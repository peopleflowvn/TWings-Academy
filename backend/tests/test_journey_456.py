"""Journey steps 4-6: lead assignment, appointments, terms / receipts / invoices, enrolment file."""

from datetime import datetime, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Cohort, CohortSession
from apps.crm.assignment import overdue_leads, remind_appointments, response_deadline
from apps.crm.models import Appointment, FollowupTask, InvoiceRequest, Order
from apps.notifications.models import EmailLog
from apps.payments.receipts import receipt_url
from tests.conftest import Role, make_staff

pytestmark = pytest.mark.django_db
BANK = {"HTTP_AUTHORIZATION": "Apikey test-bank-key"}


def _register(api, payload, **extra):
    res = api.post("/api/v1/public/registrations/", {**payload, **extra}, format="json")
    assert res.status_code == 201, res.content
    return Order.objects.get(order_code=res.json()["registrationCode"])


# ---------------------------------------------------------------- step 4
def test_response_deadline_counts_working_hours_only(settings):
    settings.LEAD_RESPONSE_HOURS = 4
    tz = timezone.get_current_timezone()
    morning = datetime(2026, 10, 7, 9, 0, tzinfo=tz)
    assert response_deadline(morning) == datetime(2026, 10, 7, 13, 0, tzinfo=tz)
    evening = datetime(2026, 10, 7, 19, 0, tzinfo=tz)  # 1h today, 3h tomorrow from 8:00
    assert response_deadline(evening) == datetime(2026, 10, 8, 11, 0, tzinfo=tz)
    night = datetime(2026, 10, 7, 23, 30, tzinfo=tz)
    assert response_deadline(night) == datetime(2026, 10, 8, 12, 0, tzinfo=tz)


def test_new_lead_goes_to_the_least_busy_consultant(api, registration_payload):
    busy = make_staff(Role.SALES_CRM, "busy@twings.test")
    free = make_staff(Role.SALES_CRM, "free@twings.test")
    away = make_staff(Role.SALES_CRM, "away@twings.test")
    away.receives_leads = False
    away.save()
    Order.objects.create(customer_name="X", assigned_to=busy, crm_status="3. Đang tư vấn")
    order = _register(api, registration_payload)
    assert order.assigned_to == free and order.pic and order.response_due_at
    task = FollowupTask.objects.get(order=order)
    assert task.priority == "high" and task.title.startswith("Liên hệ lead mới")
    # the same person registering again stays with their consultant
    again = _register(api, {**registration_payload, "customerName": "Nguyễn Văn A (lần 2)"})
    assert again.assigned_to == free


def test_first_contact_stops_the_clock_and_overdue_list(api, registration_payload, staff_client):
    make_staff(Role.SALES_CRM, "sale@twings.test")
    order = _register(api, registration_payload)
    Order.objects.filter(pk=order.pk).update(response_due_at=timezone.now() - timedelta(minutes=5))
    assert list(overdue_leads()) == [order]
    sales = staff_client(Role.SALES_CRM)
    dash = sales.get("/api/v1/staff/dashboard/").json()["sales"]
    assert dash["overdueLeads"] == 1 and dash["overdueList"][0]["customerName"] == order.customer_name
    sales.post(
        f"/api/v1/staff/orders/{order.pk}/activities/", {"type": "call", "title": "Đã gọi"}, format="json"
    )
    order.refresh_from_db()
    assert order.first_response_at is not None and not overdue_leads().exists()


def test_appointment_confirms_reminds_and_moves_the_pipeline(api, registration_payload, staff_client):
    order = _register(api, registration_payload)
    sales = staff_client(Role.SALES_CRM)
    starts = timezone.now() + timedelta(hours=2)
    res = sales.post(
        f"/api/v1/staff/orders/{order.pk}/appointments/",
        {"startsAt": starts.isoformat(), "channel": "office", "location": "ROX Tower"},
        format="json",
    )
    assert res.status_code == 201, res.content
    order.refresh_from_db()
    assert order.crm_status == "4. Hẹn gặp" and order.first_response_at
    assert remind_appointments() == 1 and remind_appointments() == 0
    codes = set(EmailLog.objects.filter(order=order).values_list("template_code", flat=True))
    assert {"appointment_reminder"} <= codes
    appt = Appointment.objects.get()
    res = sales.patch(f"/api/v1/staff/appointments/{appt.pk}/", {"status": "done"}, format="json")
    assert res.status_code == 200
    assert sales.get("/api/v1/staff/appointments/?upcoming=1").json()["results"][0]["status"] == "done"


