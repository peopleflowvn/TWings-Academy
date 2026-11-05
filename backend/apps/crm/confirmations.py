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
    context = {
        "customer_name": escape(order.customer_name),
        "course_title": escape(order.course_title),
        "order_code": escape(order.order_code),
        "customer_phone": escape(order.customer_phone),
    }
    if order.hold_expires_at and payment_instructions(order):
        code = "checkout_received"
        context.update(
            cohort=f" – lớp <strong>{escape(order.cohort.name)}</strong>" if order.cohort_id else "",
            hold_until=hold_until(order),
            plan=(
                f"<p>Bạn chọn trả góp <strong>{order.installment_count} kỳ</strong>: chuyển khoản kỳ đầu "
                "theo thông tin dưới đây để vào học ngay.</p>"
                if order.installment_count > 1
                else ""
            ),
            payment_details=payment_details_html(order),
        )
    else:
        code = "consultation_received"
    subject, html = render_template(code, context)
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
