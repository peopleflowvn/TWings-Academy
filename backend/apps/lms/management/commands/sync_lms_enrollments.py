from django.core.management.base import BaseCommand

from apps.crm.models import Order
from apps.lms import moodle
from apps.lms.models import LmsEnrollment
from apps.lms.services import retry_pending


class Command(BaseCommand):
    help = "Grant Moodle access for paid orders that are not enrolled yet (retries failures)."

    def handle(self, *args, **options):
        if not moodle.is_configured():
            self.stdout.write("LMS not configured (MOODLE_INTERNAL_URL / MOODLE_WS_TOKEN); nothing to do.")
            return
        # Paid orders that never got an enrollment record (e.g. paid before the LMS existed).
        missing = Order.objects.filter(status="paid", lms_enrollment__isnull=True)
        LmsEnrollment.objects.bulk_create([LmsEnrollment(order=o) for o in missing])
        self.stdout.write(f"{retry_pending()}")
