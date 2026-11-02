"""The super admin deletes for good: a course, a class, a lead, a learner (apps.crm.deletion)."""

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Cohort, Course, Program, ProgramCourse
from apps.crm.models import Learner, Order
from apps.payments.models import Payment
from tests.conftest import Role, make_staff

pytestmark = pytest.mark.django_db


def _paid_lead(course, cohort=None, learner=None):
    lead = Order.objects.create(customer_name="A", course=course, cohort=cohort, learner=learner, amount=1)
    Payment.objects.create(order=lead, amount=1_000, source="manual")
    return lead


def test_a_course_with_classes_and_registrations(staff_client, course):
    k1 = Cohort.objects.create(course=course, name="K1", status="opening")
    lead = _paid_lead(course, k1)
    program = Program.objects.create(slug="goi", title="Gói", price=1)
    ProgramCourse.objects.create(program=program, course=course)
    url = f"/api/v1/staff/courses/{course.pk}/"

    editor = make_staff(Role.ACADEMIC_MANAGEMENT)
    editor.permission_overrides = {"granted": ["courses.delete"]}  # others with the right: take off sale
    editor.save()
    other = APIClient()
    other.force_authenticate(editor)
    assert other.delete(url).status_code == 400 and Course.objects.filter(pk=course.pk).exists()

    assert staff_client(Role.SUPER_ADMIN).delete(url).status_code == 204
    assert not Course.objects.filter(pk=course.pk).exists() and not Cohort.objects.filter(pk=k1.pk).exists()
    lead.refresh_from_db()
    assert lead.course is None and lead.course_title == course.title  # the registration stays
    assert not ProgramCourse.objects.exists() and Program.objects.filter(pk=program.pk).exists()


def test_a_class_with_registrations(staff_client, course):
    k1 = Cohort.objects.create(course=course, name="K1", status="opening")
    lead = Order.objects.create(customer_name="A", course=course, cohort=k1)
    url = f"/api/v1/staff/cohorts/{k1.pk}/"

    res = staff_client(Role.ACADEMIC_MANAGEMENT).delete(url)
    assert res.status_code == 400 and "đăng ký" in res.json()["detail"]

    assert staff_client(Role.SUPER_ADMIN).delete(url).status_code == 204
    lead.refresh_from_db()
    assert not Cohort.objects.filter(pk=k1.pk).exists() and lead.cohort is None and lead.course == course


def test_a_paid_lead_in_the_pipeline(staff_client, course):
    lead = _paid_lead(course)
    component = Order.objects.create(customer_name="A", course=course, parent=lead)
    assert staff_client(Role.SALES_CRM).delete(f"/api/v1/staff/orders/{lead.pk}/").status_code == 403

    assert staff_client(Role.SUPER_ADMIN).delete(f"/api/v1/staff/orders/{lead.pk}/").status_code == 204
    assert not Order.objects.filter(pk__in=[lead.pk, component.pk]).exists() and not Payment.objects.exists()


def test_a_learner_and_their_registrations(staff_client, course):
    learner = Learner.objects.create(full_name="Học Viên Thử", email="thu@example.com")
    _paid_lead(course, learner=learner)
    url = f"/api/v1/staff/learners/{learner.pk}/"

    assert staff_client(Role.SALES_CRM).delete(url).status_code == 403
    assert staff_client(Role.SUPER_ADMIN).delete(url).status_code == 204
    assert not Learner.objects.exists() and not Order.objects.exists() and not Payment.objects.exists()
