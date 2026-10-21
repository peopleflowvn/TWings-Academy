"""
Corporate training (B2B): companies send their staff to classes under a service contract. Nothing here
goes through crm.Order or payments: a learner is enrolled because the company listed them, gets Moodle
access through LmsEnrollment(corporate_enrollment=...), and the class is a catalog.Cohort with
audience="corporate" (hidden from the website and admissions) plus its CorporateClass.
"""

from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class CorporateClient(BaseModel):
    """A company buying training (the tenant: everything B2B belongs to exactly one client)."""

    name = models.CharField(max_length=300)
    code = models.CharField(max_length=30, unique=True)  # short name used in lists and exports, e.g. "MSB"
    tax_code = models.CharField(max_length=20, blank=True)
    # Recipient policy: CC addresses must be at one of these domains (or internal ones).
    email_domains = models.JSONField(default=list, blank=True)
    default_cc = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.code


class ClientUnit(BaseModel):
    """A legal entity of the client, or a department inside one."""

    KIND_CHOICES = [("legal_entity", "Pháp nhân"), ("department", "Đơn vị / phòng ban")]

    client = models.ForeignKey(CorporateClient, on_delete=models.CASCADE, related_name="units")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="department")
    name = models.CharField(max_length=300)
    code = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["client", "name"]

    def __str__(self):
        return self.name


class CorporateEmployee(BaseModel):
    """
    A person as an employee of a client, valid over a period. A change of unit or line manager closes
    the current row (valid_to) and opens a new one, so e-mails sent earlier keep pointing at who the
    manager was then.
    """

    learner = models.ForeignKey("crm.Learner", on_delete=models.PROTECT, related_name="employments")
    client = models.ForeignKey(CorporateClient, on_delete=models.PROTECT, related_name="employees")
    legal_entity = models.ForeignKey(ClientUnit, on_delete=models.PROTECT, related_name="+")
    unit = models.ForeignKey(ClientUnit, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    employee_code = models.CharField(max_length=50, blank=True)
    job_title = models.CharField(max_length=200, blank=True)
    manager_name = models.CharField(max_length=200, blank=True)
    manager_email = models.EmailField(blank=True)
    extra_cc = models.JSONField(default=list, blank=True)
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-valid_from"]
        constraints = [
            models.UniqueConstraint(
                fields=["legal_entity", "employee_code"],
                condition=models.Q(valid_to__isnull=True) & ~models.Q(employee_code=""),
                name="uniq_current_employee_code",
            ),
            models.UniqueConstraint(
                fields=["client", "learner"],
                condition=models.Q(valid_to__isnull=True),
                name="uniq_current_employment",
            ),
        ]

    def __str__(self):
        return f"{self.client_id} {self.employee_code or self.learner_id}"


class ServiceContract(BaseModel):
    """
    A training service contract with a client. An amendment (phụ lục) is a contract of its own that
    points at the original (`amends`), so rates and values are never overwritten.
    """

    STATUS_CHOICES = [
        ("draft", "Đang soạn"),
        ("active", "Đang hiệu lực"),
        ("ended", "Đã kết thúc"),
        ("cancelled", "Đã hủy"),
    ]

    client = models.ForeignKey(CorporateClient, on_delete=models.PROTECT, related_name="contracts")
    number = models.CharField(max_length=100)
    title = models.CharField(max_length=300, blank=True)
    amends = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="amendments"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    signed_on = models.DateField(null=True, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    # Contract value before VAT, in đồng (management figure: acceptance decides what is billed).
    value = models.PositiveBigIntegerField(null=True, blank=True)
    vat_rate = models.PositiveSmallIntegerField(null=True, blank=True)  # %, e.g. 8 or 10
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["-valid_from", "number"]
        constraints = [models.UniqueConstraint(fields=["client", "number"], name="uniq_contract_number")]

    def __str__(self):
        return self.number


class ContractRate(BaseModel):
    """A unit price of the contract: what one class / learner / session / hour / package is billed."""

    KIND_CHOICES = [
        ("per_class", "Theo lớp"),
        ("per_learner", "Theo học viên"),
        ("per_session", "Theo buổi"),
        ("per_hour", "Theo giờ"),
        ("lump_sum", "Trọn gói"),
    ]

    contract = models.ForeignKey(ServiceContract, on_delete=models.CASCADE, related_name="rates")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    # Empty: the rate applies to every course of the contract.
    course = models.ForeignKey("catalog.Course", null=True, blank=True, on_delete=models.PROTECT)
    description = models.CharField(max_length=300, blank=True)
    unit_price = models.PositiveBigIntegerField()  # đồng, before VAT
    vat_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["contract", "kind"]

    def __str__(self):
        return f"{self.contract_id} {self.kind} {self.unit_price}"


class TrainingPlan(BaseModel):
    """
    A client's training plan for a period, as agreed. Once approved it is not edited: a change is a new
    version (`previous` points at the one it replaces, which becomes superseded).
    """

    STATUS_CHOICES = [("draft", "Đang soạn"), ("approved", "Đã duyệt"), ("superseded", "Đã thay thế")]

    client = models.ForeignKey(CorporateClient, on_delete=models.PROTECT, related_name="plans")
    contract = models.ForeignKey(
        ServiceContract, null=True, blank=True, on_delete=models.SET_NULL, related_name="plans"
    )
    name = models.CharField(max_length=300)
    period = models.CharField(max_length=50, blank=True)  # e.g. "2026" or "Q4/2026"
    version = models.PositiveSmallIntegerField(default=1)
    previous = models.OneToOneField(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="next_version"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["client", "name", "version"], name="uniq_plan_version")
        ]

    def __str__(self):
        return f"{self.name} v{self.version}"


class PlanLine(BaseModel):
    """One planned course of the plan: for which unit, when, how many classes / learners, budget, PIC."""

    plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE, related_name="lines")
    course = models.ForeignKey("catalog.Course", null=True, blank=True, on_delete=models.PROTECT)
    title = models.CharField(max_length=300)  # as written in the client's plan
    unit = models.ForeignKey(ClientUnit, null=True, blank=True, on_delete=models.SET_NULL)
    planned_start = models.DateField(null=True, blank=True)
    planned_end = models.DateField(null=True, blank=True)
    planned_classes = models.PositiveSmallIntegerField(default=1)
    planned_learners = models.PositiveIntegerField(null=True, blank=True)
    budget = models.PositiveBigIntegerField(null=True, blank=True)  # đồng
    pic = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    note = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["plan", "sort_order", "planned_start"]

    def __str__(self):
        return self.title


