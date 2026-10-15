"""
Checkouts unpaid after their hold: cancelled (price, coupon and seat released). The consultant gets a
follow-up task; a transfer arriving later is left unmatched for finance (it is never credited at the
old price).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crm.models import Activity, FollowupTask, Order


def expire_checkouts(now=None) -> int:
    now = now or timezone.now()
    expired = 0
    for order in Order.objects.filter(
        status="pending", hold_expires_at__lt=now, total_paid_amount=0, parent__isnull=True
    ):
        order.status, order.hold_expires_at = "cancelled", None
        order.crm_status = "6. Chăm sóc lại"
        order.save(update_fields=["status", "hold_expires_at", "crm_status", "updated_at"])
        Activity.objects.create(
            order=order,
            type="note",
            title="Hết hạn thanh toán: đơn đã hủy (giá, mã giảm giá, chỗ được trả lại)",
            actor="Hệ thống",
        )
        FollowupTask.objects.create(
            order=order,
            title="Liên hệ lại: đơn thanh toán đã hết hạn",
            due_date=timezone.localdate(),
            priority="medium",
            assigned_to=order.pic,
        )
        expired += 1
    return expired


class Command(BaseCommand):
    help = "Cancel checkouts still unpaid after their hold (CHECKOUT_HOLD_HOURS)."

    def handle(self, *args, **options):
        self.stdout.write(f"expired: {expire_checkouts()}")
