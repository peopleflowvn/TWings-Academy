import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.accounts.models import User
from apps.catalog.models import Cohort
from apps.crm.models import Order

from . import moodle, tasks

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order, dispatch_uid="lms_enroll_paid_order")
def enroll_when_paid(sender, instance: Order, **kwargs):
    """
    Any path that opens learning (paid in full, or first installment paid) grants LMS access;
    assigning an intake later (or moving to another one) enrols / moves the learner accordingly.
    A refunded or cancelled order loses it again.
    """
    if not moodle.is_configured() or instance.is_program_order:
        return  # a program order has no course: its components are enrolled
    enrollment = getattr(instance, "lms_enrollment", None)
    if not instance.learning_access:
        if (
            instance.status in ("refunded", "cancelled")
            and enrollment is not None
            and enrollment.status != "removed"
        ):
            _later(tasks.revoke_order, instance.pk)
        return
    if enrollment is not None:
        # Removed by staff: later edits of the order must not re-enrol.
        if enrollment.status == "removed":
            return
        if enrollment.status == "done" and enrollment.cohort_id == instance.cohort_id:
            return
    # Queued after commit: the payment never waits for Moodle nor rolls back because of it (the worker
    # enrols; failures stay in LmsEnrollment and are retried).
    _later(tasks.enroll_order, instance.pk)


@receiver(post_save, sender=Cohort, dispatch_uid="lms_provision_cohort")
def provision_when_saved(sender, instance: Cohort, **kwargs):
    """A new or edited intake gets (or keeps in sync) its own Moodle course and teachers."""
    if not moodle.is_configured() or instance.status == "completed":
        return
    _later(tasks.provision_cohort, instance.pk)


def _later(task, *args) -> None:
    """Queue Moodle work for the worker once the transaction commits; never fails the caller."""
    transaction.on_commit(lambda: task.enqueue(*args), robust=True)


# ---------------------------------------------------------------- staff accounts on Moodle
@receiver(pre_save, sender=User, dispatch_uid="lms_staff_before")
def remember_staff_access(sender, instance: User, **kwargs):
    old = sender.objects.filter(pk=instance.pk).values("is_active", "role").first() if instance.pk else None
    instance._lms_access_before = old


@receiver(post_save, sender=User, dispatch_uid="lms_staff_after")
def sync_staff_when_changed(sender, instance: User, created, **kwargs):
    """Deactivated or re-roled staff: Moodle follows (suspended / manager role taken or given)."""
    old = getattr(instance, "_lms_access_before", None)
    if created or old is None or not moodle.is_configured():
        return
    if old != {"is_active": instance.is_active, "role": instance.role}:
        _later(tasks.sync_account, instance.email)


@receiver(post_delete, sender=User, dispatch_uid="lms_staff_deleted")
def sync_deleted_staff(sender, instance: User, **kwargs):
    if moodle.is_configured():
        _later(tasks.sync_account, instance.email)
