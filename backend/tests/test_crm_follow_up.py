"""CRM follow-up: nobody loses a lead (unassigned, overdue, reassigned), tasks per person, stage rules."""

from datetime import date, datetime, timedelta

import pytest
from django.utils import timezone

from apps.crm.assignment import alert_overdue_leads
from apps.crm.models import Activity, FollowupTask, Order
from tests.conftest import Role, make_staff

pytestmark = pytest.mark.django_db


@pytest.fixture
def sent(monkeypatch):
    """E-mails the CRM sends (recipient, subject)."""
    box = []

    def fake(*, to, subject, html, idempotency_key, **kwargs):
        box.append((to, subject))

    monkeypatch.setattr("apps.notifications.resend.send_email", fake)
    return box


def _register(api, payload, **extra):
    res = api.post("/api/v1/public/registrations/", {**payload, **extra}, format="json")
    assert res.status_code == 201, res.content
    return Order.objects.get(order_code=res.json()["registrationCode"])


def test_a_lead_nobody_takes_goes_to_the_lead_managers(
    api, registration_payload, sent, django_capture_on_commit_callbacks
):
    away = make_staff(Role.SALES_CRM, "away@twings.test")
    away.receives_leads = False
    away.save()
    boss = make_staff(Role.SALES_CRM, "boss@twings.test")
    boss.receives_leads, boss.lead_manager = False, True
    boss.save()
    with django_capture_on_commit_callbacks(execute=True):
        order = _register(api, registration_payload)
    assert order.assigned_to is None
    task = FollowupTask.objects.get(order=order)
    assert task.owner is None and task.title.startswith("Phân công lead mới")
    assert ("boss@twings.test", f"[TWings] Lead chưa có người nhận: {order.customer_name}") in sent
    # the manager's day lists it; a consultant's day does not
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(boss)
    day = client.get("/api/v1/staff/my-day/").json()
    assert day["isLeadManager"] and [r["id"] for r in day["unassigned"]] == [order.pk]
    upcoming = client.get("/api/v1/staff/dashboard/").json()["sales"]["upcomingTasks"]
    assert any(t["orderId"] == order.pk for t in upcoming)  # the unowned task is the managers' to do
    client.force_authenticate(away)
    assert "unassigned" not in client.get("/api/v1/staff/my-day/").json()


def test_one_contact_task_per_person(api, registration_payload):
    make_staff(Role.SALES_CRM, "lan@twings.test")
    first = _register(api, registration_payload)
    second = _register(api, {**registration_payload, "customerName": "Nguyễn Văn A (khóa 2)"})
    assert second.assigned_to == first.assigned_to
    tasks = FollowupTask.objects.filter(title__startswith="Liên hệ lead mới")
    assert tasks.count() == 1 and tasks.get().owner == first.assigned_to


def test_reassigning_moves_tasks_learner_and_deadline(api, registration_payload, staff_client, sent):
    lan = make_staff(Role.SALES_CRM, "lan@twings.test")
    order = _register(api, registration_payload)
    assert order.assigned_to == lan
    Order.objects.filter(pk=order.pk).update(response_due_at=timezone.now() - timedelta(hours=1))
    minh = make_staff(Role.SALES_CRM, "minh@twings.test")
    boss = staff_client(Role.SUPER_ADMIN)
    res = boss.patch(f"/api/v1/staff/orders/{order.pk}/", {"assignedTo": minh.pk}, format="json")
    assert res.status_code == 200, res.content
    order.refresh_from_db()
    assert order.assigned_to == minh and order.pic == minh.name
    assert order.response_due_at > timezone.now()  # a fresh deadline for the new consultant
    assert set(order.followup_tasks.filter(is_completed=False).values_list("owner", flat=True)) == {minh.pk}
    order.learner.refresh_from_db()
    assert order.learner.owner == minh
    assert Activity.objects.filter(order=order, title__startswith="Chuyển phụ trách").exists()
    # the learner's next registration goes to the new consultant
    again = _register(api, {**registration_payload, "customerName": "Nguyễn Văn A (lần 2)"})
    assert again.assigned_to == minh


def test_bulk_assign(staff_client, course):
    lan = make_staff(Role.SALES_CRM, "lan@twings.test")
    orders = [Order.objects.create(customer_name=f"L{i}", course=course) for i in range(3)]
    client = staff_client(Role.SALES_CRM)  # consultants have crm.assign_pic
    res = client.post(
        "/api/v1/staff/orders/assign/", {"ids": [o.pk for o in orders], "assignedToId": lan.pk}, format="json"
    )
    assert res.status_code == 200 and res.json()["updated"] == 3
    assert Order.objects.filter(assigned_to=lan).count() == 3
    assert staff_client(Role.FINANCE_ACCOUNTANT).post("/api/v1/staff/orders/assign/", {}).status_code == 403


