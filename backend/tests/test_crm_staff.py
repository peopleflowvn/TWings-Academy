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


def test_duplicate_means_same_learner_same_course(staff_client, course):
    from apps.catalog.models import Course
    from apps.crm.services import flag_duplicates

    course2 = Course.objects.create(status="published", slug="gdv", title="Giao dịch viên", price=1000)

    first = Order.objects.create(customer_name="A", course=course, customer_phone="0912 345 678")
    flag_duplicates(first)
    again = Order.objects.create(customer_name="A", course=course, customer_phone="+84912345678")
    flag_duplicates(again)
    other_course = Order.objects.create(customer_name="A", course=course2, customer_phone="0912345678")
    flag_duplicates(other_course)

    assert first.learner_id == again.learner_id == other_course.learner_id
    assert again.is_duplicate and first.order_code in again.duplicate_note
    assert not other_course.is_duplicate  # a returning learner on another course is not a duplicate
    detail = staff_client(Role.SALES_CRM).get(f"/api/v1/staff/orders/{again.pk}/").json()
    assert detail["duplicateCount"] == 1 and detail["learnerCode"].startswith("HV")
    assert {r["id"] for r in detail["relatedOrders"]} == {first.pk, other_course.pk}


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
    from apps.crm.services import flag_duplicates

    from .conftest import make_staff

    flag_duplicates(Order.objects.create(customer_name="Old", course=course, customer_phone="0911222333"))
    consultant = make_staff(Role.SALES_CRM, "tuvan@twings.test")
    consultant.receives_leads = True
    consultant.save()
    res = staff_client(Role.SUPER_ADMIN).post(  # the creator is not a consultant receiving leads
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


def test_learner_page_and_edit_reach_every_registration(staff_client, course):
    from apps.catalog.models import Course
    from apps.crm.services import flag_duplicates

    course2 = Course.objects.create(status="published", slug="gdv2", title="Giao dịch viên", price=1000)
    a = Order.objects.create(customer_name="Lan", course=course, customer_email="lan@example.com")
    flag_duplicates(a)
    b = Order.objects.create(customer_name="Lan", course=course2, customer_email="LAN@example.com")
    flag_duplicates(b)
    learner_id = a.learner_id
    assert b.learner_id == learner_id

    client = staff_client(Role.SALES_CRM)
    rows = _rows(client.get("/api/v1/staff/learners/?search=lan"))
    assert rows[0]["registrations"] == 2 and "citizenId" not in rows[0]

    res = client.patch(
        f"/api/v1/staff/learners/{learner_id}/",
        {"citizenId": "001205019888", "university": "NEU"},
        format="json",
    )
    assert res.status_code == 200, res.content
    for order in (a, b):
        order.refresh_from_db()
        assert order.citizen_id == "001205019888" and order.university == "NEU"

    page = client.get(f"/api/v1/staff/learners/{learner_id}/").json()
    assert {r["courseTitle"] for r in page["registrations"]} == {course.title, course2.title}
    assert page["citizenId"] == "001205019888"


def test_editing_one_registration_updates_the_learner(staff_client, course):
    from apps.catalog.models import Course
    from apps.crm.services import flag_duplicates

    course2 = Course.objects.create(status="published", slug="gdv3", title="GDV", price=1000)
    a = Order.objects.create(customer_name="Minh", course=course, customer_phone="0909000111")
    flag_duplicates(a)
    b = Order.objects.create(customer_name="Minh", course=course2, customer_phone="0909000111")
    flag_duplicates(b)
    staff_client(Role.SALES_CRM).patch(f"/api/v1/staff/orders/{a.pk}/", {"major": "Kế toán"}, format="json")
    b.refresh_from_db()
    a.learner.refresh_from_db()
    assert a.learner.major == "Kế toán" and b.major == "Kế toán"


def test_merge_two_records_of_one_person(staff_client, course):
    from apps.crm.services import flag_duplicates

    a = Order.objects.create(customer_name="Hà", course=course, customer_email="ha@example.com")
    flag_duplicates(a)
    b = Order.objects.create(customer_name="Hà", course=course, customer_email="ha.work@example.com")
    flag_duplicates(b)
    assert a.learner_id != b.learner_id
    res = staff_client(Role.SUPER_ADMIN).post(
        f"/api/v1/staff/learners/{a.learner_id}/merge/", {"other": b.learner_id}, format="json"
    )
    assert res.status_code == 200, res.content
    b.refresh_from_db()
    assert b.learner_id == a.learner_id and len(res.json()["registrations"]) == 2


def test_backfill_groups_existing_registrations_into_learners(course):
    import importlib

    from django.apps import apps as django_apps

    from apps.catalog.models import Course
    from apps.crm.models import Learner

    backfill = importlib.import_module("apps.crm.migrations.0007_backfill_learners")
    course2 = Course.objects.create(status="published", slug="bf", title="BF", price=1)
    old = Order.objects.create(customer_name="Old name", course=course, customer_phone="0912 000 111")
    new = Order.objects.create(
        customer_name="New name",
        course=course2,
        customer_phone="+84912000111",
        university="HVNH",
        is_duplicate=True,
    )
    again = Order.objects.create(
        customer_name="New name", course=course, customer_phone="0912000111", is_duplicate=True
    )
    alone = Order.objects.create(customer_name="Someone", course=course, customer_email="x@example.com")

    backfill.forwards(django_apps, None)

    for o in (old, new, again, alone):
        o.refresh_from_db()
    assert old.learner_id == new.learner_id == again.learner_id != alone.learner_id
    learner = Learner.objects.get(pk=old.learner_id)
    assert learner.full_name == "New name" and learner.university == "HVNH"
    assert not new.is_duplicate  # another course: a returning learner
    assert again.is_duplicate and old.order_code in again.duplicate_note


def test_cancel_stage_cancels_an_unpaid_order_and_reopening_restores_it(staff_client, course):
    order = Order.objects.create(customer_name="A", course=course, amount=100, total_receivable=100)
    client = staff_client(Role.SALES_CRM)
    client.patch(f"/api/v1/staff/orders/{order.pk}/", {"crmStatus": "7. Đã hủy"}, format="json")
    order.refresh_from_db()
    assert order.status == "cancelled"
    client.patch(f"/api/v1/staff/orders/{order.pk}/", {"crmStatus": "6. Chăm sóc lại"}, format="json")
    order.refresh_from_db()
    assert order.status == "pending"

    order.total_paid_amount = 50
    order.save()
    client.patch(f"/api/v1/staff/orders/{order.pk}/", {"crmStatus": "7. Đã hủy"}, format="json")
    order.refresh_from_db()
    assert order.status == "pending"  # money received: a refund cancels it, not a stage


def test_appointment_outcome_adds_the_next_step(staff_client, course):
    from django.utils import timezone

    from apps.crm.models import Appointment

    order = Order.objects.create(customer_name="A", course=course, pic="Tư vấn A")
    appt = Appointment.objects.create(order=order, starts_at=timezone.now())
    res = staff_client(Role.SALES_CRM).patch(
        f"/api/v1/staff/appointments/{appt.pk}/", {"status": "no_show"}, format="json"
    )
    assert res.status_code == 200, res.content
    task = order.followup_tasks.get()
    assert task.title.startswith("Liên hệ lại") and task.assigned_to == "Tư vấn A"


def test_crm_data_check_reports_without_changing_anything(course):
    from io import StringIO

    from django.core.management import call_command

    Order.objects.create(customer_name="A", course=course, crm_status="5. Đã đóng phí", pic="HuongNT22")
    Order.objects.create(
        customer_name="B", course=course, campaign_code="TW3", batch_cohort="Khóa học 9 - Hà Nội"
    )
    Order.objects.create(customer_name="C", course=course, paid_amount_l1=500)
    before = list(Order.objects.values_list("pk", "crm_status", "status", "pic").order_by("pk"))

    out = StringIO()
    call_command("crm_data_check", "--json", stdout=out)
    import json

    report = json.loads(out.getvalue())
    assert report["paid_stage_without_payment"]["count"] == 1
    assert report["pic"]["old_default_names"] == 1
    assert report["campaign_codes_without_campaign"]["old_defaults"] == 1
    assert report["class_without_intake"]["count"] == 1
    assert report["legacy_payment_columns"]["paid_amount_l1"] == 1
    assert list(Order.objects.values_list("pk", "crm_status", "status", "pic").order_by("pk")) == before


def test_tuition_template_migration_removes_the_sample_account(db):
    import importlib

    from django.apps import apps as django_apps

    from apps.notifications.models import EmailTemplate

    migration = importlib.import_module("apps.notifications.migrations.0003_tuition_template_real_account")
    body = (
        '<img src="https://img.vietqr.io/image/MSB-03001010099999-compact2.png'
        '?amount=8490000&addInfo=TW3%20{{orderCode}}" />'
        "<p><strong>Ngân hàng:</strong> Ngân hàng TMCP Hàng Hải Việt Nam (MSB)</p>"
        "<p><strong>Số tài khoản:</strong> <span>03001010099999</span></p>"
        "<p><strong>Chủ tài khoản:</strong> CONG TY CP TWINGS ACADEMY</p>"
        "<p>Nội dung CK: TW3 {{orderCode}} {{customerName}}</p><p>Đoạn nhân viên tự viết</p>"
    )
    EmailTemplate.objects.create(code="vietqr_tuition_invoice", name="Học phí", subject="Học phí", body=body)
    migration.forwards(django_apps, None)
    fixed = EmailTemplate.objects.get(code="vietqr_tuition_invoice")
    assert "03001010099999" not in fixed.body and "TW3" not in fixed.body
    for var in (
        "{{qrImageUrl}}",
        "{{bankName}}",
        "{{accountNumber}}",
        "{{accountName}}",
        "{{transferContent}}",
    ):
        assert var in fixed.body
    assert "Đoạn nhân viên tự viết" in fixed.body and "accountNumber" in fixed.variables
