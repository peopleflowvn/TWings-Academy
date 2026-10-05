from django.db import models

from apps.core.models import BaseModel


class LmsEnrollment(BaseModel):
    """
    Moodle access for one paid order: a Moodle account for the learner, enrolled as student in the
    Moodle course mapped to the order's course. Retried until done (see sync_lms_enrollments).
    """

    STATUS_CHOICES = [
        ("pending", "Chờ ghi danh"),
        ("done", "Đã ghi danh"),
        ("failed", "Lỗi – sẽ thử lại"),
        ("skipped", "Bỏ qua"),
        ("removed", "Đã hủy ghi danh"),
    ]

    order = models.OneToOneField("crm.Order", on_delete=models.CASCADE, related_name="lms_enrollment")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    moodle_user_id = models.PositiveIntegerField(null=True, blank=True)
    moodle_course_id = models.PositiveIntegerField(null=True, blank=True)
    user_created = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)
    enrolled_at = models.DateTimeField(null=True, blank=True)
    access_emailed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"LMS {self.order_id}: {self.status}"