def test_overdue_leads_remind_once_then_escalate(api, registration_payload, sent, settings):
    settings.LEAD_RESPONSE_HOURS = 4
    lan = make_staff(Role.SALES_CRM, "lan@twings.test")
    boss = make_staff(Role.SUPER_ADMIN, "boss@twings.test")
    order = _register(api, registration_payload)
    tz = timezone.get_current_timezone()
    noon = datetime(2026, 10, 7, 12, 0, tzinfo=tz)
    Order.objects.filter(pk=order.pk).update(response_due_at=noon - timedelta(hours=1))

    assert alert_overdue_leads(noon) == {"reminded": 1, "escalated": 0}
    assert sent[-1][0] == lan.email
    assert alert_overdue_leads(noon + timedelta(minutes=30))["reminded"] == 0  # once
    later = noon + timedelta(hours=4)  # past twice the commitment
    assert alert_overdue_leads(later) == {"reminded": 0, "escalated": 1}
    assert sent[-1][0] == boss.email
    assert alert_overdue_leads(later + timedelta(minutes=30))["escalated"] == 0
    night = datetime(2026, 10, 7, 22, 0, tzinfo=tz)
    assert alert_overdue_leads(night)["reminded"] == 0  # nobody is e-mailed at night


def test_care_again_needs_a_call_back_day_and_cancel_a_reason(staff_client, course):
    lan = make_staff(Role.SALES_CRM, "lan@twings.test")
    order = Order.objects.create(
        customer_name="A", course=course, assigned_to=lan, crm_status="3. Đang tư vấn"
    )
    client = staff_client(Role.SALES_CRM)
    url = f"/api/v1/staff/orders/{order.pk}/"
    assert client.patch(url, {"crmStatus": "6. Chăm sóc lại"}, format="json").status_code == 400
    res = client.patch(url, {"crmStatus": "6. Chăm sóc lại", "nextContactOn": "2026-11-20"}, format="json")
    assert res.status_code == 200, res.content
    task = order.followup_tasks.get(title="Gọi lại (chăm sóc lại)")
    assert task.due_date == date(2026, 11, 20) and task.owner == lan

    assert client.patch(url, {"crmStatus": "7. Đã hủy"}, format="json").status_code == 400
    res = client.patch(url, {"crmStatus": "7. Đã hủy", "lostReason": "Đã học nơi khác"}, format="json")
    assert res.status_code == 200
    order.refresh_from_db()
    assert order.lost_reason == "Đã học nơi khác" and order.status == "cancelled"

    report = staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/reports/").json()["sales"]
    assert {"reason": "Đã học nơi khác", "count": 1} in report["lostReasons"]
    row = next(r for r in report["consultants"] if r["consultant"] == lan.name)
    assert row["leads"] == 1 and row["lost"] == 1


def test_tasks_belong_to_people(staff_client, course):
    from rest_framework.test import APIClient

    lan = make_staff(Role.SALES_CRM, "lan@twings.test")
    minh = make_staff(Role.SALES_CRM, "minh@twings.test")
    mine = Order.objects.create(customer_name="Của Lan", course=course, assigned_to=lan)
    FollowupTask.objects.create(order=mine, title="Gọi", due_date=timezone.localdate())
    task = mine.followup_tasks.get()
    assert task.owner == lan and task.assigned_to == lan.name
    client = APIClient()
    client.force_authenticate(minh)
    dash = client.get("/api/v1/staff/dashboard/").json()["sales"]
    assert dash["tasksDueToday"] == 0 and dash["upcomingTasks"] == []
    client.force_authenticate(lan)
    assert client.get("/api/v1/staff/dashboard/").json()["sales"]["tasksDueToday"] == 1
    day = client.get("/api/v1/staff/my-day/").json()
    assert [t["title"] for t in day["tasks"]] == ["Gọi"]


def test_lead_manager_toggle(staff_client):
    lan = make_staff(Role.SALES_CRM, "lan@twings.test")
    client = staff_client(Role.SUPER_ADMIN)
    rows = client.patch(
        "/api/v1/staff/consultants/", {"id": lan.pk, "leadManager": True}, format="json"
    ).json()
    lan.refresh_from_db()
    assert lan.lead_manager and lan.receives_leads  # the other flag is left alone
    assert next(r for r in rows if r["id"] == lan.pk)["leadManager"] is True
