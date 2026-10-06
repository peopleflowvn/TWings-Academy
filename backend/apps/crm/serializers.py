from django.utils import timezone
from rest_framework import serializers

from apps.catalog.models import Cohort, Course, Program

from .models import Activity, AdmissionCampaign, CampaignPosition, FollowupTask, Order

PRIVACY_POLICY_VERSION = "2026-10"


class ActivitySerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Activity
        fields = ["id", "type", "title", "content", "actor", "timestamp"]
        read_only_fields = ["id", "actor", "timestamp"]


class FollowupTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowupTask
        fields = ["id", "title", "due_date", "priority", "is_completed", "assigned_to"]


class OrderSerializer(serializers.ModelSerializer):
    course_id = serializers.PrimaryKeyRelatedField(
        source="course", queryset=Course.objects.all(), required=False, allow_null=True
    )
    cohort_id = serializers.PrimaryKeyRelatedField(
        source="cohort", queryset=Cohort.objects.all(), required=False, allow_null=True
    )
    timeline_activities = ActivitySerializer(many=True, read_only=True)
    followup_tasks = FollowupTaskSerializer(many=True, read_only=True)
    duplicate_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        exclude = ["course", "cohort", "citizen_id_index"]
        read_only_fields = [
            "order_code",
            "total_paid_amount",
            "refunded_amount",
            "learning_access",
            "installment_count",
            "program",
            "parent",
            "paid_at",
            "is_duplicate",
            "privacy_consent_at",
            "privacy_consent_version",
            "created_at",
            "updated_at",
        ]

    def get_duplicate_count(self, obj):
        return getattr(obj, "_duplicate_count", None) if obj.is_duplicate else 0


# Field groups that need a specific permission to change (beyond basic CRM editing).
FINANCE_FIELDS = {
    "status",
    "amount",
    "original_amount",
    "discount_amount",
    "discount_code",
    "payment_method",
    "tuition_fee",
    "total_receivable",
    "paid_amount_l1",
    "paid_amount_l2",
    "payment_status_detail",
    "payment_method_detail",
    "payment_date",
    "transaction_code",
    "bank_account_number",
    "bank_name",
    "referral_commission",
    "payment_note",
}
REFERRAL_FIELDS = {
    "referral_reward_amount",
    "referral_reward_status",
    "referral_reward_bank_acc",
    "referral_reward_date",
    "referral_reward_note",
}
ASSIGN_FIELDS = {"pic", "assigned_to"}


class PublicRegistrationSerializer(serializers.Serializer):
    """Fields an anonymous visitor may submit. Everything else is set server-side."""

    course_id = serializers.CharField(max_length=64, required=False)
    program_id = serializers.CharField(max_length=64, required=False)
    pay_in_installments = serializers.BooleanField(default=False)
    customer_name = serializers.CharField(max_length=200)
    customer_phone = serializers.RegexField(r"^\+?[0-9 .\-]{8,20}$", max_length=32)
    customer_email = serializers.EmailField(max_length=254)
    area = serializers.CharField(max_length=100, required=False, allow_blank=True)
    birth_date = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=["Nam", "Nữ", "Khác"], required=False, allow_blank=True)
    university = serializers.CharField(max_length=200, required=False, allow_blank=True)
    major = serializers.CharField(max_length=200, required=False, allow_blank=True)
    graduation_year = serializers.CharField(max_length=10, required=False, allow_blank=True)
    education_level = serializers.CharField(max_length=100, required=False, allow_blank=True)
    consult_need = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    batch_cohort = serializers.CharField(max_length=200, required=False, allow_blank=True)
    campaign_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    referrer_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    referrer_phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    referrer_staff_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    source = serializers.CharField(max_length=100, required=False, allow_blank=True)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    # First / last marketing touch kept by the browser (utm_*, ref, referrer, landing page).
    attribution = serializers.JSONField(required=False)
    privacy_consent = serializers.BooleanField()
    # Honeypot: real users never see or fill this field.
    website = serializers.CharField(required=False, allow_blank=True)

    def validate_attribution(self, value):
        from .attribution import clean

        return clean(value)

    def validate_privacy_consent(self, value):
        if value is not True:
            raise serializers.ValidationError("Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân.")
        return value

    def validate_course_id(self, value):
        course = Course.objects.filter(is_published=True).filter(pk=value).first() or (
            Course.objects.filter(is_published=True, slug=value).first()
        )
        if course is None:
            raise serializers.ValidationError("Khóa học không tồn tại.")
        return course

    def validate_program_id(self, value):
        program = Program.objects.filter(is_published=True).filter(pk=value).first() or (
            Program.objects.filter(is_published=True, slug=value).first()
        )
        if program is None:
            raise serializers.ValidationError("Chương trình không tồn tại.")
        return program

    def validate(self, attrs):
        if bool(attrs.get("course_id")) == bool(attrs.get("program_id")):
            raise serializers.ValidationError({"detail": "Chọn một khóa học hoặc một chương trình."})
        return attrs

    def consent_fields(self):
        return {"privacy_consent_at": timezone.now(), "privacy_consent_version": PRIVACY_POLICY_VERSION}


class CampaignPositionSerializer(serializers.ModelSerializer):
    # Writable so the CMS can send back existing positions (kept) next to new ones (created).
    id = serializers.CharField(required=False)
    course_id = serializers.PrimaryKeyRelatedField(source="course", queryset=Course.objects.all())
    enrolled_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CampaignPosition
        exclude = ["campaign", "course", "created_at", "updated_at"]


class AdmissionCampaignSerializer(serializers.ModelSerializer):
    positions = CampaignPositionSerializer(many=True, required=False)
    total_enrolled = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = AdmissionCampaign
        exclude = ["created_at", "updated_at"]

    def create(self, validated_data):
        positions = validated_data.pop("positions", [])
        campaign = super().create(validated_data)
        self._save_positions(campaign, positions)
        return campaign

    def update(self, instance, validated_data):
        positions = validated_data.pop("positions", None)
        campaign = super().update(instance, validated_data)
        if positions is not None:
            self._save_positions(campaign, positions)
        return campaign

    @staticmethod
    def _save_positions(campaign, positions):
        """The list sent is the new truth: known ids are updated, others created, missing ones removed."""
        keep = []
        for data in positions:
            pid = data.pop("id", None)
            position = campaign.positions.filter(pk=pid).first() if pid else None
            if position is None:
                position = CampaignPosition.objects.create(campaign=campaign, **data)
            else:
                for field, value in data.items():
                    setattr(position, field, value)
                position.save()
            keep.append(position.pk)
        campaign.positions.exclude(pk__in=keep).delete()
