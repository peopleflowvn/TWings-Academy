from django.core.management.base import BaseCommand

from apps.corporate.requests import remind_owners


class Command(BaseCommand):
    help = "E-mail owners their client requests overdue or due soon under the SLA (weekday mornings)."

    def handle(self, *args, **options):
        self.stdout.write(f"reminded: {remind_owners()}")
