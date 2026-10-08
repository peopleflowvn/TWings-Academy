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
