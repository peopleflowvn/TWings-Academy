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
    from apps.notifications.engine import render_template
    from apps.payments.billing import payment_instructions
    from apps.payments.reminders import hold_until, payment_details_html

    order = Order.objects.filter(pk=order_id).first()
    if order is None or not order.customer_email or order.status != "pending":
        return  # free courses get the enrolment e-mail instead
    name = escape(order.customer_name)
    title = escape(order.course_title)
    if order.hold_expires_at and payment_instructions(order):
        cohort_str = f" – lớp <strong>{escape(order.cohort.name)}</strong>" if order.cohort_id else ""
        plan_str = (
            f"<p>Bạn chọn trả góp {order.installment_count} kỳ: chuyển kỳ đầu để vào học ngay.</p>"
            if order.installment_count > 1
            else ""
        )
        code = "checkout_received"
        default_subject = f"Thông tin chuyển khoản {order.order_code} – {order.course_title} | TWings Academy"
        default_body = f"""
<div style="font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;">THÔNG TIN THANH TOÁN ĐĂNG KÝ HỌC</div>
<div style="font-size: 13px; color: #64748B; margin-bottom: 22px;">Xác nhận tiếp nhận hồ sơ đăng ký khóa học</div>
<p>Chào <strong>{{customer_name}}</strong>,</p>
<p>TWings Academy đã nhận đăng ký <strong>{{course_title}}</strong>{{cohort}}.
Chỗ học và học phí được giữ đến <strong>{{hold_until}}</strong>.</p>
{{plan}}
{{payment_details}}
<p>Cần hỗ trợ? Trả lời email này hoặc gọi tư vấn viên của TWings.</p>
"""
        context = {
            "customer_name": name,
            "course_title": title,
            "order_code": order.order_code,
            "cohort": cohort_str,
            "hold_until": hold_until(order),
            "plan": plan_str,
            "payment_details": payment_details_html(order),
        }
        subject, html = render_template(code, context, default_subject=default_subject, default_body=default_body)
    else:
        code = "consultation_received"
        default_subject = f"TWings đã nhận đăng ký tư vấn {order.course_title}"
        default_body = f"""
<div style="font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;">XÁC NHẬN ĐĂNG KÝ TƯ VẤN</div>
<div style="font-size: 13px; color: #64748B; margin-bottom: 22px;">Chuyên viên TWings sẽ liên hệ hỗ trợ bạn trong giờ làm việc</div>
<p>Chào <strong>{{customer_name}}</strong>,</p>
<p>TWings Academy đã nhận đăng ký tư vấn khóa học <strong>{{course_title}}</strong>.</p>
<p>Tư vấn viên sẽ gọi cho bạn qua số <strong>{{customer_phone}}</strong> trong giờ làm việc để giới thiệu chi tiết lịch khai giảng, học phí và các hình thức hỗ trợ tài chính.</p>
<p>Cần hỗ trợ ngay, vui lòng liên hệ hotline <strong>1900 633 898</strong> hoặc phản hồi email này.</p>
"""
        context = {
            "customer_name": name,
            "course_title": title,
            "customer_phone": escape(order.customer_phone),
        }
        subject, html = render_template(code, context, default_subject=default_subject, default_body=default_body)

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
