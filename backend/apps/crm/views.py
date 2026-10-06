import csv

from django.db.models import Count, Q
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ActionPermission, require_perms
from apps.accounts.rbac import has_perm_code
from apps.catalog.models import Cohort
from apps.core.models import audit

from .models import AdmissionCampaign, Order
from .serializers import (
    ASSIGN_FIELDS,
    FINANCE_FIELDS,
    REFERRAL_FIELDS,
    ActivitySerializer,
    AdmissionCampaignSerializer,
    FollowupTaskSerializer,
    OrderSerializer,
    PublicRegistrationSerializer,
)
from .services import CheckoutError, create_public_order, rollover_cohort


class PublicRegistrationView(APIView):
    """Consultation / admission form on the public site. Creates a lead, no payment."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "public_form"

    def post(self, request):
        ser = PublicRegistrationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data.get("website"):  # honeypot tripped: pretend success, store nothing
            return Response({"registration_code": "OK"}, status=status.HTTP_201_CREATED)
        order = create_public_order(dict(ser.validated_data), ser.consent_fields(), with_payment=False)
        return Response(
            {"registration_code": order.order_code, "batch_cohort": order.batch_cohort},
            status=status.HTTP_201_CREATED,
        )


# CSV export deliberately omits encrypted identity fields (CCCD, addresses, bank accounts).
EXPORT_FIELDS = [
    "order_code",
    "created_at",
    "customer_name",
    "customer_phone",
    "customer_email",
    "area",
    "course_title",
    "batch_cohort",
    "source",
    "campaign_code",
    "pic",
    "crm_status",
    "interest_level",
    "status",
    "payment_status_detail",
    "amount",
    "total_paid_amount",
    "training_status",
    "placement_status",
]


class _Echo:
    def write(self, value):
        return value


def _csv_safe(value):
    """Neutralise spreadsheet formula injection (=, +, -, @ prefixes)."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["crm.view_leads"],
        "retrieve": ["crm.view_leads"],
        "create": ["crm.edit_status"],
        "update": ["crm.edit_status", "finance.confirm_manual"],
        "partial_update": ["crm.edit_status", "finance.confirm_manual"],
        "destroy": ["crm.delete_lead"],
        "activities": ["crm.view_leads"],
        "followups": ["crm.view_leads"],
        "followup_detail": ["crm.edit_status"],
        "export": ["crm.export_excel"],
    }
    filterset_fields = [
        "crm_status",
        "status",
        "course",
        "cohort",
        "campaign",
        "pic",
        "source",
        "is_duplicate",
    ]
    search_fields = ["order_code", "customer_name", "customer_phone", "customer_email"]
    ordering_fields = ["created_at", "amount", "crm_status"]

    def get_queryset(self):
        return Order.objects.select_related("course", "cohort").prefetch_related(
            "timeline_activities", "followup_tasks"
        )

    def _guard_fields(self, serializer):
        user = self.request.user
        changed = set(serializer.validated_data)
        if changed & FINANCE_FIELDS and not has_perm_code(user, "finance.confirm_manual"):
            raise PermissionDenied("Thông tin thanh toán chỉ Kế toán được chỉnh sửa.")
        if changed & REFERRAL_FIELDS and not has_perm_code(user, "finance.referral_bonus"):
            raise PermissionDenied("Cần quyền finance.referral_bonus.")
        if changed & ASSIGN_FIELDS and not has_perm_code(user, "crm.assign_pic"):
            raise PermissionDenied("Cần quyền crm.assign_pic để phân công PIC.")
        other = changed - FINANCE_FIELDS - REFERRAL_FIELDS - ASSIGN_FIELDS
        if other and not has_perm_code(user, "crm.edit_status"):
            raise PermissionDenied("Cần quyền crm.edit_status.")

    def perform_create(self, serializer):
        self._guard_fields(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._guard_fields(serializer)
        serializer.save()

    def perform_destroy(self, instance):
        audit(self.request, "order.delete", instance, order_code=instance.order_code)
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def activities(self, request, pk=None):
        order = self.get_object()
        if request.method == "POST":
            if not has_perm_code(request.user, "crm.edit_status"):
                raise PermissionDenied()
            ser = ActivitySerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            ser.save(order=order, actor=request.user.name or request.user.email, actor_user=request.user)
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ActivitySerializer(order.timeline_activities.all(), many=True).data)

    @action(detail=True, methods=["get", "post"])
    def followups(self, request, pk=None):
        order = self.get_object()
        if request.method == "POST":
            if not has_perm_code(request.user, "crm.edit_status"):
                raise PermissionDenied()
            ser = FollowupTaskSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            ser.save(order=order)
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(FollowupTaskSerializer(order.followup_tasks.all(), many=True).data)

    @action(detail=True, methods=["patch", "delete"], url_path=r"followups/(?P<task_id>[^/.]+)")
    def followup_detail(self, request, pk=None, task_id=None):
        """Update (e.g. tick as done) or remove one follow-up task of the order."""
        if not has_perm_code(request.user, "crm.edit_status"):
            raise PermissionDenied()
        task = get_object_or_404(self.get_object().followup_tasks, pk=task_id)
        if request.method == "DELETE":
            task.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        ser = FollowupTaskSerializer(task, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        audit(request, "order.export_csv", None, count=queryset.count(), query=request.GET.dict())
        writer = csv.writer(_Echo())

        def rows():
            yield "﻿"  # BOM so Excel opens UTF-8 Vietnamese correctly
            yield writer.writerow(EXPORT_FIELDS)
            for order in queryset.iterator(chunk_size=500):
                yield writer.writerow([_csv_safe(getattr(order, f)) for f in EXPORT_FIELDS])

        response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="twings-crm-export.csv"'
        return response


class AdmissionCampaignViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionCampaignSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["crm.view_leads"],
        "retrieve": ["crm.view_leads"],
        **dict.fromkeys(["create", "update", "partial_update", "destroy"], ["crm.assign_pic"]),
    }

    def get_queryset(self):
        return AdmissionCampaign.objects.prefetch_related("positions").annotate(
            total_enrolled=Count("orders", filter=Q(orders__learning_access=True))
        )


class CohortRolloverView(APIView):
    permission_classes = [require_perms("courses.edit_info", "crm.edit_status")]

    def post(self, request, pk):
        cohort = get_object_or_404(Cohort, pk=pk)
        try:
            moved = rollover_cohort(request, cohort)
        except CheckoutError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"migrated_count": moved, "target_cohort_id": cohort.next_cohort_id})