class CorporateClass(BaseModel):
    """The B2B side of a class: the schedule, Moodle course and attendance stay on its Cohort."""

    STATUS_CHOICES = [
        ("planned", "Lên kế hoạch"),
        ("running", "Đang học"),
        ("finished", "Đã học xong"),
        ("closed", "Đã chốt hồ sơ"),
        ("cancelled", "Đã hủy"),
    ]

    cohort = models.OneToOneField("catalog.Cohort", on_delete=models.PROTECT, related_name="corporate_class")
    client = models.ForeignKey(CorporateClient, on_delete=models.PROTECT, related_name="classes")
    contract = models.ForeignKey(
        ServiceContract, null=True, blank=True, on_delete=models.PROTECT, related_name="classes"
    )
    plan_line = models.ForeignKey(
        PlanLine, null=True, blank=True, on_delete=models.SET_NULL, related_name="classes"
    )
    pic = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planned", db_index=True)
    # Whether completing learners get a TWings certificate (TWC-…): decided per contract.
    issue_certificate = models.BooleanField(default=False)
    # Completion rule, e.g. {"min_attendance": 80, "min_grade": 50, "survey_required": true}.
    completion_policy = models.JSONField(default=dict, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "corporate classes"

    def __str__(self):
        return f"{self.client_id} {self.cohort_id}"


class CorporateEnrollment(BaseModel):
    """A learner listed by the client for a class: grants learning access without any order."""

    STATUS_CHOICES = [
        ("enrolled", "Đang học"),
        ("completed", "Hoàn thành"),
        ("not_passed", "Không đạt"),
        ("transferred", "Đã chuyển lớp"),
        ("cancelled", "Đã hủy"),
    ]
    # Statuses that keep access to the class on Moodle (content stays open after the end, as for B2C).
    STUDYING = ("enrolled", "completed", "not_passed")

    corporate_class = models.ForeignKey(CorporateClass, on_delete=models.PROTECT, related_name="enrollments")
    learner = models.ForeignKey("crm.Learner", on_delete=models.PROTECT, related_name="corporate_enrollments")
    # The employment row when the learner was listed (unit, manager at that time).
    employee = models.ForeignKey(CorporateEmployee, on_delete=models.PROTECT, related_name="enrollments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="enrolled", db_index=True)
    transferred_from = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="transferred_to"
    )
    invited_at = models.DateTimeField(null=True, blank=True)  # class invitation (schedule + .ics) sent
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["corporate_class", "learner"], name="uniq_learner_per_corporate_class"
            )
        ]

    def __str__(self):
        return f"{self.corporate_class_id} {self.learner_id}: {self.status}"

    @property
    def may_study(self) -> bool:
        return self.status in self.STUDYING


