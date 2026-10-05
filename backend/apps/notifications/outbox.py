"""Send an e-mail through Resend and keep it in the EmailLog (visible in the CMS, tracked by webhooks)."""

from django.utils import timezone

from .models import EmailLog
from .resend import ResendError, send_email


def send_logged(
    *, to: str, subject: str, html: str, order=None, sent_by=None, template_code="", name=""
) -> EmailLog:
    log = EmailLog.objects.create(
        template_code=template_code,
        order=order,
        recipient_email=to,
        recipient_name=name,
        subject=subject,
        rendered_html=html,
        sent_by=sent_by,
    )
    try:
        message_id = send_email(to=to, subject=subject, html=html, idempotency_key=log.pk)
    except ResendError as exc:
        log.status, log.error_message = "failed", str(exc)[:500]
        log.save(update_fields=["status", "error_message", "updated_at"])
        raise
    log.status = "sent" if message_id else "simulated"
    log.resend_message_id = message_id
    log.sent_at = timezone.now()
    log.save(update_fields=["status", "resend_message_id", "sent_at", "updated_at"])
    return log