# ---------------------------------------------------------------- step 5
def test_checkout_requires_terms_and_records_them(api, registration_payload):
    res = api.post(
        "/api/v1/public/checkout/", {**registration_payload, "termsAccepted": False}, format="json"
    )
    assert res.status_code == 400 and "Điều khoản" in res.json()["detail"]
    res = api.post("/api/v1/public/checkout/", registration_payload, format="json")
    order = Order.objects.get(order_code=res.json()["orderCode"])
    assert order.terms_accepted_at and order.terms_version


def test_company_invoice_request_at_checkout_and_finance_issue(api, registration_payload, staff_client):
    invoice = {
        "buyerType": "company",
        "companyName": "Cty ABC",
        "taxCode": "0101234567",
        "address": "Hà Nội",
        "email": "ketoan@abc.vn",
    }
    bad = api.post(
        "/api/v1/public/checkout/",
        {**registration_payload, "invoice": {**invoice, "taxCode": "12"}},
        format="json",
    )
    assert bad.status_code == 400
    res = api.post("/api/v1/public/checkout/", {**registration_payload, "invoice": invoice}, format="json")
    req = InvoiceRequest.objects.get(order__order_code=res.json()["orderCode"])
    assert req.status == "requested" and req.tax_code == "0101234567"
    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    assert (
        finance.patch(f"/api/v1/staff/invoices/{req.pk}/", {"status": "issued"}, format="json").status_code
        == 400
    )
    res = finance.patch(
        f"/api/v1/staff/invoices/{req.pk}/",
        {"status": "issued", "invoiceNumber": "AA/26E-0001234"},
        format="json",
    )
    assert res.status_code == 200 and res.json()["issuedAt"]
    assert (
        staff_client(Role.SALES_CRM)
        .patch(f"/api/v1/staff/invoices/{req.pk}/", {"status": "cancelled"}, format="json")
        .status_code
        == 403
    )


def test_each_payment_emails_a_printable_receipt(
    api, registration_payload, client, django_capture_on_commit_callbacks
):
    res = api.post("/api/v1/public/checkout/", registration_payload, format="json")
    order = Order.objects.get(order_code=res.json()["orderCode"])
    with django_capture_on_commit_callbacks(execute=True):
        api.post(
            "/api/v1/webhooks/bank/",
            {
                "id": 1,
                "accountNumber": "0123456789",
                "transferType": "in",
                "transferAmount": 1_000_000,
                "content": order.order_code,
            },
            format="json",
            **BANK,
        )
    log = EmailLog.objects.get(template_code="payment_receipt")
    assert "1.000.000" in log.rendered_html and "/bien-nhan/" in log.rendered_html
    payment = order.payments.get()
    page = client.get(receipt_url(payment).split("tuyensinh.twings.edu.vn")[1])
    html = page.content.decode()
    assert page.status_code == 200 and order.order_code in html and "1.000.000 đ" in html
    assert "<script" not in html and page["X-Robots-Tag"] == "noindex"
    assert client.get("/bien-nhan/forged/").status_code == 404


