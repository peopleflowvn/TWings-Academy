"""
The e-mail a visitor gets right after the website form: payment details for a checkout (so closing the
QR screen loses nothing), or what happens next for a consultation request.
"""

import logging

from django.utils.html import escape

from apps.notifications.outbox import send_logged
from apps.notifications.resend import ResendError

from .models import Order

logger = logging.getLogger(__name__)


def send_order_received(order_id) -> None:
    from apps.payments.billing import payment_instructions
    from apps.payments.reminders import hold_until, payment_details_html

    order = Order.objects.filter(pk=order_id).first()
    if order is None or not order.customer_email or order.status != "pending":
        return  # free courses get the enrolment e-mail instead
    name = escape(order.customer_name)
    title = escape(order.course_title)
    if order.hold_expires_at and payment_instructions(order):
        cohort = f" – lớp <strong>{escape(order.cohort.name)}</strong>" if order.cohort_id else ""
        plan = (
            f"<p>Bạn chọn trả góp {order.installment_count} kỳ: chuyển kỳ đầu để vào học ngay.</p>"
            if order.installment_count > 1
            else ""
        )
        subject = f"Thông tin chuyển khoản {order.order_code} – {order.course_title} | TWings Academy"
        html = f"""
<p>Chào {name},</p>
<p>TWings Academy đã nhận đăng ký <strong>{title}</strong>{cohort}.
Chỗ học và học phí được giữ đến <strong>{hold_until(order)}</strong>.</p>
{plan}
{payment_details_html(order)}
<p>Cần hỗ trợ? Trả lời email này hoặc gọi tư vấn viên của TWings.</p>
<p>TWings Academy</p>
"""
        code = "checkout_received"
    else:
        subject = f"TWings đã nhận đăng ký tư vấn {order.course_title}"
        html = f"""
<p>Chào {name},</p>
<p>TWings Academy đã nhận đăng ký tư vấn khóa <strong>{title}</strong>.
Tư vấn viên sẽ gọi cho bạn qua số {escape(order.customer_phone)} trong giờ làm việc
để giới thiệu lịch khai giảng, học phí và hình thức trả góp.</p>
<p>TWings Academy</p>
"""
        code = "consultation_received"
    try:
        send_logged(
            to=order.customer_email,
            subject=subject,
            html=html,
            order=order,
            template_code=code,
            name=order.customer_name,
        )
    except ResendError:
        logger.warning("Order confirmation for %s could not be sent", order.order_code)
