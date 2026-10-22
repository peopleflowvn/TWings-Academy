"""
Journey step 4 – capture and consult.

- New website leads go to an admissions consultant at once: the same consultant as an earlier lead of
  this person (duplicate), else the active consultant with the fewest open leads. They get an e-mail and
  a follow-up task due by the response deadline (LEAD_RESPONSE_HOURS within 8:00-20:00).
- The first contact (call / Zalo / e-mail / meeting logged, or the pipeline moved on) stamps
  first_response_at. A lead past its deadline without contact: the consultant is reminded once; past
  twice the commitment, the lead managers get a digest (alert_overdue_leads, every 30 minutes).
- No consultant takes new leads (all on leave): the lead managers get a "Phân công" task and an e-mail.
- Reassigning a lead moves its open tasks, the learner and a fresh deadline to the new consultant.
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
    # The consultant who already looks after this learner keeps them.
    learner = order.learner
    if learner is not None and learner.owner_id:
        owner = learner.owner
        if owner.is_active and owner.receives_leads:
            return owner
    previous = (
        Order.objects.filter(
            learner_id=order.learner_id, assigned_to__isnull=False, assigned_to__is_active=True
        )
        .exclude(pk=order.pk)
        .order_by("-created_at")
        .first()
        if order.learner_id
        else None
    )
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


def lead_managers():
    """Who is alerted about unassigned and unanswered leads: the lead managers, else the super admins."""
    from apps.accounts.models import User
    from apps.accounts.rbac import Role

    staff = User.objects.filter(is_active=True, is_staff=True)
    managers = staff.filter(lead_manager=True)
    return managers if managers.exists() else staff.filter(role=Role.SUPER_ADMIN)


NEW_LEAD_TASK = "Liên hệ lead mới"


def is_lead_manager(user) -> bool:
    from apps.accounts.rbac import Role

    return bool(getattr(user, "lead_manager", False) or getattr(user, "role", "") == Role.SUPER_ADMIN)


def my_tasks(user):
    """Open follow-up tasks of a staff member; the lead managers also get the tasks nobody owns."""
    mine = Q(owner=user)
    if is_lead_manager(user):
        mine |= Q(owner__isnull=True)
    return FollowupTask.objects.filter(mine, is_completed=False)


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
    if order.learner_id and not order.learner.owner_id and order.assigned_to_id:
        order.learner.owner_id = order.assigned_to_id
        order.learner.save(update_fields=["owner", "updated_at"])
    due = timezone.localtime(order.response_due_at)
    from django.db import transaction

    if not order.assigned_to_id:
        # Nobody takes new leads (everyone on leave): the managers assign it by hand.
        FollowupTask.objects.create(
            order=order,
            title=f"Phân công lead mới (chưa có tư vấn viên nhận lead) trước {due:%H:%M %d/%m}",
            due_date=due.date(),
            priority="high",
        )
        Activity.objects.create(
            order=order,
            type="note",
            title="Chưa có tư vấn viên nhận lead: chờ quản lý phân công",
            actor="Hệ thống tuyển sinh",
        )
        transaction.on_commit(lambda: _notify_managers_unassigned(order))
        return
    if consultant is None:
        return
    # The same person registering again (another course): one contact task is enough.
    already = FollowupTask.objects.filter(
        order__learner_id=order.learner_id,
        order__assigned_to=consultant,
        is_completed=False,
        title__startswith=NEW_LEAD_TASK,
    ).exclude(order=order)
    if order.learner_id and already.exists():
        Activity.objects.create(
            order=order,
            type="note",
            title=f"Tự động phân công cho {order.pic} (cùng học viên với đăng ký đang chờ liên hệ)",
            actor="Hệ thống tuyển sinh",
        )
    else:
        FollowupTask.objects.create(
            order=order,
            title=f"{NEW_LEAD_TASK} trước {due:%H:%M %d/%m}",
            due_date=due.date(),
            priority="high",
        )
        Activity.objects.create(
            order=order,
            type="note",
            title=f"Tự động phân công cho {order.pic}",
            content=f"Hạn phản hồi lần đầu: {due:%H:%M %d/%m/%Y}.",
            actor="Hệ thống tuyển sinh",
        )
    transaction.on_commit(lambda: _notify_consultant(order, consultant, due))


def reassign(order: Order, user, actor=None) -> None:
    """
    Give a lead to another consultant (or to nobody): open tasks follow, the learner follows (their next
    registrations go to the new consultant), an unanswered lead gets a fresh deadline, and the new
    consultant is told (unless they did it themselves).
    """
    previous = order.assigned_to
    if previous == user:
        return
    order.assigned_to = user
    order.pic = (user.name or user.email)[:100] if user else ""
    fields = ["assigned_to", "pic", "updated_at"]
    if user and order.first_response_at is None and order.status == "pending":
        order.response_due_at = response_deadline(timezone.now())
        order.overdue_alerted_at = order.escalated_at = None
        fields += ["response_due_at", "overdue_alerted_at", "escalated_at"]
    order.save(update_fields=fields)
    for task in order.followup_tasks.filter(is_completed=False):
        task.owner = user
        task.assigned_to = ""
        task.save(update_fields=["owner", "assigned_to", "updated_at"])
    if user and order.learner_id and order.learner.owner_id in (None, getattr(previous, "pk", None)):
        order.learner.owner = user
        order.learner.save(update_fields=["owner", "updated_at"])
    who = (actor.name or actor.email) if actor else "Hệ thống tuyển sinh"
    Activity.objects.create(
        order=order,
        type="note",
        title=f"Chuyển phụ trách: {previous.name if previous else 'chưa có'} → {order.pic or 'chưa có'}",
        actor=who,
        actor_user=actor,
    )
    if user and user != actor:
        from django.db import transaction

        due = timezone.localtime(order.response_due_at) if order.response_due_at else None
        transaction.on_commit(lambda: _notify_consultant(order, user, due, handed_over=True))


def _notify_consultant(order: Order, consultant, due, handed_over: bool = False) -> None:
    from apps.cms.seo import base_url
    from apps.notifications.resend import ResendError, send_email

    deadline = f"<li>Hạn liên hệ lần đầu: <strong>{due:%H:%M %d/%m/%Y}</strong></li>" if due else ""
    html = f"""
