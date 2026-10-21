import re
from urllib.parse import quote, urlencode

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.crm.models import ORDER_CODE_ALPHABET, Activity, FollowupTask, Order

from .models import BankTransaction, Payment, Refund

ORDER_CODE_RE = re.compile(rf"TW[{ORDER_CODE_ALPHABET}]{{8}}")


def vietqr_payload(order: Order) -> dict:
    """
    Payment instructions (checkout screen, learner account, reminders). Amount and memo always come
    from the database: the amount due now (next installment, or the rest of the price).
    """
    amount = order.amount_due_now() if order.status == "pending" else order.amount
    query = urlencode(
        {"amount": amount, "addInfo": order.order_code, "accountName": settings.VIETQR_ACCOUNT_NAME},
        quote_via=quote,
    )
    image = (
        f"https://img.vietqr.io/image/{settings.VIETQR_BANK_BIN}-{settings.VIETQR_ACCOUNT_NUMBER}-"
        f"{settings.VIETQR_TEMPLATE}.png?{query}"
    )
    return {
        "order_code": order.order_code,
        "amount": amount,
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
    had_access = order.learning_access
    order.recompute_payment_totals()
    if order.status == "paid" and not was_paid:
        order.paid_at = timezone.now()
    order.hold_expires_at = None  # money arrived: nothing to expire any more
    order.save()
    if order.learning_access and not had_access:
        from apps.crm.services import count_coupon_use

        count_coupon_use(order)
    # Step 5: printable receipt e-mailed to the learner once the payment is committed.
    from .receipts import send_receipt

    transaction.on_commit(lambda: send_receipt(payment.pk))
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
        elif order.status in ("cancelled", "refunded"):
            txn.order, txn.match_status = order, "unmatched"
            txn.match_note = f"Đơn {order.get_status_display().lower()} – cần kế toán xử lý"
        else:
            due = order.amount_due_now()
            txn.order, txn.match_status = order, "matched"
            _credit(order, txn.amount, source="bank_webhook", txn=txn)
            if txn.amount < due:
                txn.match_note = (
                    "Thanh toán thiếu so với kỳ trả góp"
                    if order.installment_count > 1
                    else "Thanh toán thiếu so với số phải thu"
                )
    txn.save()
    return txn, True


@transaction.atomic
def confirm_manual_payment(request, order: Order, amount: int, note: str) -> Payment:
    from apps.core.models import audit

    order = Order.objects.select_for_update().get(pk=order.pk)
    payment = _credit(order, amount, source="manual", user=request.user, note=note)
    audit(request, "payment.confirm_manual", order, amount=amount, note=note)
    return payment


class RestoreError(Exception):
    pass


@transaction.atomic
def restore_and_credit(request, txn: BankTransaction, order: Order | None = None) -> Payment:
    """
    Finance, for a transfer left unmatched: credit it to its order (or the one finance names when the
    memo had no order code). An order cancelled at the end of its hold is reopened at its price; a
    full intake is not changed but the consultant gets a task to move the learner.
    """
    from apps.catalog.intakes import has_seat
    from apps.core.models import audit

    txn = BankTransaction.objects.select_for_update().get(pk=txn.pk)
    if txn.match_status != "unmatched":
        raise RestoreError("Giao dịch này không ở trạng thái chưa khớp.")
    order = order or txn.order
    if order is None:
        raise RestoreError("Chọn đơn hàng nhận khoản tiền này.")
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status == "refunded":
        raise RestoreError("Đơn đã hoàn tiền: tạo đơn mới hoặc hoàn lại khoản chuyển.")
    if order.status == "cancelled":
        if order.cohort_id and not has_seat(order.cohort):
            FollowupTask.objects.create(
                order=order,
                title=f"Lớp {order.cohort.name} đã đủ chỗ: xếp học viên sang lớp khác",
                due_date=timezone.localdate(),
                priority="high",
                assigned_to=order.pic,
            )
        order.status = "pending"
        order.save(update_fields=["status", "updated_at"])
        Activity.objects.create(
            order=order,
            type="note",
            title="Khôi phục đơn đã hủy: tiền chuyển đến sau hạn giữ chỗ",
            actor=request.user.email,
            actor_user=request.user,
        )
    payment = _credit(order, txn.amount, source="bank_webhook", txn=txn, user=request.user)
    txn.order, txn.match_status = order, "matched"
    txn.match_note = f"Kế toán ghi nhận vào {order.order_code}"
    txn.save(update_fields=["order", "match_status", "match_note"])
    audit(request, "payment.restore_and_credit", order, amount=txn.amount, transaction=txn.provider_txn_id)
    return payment


class RefundError(Exception):
    pass


@transaction.atomic
def refund_order(
    request, order: Order, *, amount: int, reason: str, reference: str, revoke_access: bool
) -> Refund:
    """
    Record a refund. A full refund (or one that ends the enrolment) marks the order refunded, which
    revokes LMS access (signals) and passes on to a program's course components.
    """
    from apps.core.models import audit

    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.parent_id:
        raise RefundError("Hoàn tiền trên đơn chương trình gốc, không phải đơn thành phần.")
    refundable = order.total_paid_amount - order.refunded_amount
    if amount <= 0 or amount > refundable:
        raise RefundError(f"Số tiền hoàn tối đa là {refundable:,}đ.".replace(",", "."))
    refund = Refund.objects.create(
        order=order,
        amount=amount,
        reason=reason,
        reference=reference,
        revoke_access=revoke_access,
        refunded_by=request.user,
    )
    order.refunded_amount += amount
    full = order.refunded_amount >= order.total_paid_amount
    if full or revoke_access:
        order.status = "refunded"
        order.crm_status = "7. Đã hủy"
    order.save()
    Activity.objects.create(
        order=order,
        type="payment",
        title=f"Hoàn tiền {amount:,}đ".replace(",", ".")
        + (" – kết thúc ghi danh" if order.status == "refunded" else ""),
        content=reason + (f" (tham chiếu: {reference})" if reference else ""),
        actor=request.user.name or request.user.email,
        actor_user=request.user,
    )
    audit(request, "payment.refund", order, amount=amount, revoke=order.status == "refunded")
    return refund
