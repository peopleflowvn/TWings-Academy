"""What an order costs, what was paid and refunded, and what is due when (staff app and learner account)."""

from django.conf import settings
from django.utils import timezone

from apps.crm.models import Order


def installment_rows(order: Order) -> list[dict]:
    today = timezone.localdate()
    return [
        {
            "sequence": i.sequence,
            "amount": i.amount,
            "due_date": i.due_date.isoformat(),
            "paid_at": i.paid_at.isoformat() if i.paid_at else None,
            "overdue": i.paid_at is None and i.due_date < today and order.status == "pending",
        }
        for i in order.installments.order_by("sequence")
    ]


def payment_instructions(order: Order) -> dict | None:
    from .services import vietqr_payload

    if order.status != "pending" or not settings.VIETQR_ACCOUNT_NUMBER or order.amount_due_now() <= 0:
        return None
    return vietqr_payload(order)


def order_billing(order: Order, *, staff: bool = False) -> dict:
    data = {
        "order_code": order.order_code,
        "status": order.status,
        "status_label": order.get_status_display(),
        "amount": order.amount,
        "total_paid": order.total_paid_amount,
        "refunded": order.refunded_amount,
        "refundable": max(order.total_paid_amount - order.refunded_amount, 0),
        "amount_due_now": order.amount_due_now(),
        "installment_count": order.installment_count,
        "installments": installment_rows(order),
        "learning_access": order.learning_access,
        "payment": payment_instructions(order),
    }
    if staff:
        data["payments"] = [
            {
                "amount": p.amount,
                "source": p.get_source_display(),
                "note": p.note,
                "at": p.created_at.isoformat(),
            }
            for p in order.payments.all()
        ]
        data["refunds"] = [
            {
                "amount": r.amount,
                "reason": r.reason,
                "reference": r.reference,
                "by": (r.refunded_by.name or r.refunded_by.email) if r.refunded_by else "",
                "at": r.created_at.isoformat(),
            }
            for r in order.refunds.select_related("refunded_by")
        ]
        data["parent_code"] = order.parent.order_code if order.parent_id else ""
        data["components"] = [
            {
                "id": c.id,
                "order_code": c.order_code,
                "course_title": c.course_title,
                "status": c.status,
                "cohort": c.cohort.name if c.cohort_id else "",
            }
            for c in order.components.select_related("cohort")
        ]
    return data