<p>{"Lead được chuyển cho bạn" if handed_over else "Lead mới được giao cho bạn"}:</p>
<ul>
<li><strong>{escape(order.customer_name)}</strong> – {escape(order.customer_phone)}
 – {escape(order.customer_email)}</li>
<li>Quan tâm: {escape(order.course_title or order.interested_course)}</li>
<li>Nguồn: {escape(order.source)}</li>
{deadline}
</ul>
<p><a href="{base_url()}/app/sales/crm">Mở CRM</a> (mã đơn {escape(order.order_code)}).</p>
"""
    try:
        send_email(
            to=consultant.email,
            subject=(
                f"[TWings] {'Chuyển lead' if handed_over else 'Lead mới'}: "
                f"{order.customer_name} – {order.course_title}"
            )[:200],
            html=html,
            idempotency_key=f"lead-assigned-{order.pk}-{consultant.pk}",
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


def _send(to: list[str], subject: str, html: str, key: str) -> None:
    from apps.notifications.resend import ResendError, send_email

    for email in to:
        try:
            send_email(to=email, subject=subject[:200], html=html, idempotency_key=f"{key}-{email}")
        except ResendError:
            logger.warning("Lead alert %s to %s not sent", key, email)


def _lead_rows(orders) -> str:
    return "".join(
        f"<li><strong>{escape(o.customer_name)}</strong> – {escape(o.customer_phone)} – "
        f"{escape(o.course_title or o.interested_course)} ({escape(o.order_code)}"
        f"{', ' + escape(o.pic) if o.pic else ''})</li>"
        for o in orders
    )


def _notify_managers_unassigned(order: Order) -> None:
    from apps.cms.seo import base_url

    emails = list(lead_managers().values_list("email", flat=True))
    html = f"""
<p>Lead mới chưa có tư vấn viên nhận (mọi tư vấn viên đang tắt nhận lead):</p>
<ul>{_lead_rows([order])}</ul>
<p><a href="{base_url()}/app/sales/consulting">Phân công trong CRM</a></p>
"""
    _send(emails, f"[TWings] Lead chưa có người nhận: {order.customer_name}", html, f"unassigned-{order.pk}")


def alert_overdue_leads(now=None) -> dict:
    """
    Every 30 minutes in working hours: each consultant is reminded once about a lead past its first
    response deadline; leads past twice the commitment (and unassigned leads) go to the lead managers
    in one digest.
    """
    from apps.cms.seo import base_url

    now = now or timezone.now()
    local = timezone.localtime(now).time()
    if not (WORK_START <= local < WORK_END):
        return {"reminded": 0, "escalated": 0, "skipped": "ngoài giờ làm việc"}
    reminded = 0
    by_consultant: dict = {}
    for order in (
        overdue_leads()
        .filter(overdue_alerted_at__isnull=True, assigned_to__isnull=False)
        .select_related("assigned_to")
    ):
        by_consultant.setdefault(order.assigned_to, []).append(order)
    for consultant, orders in by_consultant.items():
        html = f"""
