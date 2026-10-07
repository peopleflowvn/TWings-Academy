"""
Journey step 2 – opening intakes for enrolment.

- Status follows the facts: full when the seats are taken, closed after the registration deadline,
  in progress from the start date. A full / closed intake passes its unpaid applicants on to the next
  intake when `auto_rollover_waitlist` is on. Run daily (refresh_intakes) and after each payment.
- Class sessions are mirrored as course events in the intake's Moodle course calendar, so learners see
  the schedule on the LMS and the Moodle app (with Moodle's own reminders).
- `overview()` feeds /app → Đợt khai giảng & chỉ tiêu.
"""

import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from .models import Cohort, CohortSession

logger = logging.getLogger(__name__)

OPEN = ("opening",)


def seats_taken(cohort: Cohort) -> int:
    return cohort.orders.filter(learning_access=True).count()


def refresh_statuses(today=None) -> dict:
    """Move intakes to the status their dates and seats imply. Idempotent."""
    from apps.crm.services import CheckoutError, rollover_cohort

    today = today or timezone.localdate()
    changes = {"full": 0, "closed": 0, "in_progress": 0, "rolled_over": 0}
    candidates = Cohort.objects.filter(status__in=("opening", "upcoming", "full", "closed")).select_related(
        "next_cohort"
    )
    for cohort in candidates:
        new = cohort.status
        if cohort.start_date and cohort.start_date <= today:
            new = "in_progress"
        elif cohort.status == "opening" and seats_taken(cohort) >= cohort.capacity:
            new = "full"
        elif (
            cohort.status == "opening"
            and cohort.registration_deadline
            and cohort.registration_deadline < today
        ):
            new = "closed"
        if new == cohort.status:
            continue
        previous = cohort.status
        cohort.status = new
        cohort.save(update_fields=["status", "updated_at"])
        changes[new] += 1
        logger.info("Intake %s: %s -> %s", cohort.pk, previous, new)
        if new in ("full", "closed") and cohort.auto_rollover_waitlist and cohort.next_cohort_id:
            try:
                changes["rolled_over"] += rollover_cohort(None, cohort)
            except CheckoutError:
                pass
    return changes


def after_payment(cohort_id: str) -> None:
    """A seat was just taken: close the intake if it is now full."""
    cohort = Cohort.objects.filter(pk=cohort_id, status="opening").first()
    if cohort and seats_taken(cohort) >= cohort.capacity:
        refresh_statuses()


# ---------------------------------------------------------------- Moodle calendar
def sync_sessions(cohort: Cohort) -> dict:
    """Make the intake's Moodle course calendar match its sessions (delete stale events, create new)."""
    from apps.lms import moodle
    from apps.lms.services import ensure_cohort_course

    if not moodle.is_configured():
        return {"synced": 0, "detail": "LMS chưa cấu hình"}
    sessions = list(cohort.sessions.all())
    stale = {*cohort.calendar_cleanup, *(s.moodle_event_id for s in sessions if s.moodle_event_id)}
    course_id = ensure_cohort_course(cohort)
    if stale:
        moodle.call(
            "core_calendar_delete_calendar_events", events=[{"eventid": e, "repeat": 0} for e in stale]
        )
    cohort.calendar_cleanup = []
    cohort.save(update_fields=["calendar_cleanup", "updated_at"])
    events = [
        {
            "name": (s.title or f"Buổi học – {cohort.name}")[:255],
            "description": "Học trực tuyến" if s.online else f"Địa điểm: {s.location or cohort.location}",
            "format": 1,
            "courseid": course_id,
            "groupid": 0,
            "repeats": 0,
            "eventtype": "course",
            "timestart": int(s.starts_at.timestamp()),
            "timeduration": max(int((s.ends_at - s.starts_at).total_seconds()), 0),
            "visible": 1,
        }
        for s in sessions
    ]
    created = moodle.call("core_calendar_create_calendar_events", events=events)["events"] if events else []
    for session, event in zip(sessions, created, strict=False):
        session.moodle_event_id = event["id"]
        session.save(update_fields=["moodle_event_id", "updated_at"])
    # Step 7: one attendance session per class session in the intake's "Điểm danh" activity.
    from apps.lms.learning import sync_attendance_sessions

    try:
        attendance = sync_attendance_sessions(cohort, course_id)
    except moodle.MoodleError as exc:
        return {
            "synced": len(created),
            "moodleCourseId": course_id,
            "detail": f"Chưa tạo được điểm danh: {exc}",
        }
    return {"synced": len(created), "moodleCourseId": course_id, "attendanceSessions": attendance}