class ImportTemplate(BaseModel):
    """
    How one client's Excel file of one kind is read: which column holds which field. Without a template
    the columns are recognised by their Vietnamese headers (apps.corporate.imports). A changed file
    layout is a new version, so earlier imports keep the mapping they used.
    """

    KIND_CHOICES = [("roster", "Danh sách học viên"), ("plan", "Kế hoạch đào tạo")]

    client = models.ForeignKey(CorporateClient, on_delete=models.CASCADE, related_name="import_templates")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    name = models.CharField(max_length=200)
    version = models.PositiveSmallIntegerField(default=1)
    sheet = models.CharField(max_length=100, blank=True)  # empty: the first sheet
    header_row = models.PositiveSmallIntegerField(default=1)
    # {field: header text as written in the file}, e.g. {"employee_code": "Mã CBNV"}.
    mapping = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["client", "kind", "-version"]
        constraints = [
            models.UniqueConstraint(fields=["client", "kind", "name", "version"], name="uniq_import_template")
        ]

    def __str__(self):
        return f"{self.name} v{self.version}"


class ImportBatch(BaseModel):
    """
    One uploaded file: kept as received (private storage), read into rows, checked and previewed
    (add / update / unchanged / error per row), then imported on confirmation. The same file cannot be
    imported twice into the same target.
    """

    STATUS_CHOICES = [
        ("previewed", "Đã kiểm tra – chờ xác nhận"),
        ("imported", "Đã nhập"),
        ("cancelled", "Đã hủy"),
    ]

    client = models.ForeignKey(CorporateClient, on_delete=models.PROTECT, related_name="imports")
    kind = models.CharField(max_length=20, choices=ImportTemplate.KIND_CHOICES)
    template = models.ForeignKey(ImportTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    corporate_class = models.ForeignKey(
        CorporateClass, null=True, blank=True, on_delete=models.PROTECT, related_name="imports"
    )
    plan = models.ForeignKey(
        TrainingPlan, null=True, blank=True, on_delete=models.PROTECT, related_name="imports"
    )
    file_name = models.CharField(max_length=255)
    file_key = models.CharField(max_length=500)  # in the "private" storage
    fingerprint = models.CharField(max_length=64, db_index=True)  # SHA-256 of the file
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="previewed", db_index=True)
    # The columns found and every row: {"row": 5, "values": {...}, "action": "add", "errors": [...]}.
    columns = models.JSONField(default=dict)
    rows = models.JSONField(default=list)
    summary = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    imported_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} {self.file_name}"


class AttendanceRecord(BaseModel):
    """One learner's mark for one session as Moodle has it (synced; never edited in TWings)."""

    enrollment = models.ForeignKey(CorporateEnrollment, on_delete=models.CASCADE, related_name="attendance")
    session = models.ForeignKey("catalog.CohortSession", on_delete=models.CASCADE, related_name="+")
    acronym = models.CharField(max_length=10, blank=True)  # Moodle status, e.g. P / L / E / A
    description = models.CharField(max_length=100, blank=True)
    attended = models.BooleanField(default=False)
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["enrollment", "session"], name="uniq_attendance_record")
        ]


