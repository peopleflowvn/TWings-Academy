import csv
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, F, OuterRef, Q, Subquery, Sum
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
from .models import Activity, Appointment, FollowupTask, Order
from .serializers import (
    ASSIGN_FIELDS,
    FINANCE_FIELDS,
    PAID_STAGE,
    ActivitySerializer,
    FollowupTaskSerializer,
    OrderSerializer,
    PublicRegistrationSerializer,
)
from .services import CheckoutError, create_public_order, create_staff_lead, rollover_cohort


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


CANCELLED_STAGE = "7. Đã hủy"
CARE_AGAIN_STAGE = "6. Chăm sóc lại"

# CSV export: registrations only (identity documents and addresses stay on the learner page).
EXPORT_FIELDS = [
    "order_code",
    "learner_code",
    "created_at",
    "customer_name",
    "customer_phone",
    "customer_email",
    "course_title",
    "batch_cohort",
    "source",
    "campaign_code",
    "pic",
    "crm_status",
    "interest_level",
    "status",
    "amount",
    "total_paid_amount",
    "training_status",
    "placement_stage",
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
        "assign": ["crm.assign_pic"],
        "pipeline": ["crm.view_leads"],
        "appointments": ["crm.view_leads"],  # booking also checks crm.edit_status
    }
    filterset_fields = [
        "crm_status",
        "status",
        "course",
        "program",
        "cohort",
        "pic",
        "assigned_to",
        "interest_level",
        "source",
        "is_duplicate",
    ]
    search_fields = [
        "order_code",
        "customer_name",
        "customer_phone",
        "customer_email",
        "learner__code",
        "learner__university",
        "batch_cohort",
    ]
    ordering_fields = ["created_at", "updated_at", "amount", "crm_status", "response_due_at", "customer_name"]

    def get_queryset(self):
        qs = Order.objects.select_related("course", "cohort")
        if self.action != "pipeline":
            qs = qs.prefetch_related("timeline_activities", "followup_tasks")
        if self.action in ("list", "export", "pipeline"):
            # Courses of a program order (amount 0, parent = the program order) are not leads of their
            # own: the pipeline shows the program order only (?components=1 to include them).
            if not self.request.query_params.get("components"):
                qs = qs.filter(parent__isnull=True)
            qs = self._pipeline_filters(qs)
        return qs

    def _pipeline_filters(self, qs):
        """
        Lead pipeline filters beyond plain fields: ?scope=<class id> (its leads, or leads carrying its
        code) | none (no class); ?mine=1, ?unassigned=1, ?overdue=1 (first response late);
        ?paid=paid|unpaid.
        """
        from .assignment import overdue_leads

        params = self.request.query_params
        scope = params.get("scope", "")
        if scope == "none":
            qs = qs.filter(cohort__isnull=True)
        elif scope and scope != "all":
            cohort = Cohort.objects.filter(pk=scope).first()
            if cohort is None:
                return qs.none()
            qs = qs.filter(
                Q(cohort=cohort) | (Q(campaign_code__iexact=cohort.code) if cohort.code else Q(pk__in=[]))
            )
        if params.get("mine"):
            qs = qs.filter(assigned_to=self.request.user)
        if params.get("unassigned"):
            qs = qs.filter(assigned_to__isnull=True)
        if params.get("overdue"):
            qs = qs.filter(pk__in=overdue_leads().values("pk"))
        if params.get("paid") == "paid":
            qs = qs.filter(status="paid")
        elif params.get("paid") == "unpaid":
            qs = qs.filter(status="pending")
        return qs

    @staticmethod
    def _sync_pic(serializer, order):
        """The consultant's name (pic) follows the assigned consultant."""
        if "assigned_to" not in serializer.validated_data:
            return
        user = order.assigned_to
        pic = (user.name or user.email)[:100] if user else ""
        if order.pic != pic:
            order.pic = pic
            order.save(update_fields=["pic", "updated_at"])

    def _guard_fields(self, serializer):
        user = self.request.user
        changed = set(serializer.validated_data)
        if changed & FINANCE_FIELDS and not has_perm_code(user, "finance.confirm_manual"):
            raise PermissionDenied("Thông tin thanh toán chỉ Kế toán được chỉnh sửa.")
        if changed & ASSIGN_FIELDS and not has_perm_code(user, "crm.assign_pic"):
            raise PermissionDenied("Cần quyền crm.assign_pic để phân công PIC.")
        other = changed - FINANCE_FIELDS - ASSIGN_FIELDS
        if other and not has_perm_code(user, "crm.edit_status"):
            raise PermissionDenied("Cần quyền crm.edit_status.")
        self._guard_payment_state(serializer)

    @staticmethod
    def _guard_payment_state(serializer):
        """'Paid' (status and the 'Đã đóng phí' stage) follows recorded payments, never a field edit."""
        data, order = serializer.validated_data, serializer.instance
        status = data.get("status", order.status if order else "pending")
        if data.get("crm_status") == PAID_STAGE and status != "paid":
            raise serializers.ValidationError(
                {"crm_status": "Giai đoạn 'Đã đóng phí' chỉ có sau khi ghi nhận thanh toán."}
            )
        if data.get("status") == "paid" and (order is None or order.status != "paid"):
            receivable = (order.total_receivable or order.amount) if order else data.get("amount", 0)
            paid = order.total_paid_amount if order else 0
            if receivable and paid < receivable:
                raise serializers.ValidationError(
                    {
                        "status": "Hãy ghi nhận khoản thu (xác nhận thanh toán) "
                        "thay vì đặt trạng thái 'Đã thanh toán'."
                    }
                )

    def perform_create(self, serializer):
        self._guard_fields(serializer)
        self._sync_pic(serializer, create_staff_lead(self.request, serializer))

    @staticmethod
    def _stage_requirements(serializer):
        """'Chăm sóc lại' needs a call-back day; 'Đã hủy' needs the reason (lost-reason report)."""
        data, order = serializer.validated_data, serializer.instance
        stage = data.get("crm_status")
        if not stage or stage == order.crm_status:
            return None
        if stage == CARE_AGAIN_STAGE and not data.get("next_contact_on"):
            raise serializers.ValidationError(
                {"next_contact_on": "Chọn ngày gọi lại khi chuyển 'Chăm sóc lại'."}
            )
        if stage == CANCELLED_STAGE and not (data.get("lost_reason") or "").strip():
            raise serializers.ValidationError({"lost_reason": "Ghi lý do hủy đăng ký."})
        return stage

    def perform_update(self, serializer):
        from .assignment import mark_first_response, reassign

        self._guard_fields(serializer)
        stage = self._stage_requirements(serializer)
        next_contact_on = serializer.validated_data.pop("next_contact_on", None)
        new_owner = serializer.validated_data.pop("assigned_to", serializer.instance.assigned_to)
        was_new = serializer.instance.crm_status == "1. Mới"
        was_cancelled = serializer.instance.crm_status == CANCELLED_STAGE
        data = serializer.validated_data
        item_changed = ("course" in data or "program" in data) and (
            data.get("course", serializer.instance.course) != serializer.instance.course
            or data.get("program", serializer.instance.program) != serializer.instance.program
        )
        if item_changed:
            from .services import change_registration_item

            sent = self.request.data
            course = data.get("course") if "course_id" in sent else serializer.instance.course
            program = data.get("program") if "program_id" in sent else serializer.instance.program
            if course is not None and "program_id" not in sent:
                program = None  # a course replaces the program
            if program is not None and "course_id" not in sent:
                course = None
            data.pop("course", None)
            data.pop("program", None)
            change_registration_item(serializer.instance, course, program, self.request.user)
            data.pop("cohort", None)  # the new course's open intake was chosen
        else:
            data.pop("course", None)
            data.pop("program", None)
        order = serializer.save()
        if new_owner != order.assigned_to:
            reassign(order, new_owner, self.request.user)
        if stage == CARE_AGAIN_STAGE and next_contact_on:
            FollowupTask.objects.create(
                order=order, title="Gọi lại (chăm sóc lại)", due_date=next_contact_on, priority="medium"
            )
            Activity.objects.create(
                order=order,
                type="note",
                title=f"Chăm sóc lại: hẹn gọi lại ngày {next_contact_on:%d/%m/%Y}",
                actor=self.request.user.name or self.request.user.email,
                actor_user=self.request.user,
            )
        if stage == CANCELLED_STAGE:
            Activity.objects.create(
                order=order,
                type="note",
                title=f"Lý do hủy: {order.lost_reason}",
                actor=self.request.user.name or self.request.user.email,
                actor_user=self.request.user,
            )
        if "crm_status" in serializer.validated_data:
            self._follow_cancel_stage(order, was_cancelled)
        if was_new and order.crm_status != "1. Mới":
            mark_first_response(order)

    def _follow_cancel_stage(self, order, was_cancelled):
        """
        A lead moved to 'Đã hủy' with nothing paid is a cancelled order (no payment reminders; a later
        transfer shows as unmatched for finance); moved out again, it waits for payment again. Orders
        with money received are cancelled by a refund only.
        """
        actor = self.request.user.name or self.request.user.email
        if order.crm_status == CANCELLED_STAGE and order.status == "pending" and not order.total_paid_amount:
            order.status = "cancelled"
            order.save(update_fields=["status", "updated_at"])
            Activity.objects.create(
                order=order,
                type="note",
                title="Hủy đăng ký (chưa thu học phí)",
                actor=actor,
                actor_user=self.request.user,
            )
        elif was_cancelled and order.crm_status != CANCELLED_STAGE and order.status == "cancelled":
            order.status = "pending"
            order.save(update_fields=["status", "updated_at"])
            Activity.objects.create(
                order=order, type="note", title="Mở lại đăng ký", actor=actor, actor_user=self.request.user
            )

    @action(detail=False, methods=["post"])
    def assign(self, request):
        """Give several leads to a consultant at once (or take them back: no consultant)."""
        from apps.accounts.models import User

        from .assignment import reassign

        ids = [str(i) for i in request.data.get("ids") or []][:500]
        target = request.data.get("assigned_to_id")
        user = get_object_or_404(User, pk=str(target), is_active=True, is_staff=True) if target else None
        orders = list(Order.objects.filter(pk__in=ids))
        for order in orders:
            reassign(order, user, request.user)
        audit(request, "crm.bulk_assign", None, count=len(orders), assigned_to=str(user.pk) if user else "")
        return Response({"updated": len(orders)})

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        """Number of leads and amount per stage over every filtered lead (the kanban column headers)."""
        qs = self.filter_queryset(self.get_queryset()).order_by()
        rows = qs.values("crm_status").annotate(count=Count("pk"), amount=Sum("amount"))
        stages = [{"stage": r["crm_status"], "count": r["count"], "amount": r["amount"] or 0} for r in rows]
        return Response(
            {
                "stages": stages,
                "total": sum(s["count"] for s in stages),
                "paid": qs.filter(status="paid").count(),
            }
        )

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
        from .models import Placement

        latest_stage = (
            Placement.objects.filter(order=OuterRef("pk")).order_by("-updated_at").values("stage")[:1]
        )
        queryset = self.filter_queryset(self.get_queryset()).annotate(
            learner_code=F("learner__code"), placement_stage=Subquery(latest_stage)
        )
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


