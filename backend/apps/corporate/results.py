"""
Class results of corporate training: compute, freeze, publish. The completion policy of the class
decides who passed (a learner missing data is "chờ xác minh", never counted as passed or filled in):

    {"min_attendance": 80, "min_grade": 50, "survey_required": true, "moodle_completion": false}

Publishing locks the class (no more attendance corrections), sets each listing to completed /
not passed and keeps the snapshot as it is. Reopening creates the next draft version.
"""

from io import BytesIO

from django.db import transaction
from django.utils import timezone

from .attendance import sheet
from .models import ResultSnapshot
from .services import CorporateError

POLICY_KEYS = {"min_attendance", "min_grade", "survey_required", "moodle_completion"}


def clean_policy(policy: dict) -> dict:
    if not isinstance(policy, dict) or set(policy) - POLICY_KEYS:
        raise CorporateError(f"Điều kiện hoàn thành chỉ gồm: {', '.join(sorted(POLICY_KEYS))}.")
    out = {}
    for key in ("min_attendance", "min_grade"):
        if policy.get(key) not in (None, ""):
            value = int(policy[key])
            if not 0 <= value <= 100:
                raise CorporateError(f"{key} từ 0 đến 100.")
            out[key] = value
    for key in ("survey_required", "moodle_completion"):
        out[key] = bool(policy.get(key))
    return out


def _survey_respondents(corporate_class) -> set[int] | None:
    """Moodle user ids who answered a named survey of the class; None when the class has no named survey."""
    named = [s for s in corporate_class.surveys.all() if not s.anonymous]
    if not named:
        return None
    return {uid for s in named for uid in s.respondents}


def compute(corporate_class) -> tuple[list[dict], dict]:
    """(learners, kpis) from the verified attendance sheet, Moodle signals and surveys."""
    from apps.lms.models import LmsEnrollment

    policy = clean_policy(corporate_class.completion_policy or {})
    attendance = {row["enrollment"]: row for row in sheet(corporate_class)["rows"]}
    lms = {
        e.corporate_enrollment_id: e
        for e in LmsEnrollment.objects.filter(corporate_enrollment__corporate_class=corporate_class)
    }
    respondents = _survey_respondents(corporate_class)
    listings = (
        corporate_class.enrollments.filter(status__in=("enrolled", "completed", "not_passed"))
        .select_related("learner", "employee__unit")
        .order_by("learner__full_name")
    )
    learners = []
    for listing in listings:
        att = attendance.get(listing.pk, {})
        e = lms.get(listing.pk)
        uid = e.moodle_user_id if e else None
        rate, grade = att.get("rate"), e.grade_percent if e else None
        answered = None if respondents is None or uid is None else uid in respondents
        reasons, pending = [], []
        if "min_attendance" in policy:
            if rate is None:
                pending.append("Chưa có dữ liệu điểm danh")
            elif rate < policy["min_attendance"]:
                reasons.append(f"Chuyên cần {rate}% < {policy['min_attendance']}%")
        if "min_grade" in policy:
            if grade is None:
                pending.append("Chưa có điểm")
            elif grade < policy["min_grade"]:
                reasons.append(f"Điểm {grade}% < {policy['min_grade']}%")
        if policy["survey_required"]:
            if answered is None:
                pending.append("Không có khảo sát ghi tên để đối chiếu")
            elif not answered:
                reasons.append("Chưa làm khảo sát")
        if policy["moodle_completion"] and not (e and e.completed_at):
            reasons.append("Chưa hoàn thành khóa trên Moodle")
        result = "not_passed" if reasons else "pending" if pending else "passed"
        learners.append(
            {
                "enrollment": listing.pk,
                "name": listing.learner.full_name,
                "email": listing.learner.email,
                "employee_code": listing.employee.employee_code,
                "unit": listing.employee.unit.name if listing.employee.unit else "",
                "manager_email": listing.employee.manager_email,
                "sessions_taken": att.get("taken", 0),
                "sessions_attended": att.get("attended", 0),
                "attendance_rate": rate,
                "grade_percent": grade,
                "progress": e.progress if e else None,
                "moodle_completed": bool(e and e.completed_at),
                "survey_answered": answered,
                "result": result,
                "reasons": reasons + pending,
            }
        )
    kpis = _kpis(corporate_class, learners)
    return learners, kpis


def _avg(values) -> float | None:
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 1) if values else None


def _kpis(corporate_class, learners: list[dict]) -> dict:
    n = len(learners)
    passed = sum(1 for r in learners if r["result"] == "passed")
    surveys = list(corporate_class.surveys.all())
    responses = sum(s.responses for s in surveys)
    satisfaction = [s.satisfaction for s in surveys if s.satisfaction is not None]
    sessions = corporate_class.cohort.sessions.count()
    return {
        "learners": n,
        "passed": passed,
        "not_passed": sum(1 for r in learners if r["result"] == "not_passed"),
        "pending": sum(1 for r in learners if r["result"] == "pending"),
        "completion_rate": round(100 * passed / n, 1) if n else None,
        "attendance_rate": _avg(r["attendance_rate"] for r in learners),
        "grade_average": _avg(r["grade_percent"] for r in learners),
        "sessions": sessions,
        "learner_sessions": sum(r["sessions_attended"] for r in learners),  # lượt học viên có mặt
        "survey_response_rate": round(100 * min(responses, n) / n, 1) if n and surveys else None,
        "satisfaction": _avg(satisfaction),
    }


