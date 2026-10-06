"""
Paid order -> Moodle access, using only Moodle's built-in web services.

Courses: every TWings course has a *template* Moodle course (idnumber = course id, or shortname =
course slug, so staff can build it in Moodle first). Each intake (Cohort: "Khóa 9", "Khóa 10"...) gets
its own Moodle course, copied from the template (core_course_duplicate_course, no users) and dated
from the intake (idnumber = "cohort:<id>"). Courses without intakes are taught in the template itself.

Learners: found by e-mail, otherwise created with createpassword=1 (Moodle e-mails the login; no
password passes through TWings), then enrolled as student in the intake's course. An order for a
course that has intakes but no intake chosen yet waits ("Chờ xếp lớp") and is enrolled as soon as
staff assign one; moving a learner to another intake moves the Moodle enrolment.

Teachers: the course's instructors and the intake's lead instructor are enrolled as editing teachers.

Every step is idempotent, so failures are simply retried (sync_lms_enrollments).
"""

import logging
from datetime import datetime, time

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.crm.models import Activity, Order

from . import moodle
from .models import LmsEnrollment

logger = logging.getLogger(__name__)

CATEGORY_IDNUMBER = "twings"
COHORT_PREFIX = "cohort:"
MAX_ATTEMPTS = 20


class WaitingForIntake(Exception):
    """The course is taught in intakes and the order has none yet."""


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


def _find_course(field: str, value: str) -> dict | None:
    found = moodle.call("core_course_get_courses_by_field", field=field, value=value)["courses"]
    return found[0] if found else None


def ensure_course(course) -> int:
    """The course's template Moodle course (created as an empty shell if staff haven't built one)."""
    for field, value in (("idnumber", course.id), ("shortname", course.slug)):
        found = _find_course(field, value)
        if found:
            return found["id"]
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
    sync_teachers(course, created[0]["id"])
    return created[0]["id"]


def _timestamp(day) -> int:
    return int(timezone.make_aware(datetime.combine(day, time(8, 0))).timestamp())


def ensure_cohort_course(cohort) -> int:
    """The intake's own Moodle course: copied from the course template on first use, kept dated."""
    idnumber = f"{COHORT_PREFIX}{cohort.id}"
    found = _find_course("idnumber", idnumber)
    if found:
        start = _timestamp(cohort.start_date) if cohort.start_date else None
        if start and found.get("startdate") != start:
            moodle.call("core_course_update_courses", courses=[{"id": found["id"], "startdate": start}])
        return found["id"]

    template_id = ensure_course(cohort.course)
    shortname = f"{cohort.course.slug}-{slugify(cohort.name) or cohort.id}"[:90]
    if _find_course("shortname", shortname):  # a manual course already uses that short name
        shortname = f"{shortname}-{cohort.id[:6]}"
    copy = moodle.call(
        "core_course_duplicate_course",
        courseid=template_id,
        fullname=f"{cohort.course.title} – {cohort.name}"[:254],
        shortname=shortname,
        categoryid=_category_id(),
        visible=1,
        # No options: Moodle's duplicate defaults copy content only (users=0, no enrolments, no logs).
        # Passing users=0 explicitly fails with setting_locked_by_permission, since the integration
        # deliberately lacks moodle/backup:userinfo (it can never copy people).
    )
    update = {"id": copy["id"], "idnumber": idnumber}
    if cohort.start_date:
        update["startdate"] = _timestamp(cohort.start_date)
    moodle.call("core_course_update_courses", courses=[update])
    sync_teachers(cohort.course, copy["id"], lead=cohort.lead_instructor)
    return copy["id"]


def _ensure_moodle_user(email: str, full_name: str) -> tuple[int, bool]:
    email = email.strip().lower()
    found = moodle.call("core_user_get_users_by_field", field="email", values=[email])
    if found:
        return found[0]["id"], False
    firstname, lastname = split_vietnamese_name(full_name)
    created = moodle.call(
        "core_user_create_users",
        users=[
            {
                "username": email,
                "auth": "manual",
                "createpassword": 1,  # Moodle generates a password and e-mails it
                "firstname": firstname[:100],
                "lastname": lastname[:100],
                "email": email,
                "lang": "vi",
                "timezone": "Asia/Ho_Chi_Minh",
            }
        ],
    )
    return created[0]["id"], True


def ensure_user(order: Order) -> tuple[int, bool]:
    return _ensure_moodle_user(order.customer_email, order.customer_name)


def sync_teachers(course, moodle_course_id: int, lead=None) -> int:
    """Enrol the course's instructors (and the intake's lead instructor) as editing teachers."""
    instructors = {i.pk: i for i in course.instructors.all()}
    if lead is not None:
        instructors[lead.pk] = lead
    enrolments = []
    for instructor in instructors.values():
        if not instructor.email or instructor.status == "on_leave":
            continue
        user_id, _ = _ensure_moodle_user(instructor.email, instructor.name)
        enrolments.append(
            {"roleid": settings.MOODLE_TEACHER_ROLE_ID, "userid": user_id, "courseid": moodle_course_id}
        )
    if enrolments:
        moodle.call("enrol_manual_enrol_users", enrolments=enrolments)
    return len(enrolments)


