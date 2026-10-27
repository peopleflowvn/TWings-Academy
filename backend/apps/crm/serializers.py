from django.utils import timezone
from rest_framework import serializers

from apps.catalog.models import Cohort, Course, Program

from .models import (
    Activity,
    Appointment,
    FollowupTask,
    Learner,
    Order,
)

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
        fields = ["id", "title", "due_date", "priority", "is_completed", "assigned_to", "owner"]
        read_only_fields = ["owner"]


class OrderSerializer(serializers.ModelSerializer):
    course_id = serializers.PrimaryKeyRelatedField(
        source="course", queryset=Course.objects.all(), required=False, allow_null=True
    )
    cohort_id = serializers.PrimaryKeyRelatedField(
        source="cohort", queryset=Cohort.objects.public(), required=False, allow_null=True
    )
    program_id = serializers.PrimaryKeyRelatedField(
        source="program", queryset=Program.objects.all(), required=False, allow_null=True
    )
    timeline_activities = ActivitySerializer(many=True, read_only=True)
    followup_tasks = FollowupTaskSerializer(many=True, read_only=True)
    # Moving a lead to '6. Chăm sóc lại' needs the day to call back (a task is created for it).
    next_contact_on = serializers.DateField(write_only=True, required=False)
    duplicate_count = serializers.SerializerMethodField()
    related_orders = serializers.SerializerMethodField()
    learner_id = serializers.PrimaryKeyRelatedField(
        source="learner", queryset=Learner.objects.all(), required=False, allow_null=True
    )
    learner_code = serializers.CharField(source="learner.code", read_only=True, default="")
    learner_profile = serializers.SerializerMethodField()

    class Meta:
        model = Order
        exclude = ["course", "cohort", "learner", "program"]
        read_only_fields = [
            "order_code",
            "total_paid_amount",
            "refunded_amount",
            "learning_access",
            "installment_count",
            "parent",
            "paid_at",
            "is_duplicate",
            "privacy_consent_at",
            "privacy_consent_version",
            "overdue_alerted_at",
            "escalated_at",
            "response_due_at",
            "first_response_at",
            "created_at",
            "updated_at",
        ]

    def _is_list(self) -> bool:
        view = self.context.get("view")
        return getattr(view, "action", None) == "list"

    def get_related_orders(self, obj):
        """The learner's other registrations, in one order's detail only."""
        if self._is_list() or not obj.learner_id:
            return None if self._is_list() else []
        others = Order.objects.filter(learner_id=obj.learner_id, parent__isnull=True).exclude(pk=obj.pk)
        others = others.order_by("-created_at")[:20]
        return [
            {
                "id": o.pk,
                "order_code": o.order_code,
                "course_title": o.course_title,
                "status": o.status,
                "crm_status": o.crm_status,
                "created_at": o.created_at,
            }
            for o in others
        ]

    def get_learner_profile(self, obj):
        """The person behind one registration (detail only; the CCCD is masked, the learner page has it)."""
        learner = obj.learner
        if self._is_list() or learner is None:
            return None
        from .learners import dossier_missing

        cid = learner.citizen_id or ""
        return {
            "id": learner.pk,
            "code": learner.code,
            "full_name": learner.full_name,
            "phone": learner.phone,
            "email": learner.email,
            "birth_date": learner.birth_date,
            "gender": learner.gender,
            "area": learner.area,
            "current_residence": learner.current_residence,
            "education_level": learner.education_level,
            "university": learner.university,
            "major": learner.major,
            "citizen_id_masked": f"•••••••••{cid[-3:]}" if cid else "",
            "has_cv": learner.cv_link.startswith("private:"),
            "dossier_missing": dossier_missing(learner),
        }

    def get_duplicate_count(self, obj):
        # Counted for one order (detail); the list only flags duplicates (no query per row).
        if not obj.is_duplicate:
            return 0
        from .learners import active_duplicates

        return None if self._is_list() else active_duplicates(obj).count()


PAID_STAGE = "5. Đã đóng phí"

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
    # Checkout only: terms of service (/dieu-khoan) accepted, optional VAT invoice details.
    terms_accepted = serializers.BooleanField(default=False)
    invoice = serializers.JSONField(required=False)
    privacy_consent = serializers.BooleanField()
    # Honeypot: real users never see or fill this field.
    website = serializers.CharField(required=False, allow_blank=True)

    def validate_attribution(self, value):
        from .attribution import clean

        return clean(value)

    def validate_invoice(self, value):
        if not value:
            return None
        ser = InvoiceInputSerializer(data=value)
        ser.is_valid(raise_exception=True)
        return dict(ser.validated_data)

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


class AppointmentSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    customer_name = serializers.CharField(source="order.customer_name", read_only=True)
    customer_phone = serializers.CharField(source="order.customer_phone", read_only=True)
    course_title = serializers.CharField(source="order.course_title", read_only=True)
    order_id = serializers.CharField(source="order.id", read_only=True)
    staff_name = serializers.CharField(source="staff.name", read_only=True, default="")
    notify = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "order_id",
            "order_code",
            "customer_name",
            "customer_phone",
            "course_title",
            "starts_at",
            "duration_minutes",
            "channel",
            "location",
            "note",
            "status",
            "staff",
            "staff_name",
            "notify",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        validated_data.pop("notify", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("notify", None)
        return super().update(instance, validated_data)


class InvoiceInputSerializer(serializers.Serializer):
    """VAT invoice details given by a learner (company or person)."""

    buyer_type = serializers.ChoiceField(choices=["company", "person"], default="company")
    company_name = serializers.CharField(max_length=300, required=False, allow_blank=True)
    tax_code = serializers.RegexField(
        r"^\d{10}(-\d{3})?$|^\d{12}$", max_length=20, required=False, allow_blank=True
    )
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    email = serializers.EmailField()

    def validate(self, attrs):
        if attrs.get("buyer_type", "company") == "company":
            missing = [f for f in ("company_name", "tax_code", "address") if not attrs.get(f)]
            if missing:
                raise serializers.ValidationError("Hóa đơn công ty cần tên công ty, mã số thuế và địa chỉ.")
        return attrs


class InvoiceRequestSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    order_id = serializers.CharField(source="order.id", read_only=True)
    customer_name = serializers.CharField(source="order.customer_name", read_only=True)
    course_title = serializers.CharField(source="order.course_title", read_only=True)
    amount = serializers.IntegerField(source="order.amount", read_only=True)
    total_paid = serializers.IntegerField(source="order.total_paid_amount", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.name", read_only=True, default="")

    class Meta:
        from .models import InvoiceRequest

        model = InvoiceRequest
        fields = [
            "id",
            "order_id",
            "order_code",
            "customer_name",
            "course_title",
            "amount",
            "total_paid",
            "buyer_type",
            "company_name",
            "tax_code",
            "address",
            "email",
            "status",
            "invoice_number",
            "issued_at",
            "issued_by_name",
            "created_at",
        ]
        read_only_fields = ["issued_at", "created_at"]
