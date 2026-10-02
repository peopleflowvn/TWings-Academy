from django.contrib import admin

from .models import EmailEvent, EmailLog, EmailTemplate

admin.site.register(EmailTemplate, list_display=["name", "code", "category", "is_default"])
admin.site.register(
    EmailLog, list_display=["created_at", "recipient_email", "subject", "status"], list_filter=["status"]
)
admin.site.register(EmailEvent, list_display=["received_at", "type", "svix_id"])
