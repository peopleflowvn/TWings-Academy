"""
Journey step 7 – learning, using what Moodle already does:

- Attendance (mod_attendance): every intake gets a "Điểm danh" activity in its Moodle course and one
  attendance session per class session; teachers mark it in Moodle (web or app). TWings reads it back.
- Grades: the Moodle gradebook (gradereport_user_get_grade_items) for each intake course.
- Last access: from the course's enrolled users.
- Risk: no access for 7+ days, attendance under the course minimum, progress far behind the
  intake schedule, course grade under 50 % -> "watch" (one signal) or "risk" (two or more).
- Class announcements: one e-mail to every learner of an intake.

refresh_learning() runs with sync_lms_completion (every 30 minutes).
"""

import logging
from datetime import UTC, datetime, timedelta

from django.utils import timezone
from django.utils.html import escape, linebreaks

from . import moodle
from .models import LmsEnrollment

logger = logging.getLogger(__name__)

INACTIVE_DAYS = 7
LOW_GRADE = 50
BEHIND_POINTS = 30  # progress this many points below the share of sessions already held


# ---------------------------------------------------------------- attendance activity and sessions
def ensure_attendance(cohort, moodle_course_id: int) -> int:
    if cohort.moodle_attendance_id:
        return cohort.moodle_attendance_id
    created = moodle.call(
        "mod_attendance_add_attendance",
        courseid=moodle_course_id,
        name="Điểm danh",
        intro="Điểm danh các buổi học của lớp (TWings Academy).",
        groupmode=0,
    )
    cohort.moodle_attendance_id = created["attendanceid"]
    cohort.save(update_fields=["moodle_attendance_id", "updated_at"])
    return cohort.moodle_attendance_id


def sync_attendance_sessions(cohort, moodle_course_id: int) -> int:
    """One attendance session per class session (no extra calendar event: the calendar sync adds it)."""
    attendance_id = ensure_attendance(cohort, moodle_course_id)
    for session_id in cohort.attendance_cleanup:
        try:
            moodle.call("mod_attendance_remove_session", sessionid=session_id)
        except moodle.MoodleError:
            pass  # already removed in Moodle
    if cohort.attendance_cleanup:
        cohort.attendance_cleanup = []
        cohort.save(update_fields=["attendance_cleanup", "updated_at"])
    created = 0
    for session in cohort.sessions.filter(moodle_attendance_session_id__isnull=True):
        res = moodle.call(
            "mod_attendance_add_session",
            attendanceid=attendance_id,
            description=session.title or "Buổi học",
            sessiontime=int(session.starts_at.timestamp()),
            duration=max(int((session.ends_at - session.starts_at).total_seconds()), 0),
            groupid=0,
            addcalendarevent=0,
        )
        session.moodle_attendance_session_id = res["sessionid"]
        session.save(update_fields=["moodle_attendance_session_id", "updated_at"])
        created += 1
    return created


def read_attendance(cohort) -> dict[int, tuple[int, int]]:
    """{moodle user id: (sessions taken, attended)} over the intake's past sessions."""
    stats: dict[int, list[int]] = {}
    past = cohort.sessions.filter(moodle_attendance_session_id__isnull=False, starts_at__lte=timezone.now())
    for session in past:
        try:
            data = moodle.call("mod_attendance_get_session", sessionid=session.moodle_attendance_session_id)
        except moodle.MoodleError as exc:
            logger.warning("Attendance session %s unreadable: %s", session.moodle_attendance_session_id, exc)
            continue
        if not data.get("lasttaken"):
            continue  # not marked yet
        grade_of = {int(s["id"]): float(s.get("grade") or 0) for s in data.get("statuses", [])}
        for log in data.get("attendance_log", []):
            row = stats.setdefault(int(log["studentid"]), [0, 0])
            row[0] += 1
            row[1] += int(grade_of.get(int(log["statusid"] or 0), 0) > 0)  # present / late count
    return {uid: (taken, attended) for uid, (taken, attended) in stats.items()}


# ---------------------------------------------------------------- grades, last access
def read_grades(moodle_course_id: int) -> dict[int, dict]:
    """{moodle user id: {"course_percent": int | None, "items": [...]}} from the Moodle gradebook."""
    data = moodle.call("gradereport_user_get_grade_items", courseid=moodle_course_id)
    out = {}
    for user in data.get("usergrades", []):
        items, total = [], None
        for item in user.get("gradeitems", []):
            percent = _percent(item)
            if item.get("itemtype") == "course":
                total = percent
            elif item.get("itemtype") == "mod":
                items.append(
                    {
                        "name": item.get("itemname") or "",
                        "module": item.get("itemmodule") or "",
                        "percent": percent,
                        "grade": item.get("gradeformatted") or "",
                    }
                )
        out[int(user["userid"])] = {
            "course_percent": total,
            "items": items,
            "name": user.get("userfullname", ""),
        }
    return out


