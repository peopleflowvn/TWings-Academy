import json
import logging

from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ActionPermission, require_perms
from apps.crm.models import Order

from . import config as email_config
from .config import global_context
from .models import EmailEvent, EmailLog, EmailTemplate
from .resend import InvalidSignature, ResendError, verify_svix_signature

logger = logging.getLogger(__name__)


LOCKED_MESSAGE = "Mẫu email chứa liên kết / mã đăng nhập: chỉ quản trị hệ thống thay đổi được (bảo mật)."


class EmailTemplateSerializer(serializers.ModelSerializer):
    brand = serializers.SerializerMethodField()
    is_standard = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        exclude = ["created_at"]

    def get_brand(self, obj):
        return _brand_of(obj.code, None)

    def get_is_standard(self, obj):
        from .defaults import BY_CODE

        return obj.code in BY_CODE

    def get_is_locked(self, obj):
        from .engine import LOCKED_TEMPLATES

        return obj.code in LOCKED_TEMPLATES

    def validate(self, attrs):
        from .engine import LOCKED_TEMPLATES

        if {attrs.get("code"), getattr(self.instance, "code", None)} & LOCKED_TEMPLATES:
            raise serializers.ValidationError({"detail": LOCKED_MESSAGE})
        return attrs


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
        order = Order.objects.filter(pk=data.get("order_id") or "").first()
        from .outbox import send_logged

        try:
            log = send_logged(
                to=data["to"],
                subject=data["subject"],
                html=data["html"],
                order=order,
                sent_by=request.user,
                template_code=data.get("template_code", ""),
                name=data.get("recipient_name", ""),
                sync=True,
            )
        except ResendError as exc:
            return Response({"detail": f"Gửi email thất bại: {exc}"}, status=502)
        if log.template_code:
            log.template = EmailTemplate.objects.filter(code=log.template_code).first()
            if log.template:
                log.save(update_fields=["template", "updated_at"])
        message_id = log.resend_message_id
        if order is not None:
            _record_on_lead(request, order, log)
        # No Resend key on the server: nothing was delivered ("simulated"), and the screen says so.
        return Response(
            {"id": log.pk, "resend_message_id": message_id, "status": log.status},
            status=201,
        )


class TestSendEmailSerializer(serializers.Serializer):
    to = serializers.EmailField()
    template_code = serializers.CharField(max_length=100, required=False, allow_blank=True)
    subject = serializers.CharField(max_length=300, required=False, allow_blank=True)
    html = serializers.CharField(max_length=200_000, required=False, allow_blank=True)
    variables = serializers.DictField(required=False, default=dict)
    brand = serializers.CharField(max_length=20, default="twings")


class TestSendEmailView(APIView):
    """Staff-triggered test email with sample context, immediate delivery, and [TEST] marker."""

    permission_classes = [require_perms("crm.edit_status")]
    throttle_scope = "email_send"

    def post(self, request):
        ser = TestSendEmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        template_code = data.get("template_code", "")
        raw_subject = data.get("subject", "")
        raw_html = data.get("html", "")
        variables = data.get("variables") or {}
        brand = _brand_of(template_code, data.get("brand"))

        from .engine import interpolate, render_template

        if template_code and not (raw_subject and raw_html):
            subj, body = render_template(template_code, variables, raw_subject, raw_html, brand=brand)
        else:
            context = {**global_context(brand), **variables}
            subj, body = interpolate(raw_subject, context), interpolate(raw_html, context)

        test_subject = f"[TEST] {subj}" if not subj.startswith("[TEST]") else subj

        from .outbox import send_logged

        try:
            log = send_logged(
                to=data["to"],
                subject=test_subject,
                html=body,
                template_code=f"test_{template_code}" if template_code else "test_email",
                name=f"Test ({data['to']})",
                sent_by=request.user,
                brand=brand,
                sync=True,
            )
        except ResendError as exc:
            return Response({"detail": f"Gửi email thử nghiệm thất bại: {exc}"}, status=502)

        return Response(
            {
                "id": log.pk,
                "status": log.status,
                "resend_message_id": log.resend_message_id,
                "subject": test_subject,
            },
            status=200,
        )


class PreviewEmailView(APIView):
    """Render subject and body with context and return wrapped HTML for live iframe preview."""

    permission_classes = [require_perms("crm.view_leads")]

    def post(self, request):
        template_code = request.data.get("template_code", "")
        raw_subject = request.data.get("subject", "")
        raw_html = request.data.get("html", "")
        variables = request.data.get("variables") or {}
        brand = _brand_of(template_code, request.data.get("brand"))

        from .engine import interpolate, render_template
        from .layout import wrap

        if template_code and not (raw_subject and raw_html):
            subj, body = render_template(template_code, variables, raw_subject, raw_html, brand=brand)
        else:
            context = {**global_context(brand), **variables}
            subj, body = interpolate(raw_subject, context), interpolate(raw_html, context)

        wrapped = wrap(body, brand)
        return Response({"subject": subj, "html": wrapped})


