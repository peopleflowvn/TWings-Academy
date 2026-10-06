"""Phase 3 selling: programs (bundles), installments, refunds, learner account, reminders."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Cohort, Course, Program, ProgramCourse
from apps.crm.models import Order
from apps.crm.services import installment_amounts
from apps.lms.models import Certificate, LmsEnrollment
from apps.notifications.models import EmailLog
from apps.payments.reminders import remind_due_installments
from apps.sso import services as sso
from tests.conftest import Role
from tests.test_lms import FakeMoodle

pytestmark = pytest.mark.django_db
BANK = {"HTTP_AUTHORIZATION": "Apikey test-bank-key"}


@pytest.fixture
def fake_moodle(settings, monkeypatch):
    from apps.lms import moodle

    settings.MOODLE_INTERNAL_URL = "http://lms:8080/learn"
    settings.MOODLE_WS_TOKEN = "t" * 32
    fake = FakeMoodle()
    monkeypatch.setattr(moodle, "call", fake)
    return fake


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    from django.core.cache import cache

    cache.clear()  # OTP rate limits live in the cache


def _transfer(api, order, amount, txn_id):
    res = api.post(
        "/api/v1/webhooks/bank/",
        {
            "id": txn_id,
            "accountNumber": "0123456789",
            "transferType": "in",
            "transferAmount": amount,
            "content": f"CK {order.order_code}",
        },
        format="json",
        **BANK,
    )
    assert res.status_code == 200
    order.refresh_from_db()
    return res.json()


def _checkout(api, payload, **extra):
    res = api.post("/api/v1/public/checkout/", {**payload, **extra}, format="json")
    assert res.status_code == 201, res.content
    return res.json(), Order.objects.get(order_code=res.json()["orderCode"])


@pytest.fixture
def program(course):
    second = Course.objects.create(slug="kiem-soat-vien", title="Kiểm soát viên", price=4_000_000)
    program = Program.objects.create(
        slug="chuyen-vien-ngan-hang",
        title="Chuyên viên ngân hàng",
        price=10_000_000,
        installment_count=3,
        is_published=True,
    )
    ProgramCourse.objects.create(program=program, course=course, position=0)
    ProgramCourse.objects.create(program=program, course=second, position=1)
    return program


# ------------------------------------------------------------------ installments
def test_installment_amounts_round_and_put_the_remainder_first():
    assert installment_amounts(10_000_000, 3) == [3_334_000, 3_333_000, 3_333_000]
    assert sum(installment_amounts(8_490_000, 4)) == 8_490_000
    assert installment_amounts(500, 1) == [500]


def test_installment_checkout_opens_learning_after_the_first_installment(
    api, registration_payload, course, fake_moodle, django_capture_on_commit_callbacks
):
    course.installment_count, course.installment_interval_days = 3, 30
    course.save()
    body, order = _checkout(api, registration_payload, payInInstallments=True)
    assert order.installment_count == 3 and order.installments.count() == 3
    first = order.installments.get(sequence=1)
    assert body["amount"] == first.amount  # the QR asks for the first installment only
    assert body["totalAmount"] == course.price
    assert [i["dueDate"] for i in body["installments"]][1] == (
        timezone.localdate() + timedelta(days=30)
    ).isoformat()

    with django_capture_on_commit_callbacks(execute=True):
        _transfer(api, order, first.amount, 1)
    assert order.status == "pending" and order.learning_access  # studying while paying the rest
    assert LmsEnrollment.objects.get(order=order).status == "done"
    assert order.amount_due_now() == order.installments.get(sequence=2).amount

    with django_capture_on_commit_callbacks(execute=True):
        _transfer(api, order, order.total_receivable - first.amount, 2)
    assert order.status == "paid"
    assert not order.installments.filter(paid_at__isnull=True).exists()


def test_installments_ignored_when_the_course_has_no_plan(api, registration_payload):
    _, order = _checkout(api, registration_payload, payInInstallments=True)
    assert order.installment_count == 1 and not order.installments.exists()


def test_public_status_reports_learning_access(api, registration_payload, course):
    course.installment_count = 2
    course.save()
    body, order = _checkout(api, registration_payload, payInInstallments=True)
    _transfer(api, order, body["amount"], 3)
    status = api.get(f"/api/v1/public/orders/{order.order_code}/status/").json()
    assert status["status"] == "pending" and status["learningAccess"] is True


# ------------------------------------------------------------------ programs
def test_program_is_listed_publicly_with_its_courses(api, program):
    Program.objects.create(slug="draft", title="Nháp", price=1)  # unpublished
    rows = api.get("/api/v1/public/programs/").json()
    assert [r["slug"] for r in rows] == ["chuyen-vien-ngan-hang"]
    assert [c["slug"] for c in rows[0]["courses"]] == ["rm-doanh-nghiep", "kiem-soat-vien"]
    assert rows[0]["coursesTotalPrice"] == 8_490_000 + 4_000_000


def test_program_purchase_creates_one_enrolment_per_course(
    api, registration_payload, program, course, fake_moodle, django_capture_on_commit_callbacks
):
    payload = {k: v for k, v in registration_payload.items() if k != "courseId"}
    body, order = _checkout(api, payload, programId=program.slug)
    assert body["amount"] == 10_000_000 and order.course is None and order.program == program
    assert not order.components.exists()  # nothing to study before paying

    with django_capture_on_commit_callbacks(execute=True):
        _transfer(api, order, 10_000_000, 4)
    components = list(order.components.order_by("course_title"))
    assert [c.course_title for c in components] == ["Kiểm soát viên", "RM Doanh Nghiệp"]
    assert all(c.status == "paid" and c.amount == 0 and c.learning_access for c in components)
    assert LmsEnrollment.objects.filter(order__parent=order, status="done").count() == 2
    assert not LmsEnrollment.objects.filter(order=order).exists()  # the program order itself has no course


def test_checkout_needs_exactly_one_item(api, registration_payload, program):
    res = api.post(
        "/api/v1/public/checkout/", {**registration_payload, "programId": program.slug}, format="json"
    )
    assert res.status_code == 400


def test_staff_programs_crud_and_permission(staff_client, course):
    sales = staff_client(Role.SALES_CRM)
    res = sales.post("/api/v1/staff/programs/", {"slug": "x", "title": "X"}, format="json")
    assert res.status_code == 403
    academic = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = academic.post(
        "/api/v1/staff/programs/",
        {"slug": "goi", "title": "Gói", "price": 1000, "courseIds": [course.pk]},
        format="json",
    )
    assert res.status_code == 201, res.content
    assert [c["id"] for c in res.json()["courses"]] == [course.pk]


# ------------------------------------------------------------------ refunds
def _paid_and_enrolled(api, payload, capture):
    _, order = _checkout(api, payload)
    with capture(execute=True):
        _transfer(api, order, order.amount, 10)
    return order


def test_full_refund_unenrols_and_revokes_the_certificate(
    api, registration_payload, fake_moodle, staff_client, django_capture_on_commit_callbacks
):
    order = _paid_and_enrolled(api, registration_payload, django_capture_on_commit_callbacks)
    enrollment = LmsEnrollment.objects.get(order=order)
    certificate = Certificate.objects.create(
        enrollment=enrollment, learner_name="A", course_title=order.course_title, issued_at=timezone.now()
    )
    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    with django_capture_on_commit_callbacks(execute=True):
        res = finance.post(
            f"/api/v1/staff/orders/{order.pk}/refund/",
            {"amount": order.amount, "reason": "Học viên chuyển công tác", "reference": "FT999"},
            format="json",
        )
    assert res.status_code == 201, res.content
    order.refresh_from_db()
    enrollment.refresh_from_db()
    certificate.refresh_from_db()
    assert order.status == "refunded" and not order.learning_access
    assert res.json()["refundable"] == 0 and res.json()["refunds"][0]["reference"] == "FT999"
    assert enrollment.status == "removed"
    assert (enrollment.moodle_user_id, enrollment.moodle_course_id) in fake_moodle.unenrolled
    assert certificate.revoked
    # a late transfer to a refunded order is not credited
    assert _transfer(api, order, 100, 11)["matchStatus"] == "unmatched"


def test_partial_refund_can_keep_access_and_is_capped(
    api, registration_payload, fake_moodle, staff_client, django_capture_on_commit_callbacks
):
    order = _paid_and_enrolled(api, registration_payload, django_capture_on_commit_callbacks)
    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    url = f"/api/v1/staff/orders/{order.pk}/refund/"
    res = finance.post(url, {"amount": 1_000_000, "reason": "Giảm trừ", "revokeAccess": False}, format="json")
    assert res.status_code == 201
    order.refresh_from_db()
    assert order.status == "paid" and order.learning_access and order.refunded_amount == 1_000_000
    too_much = finance.post(url, {"amount": order.amount, "reason": "x"}, format="json")
    assert too_much.status_code == 400
    sales = staff_client(Role.SALES_CRM)
    assert sales.post(url, {"amount": 1, "reason": "x"}, format="json").status_code == 403


def test_refunding_a_program_ends_every_course(
    api, registration_payload, program, fake_moodle, staff_client, django_capture_on_commit_callbacks
):
    payload = {k: v for k, v in registration_payload.items() if k != "courseId"}
    _, order = _checkout(api, payload, programId=program.slug)
    with django_capture_on_commit_callbacks(execute=True):
        _transfer(api, order, order.amount, 20)
    with django_capture_on_commit_callbacks(execute=True):
        staff_client(Role.FINANCE_ACCOUNTANT).post(
            f"/api/v1/staff/orders/{order.pk}/refund/", {"amount": order.amount, "reason": "x"}, format="json"
        )
    assert set(order.components.values_list("status", flat=True)) == {"refunded"}
    enrollments = LmsEnrollment.objects.filter(order__parent=order)
    assert set(enrollments.values_list("status", flat=True)) == {"removed"}


# ------------------------------------------------------------------ learner account
def _csrf(client):
    return client.get("/api/v1/auth/csrf/").json()["csrfToken"]


def _sign_in(client, email, monkeypatch):
    sent = {}
    monkeypatch.setattr("apps.sso.account._send_code", lambda e, code: sent.update(email=e, code=code))
    token = _csrf(client)
    assert client.post(
        "/api/v1/public/account/send-code/", {"email": email}, format="json", HTTP_X_CSRFTOKEN=token
    ).json() == {"sent": True}
    res = client.post(
        "/api/v1/public/account/verify/",
        {"email": email, "code": sent.get("code", "000000")},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    return res, sent


def test_learner_account_shows_orders_installments_and_courses(
    api, registration_payload, course, monkeypatch
):
    course.installment_count = 2
    course.save()
    body, order = _checkout(api, registration_payload, payInInstallments=True)
    client = APIClient(enforce_csrf_checks=True)
    assert client.get("/api/v1/public/account/").json() == {"authenticated": False}

    res, sent = _sign_in(client, "A@example.com", monkeypatch)
    assert res.status_code == 200 and sent["email"] == "a@example.com"
    me = client.get("/api/v1/public/account/").json()
    assert me["authenticated"] and me["name"] == "Nguyễn Văn A"
    row = me["orders"][0]
    assert row["orderCode"] == order.order_code and row["kind"] == "course"
    assert row["payment"]["amount"] == body["amount"] and len(row["installments"]) == 2
    assert row["courses"][0]["title"] == course.title
    assert "citizenId" not in row and "customerPhone" not in row  # only billing/learning data


def test_unknown_email_gets_the_same_answer_and_no_code(api, monkeypatch):
    client = APIClient(enforce_csrf_checks=True)
    res, sent = _sign_in(client, "nobody@example.com", monkeypatch)
    assert sent == {} and res.status_code == 400
    assert client.get("/api/v1/public/account/").json() == {"authenticated": False}


def test_account_posts_require_csrf(api):
    client = APIClient(enforce_csrf_checks=True)
    res = client.post("/api/v1/public/account/send-code/", {"email": "a@example.com"}, format="json")
    assert res.status_code == 403


def test_learner_can_request_a_refund_once(api, registration_payload, monkeypatch):
    _, order = _checkout(api, registration_payload)
    _transfer(api, order, order.amount, 30)
    client = APIClient(enforce_csrf_checks=True)
    _sign_in(client, "a@example.com", monkeypatch)
    token = _csrf(client)
    url = f"/api/v1/public/account/orders/{order.order_code}/refund-request/"
    for _ in range(2):
        reason = {"reason": "Không sắp xếp được thời gian"}
        res = client.post(url, reason, format="json", HTTP_X_CSRFTOKEN=token)
        assert res.status_code == 200 and res.json()["refundRequested"]
    assert order.followup_tasks.filter(priority="high").count() == 1
    other = Order.objects.create(customer_name="B", customer_email="b@example.com", course=order.course)
    res = client.post(
        f"/api/v1/public/account/orders/{other.order_code}/refund-request/",
        {"reason": "x"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 404  # never another learner's order


def test_sso_accepts_learners_paying_in_installments(api, registration_payload, course):
    course.installment_count = 2
    course.save()
    body, order = _checkout(api, registration_payload, payInInstallments=True)
    assert sso.identity_for_email("a@example.com") is None
    _transfer(api, order, body["amount"], 40)
    assert sso.identity_for_email("a@example.com")["email"] == "a@example.com"


# ------------------------------------------------------------------ reminders
def test_reminders_email_due_installments_once_and_flag_overdue(api, registration_payload, course):
    course.installment_count = 2
    course.save()
    body, order = _checkout(api, registration_payload, payInInstallments=True)
    _transfer(api, order, body["amount"], 50)
    second = order.installments.get(sequence=2)
    second.due_date = timezone.localdate() - timedelta(days=1)
    second.save()

    assert remind_due_installments() == {"sent": 1, "overdueTasks": 1}
    assert remind_due_installments() == {"sent": 0, "overdueTasks": 0}  # not again within 3 days
    log = EmailLog.objects.get(template_code="installment_reminder")
    assert order.order_code in log.subject and f"{second.amount:,}".replace(",", ".") in log.rendered_html
    assert order.followup_tasks.filter(title__contains="quá hạn").count() == 1


def test_cohort_counts_include_installment_learners(api, registration_payload, course, staff_client):
    cohort = Cohort.objects.create(course=course, name="Khóa 11", status="opening")
    course.installment_count = 2
    course.save()
    body, order = _checkout(api, registration_payload, payInInstallments=True)
    _transfer(api, order, body["amount"], 60)
    rows = staff_client(Role.ACADEMIC_MANAGEMENT).get("/api/v1/staff/cohorts/").json()
    rows = rows["results"] if isinstance(rows, dict) else rows
    assert next(r for r in rows if r["id"] == cohort.pk)["enrolledCount"] == 1