def target_course(order: Order) -> tuple[int, object]:
    """(Moodle course id, intake) the order's learner belongs in."""
    if order.cohort_id:
        return ensure_cohort_course(order.cohort), order.cohort
    if order.course.cohorts.exists():
        raise WaitingForIntake
    return ensure_course(order.course), None


def _enrol(user_id: int, course_id: int) -> None:
    moodle.call(
        "enrol_manual_enrol_users",
        enrolments=[{"roleid": settings.MOODLE_STUDENT_ROLE_ID, "userid": user_id, "courseid": course_id}],
    )


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

    previous_course = enrollment.moodle_course_id if enrollment.status == "done" else None
    enrollment.attempts += 1
    try:
        course_id, cohort = target_course(order)
        user_id, created = ensure_user(order)
        if previous_course and previous_course != course_id:
            moodle.call(
                "enrol_manual_unenrol_users", enrolments=[{"userid": user_id, "courseid": previous_course}]
            )
        _enrol(user_id, course_id)
    except WaitingForIntake:
        enrollment.attempts -= 1  # not a failure
        enrollment.status, enrollment.last_error = "waiting", "Khóa học chia theo đợt: cần xếp đợt khai giảng"
        enrollment.save()
        return enrollment
    except moodle.MoodleError as exc:
        enrollment.status, enrollment.last_error = "failed", str(exc)[:2000]
        enrollment.save()
        logger.warning("LMS enrollment for order %s failed: %s", order.order_code, exc)
        return enrollment

    moved = bool(previous_course and previous_course != course_id)
    enrollment.status, enrollment.last_error = "done", ""
    enrollment.moodle_user_id, enrollment.moodle_course_id, enrollment.cohort = user_id, course_id, cohort
    enrollment.user_created = enrollment.user_created or created
    enrollment.enrolled_at = timezone.now()
    enrollment.save()
    if enrollment.access_emailed_at is None:
        _email_access(enrollment)
    where = f" – {cohort.name}" if cohort else ""
    Activity.objects.create(
        order=order,
        type="note",
        title=("Đã chuyển sang khóa LMS của đợt mới" if moved else "Đã ghi danh vào LMS (Moodle)") + where,
        content=(
            "Tạo tài khoản học mới, Moodle đã gửi email đăng nhập cho học viên."
            if created
            else "Học viên đã có tài khoản LMS, được thêm vào khóa học."
        ),
        actor="Hệ thống LMS",
    )
    return enrollment


def _email_access(enrollment: LmsEnrollment) -> None:
    """TWings 'your course is open' e-mail (link + SSO steps); never blocks the enrolment."""
    from apps.notifications.resend import ResendError

    from .emails import send_access_email

    try:
        send_access_email(enrollment.order)
    except ResendError:
        logger.warning("Access e-mail for order %s could not be sent", enrollment.order.order_code)
        return
    enrollment.access_emailed_at = timezone.now()
    enrollment.save(update_fields=["access_emailed_at", "updated_at"])


def enroll_paid_order(order_id: str) -> None:
    """Create (or reuse) the enrollment record and enrol/move the learner; failures are retried."""
    if not moodle.is_configured():
        return
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        enrollment, _ = LmsEnrollment.objects.get_or_create(order=order)
        if enrollment.status == "removed":
            return
        if enrollment.status == "done" and enrollment.cohort_id == order.cohort_id:
            return
        process(enrollment)


def provision_cohort(cohort) -> dict:
    """Create (or refresh) the intake's Moodle course and teachers, then enrol its waiting learners."""
    course_id = ensure_cohort_course(cohort)
    teachers = sync_teachers(cohort.course, course_id, lead=cohort.lead_instructor)
    waiting = LmsEnrollment.objects.filter(order__cohort=cohort, status__in=("waiting", "pending", "failed"))
    enrolled = sum(1 for e in waiting.select_related("order") if process(e).status == "done")
    return {"moodleCourseId": course_id, "teachers": teachers, "enrolled": enrolled}


def retry_pending(limit: int = 50) -> dict:
    counts = {"done": 0, "failed": 0, "skipped": 0, "waiting": 0}
    queryset = LmsEnrollment.objects.filter(
        status__in=("pending", "failed"), attempts__lt=MAX_ATTEMPTS
    ).select_related("order", "order__course", "order__cohort")[:limit]
    for enrollment in queryset:
        result = process(enrollment)
        counts[result.status] = counts.get(result.status, 0) + 1
    return counts
