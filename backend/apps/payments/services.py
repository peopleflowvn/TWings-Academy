import re
from urllib.parse import quote, urlencode

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.crm import stages
from apps.crm.models import ORDER_CODE_ALPHABET, Activity, FollowupTask, Order

from .models import BankTransaction, Payment, Refund

ORDER_CODE_RE = re.compile(rf"TW[{ORDER_CODE_ALPHABET}]{{8}}")


def _extract_order_code(content: str) -> str | None:
    """
    Find a TWings order code in a bank transfer description.
    Checks space-preserved word boundaries first (so bank noise around the memo cannot glue onto 'TW'
    and shift the 8-char match), then falls back to space-stripped matching when a bank splits the code.
    """
    upper = (content or "").upper()
    boundary_match = re.search(rf"\bTW[{ORDER_CODE_ALPHABET}]{{8}}\b", upper)
    if boundary_match:
        return boundary_match.group(0)
    direct_match = ORDER_CODE_RE.search(upper)
    if direct_match:
        return direct_match.group(0)
    compact_match = ORDER_CODE_RE.search(re.sub(r"[^0-9A-Z]", "", upper))
    return compact_match.group(0) if compact_match else None


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
        code = _extract_order_code(txn.content)
        order = Order.objects.select_for_update().filter(order_code=code).first() if code else None
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


class ManualPaymentError(Exception):
    pass


def balance(order: Order) -> int:
    """What is still owed on the order in all (every installment left), not only what is due now."""
    return max((order.total_receivable or order.amount) - order.total_paid_amount, 0)


def _vnd(n: int) -> str:
    return f"{n:,}đ".replace(",", ".")


def set_missing_tuition(request, order: Order, tuition: int | None) -> None:
    """
    A registration without a price (course without one, an imported lead): the tuition is entered with the
    first payment. Only then: a price already there is changed in the profile (finance).
    """
    from apps.core.models import audit

    if order.total_receivable or order.amount:
        return
    if not tuition or tuition <= 0:
        raise ManualPaymentError("Đăng ký chưa có học phí: nhập học phí phải thu trước.")
    order.amount = order.total_receivable = tuition
    order.tuition_fee = order.tuition_fee or tuition
    order.original_amount = order.original_amount or tuition
    order.save(update_fields=["amount", "total_receivable", "tuition_fee", "original_amount", "updated_at"])
    Activity.objects.create(
        order=order,
        type="note",
        title=f"Nhập học phí phải thu {_vnd(tuition)}",
        actor=request.user.name or request.user.email,
        actor_user=request.user,
    )
    audit(request, "payment.set_tuition", order, tuition=tuition)


@transaction.atomic
def confirm_manual_payment(
    request, order: Order, amount: int, note: str, tuition: int | None = None
) -> Payment:
    """
    Money received outside the bank webhook (cash, a transfer with a wrong memo...), recorded by the
    consultant or finance: any amount up to the balance, so a part payment is fine.
    """
    from apps.core.models import audit

    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.parent_id:
        raise ManualPaymentError("Đơn thành phần của chương trình: ghi nhận trên đơn chương trình gốc.")
    if order.status in ("cancelled", "refunded"):
        state = order.get_status_display()
        raise ManualPaymentError(f"Đơn đang ở trạng thái “{state}”: không ghi nhận thêm học phí.")
    set_missing_tuition(request, order, tuition)
    left = balance(order)
    if left <= 0:
        raise ManualPaymentError("Đơn đã đóng đủ học phí.")
    if amount > left:
        raise ManualPaymentError(f"Số tiền vượt quá số còn phải đóng ({left:,}đ).".replace(",", "."))
    payment = _credit(order, amount, source="manual", user=request.user, note=note)
    audit(request, "payment.confirm_manual", order, amount=amount, note=note)
    return payment


FAST_TRACK_STAGES = (stages.PAID, stages.PART_PAID, stages.ONBOARD)


def _opening_amount(order: Order) -> int:
    """What must still be paid for the learner to study: the first installment, or the whole balance."""
    if order.learning_access:
        return 0
    if order.installment_count > 1:
        first = order.installments.order_by("sequence").first()
        if first is not None:
            return max(first.amount - order.total_paid_amount, 0)
    return balance(order)


@transaction.atomic
def fast_track(
    request, order: Order, stage: str, amount: int, note: str, tuition: int | None = None
) -> Order:
    """
    Super admin: take a registration straight to "Đã đóng phí", "Đã đóng 1 phần" or "Onboard", whatever stage
    it is at (a cancelled one is reopened). The gate stays on the money: the tuition received is entered,
    recorded like any manual payment (receipt, audit), and must be what the chosen stage means.
    """
    from apps.core.models import audit

    if stage not in FAST_TRACK_STAGES:
        raise ManualPaymentError("Chỉ chuyển nhanh tới “Đã đóng phí”, “Đã đóng 1 phần” hoặc “Onboard”.")
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.parent_id:
        raise ManualPaymentError("Đơn thành phần của chương trình: chuyển trên đơn chương trình gốc.")
    if order.status == "refunded":
        raise ManualPaymentError("Đơn đã hoàn tiền: tạo đăng ký mới.")
    set_missing_tuition(request, order, tuition)
    left = balance(order)
    vnd = _vnd
    if left <= 0:
        raise ManualPaymentError("Đơn đã đóng đủ học phí: chuyển giai đoạn bình thường.")
    if amount > left:
        raise ManualPaymentError(f"Số tiền vượt quá số còn phải đóng ({vnd(left)}).")
    if stage == stages.PAID and amount != left:
        raise ManualPaymentError(f"“Đã đóng phí” là đóng đủ: số tiền phải đúng {vnd(left)}.")
    if stage == stages.PART_PAID and amount >= left:
        raise ManualPaymentError("Số tiền bằng số còn phải đóng: chọn “Đã đóng phí”.")
    opening = _opening_amount(order)
    if amount < opening:
        raise ManualPaymentError(
            f"Chưa đủ để vào học: cần tối thiểu {vnd(opening)}"
            + (" (đợt 1)." if order.installment_count > 1 else " (đơn không trả góp: đóng đủ).")
        )

    previous = stages.name(order.crm_status)
    actor = request.user.name or request.user.email
    if order.status == "cancelled":
        order.status = "pending"
        order.save(update_fields=["status", "updated_at"])
    _credit(order, amount, source="manual", user=request.user, note=note)
    order.refresh_from_db()
    if stage == stages.ONBOARD:
        order.crm_status = stages.ONBOARD
        order.save(update_fields=["crm_status", "updated_at"])
    Activity.objects.create(
        order=order,
        type="note",
        title=f"Quản trị tối cao chuyển nhanh: {previous} → {stages.name(order.crm_status)}",
        content=f"Học phí ghi nhận {vnd(amount)}" + (f" – {note}" if note else ""),
        actor=actor,
        actor_user=request.user,
    )
    audit(request, "crm.fast_track", order, stage=order.crm_status, amount=amount, note=note)
    from apps.crm.learners import refresh_duplicate_flags

    refresh_duplicate_flags(order.learner_id)  # a reopened / now enrolled registration
    return order


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
        order.crm_status = stages.REFUSED_3
        order.lost_reason = order.lost_reason or "Hoàn tiền / dừng học"
    order.save()
    if order.status == "refunded":
        from apps.crm.learners import refresh_duplicate_flags

        refresh_duplicate_flags(order.learner_id)
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
