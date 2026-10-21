"""
Data written before the selling rules (0012):
- unpaid checkouts had no hold, so they kept their seat for ever: they get the standard hold from now;
- coupons were counted when the checkout was created, paid or not: the count is lowered to the orders
  whose money arrived (a higher figure set by hand elsewhere is never raised).
"""

from datetime import timedelta

from django.conf import settings
from django.db import migrations
from django.db.models import Q
from django.utils import timezone


def backfill(apps, schema_editor):
    Order = apps.get_model("crm", "Order")
    Coupon = apps.get_model("catalog", "Coupon")
    hold = timezone.now() + timedelta(hours=getattr(settings, "CHECKOUT_HOLD_HOURS", 72))
    Order.objects.filter(
        status="pending",
        hold_expires_at__isnull=True,
        total_paid_amount=0,
        parent__isnull=True,
        amount__gt=0,
        learning_access=False,
        terms_accepted_at__isnull=False,  # a checkout (consultation leads carry a price too)
    ).update(hold_expires_at=hold)
    for coupon in Coupon.objects.filter(usage_count__gt=0):
        used = (
            Order.objects.filter(discount_code__iexact=coupon.code, parent__isnull=True)
            .filter(Q(learning_access=True) | Q(total_paid_amount__gt=0))
            .count()
        )
        if used < coupon.usage_count:
            Coupon.objects.filter(pk=coupon.pk).update(usage_count=used)


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0012_selling_rules"),
        ("catalog", "0008_selling_rules"),
    ]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
