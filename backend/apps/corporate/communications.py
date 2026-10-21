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
                brand="corporate",
            )
        except ResendError:
            counts["failed"] += 1
            continue
        listing.invited_at = timezone.now()
        listing.save(update_fields=["invited_at", "updated_at"])
        counts["sent"] += 1
    return counts


# ---------------------------------------------------------------- result e-mails (batches)
RESULT_LABEL = {"passed": "Đạt", "not_passed": "Chưa đạt", "pending": "Đang chờ xác minh"}


def create_results_batch(
    corporate_class, *, user, subject: str = "", message: str = "", corrects=None, kind: str = "results"
):
    """
    A batch for the class's published results, recipients frozen now, sent once approved:
    "results" = one e-mail per learner (CC their manager); "manager_digest" = one e-mail per line
    manager listing their own staff only (the manager's address must pass the recipient policy).
    """
    from django.db import transaction

    from .models import CommunicationBatch, CommunicationRecipient
    from .services import CorporateError

    snapshot = corporate_class.results.filter(status="published").first()
    if snapshot is None:
        raise CorporateError("Chưa có kết quả đã phát hành để gửi.")
    if corrects is not None and (corrects.corporate_class_id != corporate_class.pk or corrects.kind != kind):
        raise CorporateError("Lô cần đính chính thuộc lớp khác hoặc loại thư khác.")
    cohort = corporate_class.cohort
    if kind == "manager_digest":
        default = f"Kết quả học tập của nhân viên – {cohort.course.title} – {cohort.name}"
    else:
        default = f"Kết quả khóa học {cohort.course.title} – {cohort.name}"
    listings = {
        listing.pk: listing
        for listing in corporate_class.enrollments.select_related(
            "learner", "employee", "corporate_class__client"
        )
    }
    with transaction.atomic():
        batch = CommunicationBatch.objects.create(
            corporate_class=corporate_class,
            snapshot=snapshot,
            kind=kind,
            subject=(f"[Đính chính] {subject or default}" if corrects else subject or default)[:300],
            message=message,
            corrects=corrects,
            created_by=user,
        )
        if kind == "manager_digest":
            for manager, (name, staff) in _managers(corporate_class, snapshot, listings).items():
                CommunicationRecipient.objects.create(batch=batch, to=manager, name=name, learners=staff)
            return batch
        for row in snapshot.learners:
            listing = listings.get(row["enrollment"])
            if listing is None:
                continue
            who = recipients(listing)
            CommunicationRecipient.objects.create(
                batch=batch,
                enrollment=listing,
                name=listing.learner.full_name,
                to=who["to"],
                cc=who["cc"],
                rejected=who["rejected"],
            )
    return batch


def _managers(corporate_class, snapshot, listings) -> dict[str, tuple[str, list[str]]]:
    """{manager e-mail: (manager name, [enrollment ids])} for managers allowed by the recipient policy."""
    today = timezone.localdate()
    out: dict[str, tuple[str, list[str]]] = {}
    for row in snapshot.learners:
        listing = listings.get(row["enrollment"])
        if listing is None:
            continue
        employee = employment_on(corporate_class.client, listing.learner, today) or listing.employee
        allowed, _ = cc_policy(corporate_class.client, [employee.manager_email])
        if not allowed:
            continue  # no manager on file, or outside the client's / our domains
        name, staff = out.get(allowed[0], ("", []))
        staff.append(listing.pk)
        out[allowed[0]] = (name or employee.manager_name, staff)  # the first name on file
    return out


def digest_html(batch, staff: list[dict], name: str) -> str:
    cohort = batch.corporate_class.cohort
    rows = "".join(
        "<tr>"
        f"<td>{escape(r['name'])}</td><td>{escape(r.get('employee_code') or '')}</td>"
        f"<td>{r['sessions_attended']}/{r['sessions_taken']}</td>"
        f"<td>{'' if r.get('grade_percent') is None else str(r['grade_percent']) + '%'}</td>"
        f"<td>{RESULT_LABEL.get(r['result'], r['result'])}</td>"
        "</tr>"
        for r in staff
    )
    message = "".join(f"<p>{escape(p)}</p>" for p in batch.message.split("\n\n") if p.strip())
    return f"""
<p>Kính gửi {escape(name or "Anh/Chị")},</p>
<p>Lớp <strong>{escape(cohort.course.title)} – {escape(cohort.name)}</strong> đã kết thúc. Kết quả của
{len(staff)} nhân viên thuộc quyền quản lý của Anh/Chị:</p>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px">
<tr><th align="left">Họ tên</th><th align="left">Mã NV</th><th align="left">Buổi có mặt</th>
<th align="left">Điểm</th><th align="left">Kết quả</th></tr>
{rows}
</table>
{message}
<p>Cần trao đổi thêm, vui lòng trả lời email này.</p>
"""


