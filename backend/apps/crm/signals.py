from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Order
from .services import sync_program_components


@receiver(post_save, sender=Order, dispatch_uid="crm_intake_seats")
def intake_seats(sender, instance: Order, **kwargs):
    """A seat was taken: close the intake when it is full (after commit, never blocking a payment)."""
    if instance.learning_access and instance.cohort_id:
        from django.db import transaction

        from apps.catalog.intakes import after_payment

        transaction.on_commit(lambda: after_payment(instance.cohort_id))


@receiver(post_save, sender=Order, dispatch_uid="crm_sync_program_components")
def program_components(sender, instance: Order, **kwargs):
    """A paid (or refunded/cancelled) program order passes its status on to its course components."""
    if instance.is_program_order:
        sync_program_components(instance)