# ---------------------------------------------------------------- step 6
def _signed_in(email, monkeypatch):
    from django.core.cache import cache

    cache.clear()
    client = APIClient(enforce_csrf_checks=True)
    sent = {}
    monkeypatch.setattr("apps.sso.account._send_code", lambda e, code: sent.update(code=code))
    token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    client.post("/api/v1/public/account/send-code/", {"email": email}, format="json", HTTP_X_CSRFTOKEN=token)
    client.post(
        "/api/v1/public/account/verify/",
        {"email": email, "code": sent.get("code", "000000")},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    return client, token


def test_learner_completes_the_enrolment_file_and_uploads_a_cv(
    api, registration_payload, monkeypatch, staff_client
):
    order = _register(api, registration_payload)
    client, token = _signed_in("a@example.com", monkeypatch)
    url = f"/api/v1/public/account/orders/{order.order_code}/dossier/"
    assert set(client.get(url).json()["missing"]) == {
        "birth_date",
        "citizen_id",
        "permanent_address",
        "education_level",
    }
    body = {
        "birthDate": "2002-05-01",
        "citizenId": "001202012345",
        "permanentAddress": "Hà Nội",
        "educationLevel": "Đại học",
    }
    res = client.put(url, body, format="json", HTTP_X_CSRFTOKEN=token)
    assert res.status_code == 200 and res.json()["missing"] == []
    assert res.json()["citizenIdMasked"].endswith("345") and "001202012345" not in str(res.json())
    order.refresh_from_db()
    assert order.dossier_submitted_at and order.citizen_id == "001202012345"

    cv_url = f"/api/v1/public/account/orders/{order.order_code}/cv/"
    fake = SimpleUploadedFile("cv.pdf", b"<html>not a pdf</html>")
    assert client.post(cv_url, {"file": fake}, format="multipart", HTTP_X_CSRFTOKEN=token).status_code == 400
    pdf = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 minimal")
    assert client.post(cv_url, {"file": pdf}, format="multipart", HTTP_X_CSRFTOKEN=token).json()["hasCv"]
    order.refresh_from_db()
    assert order.cv_link.startswith("private:cv/")
    download = staff_client(Role.SALES_CRM).get(f"/api/v1/staff/orders/{order.pk}/cv/")
    assert download.status_code == 200 and b"".join(download.streaming_content).startswith(b"%PDF")
    other, other_token = _signed_in("other@example.com", monkeypatch)
    assert other.get(url).status_code in (401, 404)


def test_class_roster_and_welcome_schedule(
    api, course, staff_client, settings, django_capture_on_commit_callbacks
):
    from apps.lms.emails import send_access_email

    cohort = Cohort.objects.create(
        course=course, name="Khóa 12", status="opening", schedule_text="Tối thứ 2-4-6", location="ROX"
    )
    CohortSession.objects.create(
        cohort=cohort,
        title="Buổi 1",
        starts_at=timezone.now() + timedelta(days=3),
        ends_at=timezone.now() + timedelta(days=3, hours=2),
    )
    order = Order.objects.create(
        customer_name="Lan",
        customer_email="lan@example.com",
        course=course,
        cohort=cohort,
        amount=10,
        total_receivable=10,
    )
    order.status = "paid"
    order.save()
    send_access_email(order)
    html = EmailLog.objects.get(template_code="lms_access").rendered_html
    assert "Tối thứ 2-4-6" in html and "Buổi 1" in html and "/tai-khoan" in html
    roster = staff_client(Role.ACADEMIC_MANAGEMENT).get(f"/api/v1/staff/cohorts/{cohort.pk}/roster/").json()
    row = roster["rows"][0]
    assert row["name"] == "Lan" and row["payment"] == "Đã đóng đủ" and "citizen_id" in row["dossierMissing"]


def test_team_lead_switches_consultants_off(staff_client):
    sale = make_staff(Role.SALES_CRM, "s1@twings.test")
    lead = staff_client(Role.SALES_CRM)
    assert any(r["id"] == sale.pk for r in lead.get("/api/v1/staff/consultants/").json())
    res = lead.patch("/api/v1/staff/consultants/", {"id": sale.pk, "receivesLeads": False}, format="json")
    assert res.status_code == 200
    sale.refresh_from_db()
    assert sale.receives_leads is False
    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    assert (
        finance.patch(
            "/api/v1/staff/consultants/", {"id": sale.pk, "receivesLeads": True}, format="json"
        ).status_code
        == 403
    )
