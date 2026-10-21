"""
E-mails of corporate classes. One message per learner: To = the learner, CC = their line manager on
the day of sending (+ the employee's extra CC + the client's default CC), filtered by the recipient
policy (only the client's e-mail domains or our own), so no learner's details reach someone else.
"""

from datetime import UTC

from django.conf import settings
from django.utils import timezone
from django.utils.html import escape

from apps.lms.emails import learn_url
from apps.notifications.outbox import send_logged
from apps.notifications.resend import ResendError

from .services import employment_on


# ---------------------------------------------------------------- recipient policy
def _domain(email: str) -> str:
    return email.rsplit("@", 1)[-1].lower() if "@" in email else ""


def internal_domains() -> set[str]:
    from_domain = _domain(settings.RESEND_FROM_EMAIL.strip(" >").rsplit("<", 1)[-1])
    return {d.lower().lstrip("@") for d in settings.CORPORATE_INTERNAL_EMAIL_DOMAINS} | (
        {from_domain} if from_domain else set()
    )


def cc_policy(client, emails) -> tuple[list[str], list[str]]:
    """(allowed, rejected): a CC must be at one of the client's domains or ours."""
    allowed_domains = {d.lower() for d in client.email_domains} | internal_domains()
    allowed, rejected = [], []
    for email in dict.fromkeys(e.strip().lower() for e in emails if e and e.strip()):
        (allowed if _domain(email) in allowed_domains else rejected).append(email)
    return allowed, rejected


def recipients(listing, day=None) -> dict:
    """{"to", "cc", "rejected"} for one learner of a class, as of `day` (today)."""
    day = day or timezone.localdate()
    client = listing.corporate_class.client
    to = listing.learner.email.strip().lower()
    employee = employment_on(client, listing.learner, day) or listing.employee
    wanted = [employee.manager_email, *employee.extra_cc, *client.default_cc]
    allowed, rejected = cc_policy(client, wanted)
    return {"to": to, "cc": [e for e in allowed if e != to], "rejected": rejected}


# ---------------------------------------------------------------- calendar (.ics)
def _ics_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line: str) -> str:
    """RFC 5545: lines of at most 75 octets, continued with CRLF + space."""
    out, current = [], b""
    for ch in line:
        encoded = ch.encode()
        if len(current) + len(encoded) > (75 if not out else 74):
            out.append(current.decode())
            current = b""
        current += encoded
    out.append(current.decode())
    return "\r\n ".join(out)


def class_calendar(corporate_class) -> bytes:
    """Every session of the class as calendar events (Outlook, Google, phones import it)."""
    cohort = corporate_class.cohort
    stamp = timezone.now().astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWings Academy//Corporate training//VI",
        "METHOD:PUBLISH",
    ]
    for session in cohort.sessions.order_by("starts_at"):
        location = (
            "Online" if session.online and not session.location else session.location or cohort.location
        )
        lines += [
            "BEGIN:VEVENT",
            f"UID:session-{session.pk}@twings",
            f"DTSTAMP:{stamp}",
            f"DTSTART:{session.starts_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
            f"DTEND:{session.ends_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
            f"SUMMARY:{_ics_text(f'{cohort.course.title} – {session.title or cohort.name}')}",
            *([f"LOCATION:{_ics_text(location)}"] if location else []),
            f"DESCRIPTION:{_ics_text(f'Lớp {cohort.name}. Vào học: {learn_url()}')}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return ("\r\n".join(_fold(line) for line in lines) + "\r\n").encode()


# ---------------------------------------------------------------- invitation
def invitation_html(listing) -> str:
    cohort = listing.corporate_class.cohort
    sessions = list(cohort.sessions.order_by("starts_at"))
    rows = "".join(
        f"<li>{timezone.localtime(s.starts_at):%H:%M %d/%m/%Y} – {timezone.localtime(s.ends_at):%H:%M}"
        f" · {escape(s.title or 'Buổi học')}{' · ' + escape(s.location) if s.location else ''}</li>"
        for s in sessions
    )
    url = learn_url()
    title = f"{escape(cohort.course.title)} – {escape(cohort.name)}"
    place = f"<p>Địa điểm: {escape(cohort.location)}</p>" if cohort.location else ""
    schedule = (
        f"<p><strong>Lịch học ({len(sessions)} buổi):</strong></p><ul>{rows}</ul>"
        if sessions
        else "<p>Lịch học sẽ được gửi sau.</p>"
    )
    return f"""
<p>Chào {escape(listing.learner.full_name)},</p>
<p>Đơn vị của bạn đã đăng ký cho bạn tham gia lớp <strong>{title}</strong>.</p>
{place}
{schedule}
<p>Lịch học được đính kèm (tệp .ics): mở tệp để thêm vào Outlook / Google Calendar / điện thoại.</p>
<p><strong>Vào học trực tuyến:</strong> mở <a href="{url}">{url}</a>, bấm “Đăng nhập bằng TWings”, nhập email
<strong>{escape(listing.learner.email)}</strong> và mã 6 chữ số được gửi tới email này.
Ở mỗi buổi học, điểm danh bằng cách quét mã QR giảng viên chiếu trên lớp.</p>
<p>Cần hỗ trợ, vui lòng trả lời email này.</p>
"""


def invitation_rows(corporate_class, only_new: bool = True) -> list[dict]:
    """Who would get the invitation (preview before sending)."""
    rows = []
    listings = corporate_class.enrollments.filter(status__in=("enrolled",)).select_related(
        "learner", "employee", "corporate_class__client"
    )
    for listing in listings.order_by("learner__full_name"):
        if only_new and listing.invited_at:
            continue
        rows.append({"listing": listing, **recipients(listing)})
    return rows


def send_invitations(corporate_class, *, sent_by, only_new: bool = True) -> dict:
    cohort = corporate_class.cohort
    calendar = class_calendar(corporate_class) if cohort.sessions.exists() else None
    counts = {"sent": 0, "failed": 0}
    for row in invitation_rows(corporate_class, only_new):
        listing = row["listing"]
        try:
            send_logged(
                to=row["to"],
                cc=row["cc"],
                subject=f"Thư mời tham gia lớp {cohort.course.title} – {cohort.name}",
                html=invitation_html(listing),
                attachments=[
                    {"filename": "lich-hoc.ics", "content": calendar, "content_type": "text/calendar"}
                ]
                if calendar
                else None,
                template_code="corporate_invitation",
                name=listing.learner.full_name,
                sent_by=sent_by,
                corporate_enrollment=listing,
            )
        except ResendError:
            counts["failed"] += 1
            continue
        listing.invited_at = timezone.now()
        listing.save(update_fields=["invited_at", "updated_at"])
        counts["sent"] += 1
    return counts
