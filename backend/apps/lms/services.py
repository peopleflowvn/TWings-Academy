"""
Paid order (B2C) or corporate enrolment (B2B) -> Moodle access, using only Moodle's built-in web
services.

Courses: every TWings course has a *template* Moodle course (idnumber = course id, or shortname =
course slug, so staff can build it in Moodle first). Each intake (Cohort: "Khóa 9", "Khóa 10"...) gets
its own Moodle course, copied from the template (core_course_duplicate_course, no users) and dated
from the intake (idnumber = "cohort:<id>"). Courses without intakes are taught in the template itself.

Learners: found by e-mail, otherwise created with createpassword=1 (Moodle e-mails the login; no
password passes through TWings), then enrolled as student in the intake's course. An order for a
course that has intakes but no intake chosen yet waits ("Chờ xếp lớp") and is enrolled as soon as
staff assign one; moving a learner to another intake moves the Moodle enrolment.

Teachers: the course's instructors and the intake's lead instructor are enrolled as editing teachers.

Corporate learners are listed by their company for a class (a corporate intake): same Moodle course,
same retries and learning signals, but no order, no payment and no B2C journey e-mails.

Every step is idempotent, so failures are simply retried (sync_lms_enrollments).
"""

import logging
from datetime import datetime, time

from django.conf import settings
from django.db import transaction
from django.db.models import Q
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


def _label(enrollment: LmsEnrollment) -> str:
    """How logs name the enrolment's source."""
    if enrollment.is_corporate:
        return f"corporate enrolment {enrollment.corporate_enrollment_id}"
    return f"order {enrollment.order.order_code}"


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


def ensure_user(enrollment: LmsEnrollment) -> tuple[int, bool]:
    return _ensure_moodle_user(enrollment.learner_email, enrollment.learner_name)


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


def target_course(enrollment: LmsEnrollment) -> tuple[int, object]:
    """(Moodle course id, intake) the learner belongs in."""
    cohort = enrollment.target_cohort
    if cohort is not None:
        return ensure_cohort_course(cohort), cohort
    course = enrollment.course
    if course.cohorts.public().exists():
        raise WaitingForIntake
    return ensure_course(course), None


def _enrol(user_id: int, course_id: int) -> None:
    moodle.call(
        "enrol_manual_enrol_users",
        enrolments=[{"roleid": settings.MOODLE_STUDENT_ROLE_ID, "userid": user_id, "courseid": course_id}],
    )


def process(enrollment: LmsEnrollment) -> LmsEnrollment:
    order = enrollment.order  # None for a corporate learner
    if not enrollment.may_study:
        enrollment.status = "skipped"
        enrollment.last_error = "Đơn chưa thanh toán" if order else "Học viên không còn trong danh sách lớp"
        enrollment.save()
        return enrollment
    if not enrollment.learner_email or enrollment.course is None:
        enrollment.status = "skipped"
        enrollment.last_error = "Thiếu email học viên hoặc khóa học"
        enrollment.save()
        return enrollment

    previous_course = enrollment.moodle_course_id if enrollment.status == "done" else None
    enrollment.attempts += 1
    try:
        course_id, cohort = target_course(enrollment)
        user_id, created = ensure_user(enrollment)
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
        logger.warning("LMS enrollment for %s failed: %s", _label(enrollment), exc)
        return enrollment

    moved = bool(previous_course and previous_course != course_id)
    enrollment.status, enrollment.last_error = "done", ""
    enrollment.moodle_user_id, enrollment.moodle_course_id, enrollment.cohort = user_id, course_id, cohort
    enrollment.user_created = enrollment.user_created or created
    enrollment.enrolled_at = timezone.now()
    enrollment.save()
    if enrollment.access_emailed_at is None:
        _email_access(enrollment)
    if order is None:
        return enrollment
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

    from .emails import send_access_email, send_corporate_access_email

    try:
        if enrollment.is_corporate:
            send_corporate_access_email(enrollment)
        else:
            send_access_email(enrollment.order)
    except ResendError:
        logger.warning("Access e-mail for %s could not be sent", _label(enrollment))
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


