"""The TWings e-mail that tells a learner their course is open and how to sign in (SSO or password)."""

from django.conf import settings
from django.utils.html import escape

from apps.notifications.outbox import send_logged


def learn_url() -> str:
    host = settings.MOODLE_HOST or "tuyensinh.twings.edu.vn"
    return f"https://{host}/learn/"


def send_access_email(order, *, sent_by=None):
    url = learn_url()
    course = escape(order.course.title if order.course else order.course_title)
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Khóa học <strong>{course}</strong> của bạn đã được mở trên hệ thống học trực tuyến TWings LMS.</p>
<p><strong>Cách vào học:</strong></p>
<ol>
  <li>Mở <a href="{url}">{url}</a></li>
  <li>Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>
  <li>Nhập email <strong>{escape(order.customer_email)}</strong> và mã 6 chữ số được gửi tới email này</li>
</ol>
<p>Bạn cũng có thể đăng nhập bằng mật khẩu trong email “Tài khoản thành viên mới” của hệ thống học.</p>
<p>Mã đơn hàng: {escape(order.order_code)}. Cần hỗ trợ, vui lòng trả lời email này.</p>
<p>TWings Academy</p>
"""
    return send_logged(
        to=order.customer_email,
        subject="Khóa học của bạn đã sẵn sàng – vào học ngay | TWings Academy",
        html=html,
        order=order,
        sent_by=sent_by,
        template_code="lms_access",
        name=order.customer_name,
    )
