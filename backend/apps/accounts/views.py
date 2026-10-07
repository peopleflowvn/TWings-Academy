import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import ActionPermission
from .rbac import Role, has_perm_code
from .serializers import (
    LoginSerializer,
    MeSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    StaffUserSerializer,
)

logger = logging.getLogger(__name__)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrf_token": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")  # DRF skips CSRF for anonymous requests; login needs it
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        # django-axes tracks failures on the underlying Django HttpRequest.
        user = authenticate(
            request._request,
            username=ser.validated_data["email"].lower(),
            password=ser.validated_data["password"],
        )
        # Same message for every failure so the endpoint does not reveal which emails exist.
        if user is None or not user.is_staff:
            return Response(
                {"detail": "Email hoặc mật khẩu không đúng, hoặc tài khoản tạm khóa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)  # rotates the session key and CSRF token
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "login"

    def post(self, request):
        from apps.core.models import audit

        ser = PasswordChangeSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)  # keep this session, end every other one
        audit(request, "auth.password_change", request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


RESET_SENT = {
    "detail": "Nếu email thuộc một tài khoản nhân sự đang hoạt động, "
    "liên kết đặt lại mật khẩu đã được gửi tới hộp thư."
}


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    """Email a one-hour reset link. Same answer whether or not the email exists."""

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=ser.validated_data["email"].strip(), is_active=True, is_staff=True
        ).first()
        if user is not None and user.has_usable_password():
            try:
                _send_reset_email(user)
            except Exception:  # noqa: BLE001 - never reveal delivery problems to an anonymous caller
                logger.exception("Staff password reset email failed for %s", user.pk)
        return Response(RESET_SENT)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        from apps.core.models import audit

        ser = PasswordResetConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]
        user.set_password(ser.validated_data["new_password"])  # also invalidates the token and old sessions
        user.save(update_fields=["password"])
        audit(request, "auth.password_reset", user, actor_label=user.email)
        return Response({"detail": "Đã đặt mật khẩu mới. Hãy đăng nhập lại."})


def _send_reset_email(user):
    from django.contrib.auth.tokens import default_token_generator
    from django.utils import timezone
    from django.utils.encoding import force_bytes
    from django.utils.html import escape
    from django.utils.http import urlsafe_base64_encode

    from apps.notifications.models import EmailLog
    from apps.notifications.resend import ResendError, send_email

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    # In the fragment, so the token never reaches server logs or a Referer header.
    url = f"{settings.PUBLIC_SITE_URL.rstrip('/')}/app/#reset={uid}.{token}"
    subject = "Đặt lại mật khẩu quản trị | TWings Academy"

    def render(link):
        return f"""
<p>Chào {escape(user.name)},</p>
<p>Có yêu cầu đặt lại mật khẩu cho tài khoản quản trị TWings <strong>{escape(user.email)}</strong>.</p>
<p><a href="{link}">Đặt mật khẩu mới</a> (liên kết dùng một lần, hết hạn sau 1 giờ).</p>
<p>Nếu bạn không yêu cầu, hãy bỏ qua email này và báo cho quản trị hệ thống.
Mật khẩu hiện tại vẫn giữ nguyên.</p>
<p>TWings Academy</p>
"""

    # The CMS email log is readable by other staff, so it keeps a copy without the live link.
    log = EmailLog.objects.create(
        template_code="staff_password_reset",
        recipient_email=user.email,
        recipient_name=user.name,
        subject=subject,
        rendered_html=render("#liên-kết-đã-ẩn"),
    )
    try:
        message_id = send_email(to=user.email, subject=subject, html=render(url), idempotency_key=log.pk)
    except ResendError as exc:
        log.status, log.error_message = "failed", str(exc)[:500]
        log.save(update_fields=["status", "error_message", "updated_at"])
        raise
    log.status = "sent" if message_id else "simulated"
    log.resend_message_id = message_id
    log.sent_at = timezone.now()
    log.save(update_fields=["status", "resend_message_id", "sent_at", "updated_at"])


class StaffUserViewSet(viewsets.ModelViewSet):
    serializer_class = StaffUserSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["rbac.view_users"],
        "retrieve": ["rbac.view_users"],
        "create": ["rbac.manage_roles"],
        "update": ["rbac.manage_roles"],
        "partial_update": ["rbac.manage_roles"],
    }
    http_method_names = ["get", "post", "put", "patch", "head", "options"]  # deactivate instead of delete
    search_fields = ["name", "email"]
    filterset_fields = ["role", "is_active"]

    def get_queryset(self):
        return User.objects.filter(is_staff=True).order_by("name")

    def perform_update(self, serializer):
        self._guard_privileged_change(serializer)
        user = serializer.save()
        self._audit("staff_user.update", user, serializer.validated_data)

    def perform_create(self, serializer):
        self._guard_privileged_change(serializer)
        user = serializer.save()
        self._audit("staff_user.create", user, serializer.validated_data)

    def _audit(self, action, user, data):
        from apps.core.models import audit

        changes = {k: v for k, v in data.items() if k != "password"}
        if "is_active_label" in changes:
            changes["status"] = changes.pop("is_active_label")
        if "password" in data:
            changes["password_changed"] = True
        changes["email"] = user.email
        audit(self.request, action, user, **changes)

    def _guard_privileged_change(self, serializer):
        from rest_framework.exceptions import PermissionDenied

        actor = self.request.user
        data = serializer.validated_data
        if "permission_overrides" in data and not has_perm_code(actor, "rbac.edit_matrix"):
            raise PermissionDenied("Cần quyền rbac.edit_matrix để sửa quyền tùy chỉnh.")
        # Only a super admin can create or promote another super admin.
        if data.get("role") == Role.SUPER_ADMIN and actor.role != Role.SUPER_ADMIN and not actor.is_superuser:
            raise PermissionDenied("Chỉ Super Admin mới gán được vai trò Super Admin.")
        instance = serializer.instance
        if instance is not None and instance.pk == actor.pk and data.get("is_active_label") == "suspended":
            raise PermissionDenied("Không thể tự khóa tài khoản của chính mình.")
