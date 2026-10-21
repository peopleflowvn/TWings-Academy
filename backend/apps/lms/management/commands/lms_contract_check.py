"""
Contract check against a real Moodle (CI: the freshly built lms image, installed from scratch).

Runs the integration exactly as production does, through the same service functions: web service
functions available to the token, template course + paid order -> account + enrolment, intake course
copied from the template with its calendar and attendance sessions, announcements forum link, the
learner overview, a corporate (B2B) listing -> enrolment without an order, then cancelled -> unenrol,
refund -> unenrol + suspended account. Creates test data: never run it in production.
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
from apps.lms.services import (
    enroll_corporate,
    enroll_paid_order,
    ensure_cohort_course,
    revoke_access,
    revoke_corporate,
)


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

        self.check_corporate()

        order.status = "refunded"
        order.save()
        revoke_access(order.pk)
        enrollment.refresh_from_db()
        user = overview.find_user(order.customer_email)
        self.expect(
            "refund -> unenrolled and account suspended", enrollment.status == "removed" and user["suspended"]
        )
        self.stdout.write(self.style.SUCCESS("Moodle contract check passed"))

    def check_corporate(self) -> None:
        """B2B: a learner listed by a company for a class on a course not on sale, no order at all."""
        from apps.corporate.models import (
            ClientUnit,
            CorporateClass,
            CorporateClient,
            CorporateEmployee,
            CorporateEnrollment,
        )
        from apps.crm.models import Learner
        from apps.sso.services import identity_for_email

        stamp = int(time.time())
        course = Course.objects.create(
            slug=f"contract-b2b-{stamp}", title="Kiểm thử lớp doanh nghiệp", price=1
        )
        client = CorporateClient.objects.create(name="Khách hàng kiểm thử", code=f"KT{stamp}")
        entity = ClientUnit.objects.create(client=client, kind="legal_entity", name=client.name)
        cohort = Cohort.objects.create(course=course, name="Lớp DN", audience=Cohort.AUDIENCE_CORPORATE)
        corporate_class = CorporateClass.objects.create(cohort=cohort, client=client)
        learner = Learner.objects.create(full_name="Trần Thị Doanh", email="contract-b2b@example.invalid")
        employee = CorporateEmployee.objects.create(
            learner=learner, client=client, legal_entity=entity, valid_from=timezone.localdate()
        )
        listing = CorporateEnrollment.objects.create(
            corporate_class=corporate_class, learner=learner, employee=employee
        )
        enroll_corporate(listing.pk)
        enrollment = LmsEnrollment.objects.get(corporate_enrollment=listing)
        self.expect(
            "corporate listing -> Moodle account + enrolment in the class course (draft course, no order)",
            enrollment.status == "done" and enrollment.order_id is None and enrollment.cohort_id == cohort.pk,
            enrollment.last_error,
        )
        self.expect("corporate learner can sign in (SSO)", identity_for_email(learner.email) is not None)

        from apps.catalog.intakes import sync_sessions
        from apps.lms.learning import set_selfmark

        start = timezone.now() + timedelta(days=3)
        CohortSession.objects.create(
            cohort=cohort, title="Buổi DN", starts_at=start, ends_at=start + timedelta(hours=2)
        )
        sync_sessions(cohort)
        session = cohort.sessions.get()
        self.expect(
            "corporate session -> attendance session with QR self check-in (local_twings)",
            bool(session.moodle_attendance_session_id) and set_selfmark(session, True),
        )
        self.expect("QR self check-in can be turned off", set_selfmark(session, False))

        from apps.corporate.surveys import class_course_id

        course_id = class_course_id(corporate_class)
        feedbacks = moodle.call("mod_feedback_get_feedbacks_by_courses", courseids=[course_id])
        self.expect("corporate class surveys (mod_feedback) readable", "feedbacks" in feedbacks)

        listing.status = "cancelled"
        listing.save()
        revoke_corporate(listing.pk)
        enrollment.refresh_from_db()
        user = overview.find_user(learner.email)
        self.expect(
            "corporate cancellation -> unenrolled and account suspended",
            enrollment.status == "removed" and user["suspended"],
        )