def _percent(item: dict) -> int | None:
    raw, low, high = item.get("graderaw"), item.get("grademin") or 0, item.get("grademax")
    if raw is None or not high or high <= low:
        return None
    return round(100 * (raw - low) / (high - low))


def read_last_access(moodle_course_id: int) -> dict[int, int]:
    users = moodle.call("core_enrol_get_enrolled_users", courseid=moodle_course_id)
    return {int(u["id"]): int(u.get("lastcourseaccess") or u.get("lastaccess") or 0) for u in users}


# ---------------------------------------------------------------- risk
def expected_progress(cohort) -> int | None:
    """Share of the intake's sessions already held (None for self-paced courses / no schedule)."""
    if cohort is None:
        return None
    total = cohort.sessions.count()
    if not total:
        return None
    held = cohort.sessions.filter(ends_at__lte=timezone.now()).count()
    return round(100 * held / total)


def assess(enrollment: LmsEnrollment, expected: int | None, min_attendance: int) -> list[str]:
    flags = []
    now = timezone.now()
    started = enrollment.cohort is None or (
        enrollment.cohort.start_date is not None and enrollment.cohort.start_date <= timezone.localdate()
    )
    if started and (
        enrollment.last_access is None or enrollment.last_access < now - timedelta(days=INACTIVE_DAYS)
    ):
        days = (now - enrollment.last_access).days if enrollment.last_access else None
        flags.append(f"Không vào học {days} ngày" if days is not None else "Chưa vào học lần nào")
    if (
        min_attendance
        and enrollment.attendance_taken >= 2
        and (enrollment.attendance_rate or 0) < min_attendance
    ):
        flags.append(f"Chuyên cần {enrollment.attendance_rate}% (< {min_attendance}%)")
    if expected is not None and expected >= 20 and (enrollment.progress or 0) + BEHIND_POINTS < expected:
        flags.append(f"Tiến độ {enrollment.progress or 0}% (lịch lớp đã qua {expected}%)")
    if enrollment.grade_percent is not None and enrollment.grade_percent < LOW_GRADE:
        flags.append(f"Điểm tổng {enrollment.grade_percent}%")
    return flags


def refresh_course(moodle_course_id: int, enrollments: list[LmsEnrollment]) -> int:
    """Pull attendance / grades / last access for one Moodle course and reassess its learners."""
    try:
        last_access = read_last_access(moodle_course_id)
        grades = read_grades(moodle_course_id)
    except moodle.MoodleError as exc:
        logger.warning("Learning refresh for Moodle course %s failed: %s", moodle_course_id, exc)
        return 0
    # per intake: its attendance (only from its own Moodle course) and its schedule
    per_cohort: dict = {}
    for e in enrollments:
        if e.cohort_id and e.cohort_id not in per_cohort:
            own = e.cohort.moodle_attendance_id and _is_cohort_course(e.cohort, moodle_course_id)
            per_cohort[e.cohort_id] = (read_attendance(e.cohort) if own else {}, expected_progress(e.cohort))
    for e in enrollments:
        attendance, expected = per_cohort.get(e.cohort_id, ({}, None))
        uid = e.moodle_user_id
        ts = last_access.get(uid)
        e.last_access = datetime.fromtimestamp(ts, tz=UTC) if ts else None
        e.grade_percent = (grades.get(uid) or {}).get("course_percent")
        taken, attended = attendance.get(uid, (0, 0))
        e.attendance_taken, e.attendance_attended = taken, attended
        e.attendance_rate = round(100 * attended / taken) if taken else None
        min_att = e.order.course.min_attendance_rate if e.order.course_id else 0
        e.risk_flags = [] if e.completed_at else assess(e, expected, min_att)
        e.risk_level = "risk" if len(e.risk_flags) >= 2 else "watch" if e.risk_flags else "ok"
        e.save(
            update_fields=[
                "last_access",
                "grade_percent",
                "attendance_taken",
                "attendance_attended",
                "attendance_rate",
                "risk_flags",
                "risk_level",
                "updated_at",
            ]
        )
    return len(enrollments)


def _is_cohort_course(cohort, moodle_course_id: int) -> bool:
    """The intake's attendance lives in its own Moodle course (idnumber cohort:<id>)."""
    from .services import _find_course

    if getattr(cohort, "_moodle_course_id", None) is None:
        try:
            found = _find_course("idnumber", f"cohort:{cohort.id}")
        except moodle.MoodleError:
            found = None
        cohort._moodle_course_id = found["id"] if found else 0
    return cohort._moodle_course_id == moodle_course_id


