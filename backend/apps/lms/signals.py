import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.accounts.models import User
from apps.catalog.models import Cohort
from apps.crm.models import Order

from . import moodle
from .services import enroll_paid_order, provision_cohort, revoke_access

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
            transaction.on_commit(lambda: _safe(revoke_access, instance.pk))
        return
    if enrollment is not None:
        # Removed by staff: later edits of the order must not re-enrol.
        if enrollment.status == "removed":
            return
        if enrollment.status == "done" and enrollment.cohort_id == instance.cohort_id:
            return
    # After commit: never hold the payment transaction open on a network call, and a Moodle outage
    # must not roll back the payment (the retry command picks failures up).
    transaction.on_commit(lambda: _safe(enroll_paid_order, instance.pk))


@receiver(post_save, sender=Cohort, dispatch_uid="lms_provision_cohort")
def provision_when_saved(sender, instance: Cohort, **kwargs):
    """A new or edited intake gets (or keeps in sync) its own Moodle course and teachers."""
    if not moodle.is_configured() or instance.status == "completed":
        return
    transaction.on_commit(lambda: _safe(_provision, instance.pk))


def _provision(cohort_id: str) -> None:
    provision_cohort(Cohort.objects.select_related("course", "lead_instructor").get(pk=cohort_id))


def _safe(func, pk) -> None:
    try:
        func(pk)
    except Exception:  # noqa: BLE001 - CMS/payment flows must never fail because of the LMS
        logger.exception("LMS task failed for %s", pk)


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
        email = instance.email
        transaction.on_commit(lambda: _safe_sync(email))


@receiver(post_delete, sender=User, dispatch_uid="lms_staff_deleted")
def sync_deleted_staff(sender, instance: User, **kwargs):
    if moodle.is_configured():
        email = instance.email
        transaction.on_commit(lambda: _safe_sync(email))


def _safe_sync(email: str) -> None:
    from .overview import sync_account

    try:
        logger.info("LMS account %s: %s", email.split("@")[0][:3] + "***", sync_account(email))
    except Exception:  # noqa: BLE001 - staff administration must never fail because of the LMS
        logger.exception("LMS account sync failed")
