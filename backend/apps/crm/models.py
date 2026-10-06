import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.catalog.models import Cohort, Course, Program
from apps.core.crypto import EncryptedTextField, blind_index
from apps.core.models import BaseModel

# Crockford-style alphabet: no 0/O/1/I/L, safe to read aloud and type into a bank transfer memo.
ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def new_order_code() -> str:
    """'TW' + 8 random chars (~40 bits): unguessable, so the public status endpoint can't be enumerated."""
    return "TW" + "".join(secrets.choice(ORDER_CODE_ALPHABET) for _ in range(8))


class AdmissionCampaign(BaseModel):
    STATUS_CHOICES = [("active", "Đang chạy"), ("planning", "Lên kế hoạch"), ("closed", "Đã đóng")]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=300)
    time_range = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planning")
    target_headcount = models.PositiveIntegerField(default=0)
    lead_recruiter = models.CharField(max_length=200, blank=True)
    scholarship_budget = models.PositiveBigIntegerField(default=0)
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date", "code"]

    def __str__(self):
        return self.code


class CampaignPosition(BaseModel):
    campaign = models.ForeignKey(AdmissionCampaign, on_delete=models.CASCADE, related_name="positions")
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="campaign_positions")
    position_title = models.CharField(max_length=300)
    short_name = models.CharField(max_length=100)
    department = models.CharField(max_length=200, blank=True)
    target_quota = models.PositiveIntegerField(default=0)
    lead_instructor_name = models.CharField(max_length=200, blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    badge_bg = models.CharField(max_length=100, blank=True)
    icon_name = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["campaign", "short_name"]


class Order(BaseModel):
    """
    A lead / application / order. One record follows an applicant from first contact to placement,
    mirroring the 6-section CRM sheet used by the admissions team (frontend type `Order`).
    """

    STATUS_CHOICES = [
        ("pending", "Chờ thanh toán"),
        ("paid", "Đã thanh toán"),
        ("cancelled", "Đã hủy"),
        ("refunded", "Đã hoàn tiền"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("vietqr", "VietQR"),
        ("free", "Miễn phí"),
        ("card", "Thẻ"),
        ("transfer", "Chuyển khoản"),
        ("cash", "Tiền mặt"),
        ("bundle", "Trong gói chương trình"),
    ]
    CRM_STATUS_CHOICES = [
        ("1. Mới", "1. Mới"),
        ("2. Đã tiếp cận", "2. Đã tiếp cận"),
        ("3. Đang tư vấn", "3. Đang tư vấn"),
        ("4. Hẹn gặp", "4. Hẹn gặp"),
        ("5. Đã đóng phí", "5. Đã đóng phí"),
        ("6. Chăm sóc lại", "6. Chăm sóc lại"),
        ("7. Đã hủy", "7. Đã hủy"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("Chưa thanh toán", "Chưa thanh toán"),
        ("Đã đóng phí", "Đã đóng phí"),
        ("Đã đóng 1 phần", "Đã đóng 1 phần"),
        ("Đã hoàn tiền", "Đã hoàn tiền"),
    ]

    order_code = models.CharField(max_length=20, unique=True, default=new_order_code, editable=False)
    course = models.ForeignKey(
        Course, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    course_title = models.CharField(max_length=300, blank=True)
    cohort = models.ForeignKey(
        Cohort, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    batch_cohort = models.CharField(max_length=200, blank=True)
    campaign = models.ForeignKey(
        AdmissionCampaign, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    # A program order is paid once; each of its courses gets a component order (parent = the program
    # order, amount 0) so intakes and LMS enrolment work per course exactly like single purchases.
    program = models.ForeignKey(
        Program, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="components"
    )
    installment_count = models.PositiveSmallIntegerField(default=1)
    refunded_amount = models.PositiveBigIntegerField(default=0)
    # May the learner study? Paid in full, or (installment plan) first installment paid. Kept by save().
    learning_access = models.BooleanField(default=False, db_index=True)

    amount = models.PositiveBigIntegerField(default=0)
    original_amount = models.PositiveBigIntegerField(default=0)
    discount_amount = models.PositiveBigIntegerField(default=0)
    discount_code = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="vietqr")
    paid_at = models.DateTimeField(null=True, blank=True)

    # 1. Personal information
    registration_code = models.CharField(max_length=200, blank=True)
    customer_name = models.CharField(max_length=200)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    customer_phone = models.CharField(max_length=32, blank=True, db_index=True)
    customer_email = models.EmailField(blank=True, db_index=True)
    area = models.CharField(max_length=100, blank=True)
    permanent_address = EncryptedTextField(blank=True)
    citizen_id = EncryptedTextField(blank=True)
    citizen_id_index = models.CharField(max_length=64, blank=True, db_index=True, editable=False)
    issued_place = models.CharField(max_length=200, blank=True)
    current_residence = EncryptedTextField(blank=True)
    campaign_code = models.CharField(max_length=50, blank=True)
    referrer_name = models.CharField(max_length=200, blank=True)
    referrer_email = models.EmailField(blank=True)
    referrer_phone = models.CharField(max_length=32, blank=True)
    referrer_staff_code = models.CharField(max_length=50, blank=True)
    education_level = models.CharField(max_length=100, blank=True)
    major = models.CharField(max_length=200, blank=True)
    university = models.CharField(max_length=200, blank=True)
    graduation_year = models.CharField(max_length=10, blank=True)
    contact_person_name = models.CharField(max_length=200, blank=True)
    contact_person_phone = models.CharField(max_length=32, blank=True)
    contact_relation = models.CharField(max_length=50, blank=True)
    cv_link = models.CharField(max_length=500, blank=True)

    # 2. Outreach & consulting
    source = models.CharField(max_length=100, blank=True)
    registered_at = models.DateField(null=True, blank=True)
    reached_date = models.DateField(null=True, blank=True)
    consult_need = models.TextField(blank=True)
    interested_course = models.CharField(max_length=300, blank=True)
    pic = models.CharField(max_length=100, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_orders",
    )
    study_area = models.CharField(max_length=100, blank=True)
    approach_method = models.CharField(max_length=100, blank=True)
    interest_level = models.CharField(max_length=30, blank=True)
    crm_status = models.CharField(max_length=30, choices=CRM_STATUS_CHOICES, default="1. Mới", db_index=True)
    enrolled_course_name = models.CharField(max_length=300, blank=True)
    promotion_program = models.CharField(max_length=200, blank=True)
    consult_detail = models.TextField(blank=True)

    # 3. Tuition payment
    tuition_fee = models.PositiveBigIntegerField(default=0)
    total_receivable = models.PositiveBigIntegerField(default=0)
    paid_amount_l1 = models.PositiveBigIntegerField(default=0)
    paid_amount_l2 = models.PositiveBigIntegerField(default=0)
    total_paid_amount = models.PositiveBigIntegerField(default=0)
    payment_status_detail = models.CharField(
        max_length=30, choices=PAYMENT_STATUS_CHOICES, default="Chưa thanh toán"
    )
    payment_method_detail = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    transaction_code = models.CharField(max_length=100, blank=True)
    bank_account_number = EncryptedTextField(blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    referral_commission = models.PositiveBigIntegerField(default=0)
    payment_note = models.TextField(blank=True)

    # 4. Referral reward
    referral_reward_amount = models.PositiveBigIntegerField(default=0)
    referral_reward_status = models.CharField(max_length=20, blank=True)
    referral_reward_bank_acc = EncryptedTextField(blank=True)
    referral_reward_date = models.DateField(null=True, blank=True)
    referral_reward_note = models.TextField(blank=True)

    # 5. Training & placement
    trainee_email = models.EmailField(blank=True)
    partner_trainee_id = models.CharField(max_length=50, blank=True)
    partner_email = models.EmailField(blank=True)
    training_status = models.CharField(max_length=30, blank=True)
    certificate_type = models.CharField(max_length=100, blank=True)
    certificate_date = models.DateField(null=True, blank=True)
    certificate_number = models.CharField(max_length=100, blank=True)
    placement_company = models.CharField(max_length=200, blank=True)
    placement_status = models.CharField(max_length=30, blank=True)
    work_start_date = models.DateField(null=True, blank=True)
    guarantee_start_date = models.DateField(null=True, blank=True)
    training_note = models.TextField(blank=True)

    # 6. Retake payments
    re_exam_count = models.PositiveSmallIntegerField(default=0)
    retake_count = models.PositiveSmallIntegerField(default=0)
    field_study_retake = models.CharField(max_length=200, blank=True)
    retake_amount = models.PositiveBigIntegerField(default=0)
    retake_payment_status = models.CharField(max_length=50, blank=True)
    retake_note = models.TextField(blank=True)

    # Consent to personal-data processing (Nghị định 13/2023/NĐ-CP), captured by the public form
    privacy_consent_at = models.DateTimeField(null=True, blank=True)
    privacy_consent_version = models.CharField(max_length=20, blank=True)

    # 7-8. Duplicate detection & research notes
    is_duplicate = models.BooleanField(default=False)
    duplicate_note = models.CharField(max_length=300, blank=True)
    agent_research = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["crm_status", "-created_at"])]

    def __str__(self):
        return f"{self.order_code} – {self.customer_name}"

    def save(self, *args, **kwargs):
        self.citizen_id_index = blind_index(self.citizen_id or "")
        if self.course_id and not self.course_title:
            self.course_title = self.course.title
        if self.cohort_id and not self.batch_cohort:
            self.batch_cohort = self.cohort.name
        self.learning_access = self.compute_learning_access()
        if "update_fields" in kwargs and kwargs["update_fields"] is not None:
            kwargs["update_fields"] = {*kwargs["update_fields"], "learning_access"}
        super().save(*args, **kwargs)

    def compute_learning_access(self) -> bool:
        if self.parent_id:
            return Order.objects.filter(pk=self.parent_id, learning_access=True).exists()
        if self.status == "paid":
            return True
        if self.status != "pending" or self.installment_count <= 1 or not self.pk:
            return False
        first = self.installments.order_by("sequence").first()
        return first is not None and self.total_paid_amount >= first.amount

    @property
    def is_program_order(self) -> bool:
        return bool(self.program_id and not self.parent_id)

    def amount_due_now(self) -> int:
        """What the learner should transfer now: the next installment (minus any overpayment) or the rest."""
        if self.status != "pending":
            return 0
        if self.installment_count > 1:
            running = 0
            for installment in self.installments.order_by("sequence"):
                running += installment.amount
                if running > self.total_paid_amount:
                    return running - self.total_paid_amount
            return 0
        return max((self.total_receivable or self.amount) - self.total_paid_amount, 0)

    def find_duplicates(self):
        q = models.Q()
        if self.customer_phone:
            q |= models.Q(customer_phone=self.customer_phone)
        if self.customer_email:
            q |= models.Q(customer_email__iexact=self.customer_email)
        if self.citizen_id_index:
            q |= models.Q(citizen_id_index=self.citizen_id_index)
        if not q:
            return Order.objects.none()
        return Order.objects.filter(q).exclude(pk=self.pk)

    def recompute_payment_totals(self):
        self.total_paid_amount = sum(p.amount for p in self.payments.all())
        receivable = self.total_receivable or self.amount
        if receivable and self.total_paid_amount >= receivable:
            self.status = "paid"
            self.payment_status_detail = "Đã đóng phí"
            self.crm_status = "5. Đã đóng phí"
        elif self.total_paid_amount > 0:
            self.payment_status_detail = "Đã đóng 1 phần"
        if self.installment_count > 1:
            running = 0
            for installment in self.installments.order_by("sequence"):
                running += installment.amount
                if installment.paid_at is None and self.total_paid_amount >= running:
                    installment.paid_at = timezone.now()
                    installment.save(update_fields=["paid_at", "updated_at"])


class Installment(BaseModel):
    """One scheduled payment of an installment order. Paid in order, from the order's cumulative total."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="installments")
    sequence = models.PositiveSmallIntegerField()
    amount = models.PositiveBigIntegerField()
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    reminded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["order", "sequence"]
        constraints = [models.UniqueConstraint(fields=["order", "sequence"], name="uniq_installment_seq")]


class Activity(BaseModel):
    TYPE_CHOICES = [
        ("call", "Gọi điện"),
        ("zalo", "Zalo"),
        ("email", "Email"),
        ("meeting", "Gặp mặt"),
        ("note", "Ghi chú"),
        ("agent_research", "Nghiên cứu"),
        ("payment", "Thanh toán"),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="timeline_activities")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="note")
    title = models.CharField(max_length=300)
    content = models.TextField(blank=True)
    actor = models.CharField(max_length=200, blank=True)
    actor_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]


class FollowupTask(BaseModel):
    PRIORITY_CHOICES = [("high", "Cao"), ("medium", "Trung bình"), ("low", "Thấp")]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="followup_tasks")
    title = models.CharField(max_length=300)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    is_completed = models.BooleanField(default=False)
    assigned_to = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["is_completed", "due_date"]
