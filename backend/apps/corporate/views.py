"""Staff API of corporate training (/api/v1/staff/corporate/…), scoped to the user's clients."""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import ActionPermission
from apps.catalog.models import Course
from apps.core.models import audit

from . import services
from .models import (
    AttendanceAdjustment,
    ClientUnit,
    CorporateClass,
    CorporateEnrollment,
    ImportBatch,
    ImportTemplate,
    ResultSnapshot,
    ServiceContract,
    TrainingPlan,
)
from .permissions import in_scope, scoped_clients
from .serializers import (
    AdjustmentRequestSerializer,
    AttendanceAdjustmentSerializer,
    CancelSerializer,
    ClientUnitSerializer,
    CorporateClassSerializer,
    CorporateClientSerializer,
    CorporateEnrollmentSerializer,
    ImportBatchSerializer,
    ImportTemplateSerializer,
    ImportUploadSerializer,
    ListLearnerSerializer,
    ResultSnapshotSerializer,
    SelfmarkSerializer,
    ServiceContractSerializer,
    TrainingPlanSerializer,
    TransferSerializer,
)

READ = ["list", "retrieve"]


def perm_map(write: str, **extra) -> dict:
    mapping = dict.fromkeys(READ, ["corporate.view"])
    mapping.update(dict.fromkeys(["create", "update", "partial_update"], [write]))
    mapping.update({name: [code] for name, code in extra.items()})
    return mapping


def _rule(call):
    """Run a service call; a business rule refusal becomes a 400 with its message."""
    try:
        return call()
    except services.CorporateError as exc:
        raise serializers.ValidationError({"detail": str(exc)}) from exc


class _Scoped:
    """Rows of the user's clients only; writes may not point at another client."""

    client_path = "client"

    def scoped(self, queryset):
        return queryset.filter(**{f"{self.client_path}__in": scoped_clients(self.request.user)})

    def check_client(self, client):
        if not in_scope(self.request.user, client):
            raise PermissionDenied("Không có quyền với khách hàng này.")


