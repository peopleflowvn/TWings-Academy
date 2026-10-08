from django.core.management.base import BaseCommand

from apps.core.schedule import SCHEDULE, ensure_schedule


class Command(BaseCommand):
    help = "Queue the next run of every periodic job that has none (worker start, deploy)."

    def handle(self, *args, **options):
        added = ensure_schedule()
        self.stdout.write(f"periodic jobs: {len(SCHEDULE)}, newly scheduled: {', '.join(added) or '-'}")
