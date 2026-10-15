"""Campaigns past their deadline: status "Hết hạn" (the site already stops listing them that day)."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crm.models import AdmissionCampaign


def refresh_campaigns(today=None) -> int:
    today = today or timezone.localdate()
    expired = 0
    for camp in AdmissionCampaign.objects.filter(status__in=("active", "paused"), deadline__lt=today):
        camp.status = "expired"
        camp.save(update_fields=["status", "updated_at"])
        expired += 1
    return expired


class Command(BaseCommand):
    help = "Campaigns past their deadline become expired (off the public site)."

    def handle(self, *args, **options):
        self.stdout.write(f"expired: {refresh_campaigns()}")
