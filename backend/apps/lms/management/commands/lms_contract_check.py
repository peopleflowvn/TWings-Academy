"""
Contract check against a real Moodle (CI: the freshly built lms image, installed from scratch).

Runs the integration exactly as production does, through the same service functions: web service
functions available to the token, template course + paid order -> account + enrolment, intake course
copied from the template with its calendar and attendance sessions, announcements forum link, the
learner overview, refund -> unenrol + suspended account. Creates test data: never run it in production.
"""

import time
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.catalog.models import Cohort, CohortSession, Course
from apps.crm.models import Order
from apps.lms import moodle, overview
from apps.lms.learning import announcements_link
from apps.lms.models import LmsEnrollment
from apps.lms.services import enroll_paid_order, ensure_cohort_course, revoke_access


class Command(BaseCommand):
    help = "Exercise the TWings <-> Moodle integration against a real Moodle (CI only: creates data)."

    def expect(self, label: str, ok: bool, detail="") -> None:
        if not ok:
            raise CommandError(f"FAIL {label} {detail}")
        self.stdout.write(f"ok   {label} {detail}".rstrip())

    def handle(self, *args, **options):
        if not moodle.is_configured():
            raise CommandError("MOODLE_INTERNAL_URL / MOODLE_WS_TOKEN are not set")
        info = None
        for _ in range(30):  # Apache may still be starting
            try:
                info = moodle.call("core_webservice_get_site_info")
                break
            except moodle.MoodleError:
                time.sleep(2)
        self.expect("web service reachable", info is not None)
        available = {f["name"] for f in info["functions"]}
        missing = sorted(moodle.functions_used() - available)
        self.expect("every function the backend calls is available to the token", not missing, missing or "")

        course = Course.objects.create(
            slug=f"contract-{int(time.time())}", title="Kiểm thử hợp đồng LMS", price=1, status="published"
        )
        order = Order.objects.create(
            customer_name="Nguyễn Văn Kiểm",
            customer_email="contract@example.invalid",
            course=course,
            amount=1,
        )
        order.status = "paid"
        order.save()
        enroll_paid_order(order.pk)
        enrollment = LmsEnrollment.objects.get(order=order)
        self.expect(
            "paid order -> Moodle account + enrolment", enrollment.status == "done", enrollment.last_error
        )

        cohort = Cohort.objects.create(
            course=course,
            name="Khóa KT",
            status="opening",
            start_date=timezone.localdate() + timedelta(days=7),
        )
        cohort_course = ensure_cohort_course(cohort)
        self.expect("intake course copied from the template", cohort_course != enrollment.moodle_course_id)
        start = timezone.now() + timedelta(days=7)
        CohortSession.objects.create(
            cohort=cohort, title="Buổi 1", starts_at=start, ends_at=start + timedelta(hours=2)
        )
        from apps.catalog.intakes import sync_sessions

        sync_sessions(cohort)
        cohort.refresh_from_db()
        session = cohort.sessions.get()
        self.expect(
            "class sessions -> calendar event + attendance session",
            bool(
                session.moodle_event_id
                and session.moodle_attendance_session_id
                and cohort.moodle_attendance_id
            ),
        )

        link = announcements_link(cohort_course)
        self.expect("announcements forum link", "/learn/" in link, link)
        learner = overview.learner_overview(order.customer_email)
        self.expect(
            "learner overview", any(c.get("id") == enrollment.moodle_course_id for c in learner["courses"])
        )

        order.status = "refunded"
        order.save()
        revoke_access(order.pk)
        enrollment.refresh_from_db()
        user = overview.find_user(order.customer_email)
        self.expect(
            "refund -> unenrolled and account suspended", enrollment.status == "removed" and user["suspended"]
        )
        self.stdout.write(self.style.SUCCESS("Moodle contract check passed"))