class CorporateClientViewSet(
    _Scoped, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = CorporateClientSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map("corporate.clients")
    search_fields = ["name", "code", "tax_code"]
    filterset_fields = ["is_active"]

    def get_queryset(self):
        return scoped_clients(self.request.user).annotate(
            classes_count=Count("classes", distinct=True),
            active_contracts=Count("contracts", filter=Q(contracts__status="active"), distinct=True),
        )

    def perform_create(self, serializer):
        serializer.instance = services.create_client(**serializer.validated_data)
        audit(self.request, "corporate.client_create", serializer.instance)

    def perform_update(self, serializer):
        audit(
            self.request,
            "corporate.client_update",
            serializer.save(),
            fields=sorted(serializer.validated_data),
        )


class ClientUnitViewSet(
    _Scoped, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = ClientUnitSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map("corporate.clients")
    filterset_fields = ["client", "kind"]
    pagination_class = None

    def get_queryset(self):
        return self.scoped(ClientUnit.objects.all())

    def perform_create(self, serializer):
        self.check_client(serializer.validated_data["client"])
        serializer.save()

    def perform_update(self, serializer):
        self.check_client(serializer.validated_data.get("client", serializer.instance.client))
        serializer.save()


class ServiceContractViewSet(
    _Scoped, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = ServiceContractSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map("corporate.clients")
    filterset_fields = ["client", "status"]
    search_fields = ["number", "title"]

    def get_queryset(self):
        return self.scoped(ServiceContract.objects.select_related("client").prefetch_related("rates__course"))

    def perform_create(self, serializer):
        self.check_client(serializer.validated_data["client"])
        audit(self.request, "corporate.contract_create", serializer.save())

    def perform_update(self, serializer):
        self.check_client(serializer.validated_data.get("client", serializer.instance.client))
        audit(
            self.request,
            "corporate.contract_update",
            serializer.save(),
            fields=sorted(serializer.validated_data),
        )


class TrainingPlanViewSet(
    _Scoped, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = TrainingPlanSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map("corporate.classes", approve="corporate.approve", revise="corporate.classes")
    filterset_fields = ["client", "status", "contract"]
    search_fields = ["name", "period"]

    def get_queryset(self):
        return self.scoped(
            TrainingPlan.objects.select_related("client", "approved_by").prefetch_related(
                "lines__course", "lines__unit", "lines__pic", "lines__classes"
            )
        )

    def perform_create(self, serializer):
        self.check_client(serializer.validated_data["client"])
        audit(self.request, "corporate.plan_create", serializer.save())

    def perform_update(self, serializer):
        self.check_client(serializer.validated_data.get("client", serializer.instance.client))
        audit(self.request, "corporate.plan_update", serializer.save())

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        plan = _rule(lambda: services.approve_plan(self.get_object(), request.user))
        audit(request, "corporate.plan_approve", plan, version=plan.version)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"])
    def revise(self, request, pk=None):
        plan = _rule(lambda: services.revise_plan(self.get_object()))
        audit(request, "corporate.plan_revise", plan, version=plan.version)
        return Response(self.get_serializer(plan).data, status=201)


class CorporateClassViewSet(
    _Scoped, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = CorporateClassSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(
        "corporate.classes",
        enrollments="corporate.view",
        add_learner="corporate.classes",
        invitations="corporate.view",
        send_invitations="corporate.communications_send",
        attendance="corporate.view",
        surveys="corporate.view",
        refresh_surveys="corporate.classes",
        compute_results="corporate.classes",
        reopen="corporate.results_publish",
        adjust_attendance="corporate.attendance_adjust",
        selfmark="corporate.classes",
    )
    filterset_fields = ["client", "status", "contract", "plan_line"]
    search_fields = ["cohort__name", "cohort__course__title"]

    def get_queryset(self):
        return self.scoped(
            CorporateClass.objects.select_related(
                "cohort__course", "cohort__lead_instructor", "client", "contract", "pic"
            ).annotate(
                learners=Count(
                    "enrollments",
                    filter=Q(enrollments__status__in=CorporateEnrollment.STUDYING),
                    distinct=True,
                ),
                sessions=Count("cohort__sessions", distinct=True),
            )
        )

    def perform_create(self, serializer):
        data = dict(serializer.validated_data)
        cohort_fields = data.pop("cohort", {})
        name = cohort_fields.pop("name")
        course = Course.objects.filter(pk=data.pop("course_id")).first()
        if course is None:
            raise serializers.ValidationError({"course_id": "Không tìm thấy khóa học."})
        self.check_client(data["client"])
        serializer.instance = _rule(
            lambda: services.create_class(course=course, name=name, cohort_fields=cohort_fields, **data)
        )
        audit(
            self.request, "corporate.class_create", serializer.instance, cohort=serializer.instance.cohort_id
        )

    def perform_update(self, serializer):
        corporate_class = serializer.instance
        data = dict(serializer.validated_data)
        cohort_fields = data.pop("cohort", {})
        cohort = corporate_class.cohort
        if "name" in cohort_fields and cohort_fields["name"] != cohort.name:
            taken = type(cohort).objects.filter(course=cohort.course, name=cohort_fields["name"]).exists()
            if taken:
                raise serializers.ValidationError({"name": "Khóa học này đã có lớp / đợt trùng tên."})
        for field, value in cohort_fields.items():
            setattr(cohort, field, value)
        if cohort_fields:
            cohort.save()
        for field, value in data.items():
            setattr(corporate_class, field, value)
        corporate_class.save()
        audit(self.request, "corporate.class_update", corporate_class, fields=sorted([*cohort_fields, *data]))

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        rows = (
            self.get_object()
            .enrollments.select_related("learner", "employee__unit", "lms_enrollment")
            .order_by("learner__full_name")
        )
        return Response(CorporateEnrollmentSerializer(rows, many=True).data)

    @enrollments.mapping.post
    def add_learner(self, request, pk=None):
        corporate_class = self.get_object()
        ser = ListLearnerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        unit = data.pop("unit", None)
        if unit is not None and unit.client_id != corporate_class.client_id:
            raise serializers.ValidationError({"unit": "Đơn vị thuộc khách hàng khác."})
        learner = services.find_or_create_learner(
            full_name=data.pop("full_name"), email=data.pop("email"), phone=data.pop("phone")
        )
        employment = {k: v for k, v in data.items() if v} | ({"unit": unit} if unit else {})
        listing = _rule(lambda: services.list_learner(corporate_class, learner, **employment))
        audit(request, "corporate.enrollment_add", listing, corporate_class=corporate_class.pk)
        return Response(CorporateEnrollmentSerializer(listing).data, status=201)

    @action(detail=True, methods=["get"])
    def invitations(self, request, pk=None):
        """Preview: who gets the class invitation (To, CC allowed, CC refused by the policy)."""
        from .communications import invitation_rows

        only_new = request.query_params.get("all") != "1"
        rows = invitation_rows(self.get_object(), only_new)
        return Response(
            [
                {
                    "enrollment": r["listing"].pk,
                    "name": r["listing"].learner.full_name,
                    "to": r["to"],
                    "cc": r["cc"],
                    "rejected": r["rejected"],
                    "invited_at": r["listing"].invited_at,
                }
                for r in rows
            ]
        )

    @invitations.mapping.post
    def send_invitations(self, request, pk=None):
        from .communications import send_invitations

        corporate_class = self.get_object()
        if not corporate_class.cohort.sessions.exists():
            raise serializers.ValidationError(
                {"detail": "Lớp chưa có lịch học: tạo lịch trước khi gửi thư mời."}
            )
        result = send_invitations(corporate_class, sent_by=request.user, only_new=not request.data.get("all"))
        audit(request, "corporate.invitations_send", corporate_class, **result)
        return Response(result)

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        from .attendance import sheet

        return Response(sheet(self.get_object()))

    @attendance.mapping.post
    def adjust_attendance(self, request, pk=None):
        """Ask for a correction of one session's attendance (counts once approved)."""
        from .attendance import request_adjustment

        corporate_class = self.get_object()
        ser = AdjustmentRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        listing = get_object_or_404(corporate_class.enrollments, pk=data["enrollment"])
        session = get_object_or_404(corporate_class.cohort.sessions, pk=data["session"])
        adjustment = _rule(
            lambda: request_adjustment(
                listing,
                session,
                status=data["status"],
                reason=data["reason"],
                evidence=data["evidence"],
                user=request.user,
            )
        )
        audit(request, "corporate.attendance_adjust", adjustment, status=adjustment.status)
        return Response(AttendanceAdjustmentSerializer(adjustment).data, status=201)

    @action(detail=True, methods=["post"])
    def selfmark(self, request, pk=None):
        """Turn QR self check-in on / off for one session (on by default for corporate classes)."""
        from apps.lms import moodle
        from apps.lms.learning import set_selfmark

        corporate_class = self.get_object()
        ser = SelfmarkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        session = get_object_or_404(corporate_class.cohort.sessions, pk=ser.validated_data["session"])
        if not (moodle.is_configured() and session.moodle_attendance_session_id):
            raise serializers.ValidationError({"detail": "Buổi học chưa được đưa lên Moodle."})
        if not set_selfmark(session, ser.validated_data["enabled"]):
            raise serializers.ValidationError({"detail": "Moodle chưa nhận thay đổi, thử lại sau."})
        audit(request, "corporate.attendance_selfmark", session, enabled=ser.validated_data["enabled"])
        return Response({"session": session.pk, "enabled": ser.validated_data["enabled"]})

    @action(detail=True, methods=["get"])
    def surveys(self, request, pk=None):
        from .surveys import summary

        return Response(summary(self.get_object()))

    @surveys.mapping.post
    def refresh_surveys(self, request, pk=None):
        """Read the surveys' results from Moodle now (otherwise every learning refresh does)."""
        from apps.lms import moodle

        from .surveys import summary, sync_surveys

        corporate_class = self.get_object()
        if not moodle.is_configured():
            raise serializers.ValidationError({"detail": "LMS chưa cấu hình."})
        sync_surveys(corporate_class)
        return Response(summary(corporate_class))

    @action(detail=True, methods=["post"], url_path="results")
    def compute_results(self, request, pk=None):
        """Recompute the draft results from the verified attendance, grades and surveys."""
        from .results import draft

        snapshot = _rule(lambda: draft(self.get_object(), request.user))
        return Response(ResultSnapshotSerializer(snapshot).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        """Unlock published results for corrections: the next publish is a new version."""
        from .results import reopen

        snapshot = _rule(lambda: reopen(self.get_object(), request.user))
        audit(request, "corporate.results_reopen", snapshot.corporate_class, version=snapshot.version)
        return Response(ResultSnapshotSerializer(snapshot).data)


class ResultSnapshotViewSet(_Scoped, viewsets.ReadOnlyModelViewSet):
    serializer_class = ResultSnapshotSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["corporate.view"],
        "retrieve": ["corporate.view"],
        "publish": ["corporate.results_publish"],
        "export": ["corporate.view"],
    }
    client_path = "corporate_class__client"
    filterset_fields = ["corporate_class", "status"]

    def get_queryset(self):
        return self.scoped(
            ResultSnapshot.objects.select_related(
                "corporate_class__cohort__course", "created_by", "published_by"
            )
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        from .results import publish

        snapshot = _rule(lambda: publish(self.get_object(), request.user))
        audit(request, "corporate.results_publish", snapshot, version=snapshot.version, kpis=snapshot.kpis)
        return Response(self.get_serializer(snapshot).data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        from django.http import HttpResponse

        from .results import export_xlsx

        snapshot = self.get_object()
        response = HttpResponse(
            export_xlsx(snapshot),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        name = f"ket-qua-{snapshot.corporate_class.client.code}-v{snapshot.version}.xlsx"
        response["Content-Disposition"] = f'attachment; filename="{name}"'
        audit(request, "corporate.results_export", snapshot)
        return response


class AttendanceAdjustmentViewSet(_Scoped, viewsets.ReadOnlyModelViewSet):
    """Attendance corrections waiting for (or after) a decision."""

    serializer_class = AttendanceAdjustmentSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["corporate.view"],
        "retrieve": ["corporate.view"],
        "approve": ["corporate.approve"],
        "reject": ["corporate.approve"],
    }
    client_path = "enrollment__corporate_class__client"
    filterset_fields = ["decision", "enrollment__corporate_class"]

    def get_queryset(self):
        return self.scoped(
            AttendanceAdjustment.objects.select_related(
                "enrollment__learner",
                "enrollment__corporate_class__cohort",
                "session",
                "requested_by",
                "decided_by",
            )
        )

    def _decide(self, request, approve: bool):
        from .attendance import decide

        adjustment = _rule(lambda: decide(self.get_object(), approve=approve, user=request.user))
        audit(request, "corporate.attendance_decide", adjustment, decision=adjustment.decision)
        return Response(self.get_serializer(adjustment).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._decide(request, True)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._decide(request, False)


class CorporateEnrollmentViewSet(_Scoped, viewsets.GenericViewSet):
    serializer_class = CorporateEnrollmentSerializer
    permission_classes = [ActionPermission]
    permission_map = {"cancel": ["corporate.classes"], "transfer": ["corporate.classes"]}
    client_path = "corporate_class__client"

    def get_queryset(self):
        return self.scoped(
            CorporateEnrollment.objects.select_related("learner", "employee__unit", "corporate_class__client")
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        ser = CancelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        listing = services.cancel_listing(self.get_object(), ser.validated_data["note"])
        audit(request, "corporate.enrollment_cancel", listing)
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        ser = TransferSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        listing = self.get_object()
        target = get_object_or_404(self.scoped_classes(), pk=ser.validated_data["target_class"].pk)
        new = _rule(lambda: services.transfer_listing(listing, target))
        audit(request, "corporate.enrollment_transfer", new, transferred_from=listing.pk)
        return Response(self.get_serializer(new).data, status=201)

    def scoped_classes(self):
        return CorporateClass.objects.filter(client__in=scoped_clients(self.request.user))


class ImportTemplateViewSet(
    _Scoped, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    serializer_class = ImportTemplateSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map("corporate.import")
    filterset_fields = ["client", "kind", "is_active"]
    pagination_class = None

    def get_queryset(self):
        return self.scoped(ImportTemplate.objects.all())

    def perform_create(self, serializer):
        self.check_client(serializer.validated_data["client"])
        serializer.save()

    def perform_update(self, serializer):
        self.check_client(serializer.validated_data.get("client", serializer.instance.client))
        serializer.save()


class ImportBatchViewSet(_Scoped, mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """Upload an Excel file (preview), then confirm or cancel it."""

    serializer_class = ImportBatchSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["corporate.view"],
        "retrieve": ["corporate.view"],
        "create": ["corporate.import"],
        "confirm": ["corporate.import"],
        "cancel": ["corporate.import"],
    }
    filterset_fields = ["client", "kind", "status", "corporate_class", "plan"]

    def get_queryset(self):
        return self.scoped(ImportBatch.objects.select_related("created_by"))

    def create(self, request, *args, **kwargs):
        from . import imports

        ser = ImportUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        target = data.get("corporate_class") or data.get("plan")
        if target is None:
            raise serializers.ValidationError({"detail": "Chọn lớp hoặc kế hoạch để nhập vào."})
        self.check_client(target.client)
        batch = _rule(
            lambda: imports.create_batch(
                client=target.client,
                kind=data["kind"],
                upload=data["file"],
                user=request.user,
                corporate_class=data.get("corporate_class"),
                plan=data.get("plan"),
                template=data.get("template"),
            )
        )
        audit(request, "corporate.import_preview", batch, kind=batch.kind, summary=batch.summary)
        return Response(self.get_serializer(batch).data, status=201)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        from . import imports

        batch = _rule(lambda: imports.confirm(self.get_object()))
        audit(request, "corporate.import_confirm", batch, applied=batch.summary.get("applied"))
        return Response(self.get_serializer(batch).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        batch = self.get_object()
        if batch.status == "previewed":
            batch.status = "cancelled"
            batch.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(batch).data)
