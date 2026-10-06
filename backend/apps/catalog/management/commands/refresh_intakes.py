from django.core.management.base import BaseCommand

from apps.catalog.intakes import refresh_statuses


class Command(BaseCommand):
    help = "Intake statuses from dates and seats (full / closed / in progress), rolling applicants over."

    def handle(self, *args, **options):
        self.stdout.write(f"{refresh_statuses()}")
