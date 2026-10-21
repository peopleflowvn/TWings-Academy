from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import Instructor

from .models import (
    AcceptanceBatch,
    AcceptanceLine,
    AttendanceAdjustment,
    ClassDocument,
    ClientUnit,
    CommunicationBatch,
    CommunicationRecipient,
    ContractRate,
    CorporateClass,
    CorporateClient,
    CorporateEnrollment,
    Expense,
    ImportBatch,
    ImportTemplate,
    PlanLine,
    ResultSnapshot,
    ServiceContract,
    TrainingPlan,
)


def _email_list(value):
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise serializers.ValidationError("Danh sách chuỗi.")
    return [v.strip().lower() for v in value if v.strip()]


class CorporateClientSerializer(serializers.ModelSerializer):
    classes_count = serializers.IntegerField(read_only=True, default=0)
    active_contracts = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CorporateClient
        exclude = ["updated_at"]

    def validate_email_domains(self, value):
        return [d.lstrip("@") for d in _email_list(value)]

    def validate_default_cc(self, value):
        emails = _email_list(value)
        for email in emails:
            serializers.EmailField().run_validation(email)
        return emails


class ClientUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientUnit
        exclude = ["updated_at"]

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        parent = attrs.get("parent")
        if parent is not None and parent.client_id != client.pk:
            raise serializers.ValidationError({"parent": "Đơn vị cha thuộc khách hàng khác."})
        return attrs


class ContractRateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True, default="")

    class Meta:
        model = ContractRate
        exclude = ["contract", "created_at", "updated_at"]


