import re
from urllib.parse import quote, urlencode

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.crm.models import ORDER_CODE_ALPHABET, Activity, Order

from .models import BankTransaction, Payment

ORDER_CODE_RE = re.compile(rf"TW[{ORDER_CODE_ALPHABET}]{{8}}")


def vietqr_payload(order: Order) -> dict:
    """Payment instructions for the checkout screen. Amount and memo always come from the database."""
    query = urlencode(
        {"amount": order.amount, "addInfo": order.order_code, "accountName": settings.VIETQR_ACCOUNT_NAME},
        quote_via=quote,
    )
    image = (
        f"https://img.vietqr.io/image/{settings.VIETQR_BANK_BIN}-{settings.VIETQR_ACCOUNT_NUMBER}-"
        f"{settings.VIETQR_TEMPLATE}.png?{query}"
    )
    return {
        "order_code": order.order_code,
        "amount": order.amount,
        "bank_bin": settings.VIETQR_BANK_BIN,
        "bank_name": settings.VIETQR_BANK_NAME,
        "account_number": settings.VIETQR_ACCOUNT_NUMBER,
        "account_name": settings.VIETQR_ACCOUNT_NAME,
        "transfer_content": order.order_code,
        "qr_image_url": image,
    }


def _credit(order: Order, amount: int, *, source: str, txn=None, user=None, note="") -> Payment:
    payment = Payment.objects.create(
        order=order, amount=amount, source=source, bank_transaction=txn, confirmed_by=user, note=note
    )
    was_paid = order.status == "paid"
    order.recompute_payment_totals()
    if order.status == "paid" and not was_paid:
        order.paid_at = timezone.now()
        order.payment_date = timezone.localdate()
    if txn is not None:
        order.transaction_code = txn.reference_code or txn.provider_txn_id
    order.save()
    Activity.objects.create(
        order=order,
        type="payment",
        title=f"Ghi nhận thanh toán {amount:,}đ".replace(",", "."),
        content=note or ("Đối soát tự động từ webhook ngân hàng" if source == "bank_webhook" else ""),
        actor=user.email if user else "Hệ thống đối soát",
        actor_user=user,
    )
    return payment


@transaction.atomic
def ingest_bank_transaction(payload: dict, provider: str = "sepay") -> tuple[BankTransaction, bool]:
    """
    Store a bank notification and credit the matching order. Safe to call repeatedly with the same
    payload (returns created=False). Only incoming transfers into our account are credited.
    """
    txn_id = str(payload.get("id") or payload.get("referenceCode") or "").strip()
    if not txn_id:
        raise ValueError("Missing transaction id")
    txn, created = BankTransaction.objects.get_or_create(
        provider=provider,
        provider_txn_id=txn_id,
        defaults={
            "gateway": str(payload.get("gateway", ""))[:50],
            "account_number": str(payload.get("accountNumber", ""))[:50],
            "transfer_type": str(payload.get("transferType", ""))[:10],
            "amount": int(payload.get("transferAmount") or 0),
            "content": str(payload.get("content") or payload.get("description") or "")[:2000],
            "reference_code": str(payload.get("referenceCode", ""))[:100],
            "transaction_date": str(payload.get("transactionDate", ""))[:50],
            "raw": payload,
        },
    )
    if not created:
        return txn, False

    if txn.transfer_type != "in" or txn.amount <= 0:
        txn.match_status, txn.match_note = "ignored", "Không phải giao dịch tiền vào"
    elif (
        settings.VIETQR_ACCOUNT_NUMBER
        and txn.account_number
        and txn.account_number != settings.VIETQR_ACCOUNT_NUMBER
    ):
        txn.match_status, txn.match_note = "ignored", "Sai tài khoản nhận"
    else:
        match = ORDER_CODE_RE.search((txn.content or "").upper().replace(" ", ""))
        order = Order.objects.select_for_update().filter(order_code=match.group(0)).first() if match else None
        if order is None:
            txn.match_status, txn.match_note = (
                "unmatched",
                "Không tìm thấy mã đơn trong nội dung chuyển khoản",
            )
        elif order.status == "cancelled":
            txn.order, txn.match_status, txn.match_note = order, "unmatched", "Đơn đã hủy – cần kế toán xử lý"
        else:
            txn.order, txn.match_status = order, "matched"
            _credit(order, txn.amount, source="bank_webhook", txn=txn)
            if txn.amount < order.amount:
                txn.match_note = "Thanh toán thiếu so với số phải thu"
    txn.save()
    return txn, True


@transaction.atomic
def confirm_manual_payment(request, order: Order, amount: int, note: str) -> Payment:
    from apps.core.models import audit

    order = Order.objects.select_for_update().get(pk=order.pk)
    payment = _credit(order, amount, source="manual", user=request.user, note=note)
    audit(request, "payment.confirm_manual", order, amount=amount, note=note)
    return payment
