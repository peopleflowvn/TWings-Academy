"""
Moodle work queued for the worker (django.tasks, see config TASKS): a payment, an order edit or an
intake save commits and answers at once; the worker then talks to Moodle. Each task is idempotent and
the enrolment keeps its own retry state (LmsEnrollment, sync_lms_enrollments).
"""

from django.tasks import task


@task
def enroll_order(order_id: str) -> None:
    from .services import enroll_paid_order

    enroll_paid_order(order_id)


@task
def revoke_order(order_id: str) -> None:
    from .services import revoke_access

    revoke_access(order_id)


@task
def provision_cohort(cohort_id: str) -> None:
    from apps.catalog.models import Cohort

    from .services import provision_cohort as provision

    provision(Cohort.objects.select_related("course", "lead_instructor").get(pk=cohort_id))


@task
def sync_account(email: str) -> str:
    from .overview import sync_account as sync

    return sync(email)


@task
def moodle_event(moodle_course_id: int, moodle_user_id: int) -> dict:
    """
    Moodle reported a change (completion, grade, attendance) for this course and user: refresh the
    course's learning signals and the user's completion now (certificates without waiting for the
    30-minute sync, which stays as the reconciliation).
    """
    from . import moodle
    from .completion import release_holds, sync_enrollment
    from .learning import refresh_course
    from .models import LmsEnrollment

    enrollments = list(
        LmsEnrollment.objects.filter(status="done", moodle_course_id=moodle_course_id)
        .exclude(moodle_user_id__isnull=True)
        .select_related("order", "order__course", "cohort")
    )
    if not enrollments:
        return {"learners": 0}
    refreshed = refresh_course(moodle_course_id, enrollments)
    completed = 0
    mine = [e for e in enrollments if e.moodle_user_id == moodle_user_id and not e.completed_at]
    if mine:
        courses = moodle.call("core_enrol_get_users_courses", userid=moodle_user_id, returnusercount=0)
        completed = sum(int(sync_enrollment(e, courses)) for e in mine)
    return {"learners": refreshed, "completed": completed, "released": release_holds()}
