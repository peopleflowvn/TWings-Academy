"""TWings e-mails around learning: course open (how to sign in) and course completed (certificate)."""

from django.conf import settings
from django.utils.html import escape

from apps.notifications.outbox import send_logged


def site_url() -> str:
    return f"https://{settings.MOODLE_HOST or 'tuyensinh.twings.edu.vn'}"


def learn_url() -> str:
    return f"{site_url()}/learn/"


def _intake_block(order) -> str:
    """Start date, schedule and first sessions of the learner's intake (empty for self-paced courses)."""
    from django.utils import timezone

    cohort = order.cohort
    if cohort is None:
        return ""
    lines = []
    if cohort.start_date:
        lines.append(f"Khai giảng: <strong>{cohort.start_date:%d/%m/%Y}</strong>")
    if cohort.schedule_text:
        lines.append(f"Lịch học: {escape(cohort.schedule_text)}")
    if cohort.location:
        lines.append(f"Địa điểm: {escape(cohort.location)}")
    sessions = cohort.sessions.filter(starts_at__gte=timezone.now())[:3]
    for s in sessions:
        lines.append(f"{timezone.localtime(s.starts_at):%H:%M %d/%m} – {escape(s.title or 'Buổi học')}")
    if not lines:
        return ""
    return "<p><strong>Thông tin lớp " + escape(cohort.name) + ":</strong><br>" + "<br>".join(lines) + "</p>"


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
{_intake_block(order)}
<p><strong>Hoàn thiện hồ sơ nhập học</strong> (CCCD, học vấn, CV) và xem lịch học phí tại
<a href="{site_url()}/tai-khoan">Tài khoản học viên</a>.</p>
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