class AttendanceAdjustment(BaseModel):
    """
    A correction of one session's attendance (late, excused, make-up session, wrong scan...), with the
    reason and evidence. Counts once approved; the latest approved one wins; history is kept.
    """

    STATUS_CHOICES = [
        ("present", "Có mặt"),
        ("late", "Đi muộn"),
        ("excused", "Vắng có phép"),
        ("absent", "Vắng"),
        ("makeup", "Học bù"),
    ]
    ATTENDED = ("present", "late", "makeup")
    DECISION_CHOICES = [("pending", "Chờ duyệt"), ("approved", "Đã duyệt"), ("rejected", "Từ chối")]

    enrollment = models.ForeignKey(CorporateEnrollment, on_delete=models.CASCADE, related_name="adjustments")
    session = models.ForeignKey("catalog.CohortSession", on_delete=models.CASCADE, related_name="+")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    reason = models.CharField(max_length=500)
    evidence = models.CharField(max_length=500, blank=True)  # link or reference of the proof
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, default="pending", db_index=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def attended(self) -> bool:
        return self.status in self.ATTENDED


class ClassSurvey(BaseModel):
    """
    A survey (Moodle feedback activity) of a corporate class, read back from Moodle: how many answered,
    who (unless anonymous), each question's results and the satisfaction score (rated questions, %).
    """

    corporate_class = models.ForeignKey(CorporateClass, on_delete=models.CASCADE, related_name="surveys")
    moodle_feedback_id = models.PositiveIntegerField()
    name = models.CharField(max_length=300)
    anonymous = models.BooleanField(default=True)
    responses = models.PositiveIntegerField(default=0)
    respondents = models.JSONField(default=list, blank=True)  # Moodle user ids (named surveys only)
    # [{"name", "type", "average", "scale_max", "answers": [{"text", "count"}]}]
    items = models.JSONField(default=list, blank=True)
    satisfaction = models.FloatField(null=True, blank=True)  # mean of rated questions, % of the scale
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["corporate_class", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["corporate_class", "moodle_feedback_id"], name="uniq_class_survey"
            )
        ]


class ResultSnapshot(BaseModel):
    """
    The results of a corporate class frozen at a point in time: per learner (verified attendance,
    grade, Moodle completion, survey answered, passed or not and why) and the class KPIs, with the
    completion policy used. A draft can be recomputed; a published version never changes, a correction
    is a new version (the previous one stays, superseded). Reports, e-mails and acceptance read these.
    """

    STATUS_CHOICES = [("draft", "Bản nháp"), ("published", "Đã phát hành"), ("superseded", "Đã thay thế")]

    corporate_class = models.ForeignKey(CorporateClass, on_delete=models.PROTECT, related_name="results")
    version = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    policy = models.JSONField(default=dict)
    learners = models.JSONField(default=list)
    kpis = models.JSONField(default=dict)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["corporate_class", "-version"]
        constraints = [
            models.UniqueConstraint(fields=["corporate_class", "version"], name="uniq_result_version")
        ]

    def __str__(self):
        return f"{self.corporate_class_id} v{self.version} {self.status}"


class CommunicationBatch(BaseModel):
    """
    A batch of e-mails of a class (results now), one per learner, built from a published result
    snapshot. Recipients (To / CC under the policy) are frozen when the batch is created; it is sent
    only once approved. A correction is a new batch pointing at the one it corrects.
    """

    KIND_CHOICES = [("results", "Kết quả cuối khóa")]
    STATUS_CHOICES = [
        ("draft", "Chờ duyệt"),
        ("approved", "Đã duyệt"),
        ("sent", "Đã gửi"),
        ("cancelled", "Đã hủy"),
    ]

    corporate_class = models.ForeignKey(
        CorporateClass, on_delete=models.PROTECT, related_name="communications"
    )
    snapshot = models.ForeignKey(ResultSnapshot, on_delete=models.PROTECT, related_name="communications")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="results")
    subject = models.CharField(max_length=300)
    message = models.TextField(blank=True)  # staff's own words above each learner's results
    corrects = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="corrections"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class CommunicationRecipient(BaseModel):
    """One e-mail of a batch: the learner, To / CC frozen at creation, the EmailLog once sent."""

    batch = models.ForeignKey(CommunicationBatch, on_delete=models.CASCADE, related_name="recipients")
    enrollment = models.ForeignKey(CorporateEnrollment, on_delete=models.PROTECT, related_name="+")
    to = models.EmailField()
    cc = models.JSONField(default=list, blank=True)
    rejected = models.JSONField(default=list, blank=True)  # CC refused by the recipient policy
    email_log = models.ForeignKey(
        "notifications.EmailLog", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["batch", "to"]
        constraints = [models.UniqueConstraint(fields=["batch", "enrollment"], name="uniq_batch_recipient")]