def refresh_learning() -> dict:
    """Every Moodle course with enrolled TWings learners, one pass each."""
    from collections import defaultdict

    groups: dict[int, list[LmsEnrollment]] = defaultdict(list)
    rows = LmsEnrollment.objects.filter(
        status="done", moodle_course_id__isnull=False, moodle_user_id__isnull=False
    )
    for e in rows.select_related("order", "order__course", "cohort"):
        groups[e.moodle_course_id].append(e)
    refreshed = 0
    for course_id, enrollments in groups.items():
        refreshed += refresh_course(course_id, enrollments)
    return {"learners": refreshed, "courses": len(groups)}


# ---------------------------------------------------------------- /app views
def cohort_gradebook(cohort) -> dict:
    """Learners x graded activities of an intake, with attendance and risk."""
    from .services import _find_course

    found = _find_course("idnumber", f"cohort:{cohort.id}")
    enrollments = list(
        LmsEnrollment.objects.filter(cohort=cohort, status="done")
        .select_related("order")
        .order_by("order__customer_name")
    )
    grades = read_grades(found["id"]) if found else {}
    columns: list[str] = []
    for g in grades.values():
        for item in g["items"]:
            if item["name"] not in columns:
                columns.append(item["name"])
    rows = []
    for e in enrollments:
        g = grades.get(e.moodle_user_id) or {"items": [], "course_percent": None}
        by_name = {i["name"]: i for i in g["items"]}
        rows.append(
            {
                "order_id": e.order_id,
                "name": e.order.customer_name,
                "email": e.order.customer_email,
                "progress": e.progress,
                "attendance_rate": e.attendance_rate,
                "attendance": f"{e.attendance_attended}/{e.attendance_taken}" if e.attendance_taken else "",
                "course_percent": g["course_percent"],
                "items": [by_name[c]["percent"] if c in by_name else None for c in columns],
                "risk_level": e.risk_level,
                "risk_flags": e.risk_flags,
                "last_access": e.last_access.isoformat() if e.last_access else None,
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
                "certificate_hold": e.certificate_hold,
            }
        )
    return {
        "cohort": cohort.name,
        "course": cohort.course.title,
        "moodle_course_id": found["id"] if found else None,
        "attendance_enabled": bool(cohort.moodle_attendance_id),
        "expected_progress": expected_progress(cohort),
        "columns": columns,
        "rows": rows,
    }


def at_risk_rows(limit: int = 200) -> list[dict]:
    from django.db.models import Case, IntegerField, Value, When

    rows = (
        LmsEnrollment.objects.filter(
            status="done",
            risk_level__in=("watch", "risk"),
            completed_at__isnull=True,
            order__learning_access=True,
        )
        .select_related("order", "cohort")
        .annotate(
            severity=Case(
                When(risk_level="risk", then=Value(0)), default=Value(1), output_field=IntegerField()
            )
        )
        .order_by("severity", "order__customer_name")[:limit]
    )
    return [
        {
            "order_id": e.order_id,
            "name": e.order.customer_name,
            "phone": e.order.customer_phone,
            "email": e.order.customer_email,
            "course": e.order.course_title,
            "cohort": e.cohort.name if e.cohort_id else "",
            "risk_level": e.risk_level,
            "flags": e.risk_flags,
            "progress": e.progress,
            "attendance_rate": e.attendance_rate,
            "last_access": e.last_access.isoformat() if e.last_access else None,
        }
        for e in rows
    ]


def announce(cohort, subject: str, message: str, sent_by) -> int:
    """E-mail every learner of the intake (paid / studying); logged on each order's timeline."""
    from apps.crm.models import Activity, Order
    from apps.notifications.outbox import send_logged
    from apps.notifications.resend import ResendError

    subject = " ".join(subject.split())  # one line: it becomes a mail header
    orders = Order.objects.filter(cohort=cohort, learning_access=True).exclude(customer_email="")
    header = f"<p>{escape(cohort.name)} – {escape(cohort.course.title)}</p>"
    html = f"{header}{linebreaks(escape(message))}<p>TWings Academy</p>"
    sent = 0
    for order in orders:
        try:
            send_logged(
                to=order.customer_email,
                subject=f"[{cohort.name}] {subject}",
                html=f"<p>Chào {escape(order.customer_name)},</p>{html}",
                order=order,
                sent_by=sent_by,
                template_code="class_announcement",
                name=order.customer_name,
            )
        except ResendError:
            logger.warning("Announcement to %s not sent", order.order_code)
            continue
        Activity.objects.create(
            order=order,
            type="email",
            title=f"Thông báo lớp: {subject}",
            content=message[:1000],
            actor=sent_by.name or sent_by.email,
            actor_user=sent_by,
        )
        sent += 1
    return sent
