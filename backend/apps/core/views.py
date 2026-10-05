from django.db import connection
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import ActionPermission

from .models import AuditLog


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def health(request):
    """Liveness + database check used by the deploy script and uptime monitors. Reveals nothing else."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        return Response({"status": "degraded"}, status=503)
    return Response({"status": "ok"})


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "at", "actor_label", "action", "object_type", "object_id", "ip", "details"]


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only audit trail for the CMS (contains IPs: super-admin level permission)."""

    serializer_class = AuditLogSerializer
    permission_classes = [ActionPermission]
    permission_map = {"list": ["rbac.edit_matrix"]}
    filterset_fields = ["action", "object_type"]
    search_fields = ["actor_label", "action", "object_id"]

    def get_queryset(self):
        return AuditLog.objects.all()
