"""
Asynchronous email delivery tasks for django.tasks background worker.
Ensures sending email through Resend does not block web requests.
"""

import logging

from django.tasks import task
from django.utils import timezone

from .models import EmailLog
from .resend import ResendError, send_email

logger = logging.getLogger(__name__)


@task
def deliver_email_task(log_id: str) -> None:
    """Deliver an EmailLog through Resend in the background."""
    log = EmailLog.objects.filter(pk=log_id).first()
    if not log or log.status in ("sent", "delivered"):
        return

    try:
        message_id = send_email(
            to=log.recipient_email,
            subject=log.subject,
            html=log.rendered_html,
            idempotency_key=log.pk,
            cc=log.cc,
            bcc=log.bcc,
            reply_to=log.reply_to,
        )
    except ResendError as exc:
        log.status = "failed"
        log.error_message = str(exc)[:500]
        log.save(update_fields=["status", "error_message", "updated_at"])
        logger.warning("Background email delivery failed for log %s: %s", log_id, exc)
        raise

    log.status = "sent" if message_id else "simulated"
    log.resend_message_id = message_id
    log.sent_at = timezone.now()
    log.save(update_fields=["status", "resend_message_id", "sent_at", "updated_at"])