def draft(corporate_class, user) -> ResultSnapshot:
    """The current draft, recomputed (a new one after the last published version)."""
    if corporate_class.locked_at:
        raise CorporateError("Kết quả đã phát hành: mở lại để tạo phiên bản mới.")
    learners, kpis = compute(corporate_class)
    snapshot = corporate_class.results.filter(status="draft").first()
    if snapshot is None:
        last = corporate_class.results.order_by("-version").first()
        snapshot = ResultSnapshot(corporate_class=corporate_class, version=(last.version + 1) if last else 1)
    snapshot.policy = clean_policy(corporate_class.completion_policy or {})
    snapshot.learners, snapshot.kpis, snapshot.created_by = learners, kpis, user
    snapshot.save()
    return snapshot


def publish(snapshot: ResultSnapshot, user) -> ResultSnapshot:
    from .models import CorporateEnrollment

    with transaction.atomic():
        snapshot = ResultSnapshot.objects.select_for_update().get(pk=snapshot.pk)
        if snapshot.status != "draft":
            raise CorporateError("Chỉ phát hành bản nháp.")
        corporate_class = snapshot.corporate_class
        corporate_class.results.filter(status="published").update(status="superseded")
        snapshot.status, snapshot.published_by, snapshot.published_at = "published", user, timezone.now()
        snapshot.save(update_fields=["status", "published_by", "published_at", "updated_at"])
        corporate_class.locked_at = snapshot.published_at
        corporate_class.save(update_fields=["locked_at", "updated_at"])
        for row in snapshot.learners:
            if row["result"] in ("passed", "not_passed"):
                CorporateEnrollment.objects.filter(
                    pk=row["enrollment"], status__in=CorporateEnrollment.STUDYING
                ).update(status="completed" if row["result"] == "passed" else "not_passed")
    return snapshot


def reopen(corporate_class, user) -> ResultSnapshot:
    """Unlock a published class for corrections; the next publish is a new version."""
    if not corporate_class.locked_at:
        raise CorporateError("Lớp chưa chốt kết quả.")
    corporate_class.locked_at = None
    corporate_class.save(update_fields=["locked_at", "updated_at"])
    return draft(corporate_class, user)


# ---------------------------------------------------------------- export
RESULT_LABEL = {"passed": "Đạt", "not_passed": "Không đạt", "pending": "Chờ xác minh"}


def export_xlsx(snapshot: ResultSnapshot) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    cohort = snapshot.corporate_class.cohort
    book = Workbook()
    sheet_ = book.active
    sheet_.title = "Kết quả"
    sheet_.append([f"KẾT QUẢ LỚP {cohort.name} – {cohort.course.title}"])
    sheet_.append(
        [
            f"Khách hàng: {snapshot.corporate_class.client.name} · Phiên bản {snapshot.version} · "
            f"{snapshot.get_status_display()}"
        ]
    )
    sheet_.append([])
    header = [
        "STT",
        "Họ tên",
        "Email",
        "Mã NV",
        "Đơn vị",
        "Buổi có mặt",
        "Buổi đã học",
        "Chuyên cần (%)",
        "Điểm (%)",
        "Khảo sát",
        "Kết quả",
        "Ghi chú",
    ]
    sheet_.append(header)
    for cell in sheet_[4]:
        cell.font = Font(bold=True)
    for i, r in enumerate(snapshot.learners, start=1):
        survey = "" if r["survey_answered"] is None else "Đã làm" if r["survey_answered"] else "Chưa làm"
        sheet_.append(
            [
                i,
                r["name"],
                r["email"],
                r["employee_code"],
                r["unit"],
                r["sessions_attended"],
                r["sessions_taken"],
                r["attendance_rate"],
                r["grade_percent"],
                survey,
                RESULT_LABEL[r["result"]],
                "; ".join(r["reasons"]),
            ]
        )
    k = snapshot.kpis
    sheet_.append([])
    for label, value in (
        ("Số học viên", k.get("learners")),
        ("Đạt", k.get("passed")),
        ("Tỷ lệ hoàn thành (%)", k.get("completion_rate")),
        ("Chuyên cần trung bình (%)", k.get("attendance_rate")),
        ("Lượt học viên có mặt", k.get("learner_sessions")),
        ("Tỷ lệ phản hồi khảo sát (%)", k.get("survey_response_rate")),
        ("Mức hài lòng (%)", k.get("satisfaction")),
    ):
        sheet_.append([label, value])
    buf = BytesIO()
    book.save(buf)
    return buf.getvalue()
