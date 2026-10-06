from django.core.management.base import BaseCommand

from apps.crm.journeys import run


class Command(BaseCommand):
    help = "Send the automated learner-journey e-mails that are due (each order at most once per journey)."

    def handle(self, *args, **options):
        self.stdout.write(f"{run()}")
