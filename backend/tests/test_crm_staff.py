"""Staff CRM API: what the lead list exposes, and 'paid' following recorded payments only."""

from apps.accounts.rbac import Role
from apps.crm.models import Order


def test_list_hides_identity_and_bank_fields_detail_shows_them(staff_client, course):
    order = Order.objects.create(
        customer_name="A", course=course, citizen_id="001205019888", bank_account_number="123456"
    )
    client = staff_client(Role.SALES_CRM)
    row = next(r for r in client.get("/api/v1/staff/orders/").json()["results"] if r["id"] == order.pk)
    assert "citizenId" not in row and "bankAccountNumber" not in row
    detail = client.get(f"/api/v1/staff/orders/{order.pk}/").json()
    assert detail["citizenId"] == "001205019888"


def test_list_and_export_leave_out_program_components(staff_client, course):
    parent = Order.objects.create(customer_name="Program buyer", amount=100)
    Order.objects.create(customer_name="Program buyer", course=course, parent=parent)
    client = staff_client(Role.SALES_CRM)
    assert [r["id"] for r in client.get("/api/v1/staff/orders/").json()["results"]] == [parent.pk]
    assert len(client.get("/api/v1/staff/orders/?components=1").json()["results"]) == 2


def test_paid_stage_needs_a_recorded_payment(staff_client, course):
    order = Order.objects.create(customer_name="A", course=course, amount=100, total_receivable=100)
    res = staff_client(Role.SALES_CRM).patch(
        f"/api/v1/staff/orders/{order.pk}/", {"crmStatus": "5. Đã đóng phí"}, format="json"
    )
    assert res.status_code == 400
    res = staff_client(Role.FINANCE_ACCOUNTANT).patch(
        f"/api/v1/staff/orders/{order.pk}/", {"status": "paid"}, format="json"
    )
    assert res.status_code == 400
    order.refresh_from_db()
    assert (order.status, order.crm_status) == ("pending", "1. Mới")


def test_duplicate_count_in_detail(staff_client, course):
    Order.objects.create(customer_name="A", course=course, customer_phone="0912345678")
    dup = Order.objects.create(
        customer_name="A", course=course, customer_phone="0912345678", is_duplicate=True
    )
    detail = staff_client(Role.SALES_CRM).get(f"/api/v1/staff/orders/{dup.pk}/").json()
    assert detail["duplicateCount"] == 1
    assert [r["courseTitle"] for r in detail["relatedOrders"]] == [course.title]


def test_campaign_enrolment_counts_link_and_code(staff_client, course):
    from apps.crm.models import AdmissionCampaign

    camp = AdmissionCampaign.objects.create(code="CAMP-X", name="X")
    Order.objects.create(customer_name="A", course=course, campaign=camp, status="paid")
    Order.objects.create(customer_name="B", course=course, campaign_code="camp-x", status="paid")
    Order.objects.create(customer_name="C", course=course, campaign_code="CAMP-X")  # not paid
    rows = staff_client(Role.SALES_CRM).get("/api/v1/staff/campaigns/").json()
    rows = rows["results"] if isinstance(rows, dict) else rows
    assert next(r for r in rows if r["code"] == "CAMP-X")["totalEnrolled"] == 2


def _rows(res):
    data = res.json()
    return data["results"] if isinstance(data, dict) and "results" in data else data


def test_staff_creates_a_lead_priced_assigned_and_deduplicated(staff_client, course):
    from .conftest import make_staff

    Order.objects.create(customer_name="Old", course=course, customer_phone="0911222333")
    consultant = make_staff(Role.SALES_CRM, "tuvan@twings.test")
    consultant.receives_leads = True
    consultant.save()
    res = staff_client(Role.SALES_CRM).post(
        "/api/v1/staff/orders/",
        {"customerName": "Walk-in", "customerPhone": "0911222333", "courseId": course.pk},
        format="json",
    )
    assert res.status_code == 201, res.content
    order = Order.objects.get(pk=res.json()["id"])
    assert order.amount == course.price and order.total_receivable == course.price
    assert order.course_title == course.title and order.source == "Nhập tay"
    assert order.is_duplicate and order.assigned_to == consultant and order.pic == consultant.name
    assert order.response_due_at is not None
    assert order.timeline_activities.filter(title="Tạo lead thủ công").exists()


def test_pic_follows_the_assigned_consultant(staff_client, course):
    from .conftest import make_staff

    consultant = make_staff(Role.SALES_CRM, "pic@twings.test")
    order = Order.objects.create(customer_name="A", course=course, pic="Ai đó")
    res = staff_client(Role.SUPER_ADMIN).patch(
        f"/api/v1/staff/orders/{order.pk}/", {"assignedTo": consultant.pk}, format="json"
    )
    assert res.status_code == 200, res.content
    order.refresh_from_db()
    assert order.pic == consultant.name


def test_pipeline_filters_and_stage_counts(staff_client, course):
    from apps.crm.models import AdmissionCampaign

    camp = AdmissionCampaign.objects.create(code="CAMP-P", name="P")
    Order.objects.create(customer_name="A", course=course, campaign=camp, amount=100)
    Order.objects.create(
        customer_name="B", course=course, campaign_code="camp-p", crm_status="3. Đang tư vấn"
    )
    Order.objects.create(customer_name="C", course=course)
    Order.objects.create(customer_name="D", course=course, campaign_code="UNKNOWN")
    client = staff_client(Role.SALES_CRM)

    names = {r["customerName"] for r in _rows(client.get(f"/api/v1/staff/orders/?scope={camp.pk}"))}
    assert names == {"A", "B"}
    names = {r["customerName"] for r in _rows(client.get("/api/v1/staff/orders/?scope=none"))}
    assert names == {"C", "D"}

    summary = client.get(f"/api/v1/staff/orders/pipeline/?scope={camp.pk}").json()
    stages = {s["stage"]: s for s in summary["stages"]}
    assert (
        summary["total"] == 2 and stages["1. Mới"]["amount"] == 100 and stages["3. Đang tư vấn"]["count"] == 1
    )

    funnel = next(c for c in _rows(client.get("/api/v1/staff/campaigns/")) if c["code"] == "CAMP-P")["funnel"]
    assert funnel["leads"] == 2
    assert funnel["courses"] == [{"courseId": course.pk, "leads": 2, "paid": 0}]


def test_email_from_the_lead_workspace_goes_into_its_history(staff_client, course, monkeypatch):
    order = Order.objects.create(customer_name="A", course=course, customer_email="a@example.com")
    client = staff_client(Role.SALES_CRM)
    body = {"to": "a@example.com", "subject": "Chào bạn", "html": "<p>Hi</p>", "orderId": order.pk}

    # No Resend key: nothing is delivered, the response and the history say so, no first contact.
    res = client.post("/api/v1/staff/emails/send/", body, format="json")
    assert (
        res.status_code == 201
        and res.json()["status"] == "simulated"
        and res.json()["resendMessageId"] is None
    )
    assert order.timeline_activities.get(type="email").title.startswith("Email chưa gửi")
    order.refresh_from_db()
    assert order.first_response_at is None

    monkeypatch.setattr("apps.notifications.views.send_email", lambda **kw: "msg_1")
    res = client.post("/api/v1/staff/emails/send/", body, format="json")
    assert res.json()["status"] == "sent"
    assert order.timeline_activities.filter(title="Email: Chào bạn").exists()
    order.refresh_from_db()
    assert order.first_response_at is not None
