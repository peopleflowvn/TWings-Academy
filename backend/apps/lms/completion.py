"""
Learning progress and completion, synced back from Moodle (sync_lms_completion, every 30 minutes):
progress % on each enrolment, and on completion a TWings certificate with a public verification page
(/xac-minh/<code>/), a CRM timeline entry and a congratulation e-mail.
"""

import logging

from django.utils import timezone

from apps.crm.models import Activity

from . import moodle
from .models import Certificate, LmsEnrollment

logger = logging.getLogger(__name__)


def certificate_url(code: str) -> str:
    from .emails import site_url

    return f"{site_url()}/xac-minh/{code}/"


def issue_certificate(enrollment: LmsEnrollment) -> Certificate:
    existing = Certificate.objects.filter(enrollment=enrollment).first()
    if existing:
        return existing
    order = enrollment.order
    return Certificate.objects.create(
        enrollment=enrollment,
        learner_name=order.customer_name,
        course_title=order.course.title if order.course else order.course_title,
        cohort_name=enrollment.cohort.name if enrollment.cohort else "",
        issued_at=enrollment.completed_at or timezone.now(),
    )


def sync_enrollment(enrollment: LmsEnrollment, courses: list[dict]) -> bool:
    """Update progress from the learner's Moodle courses; returns True when it just completed."""
    course = next((c for c in courses if c["id"] == enrollment.moodle_course_id), None)
    enrollment.last_synced_at = timezone.now()
    if course is None:
        enrollment.save(update_fields=["last_synced_at", "updated_at"])
        return False
    if course.get("progress") is not None:
        enrollment.progress = round(course["progress"])
    just_completed = bool(course.get("completed")) and enrollment.completed_at is None
    if just_completed:
        enrollment.completed_at = timezone.now()
        enrollment.progress = 100
    enrollment.save(update_fields=["progress", "completed_at", "last_synced_at", "updated_at"])
    if just_completed:
        _on_completed(enrollment)
    return just_completed


def certificate_hold_reason(enrollment: LmsEnrollment) -> str:
    """Why a learner who completed on Moodle cannot get the certificate yet ('' = eligible)."""
    course = enrollment.order.course
    required = course.min_attendance_rate if course else 0
    if required and enrollment.attendance_taken and (enrollment.attendance_rate or 0) < required:
        return f"Chuyên cần {enrollment.attendance_rate}% chưa đạt mức {required}% của khóa"
    return ""


def _on_completed(enrollment: LmsEnrollment, *, override_by=None, note: str = "") -> None:
    from apps.notifications.resend import ResendError

    from .emails import send_certificate_email

    order = enrollment.order
    hold = "" if override_by else certificate_hold_reason(enrollment)
    if hold:
        enrollment.certificate_hold = hold
        enrollment.save(update_fields=["certificate_hold", "updated_at"])
        order.training_status = "Chờ xét tốt nghiệp"
        order.save(update_fields=["training_status", "updated_at"])
        Activity.objects.create(
            order=order,
            type="note",
            title="Hoàn thành trên LMS – chưa cấp chứng chỉ",
            content=hold + ". Đào tạo có thể cấp ngoại lệ trong tab Học tập (LMS).",
            actor="Hệ thống LMS",
        )
        return
    if enrollment.certificate_hold:
        enrollment.certificate_hold = ""
        enrollment.save(update_fields=["certificate_hold", "updated_at"])
    certificate = issue_certificate(enrollment)
    order.training_status = "Hoàn thành"
    order.save(update_fields=["training_status", "updated_at"])
    Activity.objects.create(
        order=order,
        type="note",
        title="Hoàn thành khóa học – đã cấp chứng chỉ" + (" (ngoại lệ)" if override_by else ""),
        content=f"Mã chứng chỉ {certificate.code}: {certificate_url(certificate.code)}"
        + (f". Lý do: {note}" if note else ""),
        actor=(override_by.name or override_by.email) if override_by else "Hệ thống LMS",
        actor_user=override_by,
    )
    try:
        send_certificate_email(order, certificate)
    except ResendError:
        logger.warning("Certificate e-mail for order %s could not be sent", order.order_code)


def sync_all(limit: int = 500) -> dict:
    """One Moodle call per learner (not per enrolment)."""
    counts = {"synced": 0, "completed": 0}
    pending = (
        LmsEnrollment.objects.filter(status="done", completed_at__isnull=True, moodle_user_id__isnull=False)
        .select_related("order", "order__course", "cohort")
        .order_by("last_synced_at")[:limit]
    )
    by_user: dict[int, list[LmsEnrollment]] = {}
    for enrollment in pending:
        by_user.setdefault(enrollment.moodle_user_id, []).append(enrollment)
    for user_id, enrollments in by_user.items():
        try:
            courses = moodle.call("core_enrol_get_users_courses", userid=user_id, returnusercount=0)
        except moodle.MoodleError as exc:
            logger.warning("Completion sync for Moodle user %s failed: %s", user_id, exc)
            continue
        for enrollment in enrollments:
            counts["synced"] += 1
            counts["completed"] += int(sync_enrollment(enrollment, courses))
    return counts


def release_holds() -> int:
    """Certificates held for attendance are issued once the (updated) attendance reaches the minimum."""
    released = 0
    held = LmsEnrollment.objects.filter(completed_at__isnull=False, certificate__isnull=True).exclude(
        certificate_hold=""
    )
    for enrollment in held.select_related("order", "order__course", "cohort"):
        if not certificate_hold_reason(enrollment):
            _on_completed(enrollment)
            released += 1
    return released


def issue_with_override(enrollment: LmsEnrollment, user, note: str) -> Certificate:
    """Training staff grant the certificate despite a hold (or before Moodle completion), with a reason."""
    if enrollment.completed_at is None:
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["completed_at", "updated_at"])
    _on_completed(enrollment, override_by=user, note=note)
    return enrollment.certificate