def _brand_of(template_code: str, requested) -> str:
    """The brand a template is sent with: its own (standard templates), else what the screen asks."""
    from .defaults import BY_CODE

    standard = BY_CODE.get(template_code or "")
    if standard:
        return standard["brand"]
    if (template_code or "").startswith("corporate") or requested == "corporate":
        return "corporate"
    return "twings"


def _record_on_lead(request, order, log) -> None:
    """An e-mail sent from the lead workspace goes into the lead's history (a real one is a contact)."""
    from apps.crm.assignment import mark_first_response
    from apps.crm.models import Activity

    sent = log.status == "sent"
    Activity.objects.create(
        order=order,
        type="email",
        title=(
            f"Email: {log.subject}"
            if sent
            else f"Email chưa gửi (máy chủ chưa cấu hình Resend): {log.subject}"
        )[:300],
        content=f"Tới {log.recipient_email}",
        actor=request.user.name or request.user.email,
        actor_user=request.user,
    )
    if sent:
        mark_first_response(order)


def restore_standard(code: str) -> EmailTemplate:
    from .defaults import BY_CODE

    t = BY_CODE[code]
    obj, _ = EmailTemplate.objects.update_or_create(
        code=code,
        defaults={
            "name": t["name"],
            "category": t["category"],
            "subject": t["subject"],
            "body": t["body"],
            "variables": t["variables"],
            "description": t["description"],
            "is_default": True,
        },
    )
    return obj


class EmailTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = EmailTemplateSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["crm.view_leads"],
        "retrieve": ["crm.view_leads"],
        **dict.fromkeys(
            ["create", "update", "partial_update", "destroy", "restore", "restore_missing"],
            ["crm.edit_status"],
        ),
    }
    pagination_class = None
    queryset = EmailTemplate.objects.all()

    def perform_destroy(self, instance):
        from .defaults import BY_CODE
        from .engine import LOCKED_TEMPLATES

        if instance.code in LOCKED_TEMPLATES:
            raise serializers.ValidationError({"detail": LOCKED_MESSAGE})
        if instance.code in BY_CODE:
            raise serializers.ValidationError(
                {"detail": "Mẫu chuẩn của hệ thống không xóa được; có thể sửa hoặc khôi phục bản chuẩn."}
            )
        instance.delete()

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Put the standard version (defaults.py) back into one template."""
        from .defaults import BY_CODE

        instance = self.get_object()
        standard = BY_CODE.get(instance.code)
        if standard is None:
            return Response({"detail": "Mẫu tự tạo không có bản chuẩn để khôi phục."}, status=400)
        restore_standard(instance.code)
        instance.refresh_from_db()
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["post"], url_path="restore-missing")
    def restore_missing(self, request):
        """Create the standard templates that are not in the database (deleted or added since)."""
        from .defaults import BY_CODE

        existing = set(EmailTemplate.objects.values_list("code", flat=True))
        created = [code for code in BY_CODE if code not in existing]
        for code in created:
            restore_standard(code)
        return Response({"created": created})


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
            secret=email_config.webhook_secret(),
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


# ----------------------------------------------------------------------------- settings (/app/content/email)
class EmailSettingsView(APIView):
    """
    Sender, reply-to, archive copy, test redirect, frame (logo, signature, footer) and the Resend keys.
    Reading is open to whoever works with e-mails; changing needs email.settings. Keys are write-only.
    """

    permission_classes = [ActionPermission]
    permission_map = {"get": ["email.settings", "crm.view_leads"], "put": ["email.settings"]}

    def get(self, request):
        from apps.accounts.rbac import has_perm_code
        from apps.cms.seo import site_seo

        from .defaults import BY_CODE

        can_edit = has_perm_code(request.user, "email.settings")
        seo = site_seo()
        twings, corporate = email_config.effective("twings"), email_config.effective("corporate")
        keep = ("sender", "reply_to", "logo_url", "hotline", "support_email", "address", "from_address")
        return Response(
            {
                "can_edit": can_edit,
                "settings": email_config.stored(),
                "defaults": email_config.DEFAULTS,
                "secrets": email_config.secret_status() if can_edit else {},
                "live": bool(email_config.api_key()),
                "webhook_configured": bool(email_config.webhook_secret()),
                "webhook_url": f"{email_config.site_url()}/api/v1/webhooks/resend/",
                "webhook_events": [
                    "email.sent",
                    "email.delivered",
                    "email.delivery_delayed",
                    "email.opened",
                    "email.clicked",
                    "email.bounced",
                    "email.complained",
                ],
                "effective": {
                    "twings": {k: twings[k] for k in keep},
                    "corporate": {k: corporate[k] for k in keep},
                    "redirect_to": twings["redirect_to"],
                    "bcc_archive": twings["bcc_archive"],
                },
                "site": {
                    "logo_url": seo.get("logo_url", ""),
                    "hotline": seo.get("hotline", ""),
                    "email": seo.get("email", ""),
                    "address": seo.get("address", ""),
                },
                # A list: the API camelCases dict keys, and these are names to type in a template.
                "global_variables": [
                    {"name": name, "label": label} for name, label in email_config.GLOBAL_VARIABLES.items()
                ],
                "standard_templates": [
                    {
                        "code": t["code"],
                        "name": t["name"],
                        "category": t["category"],
                        "trigger": t["description"],
                    }
                    for t in BY_CODE.values()
                ],
            }
        )

    def put(self, request):
        from apps.core.models import audit

        raw = request.data.get("settings") or {}
        clean, errors = email_config.validate(raw if isinstance(raw, dict) else {})
        secrets = {}
        for name in email_config.SECRET_FIELDS:
            value = request.data.get(name)
            if value is None:
                continue
            value = str(value).strip()
            if name == "api_key" and value and not value.startswith("re_"):
                errors[name] = "Khóa API Resend bắt đầu bằng re_."
            if name == "webhook_secret" and value and not value.startswith("whsec_"):
                errors[name] = "Signing secret của webhook Resend bắt đầu bằng whsec_."
            secrets[name] = value
        if errors:
            return Response({"detail": "Cấu hình chưa hợp lệ.", "errors": errors}, status=400)
        email_config.save(clean, secrets)
        audit(
            request,
            "email.settings_update",
            fields=sorted(clean),
            secrets={k: ("cleared" if v == "" else "replaced") for k, v in secrets.items()},
        )
        return self.get(request)


class EmailConnectionCheckView(APIView):
    """Is the Resend key valid, which sending domains exist, is the sender's domain verified."""

    permission_classes = [require_perms("email.settings")]
    throttle_scope = "email_send"

    def post(self, request):
        from .resend import check_connection

        result = check_connection()
        senders = {
            brand: email_config.effective(brand)["from_address"].rpartition("@")[2].lower()
            for brand in ("twings", "corporate")
        }
        verified = {d["name"].lower() for d in result.get("domains", []) if d["status"] == "verified"}
        result["senders"] = [
            {
                "brand": brand,
                "domain": domain,
                "verified": None if result.get("restricted") or not result.get("ok") else domain in verified,
            }
            for brand, domain in senders.items()
        ]
        return Response(result)


