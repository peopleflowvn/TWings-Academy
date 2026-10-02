import json
import logging

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import mixins, serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ActionPermission, require_perms
from apps.crm.models import Order

from .models import EmailEvent, EmailLog, EmailTemplate
from .resend import InvalidSignature, ResendError, send_email, verify_svix_signature

logger = logging.getLogger(__name__)


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        exclude = ["created_at"]


class EmailLogSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source="template.name", read_only=True, default="")
    webhook_events = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        exclude = ["sent_by"]

    def get_webhook_events(self, obj):
        return [{"type": e.type, "timestamp": e.received_at} for e in obj.events.all()]


class SendEmailSerializer(serializers.Serializer):
    to = serializers.EmailField()
    subject = serializers.CharField(max_length=300)
    html = serializers.CharField(max_length=200_000)
    template_code = serializers.CharField(max_length=100, required=False, allow_blank=True)
    recipient_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    order_id = serializers.CharField(max_length=64, required=False, allow_blank=True)


class SendEmailView(APIView):
    """Staff-triggered email. The Resend key never leaves the server."""

    permission_classes = [require_perms("crm.edit_status")]
    throttle_scope = "email_send"

    def post(self, request):
        ser = SendEmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        template = EmailTemplate.objects.filter(code=data.get("template_code") or "").first()
        log = EmailLog.objects.create(
            template=template,
            template_code=data.get("template_code", ""),
            order=Order.objects.filter(pk=data.get("order_id") or "").first(),
            recipient_email=data["to"],
            recipient_name=data.get("recipient_name", ""),
            subject=data["subject"],
            rendered_html=data["html"],
            sent_by=request.user,
        )
        try:
            message_id = send_email(
                to=data["to"], subject=data["subject"], html=data["html"], idempotency_key=log.pk
            )
        except ResendError as exc:
            log.status, log.error_message = "failed", str(exc)[:500]
            log.save(update_fields=["status", "error_message", "updated_at"])
            return Response({"detail": f"Gửi email thất bại: {exc}"}, status=502)

        log.status = "sent" if message_id else "simulated"
        log.resend_message_id = message_id
        log.sent_at = timezone.now()
        log.save(update_fields=["status", "resend_message_id", "sent_at", "updated_at"])
        return Response(
            {"id": log.pk, "resend_message_id": message_id or f"sim_{log.pk}", "status": log.status},
            status=201,
        )


class EmailTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = EmailTemplateSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["crm.view_leads"],
        "retrieve": ["crm.view_leads"],
        **dict.fromkeys(["create", "update", "partial_update", "destroy"], ["crm.edit_status"]),
    }
    pagination_class = None
    queryset = EmailTemplate.objects.all()


class EmailLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = EmailLogSerializer
    permission_classes = [ActionPermission]
    permission_map = {"list": ["crm.view_leads"], "retrieve": ["crm.view_leads"]}
    filterset_fields = ["status", "template_code", "order"]
    search_fields = ["recipient_email", "subject"]
    queryset = EmailLog.objects.select_related("template").prefetch_related("events")


# ----------------------------------------------------------------------------- Resend webhook
STATUS_RANK = {"sent": 1, "delivered": 2, "opened": 3, "clicked": 4}


def _apply_event(log: EmailLog, event_type: str, data: dict) -> None:
    now = timezone.now()
    new_status = None
    if event_type == "email.sent":
        new_status = "sent"
    elif event_type == "email.delivered":
        log.delivered_at, new_status = log.delivered_at or now, "delivered"
    elif event_type == "email.opened":
        log.opened_at, log.open_count, new_status = log.opened_at or now, log.open_count + 1, "opened"
    elif event_type == "email.clicked":
        log.clicked_at, log.click_count, new_status = log.clicked_at or now, log.click_count + 1, "clicked"
        log.last_clicked_url = str((data.get("click") or {}).get("link", ""))[:1000]
    elif event_type == "email.bounced":
        log.bounced_at, log.status = now, "bounced"
        log.bounce_reason = str((data.get("bounce") or {}).get("message", ""))[:500]
    elif event_type == "email.complained":
        log.status = "complained"
    # Never downgrade (a late "delivered" must not overwrite "opened").
    if new_status and STATUS_RANK.get(new_status, 0) > STATUS_RANK.get(log.status, 0):
        log.status = new_status
    log.save()


@csrf_exempt
@require_POST
def resend_webhook(request):
    try:
        verify_svix_signature(
            secret=settings.RESEND_WEBHOOK_SECRET,
            msg_id=request.headers.get("svix-id", ""),
            timestamp=request.headers.get("svix-timestamp", ""),
            signature_header=request.headers.get("svix-signature", ""),
            body=request.body,
        )
    except InvalidSignature as exc:
        logger.warning("Rejected Resend webhook: %s", exc)
        return HttpResponse(status=401)

    try:
        payload = json.loads(request.body)
    except ValueError:
        return HttpResponse(status=400)
    event_type = str(payload.get("type", ""))
    data = payload.get("data") or {}
    log = EmailLog.objects.filter(resend_message_id=data.get("email_id") or "\x00").first()

    try:
        with transaction.atomic():
            EmailEvent.objects.create(
                svix_id=request.headers["svix-id"], type=event_type, email_log=log, payload=payload
            )
    except IntegrityError:
        return JsonResponse({"received": True, "duplicate": True})
    if log is not None:
        _apply_event(log, event_type, data)
    return JsonResponse({"received": True})
