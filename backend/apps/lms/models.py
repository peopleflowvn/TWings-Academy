import secrets

from django.db import models

from apps.core.models import BaseModel

CERT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I: codes are read and typed by people


def new_certificate_code() -> str:
    return "TWC-" + "".join(secrets.choice(CERT_ALPHABET) for _ in range(10))


class LmsEnrollment(BaseModel):
    """
    Moodle access for one paid order: a Moodle account for the learner, enrolled as student in the
    Moodle course of the order's intake (or of the course itself when it has no intakes). Retried
    until done (see sync_lms_enrollments); progress/completion are synced back (sync_lms_completion).
    """

    STATUS_CHOICES = [
        ("pending", "Chờ ghi danh"),
        ("waiting", "Chờ xếp lớp"),
        ("done", "Đã ghi danh"),
        ("failed", "Lỗi – sẽ thử lại"),
        ("skipped", "Bỏ qua"),
        ("removed", "Đã hủy ghi danh"),
    ]

    order = models.OneToOneField("crm.Order", on_delete=models.CASCADE, related_name="lms_enrollment")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    # The intake the learner is enrolled for (None: the course's own Moodle course, self-paced).
    cohort = models.ForeignKey(
        "catalog.Cohort", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    moodle_user_id = models.PositiveIntegerField(null=True, blank=True)
    moodle_course_id = models.PositiveIntegerField(null=True, blank=True)
    user_created = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)
    enrolled_at = models.DateTimeField(null=True, blank=True)
    access_emailed_at = models.DateTimeField(null=True, blank=True)
    progress = models.PositiveSmallIntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    # Step 7 – learning signals from Moodle (apps.lms.learning): attendance, grades, last access, risk.
    attendance_taken = models.PositiveSmallIntegerField(default=0)  # sessions already marked
    attendance_attended = models.PositiveSmallIntegerField(default=0)  # present / late
    attendance_rate = models.PositiveSmallIntegerField(null=True, blank=True)  # % of taken sessions
    grade_percent = models.PositiveSmallIntegerField(null=True, blank=True)  # course total %
    last_access = models.DateTimeField(null=True, blank=True)
    RISK_CHOICES = [("ok", "Ổn"), ("watch", "Cần theo dõi"), ("risk", "Có nguy cơ")]
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, default="ok", db_index=True)
    risk_flags = models.JSONField(default=list, blank=True)
    # Step 8 – completed on Moodle but not (yet) eligible for the certificate, e.g. low attendance.
    certificate_hold = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"LMS {self.order_id}: {self.status}"


class Certificate(BaseModel):
    """Course completion certificate with a public verification page (/xac-minh/<code>/)."""

    code = models.CharField(max_length=20, unique=True, default=new_certificate_code)
    enrollment = models.OneToOneField(LmsEnrollment, on_delete=models.PROTECT, related_name="certificate")
    learner_name = models.CharField(max_length=200)
    course_title = models.CharField(max_length=300)
    cohort_name = models.CharField(max_length=200, blank=True)
    issued_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)
    revoked_reason = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return f"{self.code} {self.learner_name}"
