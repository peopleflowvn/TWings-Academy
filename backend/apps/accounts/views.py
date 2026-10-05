from django.contrib.auth import authenticate, login, logout
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
from .serializers import LoginSerializer, MeSerializer, StaffUserSerializer


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
