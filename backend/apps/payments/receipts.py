"""
Journey step 5 – payment receipts: every recorded payment gets a printable receipt page
(/bien-nhan/<signed token>/) e-mailed to the learner. A receipt is not a VAT invoice: invoices are
requested separately (InvoiceRequest) and issued by finance in the e-invoice software.
"""

import logging

from django.core import signing
from django.http import Http404
from django.shortcuts import render
from django.utils import timezone
from django.utils.html import escape

from .models import Payment

logger = logging.getLogger(__name__)
SALT = "payment-receipt"
CSP = (
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; "
    "base-uri 'none'"
)


def _vnd(n: int) -> str:
    return f"{n:,} đ".replace(",", ".")


def receipt_token(payment: Payment) -> str:
    return signing.dumps({"p": payment.pk}, salt=SALT)


def receipt_url(payment: Payment) -> str:
    from apps.cms.seo import base_url

    return f"{base_url()}/bien-nhan/{receipt_token(payment)}/"


def _context(payment: Payment) -> dict:
    from apps.cms.legal import COMPANY

    order = payment.order
    receivable = order.total_receivable or order.amount
    remaining = max(receivable - order.total_paid_amount, 0)
    return {
        "amount_text": _vnd(payment.amount),
        "total_paid_text": _vnd(order.total_paid_amount),
        "receivable_text": _vnd(receivable),
        "remaining_text": _vnd(remaining),
        "company": COMPANY,
        "payment": payment,
        "order": order,
        "paid_at": timezone.localtime(payment.created_at),
        "total_paid": order.total_paid_amount,
        "remaining": max(receivable - order.total_paid_amount, 0),
        "receivable": receivable,
        "number": f"BN-{timezone.localtime(payment.created_at):%Y%m}-{payment.pk[:6].upper()}",
    }


def receipt_page(request, token: str):
    try:
        data = signing.loads(token, salt=SALT)
    except signing.BadSignature as exc:
        raise Http404 from exc
    payment = Payment.objects.select_related("order", "bank_transaction").filter(pk=data.get("p")).first()
    if payment is None:
        raise Http404
    response = render(request, "payments/receipt.html", _context(payment))
    response["Content-Security-Policy"] = CSP
    response["X-Robots-Tag"] = "noindex"
    response["Cache-Control"] = "private, no-store"
    return response


def send_receipt(payment_id: str) -> None:
    from apps.notifications.outbox import send_logged
    from apps.notifications.resend import ResendError

    payment = Payment.objects.select_related("order").filter(pk=payment_id).first()
    if payment is None or not payment.order.customer_email:
        return
    ctx = _context(payment)
    order = payment.order
    vnd = _vnd
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>TWings Academy đã nhận <strong>{vnd(payment.amount)}</strong> cho đơn
<strong>{escape(order.order_code)}</strong> ({escape(order.course_title)}).</p>
<p>Đã đóng: {vnd(ctx["total_paid"])} / {vnd(ctx["receivable"])}
{f"– còn lại {vnd(ctx['remaining'])}" if ctx["remaining"] else "– đã hoàn tất học phí"}.</p>
<p>Biên nhận (in / lưu PDF được): <a href="{receipt_url(payment)}">{ctx["number"]}</a></p>
<p>Cần hóa đơn VAT? Gửi yêu cầu trong Tài khoản học viên hoặc trả lời email này.</p>
<p>TWings Academy</p>
"""
    try:
        send_logged(
            to=order.customer_email,
            subject=f"Biên nhận học phí {ctx['number']} – {order.order_code} | TWings Academy",
            html=html,
            order=order,
            template_code="payment_receipt",
            name=order.customer_name,
        )
    except ResendError:
        logger.warning("Receipt for payment %s not sent", payment_id)
