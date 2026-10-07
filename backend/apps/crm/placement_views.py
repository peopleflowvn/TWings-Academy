"""Staff API for journey steps 9-10 (job referrals, partner links, post-placement, outcomes)."""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.core.models import audit

from . import placement as svc
from .models import CampaignPosition, Order, PartnerShare, Placement

VIEW = ("placement.view", "placement.manage")


def _check(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except svc.PlacementError as exc:
        raise serializers.ValidationError({"detail": str(exc)}) from exc


class ReferSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    position_id = serializers.CharField(required=False, allow_blank=True)
    employer = serializers.CharField(max_length=200, required=False, allow_blank=True)
    unit = serializers.CharField(max_length=200, required=False, allow_blank=True)
    job_title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class PlacementListView(APIView):
    def get_permissions(self):
        return [require_perms(*(VIEW if self.request.method == "GET" else ("placement.manage",)))()]

    def get(self, request):
        qs = svc.placements_qs()
        if stage := request.query_params.get("stage"):
            qs = qs.filter(stage=stage)
        if order := request.query_params.get("order"):
            qs = qs.filter(order_id=order)
        qs = svc.search_filter(qs, request.query_params.get("q", ""))
        return Response([svc.placement_data(p) for p in qs[:500]])

    def post(self, request):
        ser = ReferSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        order = get_object_or_404(
            Order.objects.select_related("lms_enrollment__certificate"), pk=data["order_id"]
        )
        position = (
            get_object_or_404(CampaignPosition, pk=data["position_id"]) if data.get("position_id") else None
        )
        p = _check(
            svc.refer,
            order,
            request.user,
            position=position,
            employer=data.get("employer", ""),
            unit=data.get("unit", ""),
            job_title=data.get("job_title", ""),
        )
        audit(request, "placement.refer", p, order=order.order_code)
        return Response(svc.placement_data(svc.placements_qs().get(pk=p.pk)), status=201)


class MoveSerializer(serializers.Serializer):
    stage = serializers.ChoiceField([s for s, _ in Placement.STAGE_CHOICES])
    interview_at = serializers.DateTimeField(required=False, allow_null=True)
    interview_location = serializers.CharField(max_length=300, required=False, allow_blank=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    offer_salary = serializers.CharField(max_length=100, required=False, allow_blank=True)
    reason = serializers.CharField(max_length=300, required=False, allow_blank=True)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    notify = serializers.BooleanField(default=True)


class PlacementMoveView(APIView):
    permission_classes = [require_perms("placement.manage")]

    def post(self, request, pk):
        p = get_object_or_404(Placement.objects.select_related("order", "staff"), pk=pk)
        ser = MoveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        _check(
            svc.move,
            p,
            d["stage"],
            user=request.user,
            notify=d["notify"],
            interview_at=d.get("interview_at"),
            interview_location=d.get("interview_location", ""),
            start_date=d.get("start_date"),
            offer_salary=d.get("offer_salary", ""),
            reason=d.get("reason", ""),
            note=d.get("note", ""),
        )
        audit(request, "placement.move", p, stage=d["stage"])
        return Response(svc.placement_data(svc.placements_qs().get(pk=pk)))


class OutcomeSerializer(serializers.Serializer):
    probation_result = serializers.ChoiceField(
        [c for c, _ in Placement.PROBATION_CHOICES], required=False, allow_blank=True
    )
    left_at = serializers.DateField(required=False, allow_null=True)
    left_reason = serializers.CharField(max_length=300, required=False, allow_blank=True)


class PlacementOutcomeView(APIView):
    """Step 10: probation result / leaving the job."""

    permission_classes = [require_perms("placement.manage")]

    def post(self, request, pk):
        p = get_object_or_404(Placement.objects.select_related("order", "staff"), pk=pk)
        ser = OutcomeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        _check(
            svc.record_outcome,
            p,
            user=request.user,
            probation_result=d.get("probation_result"),
            left_at=d.get("left_at"),
            left_reason=d.get("left_reason", ""),
        )
        audit(request, "placement.outcome", p, **{k: str(v) for k, v in d.items()})
        return Response(svc.placement_data(svc.placements_qs().get(pk=pk)))


class CandidatesView(APIView):
    """Graduates waiting for a referral (or a new one within the job guarantee)."""

    permission_classes = [require_perms(*VIEW)]

    def get(self, request):
        return Response(svc.candidates())


class OutcomesView(APIView):
    permission_classes = [require_perms(*VIEW, "lms.view")]

    def get(self, request):
        return Response(svc.outcomes())


class ShareSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    employer = serializers.CharField(max_length=200, required=False, allow_blank=True)
    placement_ids = serializers.ListField(child=serializers.CharField(), min_length=1, max_length=100)
    allow_cv = serializers.BooleanField(default=True)
    days = serializers.IntegerField(min_value=1, max_value=90, default=svc.SHARE_DAYS)


class ShareListView(APIView):
    def get_permissions(self):
        return [require_perms(*(VIEW if self.request.method == "GET" else ("placement.manage",)))()]

    def get(self, request):
        return Response([svc.share_data(s) for s in PartnerShare.objects.select_related("created_by")[:100]])

    def post(self, request):
        ser = ShareSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        placements = list(
            Placement.objects.filter(pk__in=d["placement_ids"], stage__in=svc.OPEN_STAGES).select_related(
                "order", "staff"
            )
        )
        if len(placements) != len(set(d["placement_ids"])):
            raise serializers.ValidationError(
                {"detail": "Chỉ gửi được hồ sơ đang trong quá trình giới thiệu."}
            )
        share, token = _check(
            svc.create_share,
            placements,
            request.user,
            title=d["title"],
            employer=d.get("employer") or "MSB",
            allow_cv=d["allow_cv"],
            days=d["days"],
        )
        audit(request, "placement.share_create", share, candidates=len(placements), days=d["days"])
        return Response({**svc.share_data(share), "url": svc.share_url(token)}, status=201)


class ShareRevokeView(APIView):
    permission_classes = [require_perms("placement.manage")]

    def post(self, request, pk):
        share = get_object_or_404(PartnerShare, pk=pk)
        if share.revoked_at is None:
            share.revoked_at = timezone.now()
            share.save(update_fields=["revoked_at", "updated_at"])
        audit(request, "placement.share_revoke", share)
        return Response(svc.share_data(share))
