"""
SLA of client requests. The deadline is the received time plus the priority's working hours
(settings.CORPORATE_REQUEST_SLA_HOURS), counted Monday–Friday inside CORPORATE_WORK_HOURS, Vietnam time.
Public holidays are not known: move a deadline by hand (edit due_at) when one falls inside it.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from .models import TrainingRequest

VN = ZoneInfo("Asia/Ho_Chi_Minh")
DUE_SOON_HOURS = 4  # working hours left before a request shows as "due soon"


def _window(day: datetime) -> tuple[datetime, datetime]:
    start, end = settings.CORPORATE_WORK_HOURS
    base = day.replace(minute=0, second=0, microsecond=0)
    return base.replace(hour=start), base.replace(hour=end)


def _next_work_start(local: datetime) -> datetime:
    """The given moment if it is inside working hours, else the start of the next working period."""
    while True:
        opens, closes = _window(local)
        if local.weekday() < 5 and local < closes:
            return max(local, opens)
        local = _window(local + timedelta(days=1))[0]


def add_working_hours(start: datetime, hours: float) -> datetime:
    left = timedelta(hours=hours)
    local = _next_work_start(start.astimezone(VN))
    while True:
        closes = _window(local)[1]
        if local + left <= closes:
            return local + left
        left -= closes - local
        local = _next_work_start(closes + timedelta(minutes=1))


def working_hours_between(start: datetime, end: datetime) -> float:
    """Working hours from start to end (negative when end is before start)."""
    if end < start:
        return -working_hours_between(end, start)
    total = timedelta()
    local, end = _next_work_start(start.astimezone(VN)), end.astimezone(VN)
    while local < end:
        closes = _window(local)[1]
        total += min(closes, end) - local
        local = _next_work_start(closes + timedelta(minutes=1))
    return total.total_seconds() / 3600


def due_at(received_at: datetime, priority: str) -> datetime:
    return add_working_hours(received_at, settings.CORPORATE_REQUEST_SLA_HOURS[priority])


def sla_state(req: TrainingRequest, now: datetime | None = None) -> str:
    """met / missed (resolved), cancelled, overdue / due_soon / on_track (open)."""
    if req.status == "cancelled":
        return "cancelled"
    if req.status == "done":
        return "met" if req.resolved_at and req.resolved_at <= req.due_at else "missed"
    now = now or timezone.now()
    if now > req.due_at:
        return "overdue"
    return "due_soon" if working_hours_between(now, req.due_at) <= DUE_SOON_HOURS else "on_track"


def summary(requests) -> dict:
    """Open / overdue counts and the share of the last 90 days' resolved requests done in time."""
    now = timezone.now()
    open_ = requests.filter(status__in=TrainingRequest.OPEN)
    resolved = requests.filter(status="done", resolved_at__gte=now - timedelta(days=90))
    total = resolved.count()
    met = resolved.filter(resolved_at__lte=F("due_at")).count()
    return {
        "open": open_.count(),
        "overdue": open_.filter(due_at__lt=now).count(),
        "resolved_90d": total,
        "on_time_rate": round(met * 100 / total, 1) if total else None,
    }


def attention(requests, now: datetime | None = None):
    """Open requests overdue or due within DUE_SOON_HOURS working hours, most urgent first."""
    now = now or timezone.now()
    horizon = add_working_hours(now, DUE_SOON_HOURS)
    return (
        requests.filter(status__in=TrainingRequest.OPEN)
        .filter(due_at__lte=horizon)
        .select_related("client", "owner")
        .order_by("due_at")
    )


def _handlers() -> list[str]:
    from apps.accounts.models import User
    from apps.accounts.rbac import has_perm_code

    staff = User.objects.filter(is_staff=True, is_active=True)
    return [u.email for u in staff if has_perm_code(u, "corporate.classes")]


def remind_owners(now: datetime | None = None) -> int:
    """
    One e-mail per owner listing their requests overdue or due soon (weekdays, run each morning).
    Requests nobody owns go to CORPORATE_CONTACT_EMAIL, or when it is empty to every active staff member
    who may handle requests (corporate.classes). Returns the number of e-mails sent.
    """
    import logging
    from collections import defaultdict

    from django.utils.html import escape

    from apps.notifications.resend import ResendError, send_email

    now = now or timezone.now()
    if now.astimezone(VN).weekday() >= 5:
        return 0
    groups = defaultdict(list)
    unowned = None
    for req in attention(TrainingRequest.objects.all(), now):
        if req.owner_id:
            recipients = [req.owner.email]
        else:
            if unowned is None:
                contact = settings.CORPORATE_CONTACT_EMAIL
                unowned = [contact] if contact else _handlers()
            recipients = unowned
        for to in recipients:
            if to:
                groups[to].append(req)
    sent = 0
    for to, reqs in groups.items():
        rows = "".join(
            f"<li><strong>{'QUÁ HẠN' if r.due_at < now else 'Sắp đến hạn'}</strong> "
            f"{timezone.localtime(r.due_at):%H:%M %d/%m} – {escape(r.client.code)}: {escape(r.title)}"
            f" ({r.get_priority_display()})</li>"
            for r in reqs
        )
        try:
            send_email(
                to=to,
                subject=f"{len(reqs)} yêu cầu khách hàng cần xử lý theo SLA",
                html=f"<p>Các yêu cầu đào tạo quá hạn hoặc sắp đến hạn SLA:</p><ul>{rows}</ul>"
                "<p>Cập nhật trạng thái trong mục Đào tạo doanh nghiệp → Yêu cầu.</p>",
                idempotency_key=f"corp-request-remind-{to}-{now.astimezone(VN):%Y%m%d}",
                brand="corporate",
            )
        except ResendError:
            logging.getLogger(__name__).warning("Request reminder to %s not sent", to)
            continue
        sent += 1
    return sent
