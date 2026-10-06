"""
Journey step 4 – capture and consult.

- New website leads go to an admissions consultant at once: the same consultant as an earlier lead of
  this person (duplicate), else the active consultant with the fewest open leads. They get an e-mail and
  a follow-up task due by the response deadline (LEAD_RESPONSE_HOURS within 8:00-20:00).
- The first contact (call / Zalo / e-mail / meeting logged, or the pipeline moved on) stamps
  first_response_at; leads past their deadline without contact are listed on the dashboard.
- Appointments: confirmation e-mail to the lead, reminder ~2 hours before (remind_appointments).
"""

import logging
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import escape

from .models import Activity, Appointment, FollowupTask, Order

logger = logging.getLogger(__name__)

OPEN_STAGES = ("1. Mới", "2. Đã tiếp cận", "3. Đang tư vấn", "4. Hẹn gặp")
CONTACT_TYPES = ("call", "zalo", "email", "meeting")
WORK_START, WORK_END = time(8, 0), time(20, 0)


def response_deadline(created) -> datetime:
    """created + N hours, counting only 8:00-20:00 local time."""
    hours = timedelta(hours=settings.LEAD_RESPONSE_HOURS)
    t = timezone.localtime(created)
    tz = t.tzinfo
    while hours > timedelta(0):
        day_start = datetime.combine(t.date(), WORK_START, tz)
        day_end = datetime.combine(t.date(), WORK_END, tz)
        if t < day_start:
            t = day_start
        if t >= day_end:
            t = datetime.combine(t.date() + timedelta(days=1), WORK_START, tz)
            continue
        step = min(hours, day_end - t)
        t += step
        hours -= step
    return t


def consultants():
    from apps.accounts.models import User
    from apps.accounts.rbac import Role

    return User.objects.filter(is_active=True, is_staff=True, receives_leads=True, role=Role.SALES_CRM)


def pick_consultant(order: Order):
    previous = (
        order.find_duplicates()
        .filter(assigned_to__isnull=False, assigned_to__is_active=True)
        .order_by("-created_at")
    ).first()
    if previous is not None and previous.assigned_to.receives_leads:
        return previous.assigned_to
    return (
        consultants()
        .annotate(
            open_leads=Count(
                "assigned_orders",
                filter=Q(assigned_orders__crm_status__in=OPEN_STAGES, assigned_orders__status="pending"),
            )
        )
        .order_by("open_leads", "last_login")
        .first()
    )


def assign_new_lead(order: Order) -> None:
    """Called once for each new website lead (registration or checkout)."""
    order.response_due_at = response_deadline(order.created_at)
    fields = ["response_due_at", "updated_at"]
    consultant = None if order.assigned_to_id else pick_consultant(order)
    if consultant is not None:
        order.assigned_to = consultant
        order.pic = (consultant.name or consultant.email)[:100]
        fields += ["assigned_to", "pic"]
    order.save(update_fields=fields)
    if consultant is None:
        return
    due = timezone.localtime(order.response_due_at)
    FollowupTask.objects.create(
        order=order,
        title=f"Liên hệ lead mới trước {due:%H:%M %d/%m}",
        due_date=due.date(),
        priority="high",
        assigned_to=order.pic,
    )
    Activity.objects.create(
        order=order,
        type="note",
        title=f"Tự động phân công cho {order.pic}",
        content=f"Hạn phản hồi lần đầu: {due:%H:%M %d/%m/%Y}.",
        actor="Hệ thống tuyển sinh",
    )
    from django.db import transaction

    transaction.on_commit(lambda: _notify_consultant(order, consultant, due))


def _notify_consultant(order: Order, consultant, due) -> None:
    from apps.cms.seo import base_url
    from apps.notifications.resend import ResendError, send_email

    html = f"""
<p>Lead mới được giao cho bạn:</p>
<ul>
<li><strong>{escape(order.customer_name)}</strong> – {escape(order.customer_phone)}
 – {escape(order.customer_email)}</li>
<li>Quan tâm: {escape(order.course_title or order.interested_course)}</li>
<li>Nguồn: {escape(order.source)}</li>
<li>Hạn liên hệ lần đầu: <strong>{due:%H:%M %d/%m/%Y}</strong></li>
</ul>
<p><a href="{base_url()}/app/sales/crm">Mở CRM</a> (mã đơn {escape(order.order_code)}).</p>
"""
    try:
        send_email(
            to=consultant.email,
            subject=f"[TWings] Lead mới: {order.customer_name} – {order.course_title}"[:200],
            html=html,
            idempotency_key=f"lead-assigned-{order.pk}",
        )
    except ResendError:
        logger.warning("Lead assignment e-mail for %s not sent", order.order_code)


