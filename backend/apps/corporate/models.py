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
