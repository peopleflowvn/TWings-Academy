"""
Paid order -> Moodle access, using only Moodle's built-in web services:

1. the course: found by idnumber (= TWings course id) or shortname (= TWings course slug, so staff can
   build a course in Moodle first and it gets picked up), otherwise created as an empty shell;
2. the learner: found by e-mail, otherwise created with createpassword=1, so Moodle itself e-mails the
   login details (no password ever passes through TWings);
3. a manual enrolment as student.

Every step is idempotent, so a failed enrollment can simply be retried (sync_lms_enrollments).
"""

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.crm.models import Activity, Order

from . import moodle
from .models import LmsEnrollment

logger = logging.getLogger(__name__)

CATEGORY_IDNUMBER = "twings"
MAX_ATTEMPTS = 20


def split_vietnamese_name(full_name: str) -> tuple[str, str]:
    """'Nguyễn Văn An' -> ('An', 'Nguyễn Văn'): Moodle's firstname is the given name."""
    parts = full_name.split()
    if not parts:
        return "Học viên", "TWings"
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[-1], " ".join(parts[:-1])


def _category_id() -> int:
    found = moodle.call(
        "core_course_get_categories", criteria=[{"key": "idnumber", "value": CATEGORY_IDNUMBER}]
    )
    if found:
        return found[0]["id"]
    created = moodle.call(
        "core_course_create_categories",
        categories=[{"name": "TWings Academy", "idnumber": CATEGORY_IDNUMBER, "parent": 0}],
    )
    return created[0]["id"]


def ensure_course(course) -> int:
    for field, value in (("idnumber", course.id), ("shortname", course.slug)):
        found = moodle.call("core_course_get_courses_by_field", field=field, value=value)["courses"]
        if found:
            return found[0]["id"]
    created = moodle.call(
        "core_course_create_courses",
        courses=[
            {
                "fullname": course.title[:254],
                "shortname": course.slug[:100],
                "idnumber": course.id,
                "categoryid": _category_id(),
                "summary": course.subtitle or course.description[:2000],
                "summaryformat": 1,
                "format": "topics",
                "enablecompletion": 1,
                "visible": 1,
                "lang": "vi",
            }
        ],
    )
    return created[0]["id"]


def ensure_user(order: Order) -> tuple[int, bool]:
    email = order.customer_email.strip().lower()
    found = moodle.call("core_user_get_users_by_field", field="email", values=[email])
    if found:
        return found[0]["id"], False
    firstname, lastname = split_vietnamese_name(order.customer_name)
    created = moodle.call(
        "core_user_create_users",
        users=[
            {
                "username": email,
                "auth": "manual",
                "createpassword": 1,  # Moodle generates a password and e-mails it to the learner
                "firstname": firstname[:100],
                "lastname": lastname[:100],
                "email": email,
                "lang": "vi",
                "timezone": "Asia/Ho_Chi_Minh",
            }
        ],
    )
    return created[0]["id"], True


def process(enrollment: LmsEnrollment) -> LmsEnrollment:
    order = enrollment.order
    if order.status != "paid":
        enrollment.status, enrollment.last_error = "skipped", "Đơn chưa thanh toán"
        enrollment.save()
        return enrollment
    if not order.customer_email or order.course_id is None:
        enrollment.status = "skipped"
        enrollment.last_error = "Đơn thiếu email học viên hoặc khóa học"
        enrollment.save()
        return enrollment

    enrollment.attempts += 1
    try:
        course_id = ensure_course(order.course)
        user_id, created = ensure_user(order)
        moodle.call(
            "enrol_manual_enrol_users",
            enrolments=[
                {"roleid": settings.MOODLE_STUDENT_ROLE_ID, "userid": user_id, "courseid": course_id}
            ],
        )
    except moodle.MoodleError as exc:
        enrollment.status, enrollment.last_error = "failed", str(exc)[:2000]
        enrollment.save()
        logger.warning("LMS enrollment for order %s failed: %s", order.order_code, exc)
        return enrollment

    enrollment.status, enrollment.last_error = "done", ""
    enrollment.moodle_user_id, enrollment.moodle_course_id = user_id, course_id
    enrollment.user_created = enrollment.user_created or created
    enrollment.enrolled_at = timezone.now()
    enrollment.save()
    Activity.objects.create(
        order=order,
        type="note",
        title="Đã ghi danh vào LMS (Moodle)",
        content=(
            "Tạo tài khoản học mới, Moodle đã gửi email đăng nhập cho học viên."
            if created
            else "Học viên đã có tài khoản LMS, được thêm vào khóa học."
        ),
        actor="Hệ thống LMS",
    )
    return enrollment


def enroll_paid_order(order_id: str) -> None:
    """Create (or reuse) the enrollment record and try once; failures are retried by the command."""
    if not moodle.is_configured():
        return
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        enrollment, _ = LmsEnrollment.objects.get_or_create(order=order)
        if enrollment.status != "done":
            process(enrollment)


def retry_pending(limit: int = 50) -> dict:
    counts = {"done": 0, "failed": 0, "skipped": 0}
    queryset = LmsEnrollment.objects.filter(
        status__in=("pending", "failed"), attempts__lt=MAX_ATTEMPTS
    ).select_related("order", "order__course")[:limit]
    for enrollment in queryset:
        result = process(enrollment)
        counts[result.status] = counts.get(result.status, 0) + 1
    return counts