<p>Các lead dưới đây đã quá hạn liên hệ lần đầu ({settings.LEAD_RESPONSE_HOURS} giờ làm việc):</p>
<ul>{_lead_rows(orders)}</ul>
<p><a href="{base_url()}/app/sales/today">Mở danh sách hôm nay</a></p>
"""
        _send(
            [consultant.email],
            f"[TWings] {len(orders)} lead quá hạn liên hệ",
            html,
            f"overdue-{now:%Y%m%d%H%M}",
        )
        for o in orders:
            Activity.objects.create(
                order=o,
                type="note",
                title="Nhắc tư vấn viên: quá hạn liên hệ lần đầu",
                actor="Hệ thống tuyển sinh",
            )
        Order.objects.filter(pk__in=[o.pk for o in orders]).update(overdue_alerted_at=now)
        reminded += len(orders)

    late = list(
        overdue_leads()
        .filter(
            escalated_at__isnull=True, response_due_at__lt=now - timedelta(hours=settings.LEAD_RESPONSE_HOURS)
        )
        .order_by("response_due_at")
    )
    unassigned = list(
        Order.objects.filter(
            parent__isnull=True,
            status="pending",
            assigned_to__isnull=True,
            crm_status__in=OPEN_STAGES,
            escalated_at__isnull=True,
        ).order_by("created_at")
    )
    escalated = late + [o for o in unassigned if o not in late]
    if escalated:
        emails = list(lead_managers().values_list("email", flat=True))
        hours = settings.LEAD_RESPONSE_HOURS
        late_html = (
            f"<p><strong>Quá hạn liên hệ lâu</strong> (gấp đôi cam kết {hours} giờ):</p>"
            f"<ul>{_lead_rows(late)}</ul>"
            if late
            else ""
        )
        unassigned_html = (
            f"<p><strong>Chưa có tư vấn viên</strong>:</p><ul>{_lead_rows(unassigned)}</ul>"
            if unassigned
            else ""
        )
        html = f"""
<p>Lead cần quản lý xử lý:</p>
{late_html}
{unassigned_html}
<p><a href="{base_url()}/app/sales/consulting">Mở CRM để phân công / nhắc tư vấn viên</a></p>
"""
        _send(emails, f"[TWings] {len(escalated)} lead cần quản lý xử lý", html, f"escalate-{now:%Y%m%d%H%M}")
        for o in escalated:
            Activity.objects.create(
                order=o,
                type="note",
                title="Báo quản lý tuyển sinh: lead chưa được xử lý",
                actor="Hệ thống tuyển sinh",
            )
        Order.objects.filter(pk__in=[o.pk for o in escalated]).update(escalated_at=now)
    return {"reminded": reminded, "escalated": len(escalated)}


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
    from apps.notifications.engine import render_template
    from apps.notifications.outbox import send_logged
    from apps.notifications.resend import ResendError

    if not appt.order.customer_email:
        return
    when = timezone.localtime(appt.starts_at)
    default_html = _appointment_html(appt, "TWings Academy xác nhận lịch tư vấn với bạn:")
    subject, html = render_template(
        "appointment_confirmation",
        context={
            "customer_name": escape(appt.order.customer_name),
            "starts_at": f"{when:%H:%M ngày %d/%m/%Y}",
            "duration": str(appt.duration_minutes),
            "channel": appt.get_channel_display(),
            "course": escape(appt.order.course_title or appt.order.interested_course or "khóa học"),
        },
        default_subject="Xác nhận lịch tư vấn | TWings Academy",
        default_body=default_html,
    )
    try:
        send_logged(
            to=appt.order.customer_email,
            subject=subject,
            html=html,
            order=appt.order,
            template_code="appointment_confirmation",
            name=appt.order.customer_name,
        )
    except ResendError:
        logger.warning("Appointment confirmation for %s not sent", appt.order.order_code)


def remind_appointments(now=None) -> int:
    """Reminder ~2 hours before planned appointments (learner and consultant). Run hourly."""
    from apps.notifications.engine import render_template
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
                when = timezone.localtime(appt.starts_at)
                default_html = _appointment_html(appt, "Nhắc bạn lịch tư vấn sắp tới với TWings Academy:")
                subject, html = render_template(
                    "appointment_reminder",
                    context={
                        "customer_name": escape(appt.order.customer_name),
                        "starts_at": f"{when:%H:%M ngày %d/%m/%Y}",
                        "duration": str(appt.duration_minutes),
                        "channel": appt.get_channel_display(),
                        "course": escape(
                            appt.order.course_title or appt.order.interested_course or "khóa học"
                        ),
                    },
                    default_subject="Nhắc lịch tư vấn hôm nay | TWings Academy",
                    default_body=default_html,
                )
                send_logged(
                    to=appt.order.customer_email,
                    subject=subject,
                    html=html,
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