def mark_first_response(order: Order) -> None:
    if order.first_response_at is None:
        order.first_response_at = timezone.now()
        order.save(update_fields=["first_response_at", "updated_at"])


def overdue_leads():
    return Order.objects.filter(
        parent__isnull=True,
        status="pending",
        first_response_at__isnull=True,
        response_due_at__lt=timezone.now(),
    ).exclude(crm_status="7. Đã hủy")


# ---------------------------------------------------------------- appointments
def _appointment_html(appt: Appointment, intro: str) -> str:
    when = timezone.localtime(appt.starts_at)
    where = {
        "call": "TWings sẽ gọi cho bạn qua số điện thoại đã đăng ký.",
        "zalo": "TWings sẽ liên hệ qua Zalo theo số điện thoại đã đăng ký.",
        "online": f"Họp online: {escape(appt.location)}"
        if appt.location
        else "Link họp online sẽ được gửi trước giờ hẹn.",
        "office": f"Địa điểm: {escape(appt.location or 'Văn phòng TWings Academy')}",
    }[appt.channel]
    return f"""
<p>Chào {escape(appt.order.customer_name)},</p>
<p>{intro}</p>
<ul>
<li>Thời gian: <strong>{when:%H:%M ngày %d/%m/%Y}</strong> ({appt.duration_minutes} phút)</li>
<li>Hình thức: {appt.get_channel_display()} – {where}</li>
<li>Nội dung: tư vấn {escape(appt.order.course_title or appt.order.interested_course or "khóa học")}</li>
</ul>
<p>Cần đổi lịch, vui lòng trả lời email này.</p>
<p>TWings Academy</p>
"""


def send_appointment_confirmation(appt: Appointment) -> None:
    from apps.notifications.outbox import send_logged
    from apps.notifications.resend import ResendError

    if not appt.order.customer_email:
        return
    try:
        send_logged(
            to=appt.order.customer_email,
            subject="Xác nhận lịch tư vấn | TWings Academy",
            html=_appointment_html(appt, "TWings Academy xác nhận lịch tư vấn với bạn:"),
            order=appt.order,
            template_code="appointment_confirmation",
            name=appt.order.customer_name,
        )
    except ResendError:
        logger.warning("Appointment confirmation for %s not sent", appt.order.order_code)


def remind_appointments(now=None) -> int:
    """Reminder ~2 hours before planned appointments (learner and consultant). Run hourly."""
    from apps.notifications.outbox import send_logged
    from apps.notifications.resend import ResendError, send_email

    now = now or timezone.now()
    due = Appointment.objects.filter(
        status="planned", reminded_at__isnull=True, starts_at__gt=now, starts_at__lte=now + timedelta(hours=3)
    ).select_related("order", "staff")
    sent = 0
    for appt in due:
        try:
            if appt.order.customer_email:
                send_logged(
                    to=appt.order.customer_email,
                    subject="Nhắc lịch tư vấn hôm nay | TWings Academy",
                    html=_appointment_html(appt, "Nhắc bạn lịch tư vấn sắp tới với TWings Academy:"),
                    order=appt.order,
                    template_code="appointment_reminder",
                    name=appt.order.customer_name,
                )
            if appt.staff and appt.staff.email:
                when = timezone.localtime(appt.starts_at)
                send_email(
                    to=appt.staff.email,
                    subject=f"[TWings] {when:%H:%M} hẹn tư vấn {appt.order.customer_name}"[:200],
                    html=f"<p>{escape(appt.order.customer_name)} – {escape(appt.order.customer_phone)} – "
                    f"{appt.get_channel_display()} lúc {when:%H:%M %d/%m}.</p>",
                    idempotency_key=f"appt-remind-staff-{appt.pk}",
                )
        except ResendError:
            logger.warning("Appointment reminder %s not sent", appt.pk)
            continue
        appt.reminded_at = now
        appt.save(update_fields=["reminded_at", "updated_at"])
        sent += 1
    return sent
