"""
Receivables of corporate training (công nợ): an accepted acceptance batch is owed (total incl. VAT)
from its invoice date; due after the contract's payment terms. Payments are recorded as received
(bank statement / accounting), never more than what is still owed. Aging buckets by days past due.
Management figures for follow-up; the accounting software stays the books of record.
"""

from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .acceptance import totals
from .models import AcceptanceBatch, ClientPayment
from .services import CorporateError

BUCKETS = (
    ("current", "Chưa đến hạn"),
    ("1_30", "Quá hạn 1–30 ngày"),
    ("31_60", "Quá hạn 31–60 ngày"),
    ("60_plus", "Quá hạn trên 60 ngày"),
)


def due_date_for(batch, invoice_date):
    start = invoice_date or timezone.localdate()
    return start + timedelta(days=batch.contract.payment_terms_days)


def balance(batch, today=None) -> dict:
    today = today or timezone.localdate()
    total = totals(batch)["total"]
    paid = batch.payments.aggregate(v=Sum("amount"))["v"] or 0
    outstanding = max(total - paid, 0)
    days_late = (today - batch.due_date).days if batch.due_date and outstanding else 0
    if not outstanding or days_late <= 0:
        bucket = "current"
    elif days_late <= 30:
        bucket = "1_30"
    elif days_late <= 60:
        bucket = "31_60"
    else:
        bucket = "60_plus"
    return {
        "total": total,
        "paid": paid,
        "outstanding": outstanding,
        "due_date": batch.due_date,
        "days_late": max(days_late, 0),
        "bucket": bucket,
    }


def record_payment(batch, *, amount: int, received_on, reference: str, note: str, user) -> ClientPayment:
    with transaction.atomic():
        batch = AcceptanceBatch.objects.select_for_update().get(pk=batch.pk)
        if batch.status != "accepted":
            raise CorporateError("Chỉ ghi nhận tiền cho đợt khách hàng đã nghiệm thu.")
        if amount <= 0:
            raise CorporateError("Số tiền phải lớn hơn 0.")
        outstanding = balance(batch)["outstanding"]
        if amount > outstanding:
            raise CorporateError(f"Vượt số còn phải thu ({outstanding:,} đ).".replace(",", "."))
        return ClientPayment.objects.create(
            batch=batch,
            amount=amount,
            received_on=received_on,
            reference=reference,
            note=note,
            created_by=user,
        )


def report(clients, *, client=None, today=None) -> dict:
    """Accepted batches with their balance, totals per aging bucket."""
    today = today or timezone.localdate()
    batches = (
        AcceptanceBatch.objects.filter(status="accepted", contract__client__in=clients)
        .select_related("contract__client")
        .prefetch_related("lines", "payments")
        .order_by("due_date", "accepted_at")
    )
    if client is not None:
        batches = batches.filter(contract__client=client)
    rows, by_bucket = [], dict.fromkeys((k for k, _ in BUCKETS), 0)
    for b in batches:
        bal = balance(b, today)
        rows.append(
            {
                "id": b.pk,
                "title": b.title,
                "client_code": b.contract.client.code,
                "contract_number": b.contract.number,
                "invoice_number": b.invoice_number,
                "invoice_date": b.invoice_date,
                **bal,
            }
        )
        by_bucket[bal["bucket"]] += bal["outstanding"]
    return {
        "rows": rows,
        "buckets": [{"key": k, "label": label, "amount": by_bucket[k]} for k, label in BUCKETS],
        "total": sum(r["total"] for r in rows),
        "paid": sum(r["paid"] for r in rows),
        "outstanding": sum(r["outstanding"] for r in rows),
        "overdue": sum(r["outstanding"] for r in rows if r["days_late"] > 0),
    }
