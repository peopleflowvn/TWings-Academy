"""Server-to-server callbacks. Each one authenticates the sender itself (signature or API key)."""

from django.urls import path

from apps.lms.webhooks import MoodleEventView
from apps.notifications.views import resend_webhook
from apps.payments.views import BankWebhookView

urlpatterns = [
    path("resend/", resend_webhook, name="webhook-resend"),
    path("bank/", BankWebhookView.as_view(), name="webhook-bank"),
    path("lms/", MoodleEventView.as_view(), name="webhook-lms"),
]
