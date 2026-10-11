"""Staff API of learners: the list, one learner's page (details, registrations, history), edit, merge."""

from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import ActionPermission
from apps.accounts.rbac import has_perm_code
from apps.core.models import audit

from .learners import CONTACT_FIELDS, PERSON_FIELDS, merge_learners, update_learner
from .models import Activity, Appointment, Learner, Order, Placement

# Identity documents and addresses: on one learner's page only, never in the list.
PRIVATE_FIELDS = ("citizen_id", "permanent_address", "current_residence")


class LearnerSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True, default="")
    registrations = serializers.IntegerField(read_only=True, default=0)
    paid_registrations = serializers.IntegerField(read_only=True, default=0)
    last_registration_at = serializers.DateTimeField(read_only=True, default=None)

    class Meta:
        model = Learner
        exclude = ["citizen_id_index", "phone_index"]
        read_only_fields = ["code", "owner", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        view = self.context.get("view")
        if getattr(view, "action", None) == "list":
            for field in PRIVATE_FIELDS:
                data.pop(field, None)
        return data


def _registration(o: Order) -> dict:
    enrollment = getattr(o, "lms_enrollment", None)
    return {
        "id": o.pk,
        "order_code": o.order_code,
        "course_title": o.course_title,
        "batch_cohort": o.batch_cohort,
        "campaign_code": o.campaign_code,
        "crm_status": o.crm_status,
        "status": o.status,
        "amount": o.total_receivable or o.amount,
        "total_paid_amount": o.total_paid_amount,
        "learning_access": o.learning_access,
        "pic": o.pic,
        "source": o.source,
        "training_status": o.training_status,
        "lms_status": enrollment.get_status_display() if enrollment else "",
        "progress": enrollment.progress if enrollment else None,
        "created_at": o.created_at,
    }


class LearnerViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    serializer_class = LearnerSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["crm.view_leads"],
        "retrieve": ["crm.view_leads"],
        "update": ["crm.edit_status"],
        "partial_update": ["crm.edit_status"],
        "merge": ["crm.assign_pic"],
    }
    filterset_fields = ["owner"]
    search_fields = ["code", "full_name", "phone", "email", "university"]
    ordering_fields = ["created_at", "full_name", "last_registration_at"]

    def get_queryset(self):
        qs = Learner.objects.select_related("owner").annotate(
            registrations=Count("orders", filter=Q(orders__parent__isnull=True), distinct=True),
            paid_registrations=Count(
                "orders", filter=Q(orders__parent__isnull=True, orders__status="paid"), distinct=True
            ),
            last_registration_at=Max("orders__created_at"),
        )
        if self.request.query_params.get("mine"):
            qs = qs.filter(owner=self.request.user)
        return qs.order_by("-last_registration_at", "-created_at")

    def retrieve(self, request, *args, **kwargs):
        learner = self.get_object()
        orders = list(
            learner.orders.filter(parent__isnull=True)
            .select_related("lms_enrollment")
            .order_by("-created_at")
        )
        order_ids = list(learner.orders.values_list("pk", flat=True))
        codes = {o.pk: (o.order_code, o.course_title) for o in learner.orders.all()}
        history = [
            {
                "id": a.pk,
                "type": a.type,
                "title": a.title,
                "content": a.content,
                "actor": a.actor,
                "timestamp": a.created_at,
                "order_id": a.order_id,
                "order_code": codes.get(a.order_id, ("", ""))[0],
                "course_title": codes.get(a.order_id, ("", ""))[1],
            }
            for a in Activity.objects.filter(order_id__in=order_ids).order_by("-created_at")[:200]
        ]
        appointments = [
            {
                "id": a.pk,
                "order_id": a.order_id,
                "starts_at": a.starts_at,
                "channel": a.get_channel_display(),
                "status": a.get_status_display(),
                "staff_name": a.staff.name if a.staff else "",
                "note": a.note,
            }
            for a in Appointment.objects.filter(order_id__in=order_ids)
            .select_related("staff")
            .order_by("-starts_at")
        ]
        placements = [
            {
                "id": p.pk,
                "order_id": p.order_id,
                "employer": p.employer,
                "job_title": p.job_title,
                "stage": p.get_stage_display(),
                "start_date": p.start_date,
            }
            for p in Placement.objects.filter(order_id__in=order_ids).order_by("-created_at")
        ]
        data = self.get_serializer(learner).data
        data.update(
            {
                "registrations": [_registration(o) for o in orders],
                "history": history,
                "appointments": appointments,
                "placements": placements,
            }
        )
        return Response(data)

    def perform_update(self, serializer):
        learner = serializer.instance
        values = {
            k: v for k, v in serializer.validated_data.items() if k in PERSON_FIELDS or k in CONTACT_FIELDS
        }
        if "owner_id" in self.request.data:
            if not has_perm_code(self.request.user, "crm.assign_pic"):
                raise PermissionDenied("Cần quyền crm.assign_pic để đổi tư vấn viên phụ trách.")
            owner = self.request.data.get("owner_id") or None
            learner.owner_id = owner
            learner.save(update_fields=["owner", "updated_at"])
        if "note" in serializer.validated_data:
            learner.note = serializer.validated_data["note"]
            learner.save(update_fields=["note", "updated_at"])
        update_learner(learner, values)  # and every registration of the person
        audit(self.request, "learner.update", learner, fields=sorted(values))

    @action(detail=True, methods=["post"])
    def merge(self, request, pk=None):
        """Same person recorded twice: ?other=<id> joins this learner (registrations, history)."""
        keep = self.get_object()
        other = get_object_or_404(Learner, pk=str(request.data.get("other", "")))
        if other.pk == keep.pk:
            return Response({"detail": "Chọn một hồ sơ khác để gộp."}, status=400)
        merge_learners(keep, other, request)
        return self.retrieve(request, pk=keep.pk)
