from django.conf import settings
from django.db import models

from apps.core.models import BaseModel
from apps.crm.models import Order


class EmailTemplate(BaseModel):
    CATEGORY_CHOICES = [
        ("admission", "Tuyển sinh"),
        ("payment", "Thanh toán"),
        ("scheduling", "Lịch học"),
        ("marketing", "Marketing"),
    ]

    code = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="admission")
    subject = models.CharField(max_length=300)
    body = models.TextField()  # HTML with {{variables}}
    variables = models.JSONField(default=list, blank=True)
    description = models.CharField(max_length=500, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return self.name


class EmailLog(BaseModel):
    STATUS_CHOICES = [
        ("queued", "Đang gửi"),
        ("sent", "Đã gửi"),
        ("delivered", "Đã nhận"),
        ("opened", "Đã mở"),
        ("clicked", "Đã click"),
        ("bounced", "Bị dội"),
        ("complained", "Báo spam"),
        ("failed", "Lỗi"),
        ("simulated", "Mô phỏng"),
    ]

    template = models.ForeignKey(EmailTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    template_code = models.CharField(max_length=100, blank=True)
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="emails")
    recipient_email = models.EmailField()
    recipient_name = models.CharField(max_length=200, blank=True)
    subject = models.CharField(max_length=300)
    rendered_html = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued", db_index=True)
    resend_message_id = models.CharField(max_length=100, null=True, blank=True, unique=True)
    error_message = models.CharField(max_length=500, blank=True)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    open_count = models.PositiveIntegerField(default=0)
    clicked_at = models.DateTimeField(null=True, blank=True)
    click_count = models.PositiveIntegerField(default=0)
    last_clicked_url = models.URLField(max_length=1000, blank=True)
    bounced_at = models.DateTimeField(null=True, blank=True)
    bounce_reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]


class EmailEvent(models.Model):
    """Resend webhook delivery. svix_id is unique so replays and retries are processed once."""

    svix_id = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=50)
    email_log = models.ForeignKey(
        EmailLog, null=True, blank=True, on_delete=models.SET_NULL, related_name="events"
    )
    payload = models.JSONField(default=dict)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return f"{self.type} {self.svix_id}"
