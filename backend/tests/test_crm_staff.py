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


def test_campaign_enrolment_counts_link_and_code(staff_client, course):
    from apps.crm.models import AdmissionCampaign

    camp = AdmissionCampaign.objects.create(code="CAMP-X", name="X")
    Order.objects.create(customer_name="A", course=course, campaign=camp, status="paid")
    Order.objects.create(customer_name="B", course=course, campaign_code="camp-x", status="paid")
    Order.objects.create(customer_name="C", course=course, campaign_code="CAMP-X")  # not paid
    rows = staff_client(Role.SALES_CRM).get("/api/v1/staff/campaigns/").json()
    rows = rows["results"] if isinstance(rows, dict) else rows
    assert next(r for r in rows if r["code"] == "CAMP-X")["totalEnrolled"] == 2
