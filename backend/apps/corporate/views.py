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
    ClientUnit,
    CorporateClass,
    CorporateEnrollment,
    ServiceContract,
    TrainingPlan,
)
from .permissions import in_scope, scoped_clients
from .serializers import (
    CancelSerializer,
    ClientUnitSerializer,
    CorporateClassSerializer,
    CorporateClientSerializer,
    CorporateEnrollmentSerializer,
    ListLearnerSerializer,
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
        "corporate.classes", enrollments="corporate.view", add_learner="corporate.classes"
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
