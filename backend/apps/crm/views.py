import csv

from django.db import transaction
from django.db.models import Count, Q
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ActionPermission, require_perms
from apps.accounts.rbac import has_perm_code
from apps.catalog.models import Cohort
from apps.core.models import audit

from . import journeys
from .models import Activity, AdmissionCampaign, Appointment, Order
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
        "appointments": ["crm.view_leads"],  # booking also checks crm.edit_status
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
        from .assignment import mark_first_response

        self._guard_fields(serializer)
        was_new = serializer.instance.crm_status == "1. Mới"
        order = serializer.save()
        if was_new and order.crm_status != "1. Mới":
            mark_first_response(order)

    def perform_destroy(self, instance):
        audit(self.request, "order.delete", instance, order_code=instance.order_code)
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def activities(self, request, pk=None):
        order = self.get_object()
        if request.method == "POST":
            if not has_perm_code(request.user, "crm.edit_status"):
                raise PermissionDenied()
            from .assignment import CONTACT_TYPES, mark_first_response

            ser = ActivitySerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            ser.save(order=order, actor=request.user.name or request.user.email, actor_user=request.user)
            if ser.validated_data.get("type") in CONTACT_TYPES:
                mark_first_response(order)
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

    @action(detail=True, methods=["get", "post"])
    def appointments(self, request, pk=None):
        """Consultation appointments of a lead (POST books one and e-mails the lead a confirmation)."""
        from .assignment import send_appointment_confirmation
        from .serializers import AppointmentSerializer

        order = self.get_object()
        if request.method == "GET":
            return Response(AppointmentSerializer(order.appointments.select_related("staff"), many=True).data)
        if not has_perm_code(request.user, "crm.edit_status"):
            raise PermissionDenied()
        ser = AppointmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        appt = ser.save(order=order, staff=ser.validated_data.get("staff") or request.user)
        if order.crm_status in ("1. Mới", "2. Đã tiếp cận", "3. Đang tư vấn"):
            order.crm_status = "4. Hẹn gặp"
            order.save(update_fields=["crm_status", "updated_at"])
        when = timezone.localtime(appt.starts_at)
        Activity.objects.create(
            order=order,
            type="meeting",
            title=f"Đặt lịch tư vấn {when:%H:%M %d/%m} ({appt.get_channel_display()})",
            content=appt.note,
            actor=request.user.name or request.user.email,
            actor_user=request.user,
        )
        from .assignment import mark_first_response

        mark_first_response(order)
        if ser.validated_data.get("notify", True):
            transaction.on_commit(lambda: send_appointment_confirmation(appt))
        return Response(AppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)

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


class JourneyToggleSerializer(serializers.Serializer):
    key = serializers.ChoiceField(choices=list(journeys.JOURNEYS))
    enabled = serializers.BooleanField()


class JourneysView(APIView):
    """Automated journey e-mails: stats (GET), switch on/off (PATCH), send what is due now (POST)."""

    def get_permissions(self):
        codes = ["crm.view_leads"] if self.request.method == "GET" else ["crm.edit_status"]
        return [require_perms(*codes)()]

    def get(self, request):
        return Response(journeys.overview())

    def patch(self, request):
        ser = JourneyToggleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        journeys.set_enabled(ser.validated_data["key"], ser.validated_data["enabled"])
        audit(request, "journeys.toggle", None, **ser.validated_data)
        return Response(journeys.overview())

    def post(self, request):
        result = journeys.run()
        audit(request, "journeys.run", None, result=result)
        return Response({"result": result, "journeys": journeys.overview()})


class AppointmentViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Upcoming consultations (all, or ?mine=1); PATCH records the outcome or reschedules."""

    from .serializers import AppointmentSerializer as serializer_class  # noqa: N813

    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["crm.view_leads"],
        "update": ["crm.edit_status"],
        "partial_update": ["crm.edit_status"],
    }
    filterset_fields = ["status", "channel"]

    def get_queryset(self):
        qs = Appointment.objects.select_related("order", "staff")
        if self.request.query_params.get("mine"):
            qs = qs.filter(staff=self.request.user)
        if self.request.query_params.get("upcoming"):
            qs = qs.filter(starts_at__gte=timezone.now() - timezone.timedelta(hours=2))
        return qs

    def perform_update(self, serializer):
        appt = serializer.save()
        if "starts_at" in serializer.validated_data:
            appt.reminded_at = None
            appt.save(update_fields=["reminded_at", "updated_at"])
        Activity.objects.create(
            order=appt.order,
            type="meeting",
            title=f"Lịch tư vấn: {appt.get_status_display()}",
            content=appt.note,
            actor=self.request.user.name or self.request.user.email,
            actor_user=self.request.user,
        )


class InvoiceRequestViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """VAT invoices learners asked for: issued in the e-invoice software, then the number recorded here."""

    from .serializers import InvoiceRequestSerializer as serializer_class  # noqa: N813

    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["finance.transactions"],
        "update": ["finance.confirm_manual"],
        "partial_update": ["finance.confirm_manual"],
    }
    filterset_fields = ["status"]

    def get_queryset(self):
        from .models import InvoiceRequest

        return InvoiceRequest.objects.select_related("order", "issued_by")

    def perform_update(self, serializer):
        invoice = serializer.save()
        if invoice.status == "issued" and invoice.issued_at is None:
            if not invoice.invoice_number:
                raise serializers.ValidationError({"invoice_number": "Nhập số hóa đơn đã xuất."})
            invoice.issued_at, invoice.issued_by = timezone.now(), self.request.user
            invoice.save(update_fields=["issued_at", "issued_by", "updated_at"])
            Activity.objects.create(
                order=invoice.order,
                type="payment",
                title=f"Đã xuất hóa đơn {invoice.invoice_number}",
                actor=self.request.user.name or self.request.user.email,
                actor_user=self.request.user,
            )
        audit(self.request, "invoice.update", invoice, status=invoice.status, number=invoice.invoice_number)


class OrderCvView(APIView):
    """Download the learner's CV from private storage (staff only, audited)."""

    permission_classes = [require_perms("crm.view_leads")]

    def get(self, request, pk):
        from django.core.files.storage import storages
        from django.http import FileResponse, Http404

        order = get_object_or_404(Order, pk=pk)
        if not order.cv_link.startswith("private:"):
            raise Http404
        name = order.cv_link.removeprefix("private:")
        audit(request, "order.cv_download", order)
        return FileResponse(
            storages["private"].open(name, "rb"),
            as_attachment=True,
            filename=f"CV-{order.order_code}.{name.rsplit('.', 1)[-1]}",
        )


class CohortRosterView(APIView):
    """Class list of an intake: contact, payment, enrolment file and LMS status per learner."""

    permission_classes = [require_perms("courses.view", "crm.view_leads", "lms.view")]

    def get(self, request, pk):
        from apps.sso.account import DOSSIER_REQUIRED

        cohort = get_object_or_404(Cohort, pk=pk)
        rows = []
        orders = (
            Order.objects.filter(cohort=cohort)
            .exclude(status__in=("cancelled", "refunded"))
            .select_related("parent", "lms_enrollment")
            .order_by("customer_name")
        )
        for o in orders:
            file_order = o.parent or o  # program components keep the file on the program order
            enrollment = getattr(o, "lms_enrollment", None)
            billing = o.parent or o
            rows.append(
                {
                    "order_id": o.id,
                    "order_code": o.order_code,
                    "name": o.customer_name,
                    "phone": o.customer_phone,
                    "email": o.customer_email,
                    "learning_access": o.learning_access,
                    "payment": "Đã đóng đủ"
                    if billing.status == "paid"
                    else ("Đang trả góp" if billing.learning_access else "Chưa thanh toán"),
                    "remaining": max(
                        (billing.total_receivable or billing.amount) - billing.total_paid_amount, 0
                    ),
                    "dossier_missing": [f for f in DOSSIER_REQUIRED if not getattr(file_order, f)],
                    "has_cv": bool(file_order.cv_link),
                    "lms_status": enrollment.get_status_display() if enrollment else "",
                    "progress": enrollment.progress if enrollment else None,
                }
            )
        return Response(
            {"cohort": cohort.name, "course": cohort.course.title, "capacity": cohort.capacity, "rows": rows}
        )


class ConsultantsView(APIView):
    """Admissions consultants: open / overdue leads; who receives new leads (crm.assign_pic)."""

    def get_permissions(self):
        return [require_perms("crm.view_leads" if self.request.method == "GET" else "crm.assign_pic")()]

    def _rows(self):
        from .assignment import OPEN_STAGES, consultants, overdue_leads

        overdue = set(overdue_leads().values_list("pk", flat=True))
        rows = []
        for user in consultants().model.objects.filter(is_active=True, is_staff=True, role="sales_crm"):
            open_qs = Order.objects.filter(assigned_to=user, crm_status__in=OPEN_STAGES, status="pending")
            rows.append(
                {
                    "id": user.id,
                    "name": user.name or user.email,
                    "email": user.email,
                    "receives_leads": user.receives_leads,
                    "open_leads": open_qs.count(),
                    "overdue": len(overdue & set(open_qs.values_list("pk", flat=True))),
                }
            )
        return rows

    def get(self, request):
        return Response(self._rows())

    def patch(self, request):
        from apps.accounts.models import User

        user = get_object_or_404(User, pk=str(request.data.get("id", "")), role="sales_crm")
        user.receives_leads = bool(request.data.get("receives_leads"))
        user.save(update_fields=["receives_leads"])
        audit(request, "crm.consultant_toggle", user, receives_leads=user.receives_leads)
        return Response(self._rows())
