"""Installment reminders: e-mail with the VietQR a few days before a due date, again when overdue."""

import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.utils.html import escape

from apps.crm.models import Activity, FollowupTask, Installment
from apps.notifications.outbox import send_logged
from apps.notifications.resend import ResendError

from .services import vietqr_payload

logger = logging.getLogger(__name__)

REMIND_BEFORE_DAYS = 3
REMIND_EVERY_DAYS = 3


def _vnd(value: int) -> str:
    return f"{value:,}đ".replace(",", ".")


def send_installment_email(installment: Installment) -> None:
    from apps.lms.emails import account_url

    order = installment.order
    qr = vietqr_payload(order)
    overdue = installment.due_date < timezone.localdate()
    when = "đã quá hạn từ" if overdue else "đến hạn vào"
    due = installment.due_date.strftime("%d/%m/%Y")
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Kỳ học phí {installment.sequence}/{order.installment_count} của
<strong>{escape(order.course_title)}</strong> {when} ngày <strong>{due}</strong>.</p>
<p>Số tiền cần chuyển: <strong>{_vnd(qr["amount"])}</strong><br>
Ngân hàng: {escape(qr["bank_name"])}<br>
Số tài khoản: <strong>{escape(qr["account_number"])}</strong> – {escape(qr["account_name"])}<br>
Nội dung chuyển khoản: <strong>{escape(qr["transfer_content"])}</strong></p>
<p><img src="{qr["qr_image_url"]}" alt="VietQR" width="220"></p>
<p>Hệ thống tự xác nhận sau khi nhận tiền. Xem lịch trả góp tại
<a href="{account_url()}">{account_url()}</a>.</p>
<p>TWings Academy</p>
"""
    send_logged(
        to=order.customer_email,
        subject=(
            f"{'Quá hạn' if overdue else 'Nhắc'} học phí kỳ {installment.sequence} – "
            f"{order.order_code} | TWings Academy"
        ),
        html=html,
        order=order,
        template_code="installment_reminder",
        name=order.customer_name,
    )


def remind_due_installments() -> dict:
    """Run daily. Idempotent within REMIND_EVERY_DAYS, so running it more often is harmless."""
    if not settings.VIETQR_ACCOUNT_NUMBER:
        return {"sent": 0, "overdueTasks": 0, "skipped": "VietQR chưa cấu hình"}
    now, today = timezone.now(), timezone.localdate()
    due = (
        Installment.objects.filter(
            paid_at__isnull=True,
            order__status="pending",
            order__installment_count__gt=1,
            due_date__lte=today + timedelta(days=REMIND_BEFORE_DAYS),
        )
        .exclude(order__customer_email="")
        .exclude(reminded_at__gt=now - timedelta(days=REMIND_EVERY_DAYS))
        .select_related("order")
        .order_by("order_id", "sequence")
    )
    sent = tasks = 0
    seen_orders = set()
    for installment in due:
        if installment.order_id in seen_orders:  # one e-mail per order (the earliest unpaid installment)
            continue
        seen_orders.add(installment.order_id)
        order = installment.order
        try:
            send_installment_email(installment)
        except ResendError:
            logger.warning("Installment reminder for %s could not be sent", order.order_code)
            continue
        installment.reminded_at = now
        installment.save(update_fields=["reminded_at", "updated_at"])
        sent += 1
        Activity.objects.create(
            order=order,
            type="email",
            title=f"Đã gửi email nhắc học phí kỳ {installment.sequence}",
            actor="Hệ thống thanh toán",
        )
        title = f"Học phí kỳ {installment.sequence} quá hạn – liên hệ học viên"
        if installment.due_date < today and not order.followup_tasks.filter(title=title).exists():
            FollowupTask.objects.create(order=order, title=title, due_date=today, priority="high")
            tasks += 1
    return {"sent": sent, "overdueTasks": tasks}


HOLD_REMIND_HOURS = 24


def hold_until(order) -> str:
    return timezone.localtime(order.hold_expires_at).strftime("%H:%M ngày %d/%m/%Y")


def payment_details_html(order) -> str:
    """Amount, account, memo and QR of an unpaid order, plus where to follow it (e-mails)."""
    from apps.lms.emails import account_url

    qr = vietqr_payload(order)
    return f"""
<p>Số tiền cần chuyển: <strong>{_vnd(qr["amount"])}</strong><br>
Ngân hàng: {escape(qr["bank_name"])}<br>
Số tài khoản: <strong>{escape(qr["account_number"])}</strong> – {escape(qr["account_name"])}<br>
Nội dung chuyển khoản: <strong>{escape(qr["transfer_content"])}</strong></p>
<p><img src="{qr["qr_image_url"]}" alt="VietQR" width="220"></p>
<p>Hệ thống tự xác nhận sau khi nhận tiền. Theo dõi đơn tại
<a href="{account_url()}">{account_url()}</a>.</p>
"""


def send_hold_email(order) -> None:
    """The checkout is still unpaid and its hold ends soon: the same QR, and when it ends."""
    until = hold_until(order)
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>TWings Academy đang giữ chỗ và học phí ưu đãi của bạn cho
<strong>{escape(order.course_title)}</strong> đến <strong>{until}</strong>.
Sau thời điểm này đơn chưa thanh toán sẽ tự hủy và chỗ được nhường cho học viên khác.</p>
{payment_details_html(order)}
<p>TWings Academy</p>
"""
    send_logged(
        to=order.customer_email,
        subject=f"Giữ chỗ đến {until} – {order.order_code} | TWings Academy",
        html=html,
        order=order,
        template_code="checkout_hold_reminder",
        name=order.customer_name,
    )


def remind_expiring_checkouts(now=None) -> int:
    """Once per checkout, when less than HOLD_REMIND_HOURS of its hold are left."""
    from apps.crm.models import Order

    if not settings.VIETQR_ACCOUNT_NUMBER:
        return 0
    now = now or timezone.now()
    due = (
        Order.objects.filter(
            status="pending",
            parent__isnull=True,
            total_paid_amount=0,
            hold_expires_at__gt=now,
            hold_expires_at__lte=now + timedelta(hours=HOLD_REMIND_HOURS),
        )
        .exclude(customer_email="")
        .exclude(emails__template_code="checkout_hold_reminder")
    )
    sent = 0
    for order in due:
        try:
            send_hold_email(order)
        except ResendError:
            logger.warning("Hold reminder for %s could not be sent", order.order_code)
            continue
        Activity.objects.create(
            order=order,
            type="email",
            title="Đã gửi email nhắc thanh toán trước khi hết giữ chỗ",
            actor="Hệ thống thanh toán",
        )
        sent += 1
    return sent