def revoke_access(order_id: str) -> None:
    """Refunded / cancelled order: leave the Moodle course, revoke the certificate, keep the history."""
    with transaction.atomic():
        enrollment = (
            LmsEnrollment.objects.select_for_update(of=("self",))  # the related rows sit on outer joins
            .select_related("order")
            .filter(order_id=order_id)
            .first()
        )
        if enrollment is None or enrollment.status == "removed" or enrollment.order.learning_access:
            return
        order = enrollment.order
        reason = order.get_status_display()
        certificate = _remove(enrollment, f"Đơn {reason.lower()}")
        Activity.objects.create(
            order=order,
            type="note",
            title="Đã hủy ghi danh LMS" + (" và thu hồi chứng chỉ" if certificate is not None else ""),
            content=f"Lý do: đơn {reason.lower()}.",
            actor="Hệ thống LMS",
        )
    _sync_account_after_removal(order.customer_email, f"order {order.order_code}")


def _remove(enrollment: LmsEnrollment, reason: str):
    """Leave the Moodle course and revoke the certificate (history kept); returns the certificate, if any."""
    if enrollment.status == "done" and enrollment.moodle_user_id and enrollment.moodle_course_id:
        moodle.call(
            "enrol_manual_unenrol_users",
            enrolments=[{"userid": enrollment.moodle_user_id, "courseid": enrollment.moodle_course_id}],
        )
    enrollment.status, enrollment.last_error = "removed", reason
    enrollment.save(update_fields=["status", "last_error", "updated_at"])
    certificate = getattr(enrollment, "certificate", None)
    if certificate is not None and not certificate.revoked:
        certificate.revoked, certificate.revoked_reason = True, reason
        certificate.save(update_fields=["revoked", "revoked_reason", "updated_at"])
    return certificate


def _sync_account_after_removal(email: str, label: str) -> None:
    """Nothing else lets this person study: suspend the Moodle account (no sign-in at all)."""
    from .overview import sync_account

    try:
        sync_account(email)
    except moodle.MoodleError as exc:
        logger.warning("LMS account sync after removing %s failed: %s", label, exc)


def enroll_corporate(corporate_enrollment_id: str) -> None:
    """A learner listed for a corporate class (or listed again): enrol; failures are retried."""
    from apps.corporate.models import CorporateEnrollment

    if not moodle.is_configured():
        return
    with transaction.atomic():
        listing = CorporateEnrollment.objects.select_for_update().get(pk=corporate_enrollment_id)
        if not listing.may_study:
            return
        enrollment, _ = LmsEnrollment.objects.get_or_create(corporate_enrollment=listing)
        if enrollment.status == "done":
            return
        process(enrollment)


def revoke_corporate(corporate_enrollment_id: str) -> None:
    """Cancelled or transferred out of a corporate class: leave its Moodle course, keep the history."""
    with transaction.atomic():
        enrollment = (
            LmsEnrollment.objects.select_for_update(of=("self",))
            .with_learning_data()
            .filter(corporate_enrollment_id=corporate_enrollment_id)
            .first()
        )
        if enrollment is None or enrollment.status == "removed" or enrollment.may_study:
            return
        _remove(enrollment, enrollment.corporate_enrollment.get_status_display())
        email = enrollment.learner_email
    _sync_account_after_removal(email, f"corporate enrolment {corporate_enrollment_id}")


def provision_cohort(cohort) -> dict:
    """Create (or refresh) the intake's Moodle course and teachers, then enrol its waiting learners."""
    course_id = ensure_cohort_course(cohort)
    teachers = sync_teachers(cohort.course, course_id, lead=cohort.lead_instructor)
    waiting = LmsEnrollment.objects.filter(
        Q(order__cohort=cohort) | Q(corporate_enrollment__corporate_class__cohort=cohort),
        status__in=("waiting", "pending", "failed"),
    )
    enrolled = sum(1 for e in waiting.with_learning_data() if process(e).status == "done")
    return {"moodleCourseId": course_id, "teachers": teachers, "enrolled": enrolled}


def retry_pending(limit: int = 50) -> dict:
    counts = {"done": 0, "failed": 0, "skipped": 0, "waiting": 0}
    queryset = LmsEnrollment.objects.filter(
        status__in=("pending", "failed"), attempts__lt=MAX_ATTEMPTS
    ).with_learning_data()[:limit]
    for enrollment in queryset:
        result = process(enrollment)
        counts[result.status] = counts.get(result.status, 0) + 1
    return counts
