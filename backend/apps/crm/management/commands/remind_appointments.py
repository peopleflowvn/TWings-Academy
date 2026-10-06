from django.core.management.base import BaseCommand

from apps.crm.assignment import remind_appointments


class Command(BaseCommand):
    help = "Remind leads and consultants of consultations starting within ~3 hours (run hourly)."

    def handle(self, *args, **options):
        self.stdout.write(f"reminded: {remind_appointments()}")