def class_funnels(cohort_ids=None) -> dict:
    """Per class: leads per CRM stage, leads and paid learners (its leads, or leads carrying its code)."""
    classes = Cohort.objects.public()
    if cohort_ids is not None:
        classes = classes.filter(pk__in=cohort_ids)
    by_code = {code.lower(): pk for pk, code in classes.exclude(code="").values_list("pk", "code")}
    ids = set(classes.values_list("pk", flat=True))
    rows = (
        Order.objects.filter(parent__isnull=True)
        .annotate(_code=Lower("campaign_code"))
        .filter(Q(cohort__in=ids) | Q(_code__in=list(by_code)))
        .values_list("cohort_id", "campaign_code", "crm_status", "status")
    )
    funnels: dict = {}
    for cohort_id, code, stage, status_ in rows.iterator():
        for pk in ({cohort_id} & ids) | ({by_code.get((code or "").lower())} - {None}):
            f = funnels.setdefault(pk, {"leads": 0, "paid": 0, "stages": {}})
            f["leads"] += 1
            f["paid"] += status_ == "paid"
            f["stages"][stage] = f["stages"].get(stage, 0) + 1
    return funnels


class CohortRolloverView(APIView):
    permission_classes = [require_perms("courses.edit_info", "crm.edit_status")]

    def post(self, request, pk):
        cohort = get_object_or_404(Cohort.objects.public(), pk=pk)
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
        from .models import FollowupTask

        before = serializer.instance.status
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
        # The next step after a consultation, on the consultant's list.
        next_step = {
            "done": ("Chốt đăng ký sau buổi tư vấn", 1, "high"),
            "no_show": ("Liên hệ lại: học viên không đến buổi hẹn", 0, "high"),
        }.get(appt.status)
        if next_step and before != appt.status:
            title, days, priority = next_step
            FollowupTask.objects.create(
                order=appt.order,
                title=title,
                due_date=timezone.localdate() + timezone.timedelta(days=days),
                priority=priority,
                assigned_to=appt.order.pic,
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
        cv = order.learner.cv_link if order.learner_id else ""
        if not cv.startswith("private:"):
            raise Http404
        name = cv.removeprefix("private:")
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
        from .learners import dossier_missing

        cohort = get_object_or_404(Cohort, pk=pk)
        rows = []
        orders = (
            Order.objects.filter(cohort=cohort)
            .exclude(status__in=("cancelled", "refunded"))
            .select_related("parent", "lms_enrollment", "learner")
            .order_by("customer_name")
        )
        for o in orders:
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
                    "learner_id": o.learner_id,
                    "dossier_missing": dossier_missing(o.learner),
                    "has_cv": bool(o.learner and o.learner.cv_link),
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
                    "lead_manager": user.lead_manager,
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
        changed = [f for f in ("receives_leads", "lead_manager") if f in request.data]
        for field in changed:
            setattr(user, field, bool(request.data.get(field)))
        if changed:
            user.save(update_fields=changed)
        audit(request, "crm.consultant_toggle", user, **{f: getattr(user, f) for f in changed})
        return Response(self._rows())


class MyDayView(APIView):
    """
    A consultant's working list for today (phone first): my leads past their first-response deadline,
    my new leads to contact, my tasks due, my appointments today; the lead managers also get the leads
    nobody owns.
    """

    permission_classes = [require_perms("crm.view_leads")]

    @staticmethod
    def _lead(o):
        return {
            "id": o.pk,
            "order_code": o.order_code,
            "customer_name": o.customer_name,
            "customer_phone": o.customer_phone,
            "course": o.course_title or o.interested_course,
            "crm_status": o.crm_status,
            "response_due_at": o.response_due_at,
            "pic": o.pic,
        }

    def get(self, request):
        from .assignment import OPEN_STAGES, is_lead_manager, my_tasks, overdue_leads

        user, now = request.user, timezone.now()
        today = timezone.localdate()
        overdue = list(overdue_leads().filter(assigned_to=user).order_by("response_due_at")[:50])
        fresh = (
            Order.objects.filter(
                parent__isnull=True,
                assigned_to=user,
                status="pending",
                crm_status="1. Mới",
                first_response_at__isnull=True,
            )
            .exclude(pk__in=[o.pk for o in overdue])
            .order_by("response_due_at")[:50]
        )
        tasks = my_tasks(user).filter(due_date__lte=today).select_related("order").order_by("due_date")[:100]
        end = timezone.localtime(now).replace(hour=23, minute=59)
        appointments = (
            Appointment.objects.filter(
                status="planned", starts_at__gte=now - timedelta(hours=1), starts_at__lte=end
            )
            .filter(order__assigned_to=user)
            .select_related("order")
            .order_by("starts_at")
        )
        data = {
            "overdue": [self._lead(o) for o in overdue],
            "new_leads": [self._lead(o) for o in fresh],
            "tasks": [
                {
                    "id": t.pk,
                    "title": t.title,
                    "due_date": t.due_date,
                    "priority": t.priority,
                    "overdue": bool(t.due_date and t.due_date < today),
                    "lead": self._lead(t.order),
                }
                for t in tasks
            ],
            "appointments": [
                {"id": a.pk, "starts_at": a.starts_at, "channel": a.channel, "lead": self._lead(a.order)}
                for a in appointments
            ],
            "is_lead_manager": is_lead_manager(user),
        }
        if data["is_lead_manager"]:
            unassigned = Order.objects.filter(
                parent__isnull=True, status="pending", assigned_to__isnull=True, crm_status__in=OPEN_STAGES
            ).order_by("created_at")[:100]
            data["unassigned"] = [self._lead(o) for o in unassigned]
            data["team_overdue"] = overdue_leads().count()
        return Response(data)
