"""Leads past their first-response deadline: remind the consultant, escalate to the lead managers."""

from django.core.management.base import BaseCommand

from apps.crm.assignment import alert_overdue_leads


class Command(BaseCommand):
    help = "Remind consultants of overdue leads; send the lead managers a digest of long-overdue ones."

    def handle(self, *args, **options):
        self.stdout.write(str(alert_overdue_leads()))
