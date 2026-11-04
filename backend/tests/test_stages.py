"""The CRM stages: the old CRM's "Trạng thái khách hàng" (apps.crm.stages)."""

import importlib

import pytest
from django.apps import apps as django_apps

from apps.accounts.rbac import Role
from apps.crm import stages
from apps.crm.legacy_import import restage
from apps.crm.models import ListItem, Order
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


LISTS = "/api/v1/staff/lists/"


def test_the_stages_are_a_list_renamed_and_ordered_without_touching_records(staff_client, course):
    admin = staff_client(Role.SUPER_ADMIN)
    order = Order.objects.create(customer_name="A", course=course, crm_status=stages.CONSULTING)
    item = ListItem.objects.get(kind=stages.KIND, code=stages.CONSULTING)
    r = admin.patch(f"{LISTS}items/{item.id}/", {"value": "2. Đang chăm sóc"}, format="json")
    assert r.status_code == 200
    order.refresh_from_db()
    assert order.crm_status == stages.CONSULTING and stages.name(order.crm_status) == "2. Đang chăm sóc"
    assert stages.code_of("2. Đang tư vấn") == stages.CONSULTING  # the old CRM's spelling still reads
    used = next(i for i in r.json()["items"] if i["code"] == stages.CONSULTING)
    assert used["used"] == 1 and used["system"]

    # A system stage is not hidden, deleted or regrouped; ordering is free.
    assert admin.patch(f"{LISTS}items/{item.id}/", {"active": False}, format="json").status_code == 400
    assert admin.patch(f"{LISTS}items/{item.id}/", {"group": "closed"}, format="json").status_code == 400
    assert admin.delete(f"{LISTS}items/{item.id}/").status_code == 400
    admin.post(f"{LISTS}{stages.KIND}/order/", {"ids": [item.id]}, format="json")
    assert stages.codes()[0] == stages.CONSULTING

    lists = staff_client(Role.SALES_CRM).get("/api/v1/staff/crm/lists/").json()
    assert lists["stages"][0] == {
        "code": stages.CONSULTING,
        "name": "2. Đang chăm sóc",
        "group": stages.G_OPEN,
        "active": True,
        "builtin": True,
    }


def test_a_stage_added_does_what_its_group_says(staff_client, course):
    admin = staff_client(Role.SUPER_ADMIN)
    assert admin.post(f"{LISTS}{stages.KIND}/", {"value": "2b. Hẹn gặp"}, format="json").status_code == 400
    assert (
        admin.post(
            f"{LISTS}{stages.KIND}/", {"value": "8. X", "group": stages.G_PAID}, format="json"
        ).status_code
        == 400
    )  # the paid stages follow the money
    r = admin.post(f"{LISTS}{stages.KIND}/", {"value": "2b. Hẹn gặp", "group": stages.G_OPEN}, format="json")
    meeting = r.json()["items"][-1]
    r = admin.post(f"{LISTS}{stages.KIND}/", {"value": "0. Sai số", "group": stages.G_CLOSED}, format="json")
    wrong = r.json()["items"][-1]
    assert meeting["code"].startswith("custom_") and meeting["code"] in stages.open_codes()

    client = staff_client(Role.SALES_CRM)
    order = Order.objects.create(customer_name="A", course=course, amount=100, total_receivable=100)
    assert _patch(client, order, crmStatus=meeting["code"]).status_code == 200
    assert Order.objects.filter(crm_status__in=stages.in_groups(stages.G_OPEN)).count() == 1
    assert _patch(client, order, crmStatus=wrong["code"]).status_code == 400  # a closed stage asks why
    assert _patch(client, order, crmStatus=wrong["code"], lostReason="Học phí cao").status_code == 200
    order.refresh_from_db()
    assert (order.status, order.lost_reason) == ("cancelled", "Học phí cao")

    # Hidden: no longer offered; deleted only once nothing has it.
    admin.patch(f"{LISTS}items/{meeting['id']}/", {"active": False}, format="json")
    assert _patch(client, order, crmStatus=meeting["code"]).status_code == 400
    assert admin.delete(f"{LISTS}items/{wrong['id']}/").status_code == 400
    assert (
        admin.patch(f"{LISTS}items/{wrong['id']}/", {"group": stages.G_CALL_AGAIN}, format="json").status_code
        == 200
    )
    assert stages.group_of(wrong["code"]) == stages.G_CALL_AGAIN