class EmailStatsView(APIView):
    """Real delivery figures of the last N days (EmailLog statuses kept up to date by the webhook)."""

    permission_classes = [require_perms("crm.view_leads", "email.settings")]

    def get(self, request):
        from datetime import timedelta

        from django.db.models import Count

        try:
            days = max(1, min(365, int(request.query_params.get("days", 30))))
        except ValueError:
            days = 30
        since = timezone.now() - timedelta(days=days)
        logs = EmailLog.objects.filter(created_at__gte=since).exclude(template_code__startswith="test_")
        by_status = dict(logs.values_list("status").annotate(n=Count("id")).values_list("status", "n"))
        total = sum(by_status.values())
        out = by_status.get
        reached = sum(out(s, 0) for s in ("delivered", "opened", "clicked"))
        attempted = total - out("simulated", 0) - out("queued", 0)
        top = (
            logs.exclude(template_code="").values("template_code").annotate(n=Count("id")).order_by("-n")[:8]
        )
        return Response(
            {
                "days": days,
                "total": total,
                "by_status": by_status,
                "delivery_rate": round(100 * (reached + out("sent", 0)) / attempted, 1)
                if attempted
                else None,
                "open_rate": round(100 * (out("opened", 0) + out("clicked", 0)) / reached, 1)
                if reached
                else None,
                "bounce_rate": round(100 * out("bounced", 0) / attempted, 1) if attempted else None,
                "top_templates": list(top),
            }
        )


def email_logo(request):
    """The logo the e-mails use (Moodle's e-mail frame points here, so it follows the settings)."""
    from django.http import Http404, HttpResponseRedirect

    url = email_config.effective("twings")["logo_url"]
    if not url:
        raise Http404
    response = HttpResponseRedirect(url)
    response["Cache-Control"] = "public, max-age=3600"
    return response