# ---------------------------------------------------------------- overview for /app
def overview() -> dict:
    from apps.crm.models import AdmissionCampaign, Order

    today = timezone.localdate()
    now = timezone.now()
    cohorts = (
        Cohort.objects.exclude(status="completed")
        .select_related("course", "lead_instructor", "next_cohort")
        .annotate(
            paid=Count("orders", filter=Q(orders__learning_access=True), distinct=True),
            pending=Count(
                "orders",
                filter=Q(
                    orders__status="pending", orders__learning_access=False, orders__parent__isnull=True
                ),
                distinct=True,
            ),
            session_count=Count("sessions", distinct=True),
            synced_count=Count("sessions", filter=Q(sessions__moodle_event_id__isnull=False), distinct=True),
        )
        .order_by("course__title", "start_date")
    )
    rows = []
    for c in cohorts:
        next_session = c.sessions.filter(starts_at__gte=now).first()
        rows.append(
            {
                "id": c.id,
                "course_id": c.course_id,
                "course_title": c.course.title,
                "course_price": c.course.price,
                "name": c.name,
                "status": c.status,
                "status_label": c.get_status_display(),
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "registration_deadline": c.registration_deadline.isoformat()
                if c.registration_deadline
                else None,
                "days_to_deadline": (c.registration_deadline - today).days
                if c.registration_deadline
                else None,
                "capacity": c.capacity,
                "paid": c.paid,
                "pending": c.pending,
                "seats_left": max(c.capacity - c.paid, 0),
                "fill_rate": round(100 * c.paid / c.capacity) if c.capacity else None,
                "location": c.location,
                "schedule_text": c.schedule_text,
                "lead_instructor": c.lead_instructor.name if c.lead_instructor_id else "",
                "next_cohort": c.next_cohort.name if c.next_cohort_id else "",
                "auto_rollover_waitlist": c.auto_rollover_waitlist,
                "early_bird_price": c.early_bird_price,
                "early_bird_deadline": c.early_bird_deadline.isoformat() if c.early_bird_deadline else None,
                "early_bird_active": c.early_bird_active(today),
                "price_now": c.price(today),
                "sessions": c.session_count,
                "sessions_synced": c.synced_count,
                "next_session": next_session.starts_at.isoformat() if next_session else None,
            }
        )
    campaigns = []
    for camp in AdmissionCampaign.objects.exclude(status="closed").prefetch_related("positions__course"):
        positions = []
        for pos in camp.positions.all():
            enrolled = Order.objects.filter(campaign=camp, course=pos.course, learning_access=True).count()
            positions.append(
                {
                    "title": pos.short_name or pos.position_title,
                    "course_title": pos.course.title,
                    "target": pos.target_quota,
                    "enrolled": enrolled,
                    "rate": round(100 * enrolled / pos.target_quota) if pos.target_quota else None,
                }
            )
        campaigns.append(
            {
                "code": camp.code,
                "name": camp.name,
                "deadline": camp.deadline.isoformat() if camp.deadline else None,
                "target": camp.target_headcount,
                "enrolled": sum(p["enrolled"] for p in positions),
                "positions": positions,
            }
        )
    return {"intakes": rows, "campaigns": campaigns, "today": today.isoformat()}


def session_rows(cohort: Cohort) -> list[dict]:
    return [
        {
            "id": s.id,
            "title": s.title,
            "starts_at": s.starts_at.isoformat(),
            "ends_at": s.ends_at.isoformat(),
            "location": s.location,
            "online": s.online,
            "synced": s.moodle_event_id is not None,
        }
        for s in cohort.sessions.all()
    ]


class ScheduleError(ValueError):
    pass


def replace_sessions(cohort: Cohort, rows: list[dict]) -> None:
    """
    Replace the intake's sessions; their Moodle events are removed on the next sync. A session that
    keeps its start time keeps its Moodle attendance session (and the marks in it); a session that
    already took place and has attendance cannot be removed or moved.
    """
    old = list(cohort.sessions.all())
    new_starts = {r["starts_at"] for r in rows}
    now = timezone.now()
    locked = [
        s
        for s in old
        if s.moodle_attendance_session_id and s.starts_at <= now and s.starts_at not in new_starts
    ]
    if locked:
        when = ", ".join(timezone.localtime(s.starts_at).strftime("%d/%m %H:%M") for s in locked[:3])
        raise ScheduleError(
            f"Không thể xóa hoặc đổi giờ buổi đã diễn ra có điểm danh ({when}). "
            "Giữ nguyên giờ bắt đầu của các buổi này."
        )
    keep_attendance = {
        s.starts_at: s.moodle_attendance_session_id for s in old if s.moodle_attendance_session_id
    }
    old_events = [s.moodle_event_id for s in old if s.moodle_event_id]
    dropped_attendance = [
        s.moodle_attendance_session_id
        for s in old
        if s.moodle_attendance_session_id and s.starts_at not in new_starts
    ]
    if old_events or dropped_attendance:
        cohort.calendar_cleanup = [*cohort.calendar_cleanup, *old_events]
        cohort.attendance_cleanup = [*cohort.attendance_cleanup, *dropped_attendance]
        cohort.save(update_fields=["calendar_cleanup", "attendance_cleanup", "updated_at"])
    cohort.sessions.all().delete()
    CohortSession.objects.bulk_create(
        CohortSession(
            cohort=cohort,
            title=r.get("title", "")[:200],
            starts_at=r["starts_at"],
            ends_at=r["ends_at"],
            location=r.get("location", "")[:300],
            online=bool(r.get("online")),
            moodle_attendance_session_id=keep_attendance.get(r["starts_at"]),
        )
        for r in rows
    )


def upcoming_session_dates(cohort: Cohort, limit: int = 3) -> list[str]:
    now = timezone.now() - timedelta(hours=2)
    return [s.starts_at.isoformat() for s in cohort.sessions.filter(starts_at__gte=now)[:limit]]
