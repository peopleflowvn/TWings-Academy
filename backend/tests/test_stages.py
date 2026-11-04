"""The CRM stages: the old CRM's "Trạng thái khách hàng" (apps.crm.stages)."""

import importlib

import pytest
from django.apps import apps as django_apps

from apps.accounts.rbac import Role
from apps.crm import stages
from apps.crm.legacy_import import restage
from apps.crm.models import Order
from apps.crm.services import create_installments
from apps.payments.services import _credit

pytestmark = pytest.mark.django_db


def _patch(client, order, **data):
    return client.patch(f"/api/v1/staff/orders/{order.pk}/", data, format="json")


def test_the_stage_follows_the_money(course):
    order = Order.objects.create(
        customer_name="A", course=course, amount=10_000_000, total_receivable=10_000_000, installment_count=2
    )
    create_installments(order, 30)
    first = order.installments.get(sequence=1).amount
    assert order.crm_status == stages.POTENTIAL
    _credit(order, first, source="manual")
    assert order.crm_status == stages.PART_PAID and order.learning_access
    _credit(order, 10_000_000 - first, source="manual")
    assert order.crm_status == stages.PAID and order.status == "paid"

    single = Order.objects.create(customer_name="B", course=course, amount=1000, total_receivable=1000)
    _credit(single, 400, source="manual")  # not enough to study: the stage stays
    assert single.crm_status == stages.POTENTIAL


def test_staff_moves(staff_client, course):
    client = staff_client(Role.SALES_CRM)
    order = Order.objects.create(customer_name="A", course=course, amount=1000, total_receivable=1000)
    for stage in (stages.PAID, stages.PART_PAID, stages.ONBOARD):
        assert _patch(client, order, crmStatus=stage).status_code == 400  # payments / studying only
    assert _patch(client, order, crmStatus=stages.AGREED).status_code == 200

    # A closed stage carries its own reason; "Từ chối lần 3" asks for one.
    assert _patch(client, order, crmStatus=stages.UNREACHABLE).status_code == 200
    order.refresh_from_db()
    assert (order.lost_reason, order.status) == ("Không liên lạc được", "cancelled")
    assert _patch(client, order, crmStatus=stages.REFUSED_2).status_code == 400  # call-back day
    assert _patch(client, order, crmStatus=stages.REFUSED_2, nextContactOn="2026-12-01").status_code == 200
    order.refresh_from_db()
    assert order.status == "pending"

    _credit(order, 1000, source="manual")
    assert order.crm_status == stages.PAID
    assert _patch(client, order, crmStatus=stages.ONBOARD).status_code == 200
    assert _patch(client, order, crmStatus=stages.REFUSED_3, lostReason="x").status_code == 400
    order.refresh_from_db()
    _credit(order, 0, source="manual")
    assert order.crm_status == stages.ONBOARD  # in class stays in class


def test_a_checkout_asks_for_the_payment(api, registration_payload, course, monkeypatch):
    from apps.catalog.models import Cohort

    Cohort.objects.create(course=course, name="K1", status="opening")
    assert api.post("/api/v1/public/checkout/", registration_payload, format="json").status_code == 201
    assert Order.objects.get().crm_status == stages.TO_PAY
    Order.objects.all().delete()
    assert api.post("/api/v1/public/registrations/", registration_payload, format="json").status_code == 201
    assert Order.objects.get().crm_status == stages.POTENTIAL


def test_registrations_move_from_the_former_stages(course):
    migration = importlib.import_module("apps.crm.migrations.0022_stages_of_the_old_crm")
    rows = {
        "1. Mới": stages.POTENTIAL,
        "2. Đã tiếp cận": stages.CONSULTING,
        "4. Hẹn gặp": stages.CONSULTING,
        "6. Chăm sóc lại": stages.REFUSED_1,
        "7. Đã hủy": stages.UNREACHABLE,
    }
    for old in rows:
        Order.objects.create(customer_name=old, course=course)
    Order.objects.filter(customer_name="7. Đã hủy").update(lost_reason="Không liên lạc được")
    Order.objects.update(crm_status=django_models_value("crm_status"))
    migration.to_new_stages(django_apps, None)
    assert dict(Order.objects.values_list("customer_name", "crm_status")) == rows


def django_models_value(field):
    from django.db.models import F

    return F("customer_name")


def test_old_registrations_take_their_old_status(course):
    a = Order.objects.create(customer_name="A", course=course, attribution={"legacy_code": "A1"})
    b = Order.objects.create(
        customer_name="B", course=course, amount=100, total_receivable=100, attribution={"legacy_code": "B1"}
    )
    _credit(b, 100, source="manual")
    Order.objects.create(customer_name="C", course=course, attribution={"legacy_code": "C1"})
    plan = restage(
        {"A1": "0. Từ chối lần 2", "B1": "7. Onboard", "C1": "5. Đã đóng phí", "X": "1."}, apply=True
    )
    assert plan["missing"] == ["X"]
    got = {o.customer_name: o.crm_status for o in Order.objects.all()}
    # C said paid but nothing was: it is asked to pay.
    assert got == {"A": stages.REFUSED_2, "B": stages.ONBOARD, "C": stages.TO_PAY}
    assert a.timeline_activities.filter(title="Giai đoạn theo CRM cũ").exists()
