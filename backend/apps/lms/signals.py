import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.crm.models import Order

from . import moodle
from .services import enroll_paid_order

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order, dispatch_uid="lms_enroll_paid_order")
def enroll_when_paid(sender, instance: Order, **kwargs):
    """Any path that marks an order paid (bank webhook, manual confirmation, CMS) grants LMS access."""
    if instance.status != "paid" or not moodle.is_configured():
        return
    if getattr(instance, "lms_enrollment", None) is not None and instance.lms_enrollment.status == "done":
        return
    # After commit: never hold the payment transaction open on a network call, and a Moodle outage
    # must not roll back the payment (the retry command picks failures up).
    transaction.on_commit(lambda: _safe_enroll(instance.pk))


def _safe_enroll(order_id: str) -> None:
    try:
        enroll_paid_order(order_id)
    except Exception:  # noqa: BLE001 - payment flow must never fail because of the LMS
        logger.exception("LMS enrollment crashed for order %s", order_id)