class ServiceContractSerializer(serializers.ModelSerializer):
    client_code = serializers.CharField(source="client.code", read_only=True)
    rates = ContractRateSerializer(many=True, required=False)

    class Meta:
        model = ServiceContract
        exclude = ["updated_at"]

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        amends = attrs.get("amends")
        if amends is not None and amends.client_id != client.pk:
            raise serializers.ValidationError({"amends": "Hợp đồng gốc thuộc khách hàng khác."})
        start, end = attrs.get("valid_from"), attrs.get("valid_to")
        if start and end and end < start:
            raise serializers.ValidationError({"valid_to": "Ngày kết thúc trước ngày bắt đầu."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        rates = validated_data.pop("rates", [])
        contract = super().create(validated_data)
        ContractRate.objects.bulk_create(ContractRate(contract=contract, **r) for r in rates)
        return contract

    @transaction.atomic
    def update(self, instance, validated_data):
        rates = validated_data.pop("rates", None)
        contract = super().update(instance, validated_data)
        if rates is not None:  # the rate list is replaced as a whole
            contract.rates.all().delete()
            ContractRate.objects.bulk_create(ContractRate(contract=contract, **r) for r in rates)
        return contract


class PlanLineSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True, default="")
    unit_name = serializers.CharField(source="unit.name", read_only=True, default="")
    pic_name = serializers.CharField(source="pic.name", read_only=True, default="")
    classes_count = serializers.SerializerMethodField()

    class Meta:
        model = PlanLine
        exclude = ["plan", "created_at", "updated_at"]

    def get_classes_count(self, line) -> int:
        return line.classes.count() if line.pk else 0


class TrainingPlanSerializer(serializers.ModelSerializer):
    client_code = serializers.CharField(source="client.code", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.name", read_only=True, default="")
    lines = PlanLineSerializer(many=True, required=False)

    class Meta:
        model = TrainingPlan
        exclude = ["updated_at"]
        read_only_fields = ["version", "previous", "status", "approved_by", "approved_at"]

    def validate(self, attrs):
        if self.instance is not None and self.instance.status != "draft":
            raise serializers.ValidationError({"detail": "Kế hoạch đã duyệt: tạo phiên bản mới để sửa."})
        client = attrs.get("client") or getattr(self.instance, "client", None)
        contract = attrs.get("contract")
        if contract is not None and contract.client_id != client.pk:
            raise serializers.ValidationError({"contract": "Hợp đồng thuộc khách hàng khác."})
        for line in attrs.get("lines", []):
            unit = line.get("unit")
            if unit is not None and unit.client_id != client.pk:
                raise serializers.ValidationError({"lines": "Đơn vị thuộc khách hàng khác."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lines = validated_data.pop("lines", [])
        plan = super().create(validated_data)
        PlanLine.objects.bulk_create(
            PlanLine(plan=plan, sort_order=line.pop("sort_order", i), **line) for i, line in enumerate(lines)
        )
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        plan = super().update(instance, validated_data)
        if lines is not None:  # a draft's lines are replaced as a whole
            plan.lines.all().delete()
            PlanLine.objects.bulk_create(
                PlanLine(plan=plan, sort_order=line.pop("sort_order", i), **line)
                for i, line in enumerate(lines)
            )
        return plan


class CorporateClassSerializer(serializers.ModelSerializer):
    """A corporate class with the intake fields it lives on (name, dates, place, teacher, capacity)."""

    COHORT_FIELDS = ("start_date", "location", "capacity", "lead_instructor", "schedule_text")

    course = serializers.PrimaryKeyRelatedField(source="cohort.course", read_only=True)
    course_id = serializers.CharField(write_only=True, required=False)
    course_title = serializers.CharField(source="cohort.course.title", read_only=True)
    name = serializers.CharField(source="cohort.name", max_length=200)
    start_date = serializers.DateField(source="cohort.start_date", required=False, allow_null=True)
    location = serializers.CharField(
        source="cohort.location", required=False, allow_blank=True, max_length=300
    )
    capacity = serializers.IntegerField(source="cohort.capacity", required=False, min_value=1)
    lead_instructor = serializers.PrimaryKeyRelatedField(
        source="cohort.lead_instructor", required=False, allow_null=True, queryset=Instructor.objects.all()
    )
    lead_instructor_name = serializers.CharField(
        source="cohort.lead_instructor.name", read_only=True, default=""
    )
    schedule_text = serializers.CharField(
        source="cohort.schedule_text", required=False, allow_blank=True, max_length=200
    )
    client_code = serializers.CharField(source="client.code", read_only=True)
    contract_number = serializers.CharField(source="contract.number", read_only=True, default="")
    pic_name = serializers.CharField(source="pic.name", read_only=True, default="")
    learners = serializers.IntegerField(read_only=True, default=0)
    sessions = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CorporateClass
        exclude = ["updated_at"]
        read_only_fields = ["cohort", "locked_at"]

    def validate_completion_policy(self, value):
        from .results import clean_policy
        from .services import CorporateError

        try:
            return clean_policy(value)
        except (CorporateError, TypeError, ValueError) as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate(self, attrs):
        if self.instance is None and not attrs.get("course_id"):
            raise serializers.ValidationError({"course_id": "Chọn khóa học."})
        if self.instance is not None:
            attrs.pop("course_id", None)  # the course of a class never changes (its Moodle course is copied)
            if "client" in attrs and attrs["client"] != self.instance.client:
                raise serializers.ValidationError({"client": "Không đổi khách hàng của lớp."})
        client = attrs.get("client") or getattr(self.instance, "client", None)
        for field, label in (("contract", "Hợp đồng"), ("plan_line", "Dòng kế hoạch")):
            obj = attrs.get(field)
            owner = obj.client_id if field == "contract" and obj else obj.plan.client_id if obj else None
            if owner is not None and owner != client.pk:
                raise serializers.ValidationError({field: f"{label} thuộc khách hàng khác."})
        return attrs


class CorporateEnrollmentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="learner.full_name", read_only=True)
    email = serializers.CharField(source="learner.email", read_only=True)
    phone = serializers.CharField(source="learner.phone", read_only=True)
    learner_code = serializers.CharField(source="learner.code", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    job_title = serializers.CharField(source="employee.job_title", read_only=True)
    unit_name = serializers.CharField(source="employee.unit.name", read_only=True, default="")
    manager_name = serializers.CharField(source="employee.manager_name", read_only=True)
    manager_email = serializers.CharField(source="employee.manager_email", read_only=True)
    lms_status = serializers.CharField(source="lms_enrollment.get_status_display", read_only=True, default="")
    attendance_rate = serializers.IntegerField(
        source="lms_enrollment.attendance_rate", read_only=True, default=None
    )
    progress = serializers.IntegerField(source="lms_enrollment.progress", read_only=True, default=None)

    class Meta:
        model = CorporateEnrollment
        fields = [
            "id",
            "corporate_class",
            "status",
            "transferred_from",
            "invited_at",
            "note",
            "created_at",
            "full_name",
            "email",
            "phone",
            "learner_code",
            "employee_code",
            "job_title",
            "unit_name",
            "manager_name",
            "manager_email",
            "lms_status",
            "attendance_rate",
            "progress",
        ]
        read_only_fields = fields


class ListLearnerSerializer(serializers.Serializer):
    """Add one learner to a class list (the Excel roster import uses the same rules, row by row)."""

    full_name = serializers.CharField(max_length=200)
    email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    employee_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    job_title = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    unit = serializers.PrimaryKeyRelatedField(
        queryset=ClientUnit.objects.all(), required=False, allow_null=True
    )
    manager_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    manager_email = serializers.EmailField(required=False, allow_blank=True, default="")


class TransferSerializer(serializers.Serializer):
    target_class = serializers.PrimaryKeyRelatedField(queryset=CorporateClass.objects.all())


class CancelSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class ImportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportTemplate
        exclude = ["updated_at"]

    def validate_mapping(self, value):
        from .imports import FIELDS

        kind = self.initial_data.get("kind") or getattr(self.instance, "kind", "")
        if not isinstance(value, dict) or not all(isinstance(v, str) and v.strip() for v in value.values()):
            raise serializers.ValidationError("Dạng {trường: tiêu đề cột}.")
        unknown = set(value) - set(FIELDS.get(kind, {}))
        if unknown:
            raise serializers.ValidationError(f"Trường không có: {', '.join(sorted(unknown))}.")
        return value


class ImportBatchSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.name", read_only=True, default="")

    class Meta:
        model = ImportBatch
        exclude = ["file_key", "fingerprint", "updated_at"]
        read_only_fields = [f.name for f in ImportBatch._meta.fields]


class ImportUploadSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=ImportTemplate.KIND_CHOICES)
    corporate_class = serializers.PrimaryKeyRelatedField(
        queryset=CorporateClass.objects.all(), required=False, allow_null=True
    )
    plan = serializers.PrimaryKeyRelatedField(
        queryset=TrainingPlan.objects.all(), required=False, allow_null=True
    )
    template = serializers.PrimaryKeyRelatedField(
        queryset=ImportTemplate.objects.all(), required=False, allow_null=True
    )
    file = serializers.FileField()


class AdjustmentRequestSerializer(serializers.Serializer):
    enrollment = serializers.CharField()
    session = serializers.CharField()
    status = serializers.ChoiceField(choices=AttendanceAdjustment.STATUS_CHOICES)
    reason = serializers.CharField(max_length=500)
    evidence = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class AttendanceAdjustmentSerializer(serializers.ModelSerializer):
    learner_name = serializers.CharField(source="enrollment.learner.full_name", read_only=True)
    class_name = serializers.CharField(source="enrollment.corporate_class.cohort.name", read_only=True)
    session_title = serializers.CharField(source="session.title", read_only=True)
    session_starts_at = serializers.DateTimeField(source="session.starts_at", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.name", read_only=True, default="")
    decided_by_name = serializers.CharField(source="decided_by.name", read_only=True, default="")

    class Meta:
        model = AttendanceAdjustment
        exclude = ["updated_at"]
        read_only_fields = [f.name for f in AttendanceAdjustment._meta.fields]


class SelfmarkSerializer(serializers.Serializer):
    session = serializers.CharField()
    enabled = serializers.BooleanField()


class ResultSnapshotSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="corporate_class.cohort.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True, default="")
    published_by_name = serializers.CharField(source="published_by.name", read_only=True, default="")

    class Meta:
        model = ResultSnapshot
        exclude = ["updated_at"]
        read_only_fields = [f.name for f in ResultSnapshot._meta.fields]


class CommunicationRecipientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="enrollment.learner.full_name", read_only=True)
    email_status = serializers.CharField(source="email_log.status", read_only=True, default="")
    email_status_label = serializers.CharField(
        source="email_log.get_status_display", read_only=True, default=""
    )
    error = serializers.CharField(source="email_log.error_message", read_only=True, default="")

    class Meta:
        model = CommunicationRecipient
        fields = [
            "id",
            "enrollment",
            "name",
            "to",
            "cc",
            "rejected",
            "email_status",
            "email_status_label",
            "error",
        ]


class CommunicationBatchSerializer(serializers.ModelSerializer):
    recipients = CommunicationRecipientSerializer(many=True, read_only=True)
    snapshot_version = serializers.IntegerField(source="snapshot.version", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True, default="")
    approved_by_name = serializers.CharField(source="approved_by.name", read_only=True, default="")

    class Meta:
        model = CommunicationBatch
        exclude = ["updated_at"]
        read_only_fields = [f.name for f in CommunicationBatch._meta.fields]


class CreateBatchSerializer(serializers.Serializer):
    corporate_class = serializers.PrimaryKeyRelatedField(queryset=CorporateClass.objects.all())
    subject = serializers.CharField(max_length=250, required=False, allow_blank=True, default="")
    message = serializers.CharField(max_length=5000, required=False, allow_blank=True, default="")
    corrects = serializers.PrimaryKeyRelatedField(
        queryset=CommunicationBatch.objects.all(), required=False, allow_null=True
    )


class AcceptanceLineSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="corporate_class.cohort.name", read_only=True, default="")
    snapshot_version = serializers.IntegerField(source="snapshot.version", read_only=True, default=None)

    class Meta:
        model = AcceptanceLine
        exclude = ["batch", "created_at", "updated_at"]


class AcceptanceBatchSerializer(serializers.ModelSerializer):
    lines = AcceptanceLineSerializer(many=True, read_only=True)
    contract_number = serializers.CharField(source="contract.number", read_only=True)
    client = serializers.CharField(source="contract.client_id", read_only=True)
    client_code = serializers.CharField(source="contract.client.code", read_only=True)
    totals = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.name", read_only=True, default="")
    approved_by_name = serializers.CharField(source="approved_by.name", read_only=True, default="")

    class Meta:
        model = AcceptanceBatch
        exclude = ["updated_at"]
        read_only_fields = [f.name for f in AcceptanceBatch._meta.fields]

    def get_totals(self, batch) -> dict:
        from .acceptance import totals

        return totals(batch)


class CreateAcceptanceSerializer(serializers.Serializer):
    contract = serializers.PrimaryKeyRelatedField(queryset=ServiceContract.objects.all())
    title = serializers.CharField(max_length=300)
    period_from = serializers.DateField(required=False, allow_null=True)
    period_to = serializers.DateField(required=False, allow_null=True)
    learner_basis = serializers.ChoiceField(choices=AcceptanceBatch.LEARNER_BASIS_CHOICES, default="listed")
    classes = serializers.PrimaryKeyRelatedField(
        queryset=CorporateClass.objects.all(), many=True, required=False
    )
    adjustment_only = serializers.BooleanField(default=False)  # an empty batch for corrections


class AcceptanceAdjustmentSerializer(serializers.Serializer):
    adjusts = serializers.PrimaryKeyRelatedField(
        queryset=AcceptanceLine.objects.all(), required=False, allow_null=True
    )
    description = serializers.CharField(max_length=500)
    amount = serializers.IntegerField()  # before VAT, negative to reduce
    vat_rate = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)


class AcceptInvoiceSerializer(serializers.Serializer):
    invoice_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    invoice_date = serializers.DateField(required=False, allow_null=True)


class ClassDocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.name", read_only=True, default="")

    class Meta:
        model = ClassDocument
        exclude = ["file_key", "updated_at"]


class DocumentUploadSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=ClassDocument.KIND_CHOICES)
    title = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    file = serializers.FileField()


