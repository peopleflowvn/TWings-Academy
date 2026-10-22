from django.core.management.base import BaseCommand

from apps.corporate.services import refresh_class_statuses


class Command(BaseCommand):
    help = "Corporate class statuses from their schedule (planned -> running -> finished)."

    def handle(self, *args, **options):
        self.stdout.write(f"changed: {refresh_class_statuses()}")
