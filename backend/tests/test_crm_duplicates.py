"""One person, one course, one open registration: forms sent again continue it, duplicates are merged."""

import pytest
from rest_framework.test import APIClient

from apps.crm import stages
from apps.crm.models import FollowupTask, Order
from tests.conftest import Role

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    from django.core.cache import cache

    cache.clear()


def _post(path, payload):
    res = APIClient().post(path, payload, format="json")
    assert res.status_code == 201, res.content
    return res.json()


def test_consultation_then_checkout_is_one_registration(course, registration_payload):
    lead = _post("/api/v1/public/registrations/", {**registration_payload, "consultNeed": "Hỏi lịch học"})
    paid = _post("/api/v1/public/checkout/", {**registration_payload, "customerEmail": "A@Example.com"})

    assert paid["orderCode"] == lead["registrationCode"]
    order = Order.objects.get()
    assert order.crm_status == stages.TO_PAY and order.hold_expires_at and order.terms_accepted_at
    assert order.consult_need == "Hỏi lịch học" and not order.is_duplicate
    assert order.timeline_activities.filter(title="Thanh toán online (VietQR) trên đăng ký đang mở").exists()


def test_form_sent_twice_keeps_the_stage(course, registration_payload):
    first = _post("/api/v1/public/checkout/", registration_payload)
    again = _post("/api/v1/public/registrations/", {**registration_payload, "consultNeed": "Cần hóa đơn"})

    assert again["registrationCode"] == first["orderCode"]
    order = Order.objects.get()
    assert order.crm_status == stages.TO_PAY and "Cần hóa đơn" in order.consult_need


def test_other_email_or_closed_registration_is_a_new_lead(course, registration_payload):
    first = _post("/api/v1/public/registrations/", registration_payload)
    # Same phone, another e-mail: could be someone else, so a new (flagged) lead, never theirs.
    other = _post("/api/v1/public/registrations/", {**registration_payload, "customerEmail": "b@example.com"})
    assert other["registrationCode"] != first["registrationCode"]
    flagged = Order.objects.filter(is_duplicate=True)
    assert flagged.count() == 2  # both sides of the duplicate show it

    Order.objects.update(crm_status=stages.MISTAKEN, status="cancelled")
    later = _post("/api/v1/public/registrations/", registration_payload)
    assert later["registrationCode"] not in (first["registrationCode"], other["registrationCode"])


def test_staff_lead_for_someone_already_open_is_refused_unless_confirmed(staff_client, course):
    client = staff_client(Role.SALES_CRM)
    body = {"customerName": "Duyên", "customerPhone": "0911222333", "courseId": course.pk}
    assert client.post("/api/v1/staff/orders/", body, format="json").status_code == 201

    res = client.post("/api/v1/staff/orders/", body, format="json")
    assert res.status_code == 400 and len(res.json()["duplicateOrders"]) == 1
    assert Order.objects.count() == 1  # rolled back

    res = client.post("/api/v1/staff/orders/", {**body, "allowDuplicate": True}, format="json")
    assert res.status_code == 201 and Order.objects.filter(is_duplicate=True).count() == 2


def test_merge_keeps_one_registration_with_the_history(staff_client, course):
    from apps.crm.services import flag_duplicates

    first = Order.objects.create(
        customer_name="Duyên", course=course, customer_phone="0911222333", consult_need="A"
    )
    flag_duplicates(first)
    second = Order.objects.create(
        customer_name="Duyên", course=course, customer_phone="0911222333", crm_status=stages.TO_PAY
    )
    flag_duplicates(second)
    FollowupTask.objects.create(order=first, title="Gọi lại")
    first.timeline_activities.create(type="call", title="Đã gọi", actor="x")

    res = staff_client(Role.SALES_CRM).post(f"/api/v1/staff/orders/{second.pk}/merge_duplicates/")
    assert res.status_code == 200, res.content
    assert res.json()["merged"] == [first.order_code]

    first.refresh_from_db()
    second.refresh_from_db()
    assert (first.crm_status, first.status) == (stages.MISTAKEN, "cancelled")
    assert not first.is_duplicate and not second.is_duplicate
    assert second.consult_need == "A"
    assert second.followup_tasks.filter(title="Gọi lại").exists()
    assert second.timeline_activities.filter(title="Đã gọi").exists()


def test_closing_a_duplicate_clears_the_flag(staff_client, course):
    from apps.crm.services import flag_duplicates

    first = Order.objects.create(customer_name="A", course=course, customer_phone="0911222333")
    flag_duplicates(first)
    second = Order.objects.create(customer_name="A", course=course, customer_phone="0911222333")
    flag_duplicates(second)
    res = staff_client(Role.SALES_CRM).patch(
        f"/api/v1/staff/orders/{first.pk}/", {"crmStatus": stages.MISTAKEN}, format="json"
    )
    assert res.status_code == 200, res.content
    second.refresh_from_db()
    assert not second.is_duplicate


def test_checkout_again_after_the_hold_passed_reopens_the_same_registration(course, registration_payload):
    from django.utils import timezone

    from apps.payments.management.commands.expire_checkouts import expire_checkouts

    first = _post("/api/v1/public/checkout/", registration_payload)
    Order.objects.update(hold_expires_at=timezone.now() - timezone.timedelta(minutes=1))
    assert expire_checkouts() == 1  # cancelled, still followed up ("Đồng ý học")

    again = _post("/api/v1/public/checkout/", registration_payload)
    assert again["orderCode"] == first["orderCode"]
    order = Order.objects.get()
    assert (order.status, order.crm_status) == ("pending", stages.TO_PAY) and order.hold_expires_at


def test_a_program_and_one_of_its_courses_are_duplicates(course):
    from apps.catalog.models import Program, ProgramCourse
    from apps.crm.services import flag_duplicates

    program = Program.objects.create(slug="cv", title="Chuyên viên", price=10_000_000, is_published=True)
    ProgramCourse.objects.create(program=program, course=course, position=0)
    bundle = Order.objects.create(customer_name="A", program=program, customer_phone="0911222333")
    flag_duplicates(bundle)
    single = Order.objects.create(customer_name="A", course=course, customer_phone="0911222333")
    flag_duplicates(single)
    bundle.refresh_from_db()
    assert single.is_duplicate and bundle.is_duplicate and single.order_code in bundle.duplicate_note


def test_merging_two_learner_records_flags_their_registrations_of_one_course(course):
    from apps.crm.learners import merge_learners
    from apps.crm.services import flag_duplicates

    first = Order.objects.create(customer_name="A", course=course, customer_email="a@example.com")
    flag_duplicates(first)
    second = Order.objects.create(customer_name="A", course=course, customer_email="a.other@example.com")
    flag_duplicates(second)
    assert first.learner_id != second.learner_id and not second.is_duplicate

    merge_learners(first.learner, second.learner)
    assert Order.objects.filter(is_duplicate=True).count() == 2
