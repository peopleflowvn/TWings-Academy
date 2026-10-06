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


def _on_completed(enrollment: LmsEnrollment) -> None:
    from apps.notifications.resend import ResendError

    from .emails import send_certificate_email

    certificate = issue_certificate(enrollment)
    order = enrollment.order
    order.training_status = "Hoàn thành"
    order.save(update_fields=["training_status", "updated_at"])
    Activity.objects.create(
        order=order,
        type="note",
        title="Hoàn thành khóa học trên LMS – đã cấp chứng chỉ",
        content=f"Mã chứng chỉ {certificate.code}: {certificate_url(certificate.code)}",
        actor="Hệ thống LMS",
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
