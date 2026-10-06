from django.conf import settings
from django.db import models

from apps.core.models import BaseModel
from apps.crm.models import Order


class BankTransaction(BaseModel):
    """Raw incoming transfer reported by the bank-notification provider (SePay/Casso-style webhook)."""

    provider = models.CharField(max_length=32, default="sepay")
    provider_txn_id = models.CharField(max_length=100)
    gateway = models.CharField(max_length=50, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    transfer_type = models.CharField(max_length=10, blank=True)
    amount = models.BigIntegerField()
    content = models.TextField(blank=True)
    reference_code = models.CharField(max_length=100, blank=True)
    transaction_date = models.CharField(max_length=50, blank=True)
    raw = models.JSONField(default=dict)
    order = models.ForeignKey(
        Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="bank_transactions"
    )
    match_status = models.CharField(
        max_length=20,
        choices=[("matched", "Đã khớp"), ("unmatched", "Chưa khớp"), ("ignored", "Bỏ qua")],
        default="unmatched",
    )
    match_note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Idempotency: the provider may retry the same notification many times.
            models.UniqueConstraint(fields=["provider", "provider_txn_id"], name="uniq_provider_txn"),
        ]


class Payment(BaseModel):
    """A confirmed amount credited to an order, either from a bank transaction or entered by finance."""

    SOURCE_CHOICES = [("bank_webhook", "Webhook ngân hàng"), ("manual", "Xác nhận thủ công")]

    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    amount = models.PositiveBigIntegerField()
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    bank_transaction = models.OneToOneField(
        BankTransaction, null=True, blank=True, on_delete=models.PROTECT, related_name="payment"
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]


class Refund(BaseModel):
    """Money paid back to the learner (transferred by finance; recorded here). Never deleted."""

    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="refunds")
    amount = models.PositiveBigIntegerField()
    reason = models.CharField(max_length=300)
    reference = models.CharField(max_length=100, blank=True)  # the outgoing bank transfer's reference
    revoke_access = models.BooleanField(default=True)
    refunded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["-created_at"]