class ExpenseSerializer(serializers.ModelSerializer):
    client_code = serializers.CharField(source="client.code", read_only=True)
    class_name = serializers.CharField(source="corporate_class.cohort.name", read_only=True, default="")
    contract_number = serializers.CharField(source="contract.number", read_only=True, default="")
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.name", read_only=True, default="")
    settled = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        exclude = ["updated_at"]
        read_only_fields = ["client", "approved_by", "approved_at", "created_by"]

    def get_settled(self, expense) -> int | None:
        """For an advance: the amount already settled."""
        if expense.kind != "advance":
            return None
        return sum(s.amount for s in expense.settlements.all())

    def validate(self, attrs):
        if self.instance is not None and self.instance.approved_at:
            raise serializers.ValidationError({"detail": "Khoản đã duyệt không sửa được."})
        cls = attrs.get("corporate_class", getattr(self.instance, "corporate_class", None))
        contract = attrs.get("contract", getattr(self.instance, "contract", None))
        if cls is None and contract is None:
            raise serializers.ValidationError({"detail": "Gắn khoản chi với lớp hoặc hợp đồng."})
        client = cls.client if cls else contract.client
        if cls and contract and cls.client_id != contract.client_id:
            raise serializers.ValidationError({"contract": "Hợp đồng và lớp thuộc hai khách hàng khác nhau."})
        kind = attrs.get("kind", getattr(self.instance, "kind", "expense"))
        advance = attrs.get("advance", getattr(self.instance, "advance", None))
        if kind == "settlement":
            if advance is None or advance.kind != "advance" or advance.client_id != client.pk:
                raise serializers.ValidationError(
                    {"advance": "Quyết toán phải gắn với một khoản tạm ứng của khách hàng này."}
                )
        elif advance is not None:
            raise serializers.ValidationError({"advance": "Chỉ quyết toán mới gắn với tạm ứng."})
        if attrs.get("amount", getattr(self.instance, "amount", 0)) <= 0:
            raise serializers.ValidationError({"amount": "Số tiền phải lớn hơn 0."})
        attrs["client"] = client
        return attrs
