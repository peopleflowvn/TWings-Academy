"""
Corporate training foundation (B2B, week 1 of the TMS plan): a learner listed by a client company for a
corporate class studies on Moodle with no order, signs in through SSO, and corporate classes never show
up where intakes are sold.
"""

from datetime import date

import pytest
from django.db import IntegrityError, transaction

from apps.accounts.rbac import ROLE_PERMISSIONS, Role
from apps.catalog.intakes import refresh_statuses
from apps.catalog.models import Cohort
from apps.corporate.models import (
    ClientUnit,
    CorporateClass,
    CorporateClient,
    CorporateEmployee,
    CorporateEnrollment,
)
from apps.crm.models import Learner, Order
from apps.lms import moodle
from apps.lms.completion import sync_enrollment
from apps.lms.models import LmsEnrollment
from apps.notifications.models import EmailLog
from apps.sso.services import identity_for_email
from tests.test_lms import FakeMoodle

pytestmark = pytest.mark.django_db


@pytest.fixture
def fake_moodle(settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL = "http://lms:8080/learn"
    settings.MOODLE_WS_TOKEN = "t" * 32
    fake = FakeMoodle()
    monkeypatch.setattr(moodle, "call", fake)
    return fake


@pytest.fixture
def corporate_class(course):
    client = CorporateClient.objects.create(name="Ngân hàng Mẫu", code="NHM", email_domains=["nhm.test"])
    cohort = Cohort.objects.create(
        course=course, name="NHM – Lớp 1", audience=Cohort.AUDIENCE_CORPORATE, status="opening"
    )
    return CorporateClass.objects.create(cohort=cohort, client=client)


def _list(corporate_class, email="nv1@nhm.test", name="Trần Thị Bình", **extra):
    client = corporate_class.client
    entity = client.units.filter(kind="legal_entity").first() or ClientUnit.objects.create(
        client=client, kind="legal_entity", name=client.name
    )
    learner = Learner.objects.create(full_name=name, email=email)
    employee = CorporateEmployee.objects.create(
        learner=learner,
        client=client,
        legal_entity=entity,
        employee_code=email.split("@")[0],
        manager_email="ql@nhm.test",
        valid_from=date(2026, 1, 1),
    )
    return CorporateEnrollment.objects.create(
        corporate_class=corporate_class, learner=learner, employee=employee, **extra
    )


# ---------------------------------------------------------------- LmsEnrollment: exactly one source
def test_lms_enrollment_needs_exactly_one_source(corporate_class, course):
    listing = _list(corporate_class)
    order = Order.objects.create(customer_name="A", customer_email="a@example.com", course=course, amount=1)
    with pytest.raises(IntegrityError), transaction.atomic():
        LmsEnrollment.objects.create()
    with pytest.raises(IntegrityError), transaction.atomic():
        LmsEnrollment.objects.create(order=order, corporate_enrollment=listing)
    enrollment = LmsEnrollment.objects.create(corporate_enrollment=listing)
    assert enrollment.learner_email == "nv1@nhm.test" and enrollment.learner_name == "Trần Thị Bình"
    assert enrollment.course == course and enrollment.target_cohort == corporate_class.cohort


# ---------------------------------------------------------------- Moodle access without any order
def test_listed_learner_is_enrolled_without_an_order(
    fake_moodle, corporate_class, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        listing = _list(corporate_class)
    enrollment = LmsEnrollment.objects.get(corporate_enrollment=listing)
    assert enrollment.status == "done" and enrollment.order is None
    assert enrollment.cohort == corporate_class.cohort
    assert fake_moodle.users[0]["email"] == "nv1@nhm.test"
    assert fake_moodle.enrolments[-1]["courseid"] == enrollment.moodle_course_id
    assert not Order.objects.exists()
    log = EmailLog.objects.get(recipient_email="nv1@nhm.test")
    assert log.template_code == "corporate_lms_access" and log.order is None
    assert "Học phí" not in log.rendered_html and "Mã đơn hàng" not in log.rendered_html


def test_cancelled_learner_leaves_the_class_and_loses_sign_in(
    fake_moodle, corporate_class, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        listing = _list(corporate_class)
    enrollment = LmsEnrollment.objects.get(corporate_enrollment=listing)
    listing.status = "cancelled"
    with django_capture_on_commit_callbacks(execute=True):
        listing.save()
    enrollment.refresh_from_db()
    assert enrollment.status == "removed" and enrollment.last_error == "Đã hủy"
    assert (enrollment.moodle_user_id, enrollment.moodle_course_id) in fake_moodle.unenrolled
    assert fake_moodle.suspended[enrollment.moodle_user_id] == 1  # nothing else lets them study

    listing.status = "enrolled"  # listed again
    with django_capture_on_commit_callbacks(execute=True):
        listing.save()
    enrollment.refresh_from_db()
    assert enrollment.status == "done"


def test_corporate_completion_issues_a_certificate_only_when_the_contract_says_so(
    fake_moodle, corporate_class, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        first = _list(corporate_class)
        second = _list(corporate_class, email="nv2@nhm.test", name="Lê Văn Cường")
    e1 = LmsEnrollment.objects.get(corporate_enrollment=first)
    completed = [{"id": e1.moodle_course_id, "completed": True, "progress": 100}]
    assert sync_enrollment(e1, completed)
    assert e1.completed_at and not hasattr(e1, "certificate")

    corporate_class.issue_certificate = True
    corporate_class.save()
    e2 = LmsEnrollment.objects.with_learning_data().get(corporate_enrollment=second)
    assert sync_enrollment(e2, completed)
    e2.refresh_from_db()
    assert (
        e2.certificate.learner_name == "Lê Văn Cường"
        and e2.certificate.course_title == corporate_class.cohort.course.title
    )
    assert EmailLog.objects.filter(recipient_email="nv2@nhm.test", template_code="lms_certificate").exists()


# ---------------------------------------------------------------- SSO
def test_listed_learner_can_sign_in_and_loses_it_when_cancelled(corporate_class):
    listing = _list(corporate_class, email="NV1@nhm.test")
    identity = identity_for_email("nv1@nhm.test")
    assert identity["sub"].startswith("learner:") and identity["name"] == "Trần Thị Bình"
    assert identity["given_name"] == "Bình"
    listing.status = "transferred"
    listing.save()
    assert identity_for_email("nv1@nhm.test") is None


def test_same_person_same_subject_for_b2c_and_b2b(corporate_class, course):
    _list(corporate_class, email="hv@nhm.test")
    b2b = identity_for_email("hv@nhm.test")
    order = Order.objects.create(
        customer_name="Trần Thị Bình", customer_email="hv@nhm.test", course=course, amount=1
    )
    order.status = "paid"
    order.save()
    assert identity_for_email("hv@nhm.test")["sub"] == b2b["sub"]


# ---------------------------------------------------------------- corporate classes are never on sale
def test_corporate_class_is_hidden_from_the_website_and_checkout(
    api, course, corporate_class, registration_payload
):
    public = api.get(f"/api/v1/public/courses/{course.slug}/").json()
    assert public["upcomingCohorts"] == []
    # The course has no public intake: a checkout neither waits for one nor lands in the corporate class.
    res = api.post(
        "/api/v1/public/checkout/",
        {**registration_payload, "batchCohort": corporate_class.cohort.name},
        format="json",
    )
    assert res.status_code == 201
    assert Order.objects.get().cohort is None


def test_corporate_class_is_not_an_intake_in_app(staff_client, course, corporate_class):
    public = Cohort.objects.create(course=course, name="Khóa 1", status="opening")
    res = staff_client(Role.ACADEMIC_MANAGEMENT).get("/api/v1/staff/cohorts/")
    body = res.json()
    ids = {c["id"] for c in (body["results"] if isinstance(body, dict) else body)}
    assert ids == {public.id}


def test_intake_status_rules_skip_corporate_classes(corporate_class):
    cohort = corporate_class.cohort
    cohort.registration_deadline = date(2020, 1, 1)
    cohort.save()
    refresh_statuses()
    cohort.refresh_from_db()
    assert cohort.status == "opening"  # admissions rules (deadline, seats) never close a client's class


# ---------------------------------------------------------------- RBAC
def test_corporate_role_permissions():
    corporate = ROLE_PERMISSIONS[Role.CORPORATE_TRAINING]
    assert {"corporate.view", "corporate.classes", "corporate.communications_send"} <= corporate
    assert not any(code.startswith(("crm.", "finance.")) for code in corporate)
    assert "corporate.acceptance" in ROLE_PERMISSIONS[Role.FINANCE_ACCOUNTANT]
    assert "corporate.classes" not in ROLE_PERMISSIONS[Role.FINANCE_ACCOUNTANT]
