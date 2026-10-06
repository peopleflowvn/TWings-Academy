"""TWings e-mails around learning: course open (how to sign in) and course completed (certificate)."""

from django.conf import settings
from django.utils.html import escape

from apps.notifications.outbox import send_logged


def site_url() -> str:
    return f"https://{settings.MOODLE_HOST or 'tuyensinh.twings.edu.vn'}"


def learn_url() -> str:
    return f"{site_url()}/learn/"


def send_access_email(order, *, sent_by=None):
    url = learn_url()
    course = escape(order.course.title if order.course else order.course_title)
    intake = f" – {escape(order.cohort.name)}" if order.cohort_id else ""
    html = f"""
<p>Chào {escape(order.customer_name)},</p>
<p>Khóa học <strong>{course}{intake}</strong> của bạn đã được mở trên hệ thống học trực tuyến TWings LMS.</p>
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


def send_certificate_email(order, certificate):
    from .completion import certificate_url

    url = certificate_url(certificate.code)
    html = f"""
<p>Chúc mừng {escape(order.customer_name)}!</p>
<p>Bạn đã hoàn thành khóa học <strong>{escape(certificate.course_title)}</strong>
{f"({escape(certificate.cohort_name)})" if certificate.cohort_name else ""}.</p>
<p>Chứng chỉ của bạn: mã <strong>{escape(certificate.code)}</strong>.<br>
Trang xác minh (có thể gửi cho nhà tuyển dụng): <a href="{url}">{url}</a></p>
<p>Bản PDF chứng chỉ (nếu khóa học có cấp) tải trong khóa học trên <a href="{learn_url()}">TWings LMS</a>.</p>
<p>TWings Academy</p>
"""
    return send_logged(
        to=order.customer_email,
        subject=f"Chúc mừng bạn hoàn thành khóa học – chứng chỉ {certificate.code} | TWings Academy",
        html=html,
        order=order,
        template_code="lms_certificate",
        name=order.customer_name,
    )
