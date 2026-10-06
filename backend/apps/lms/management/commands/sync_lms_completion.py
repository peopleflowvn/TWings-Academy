from django.core.management.base import BaseCommand

from apps.lms import moodle
from apps.lms.completion import sync_all


class Command(BaseCommand):
    help = "Pull progress/completion from Moodle; issue certificates for newly completed learners."

    def handle(self, *args, **options):
        if not moodle.is_configured():
            self.stdout.write("LMS not configured; nothing to do.")
            return
        self.stdout.write(f"{sync_all()}")
