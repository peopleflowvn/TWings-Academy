from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Order
from .services import sync_program_components


@receiver(post_save, sender=Order, dispatch_uid="crm_sync_program_components")
def program_components(sender, instance: Order, **kwargs):
    """A paid (or refunded/cancelled) program order passes its status on to its course components."""
    if instance.is_program_order:
        sync_program_components(instance)
