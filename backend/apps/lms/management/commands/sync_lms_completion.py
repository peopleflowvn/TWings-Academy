from django.core.management.base import BaseCommand

from apps.lms import moodle
from apps.lms.completion import release_holds, sync_all
from apps.lms.learning import refresh_learning


class Command(BaseCommand):
    help = "Pull progress/completion from Moodle; issue certificates for newly completed learners."

    def handle(self, *args, **options):
        if not moodle.is_configured():
            self.stdout.write("LMS not configured; nothing to do.")
            return
        # Attendance / grades / risk first, so completion sees fresh attendance.
        self.stdout.write(f"learning: {refresh_learning()}")
        self.stdout.write(f"completion: {sync_all()}")
        self.stdout.write(f"released holds: {release_holds()}")
