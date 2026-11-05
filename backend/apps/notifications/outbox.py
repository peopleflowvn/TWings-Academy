"""Send an e-mail through Resend and keep it in the EmailLog (visible in the CMS, tracked by webhooks)."""

from django.conf import settings
from django.utils import timezone

from .models import EmailLog
from .resend import ResendError, send_email


def send_logged(
    *,
    to: str,
    subject: str,
    html: str,
    order=None,
    sent_by=None,
    template_code="",
    name="",
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    reply_to: str = "",
    attachments: list[dict] | None = None,
    corporate_enrollment=None,
    brand: str = "twings",
    sync: bool | None = None,
    kind: str = "learner",
    idempotency_key: str = "",
) -> EmailLog:
    """
    `kind`: see resend.send_email ("internal" = staff notice: no signature, no archive copy); such
    e-mails are sent at once (the worker frames every queued e-mail as a learner e-mail).
    `idempotency_key`: for scheduled jobs that may run twice; default the log id.
    """
    log = EmailLog.objects.create(
        template_code=template_code,
        order=order,
        corporate_enrollment=corporate_enrollment,
        recipient_email=to,
        recipient_name=name,
        brand=brand,
        cc=list(cc or []),
        bcc=list(bcc or []),
        reply_to=reply_to,
        attachment_names=[a["filename"] for a in attachments or []],
        subject=subject,
        rendered_html=html,
        sent_by=sent_by,
    )

    # Use background queue if configured and not requested sync (and no binary attachments)
    use_queue = (
        getattr(settings, "TASKS_QUEUE", "immediate") == "database"
        and not sync
        and not attachments
        and kind == "learner"
    )
    if use_queue:
        from .tasks import deliver_email_task

        deliver_email_task.enqueue(str(log.pk))
        return log

    try:
        message_id = send_email(
            to=to,
            subject=subject,
            html=html,
            idempotency_key=idempotency_key or log.pk,
            cc=cc,
            bcc=bcc,
            reply_to=reply_to,
            attachments=attachments,
            brand=brand,
            kind=kind,
        )
    except ResendError as exc:
        log.status, log.error_message = "failed", str(exc)[:500]
        log.save(update_fields=["status", "error_message", "updated_at"])
        raise
    log.status = "sent" if message_id else "simulated"
    log.resend_message_id = message_id
    log.sent_at = timezone.now()
    log.save(update_fields=["status", "resend_message_id", "sent_at", "updated_at"])
    return log