def result_html(batch, row: dict, name: str) -> str:
    cohort = batch.corporate_class.cohort
    lines = [f"Kết quả: <strong>{RESULT_LABEL.get(row['result'], row['result'])}</strong>"]
    if row.get("sessions_taken"):
        rate = f" ({row['attendance_rate']}%)" if row.get("attendance_rate") is not None else ""
        lines.append(f"Chuyên cần: {row['sessions_attended']}/{row['sessions_taken']} buổi{rate}")
    if row.get("grade_percent") is not None:
        lines.append(f"Điểm tổng kết: {row['grade_percent']}%")
    if row.get("reasons"):
        lines.append("Ghi chú: " + escape("; ".join(row["reasons"])))
    message = "".join(f"<p>{escape(p)}</p>" for p in batch.message.split("\n\n") if p.strip())
    correction = (
        "<p><em>Thư này đính chính thư kết quả gửi trước đó; vui lòng dùng thông tin trong thư này.</em></p>"
        if batch.corrects_id
        else ""
    )
    return f"""
<p>Chào {escape(name)},</p>
{correction}
<p>Lớp <strong>{escape(cohort.course.title)} – {escape(cohort.name)}</strong> đã kết thúc.
Kết quả của bạn:</p>
<p>{"<br>".join(line for line in lines if line)}</p>
{message}
<p>Tài liệu và nội dung khóa học vẫn xem được tại <a href="{learn_url()}">{learn_url()}</a>.</p>
<p>Cần hỗ trợ, vui lòng trả lời email này.</p>
"""


def send_batch(batch, *, user) -> dict:
    """Send every not-yet-sent e-mail of an approved batch (safe to run again after a failure)."""
    from .services import CorporateError

    if batch.status not in ("approved", "sent"):
        raise CorporateError("Lô email cần được duyệt trước khi gửi.")
    from apps.notifications.models import EmailLog

    rows = {row["enrollment"]: row for row in batch.snapshot.learners}
    template = "corporate_manager_digest" if batch.kind == "manager_digest" else "corporate_results"
    counts = {"sent": 0, "failed": 0, "skipped": 0}
    for recipient in batch.recipients.select_related("enrollment__learner", "email_log"):
        if recipient.email_log and recipient.email_log.status not in ("failed",):
            counts["skipped"] += 1
            continue
        if batch.kind == "manager_digest":
            staff = [rows[i] for i in recipient.learners if i in rows]
            html = digest_html(batch, staff, recipient.name) if staff else ""
        else:
            row = rows.get(recipient.enrollment_id)
            html = (
                result_html(batch, row, recipient.name or recipient.enrollment.learner.full_name)
                if row
                else ""
            )
        if not html:
            counts["skipped"] += 1
            continue
        try:
            log = send_logged(
                to=recipient.to,
                cc=recipient.cc,
                subject=batch.subject,
                html=html,
                template_code=template,
                name=recipient.name,
                sent_by=user,
                corporate_enrollment=recipient.enrollment,
                brand="corporate",
            )
        except ResendError:
            counts["failed"] += 1
            # send_logged kept the failed attempt: link it so the screen shows the error.
            recipient.email_log = (
                EmailLog.objects.filter(recipient_email=recipient.to, template_code=template, status="failed")
                .order_by("-created_at")
                .first()
            )
            recipient.save(update_fields=["email_log", "updated_at"])
            continue
        recipient.email_log = log
        recipient.save(update_fields=["email_log", "updated_at"])
        counts["sent"] += 1
    if batch.status != "sent" and counts["failed"] == 0:
        batch.status, batch.sent_at = "sent", timezone.now()
        batch.save(update_fields=["status", "sent_at", "updated_at"])
    return counts
