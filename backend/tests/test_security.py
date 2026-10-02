import base64
import hashlib
import hmac
import json
import time

import pytest
from django.db import connection

from apps.accounts.rbac import Role
from apps.catalog.models import Coupon
from apps.crm.models import Order
from apps.notifications.models import EmailLog
from apps.payments.models import BankTransaction

from .conftest import make_staff

pytestmark = pytest.mark.django_db


# ------------------------------------------------------------------ authentication
def test_login_requires_csrf_and_rotates_session(api):
    make_staff(Role.SALES_CRM, "sale@twings.test")
    # Without CSRF token → rejected
    res = api.post(
        "/api/v1/auth/login/",
        {"email": "sale@twings.test", "password": "Very-Strong-Passw0rd!"},
        format="json",
    )
    assert res.status_code == 403

    token = api.get("/api/v1/auth/csrf/").json()["csrfToken"]
    res = api.post(
        "/api/v1/auth/login/",
        {"email": "sale@twings.test", "password": "Very-Strong-Passw0rd!"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 200
    body = res.json()
    assert "crm.view_leads" in body["permissions"]
    assert "finance.confirm_manual" not in body["permissions"]


def test_login_same_error_for_unknown_and_wrong_password(api):
    make_staff(Role.SALES_CRM, "sale@twings.test")
    token = api.get("/api/v1/auth/csrf/").json()["csrfToken"]
    wrong = api.post(
        "/api/v1/auth/login/",
        {"email": "sale@twings.test", "password": "nope-nope-nope"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    unknown = api.post(
        "/api/v1/auth/login/",
        {"email": "ghost@twings.test", "password": "nope-nope-nope"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert wrong.status_code == unknown.status_code == 400
    assert wrong.json() == unknown.json()


def test_bruteforce_lockout_is_per_username(api):
    make_staff(Role.SALES_CRM, "sale@twings.test")
    make_staff(Role.SALES_CRM, "colleague@twings.test")
    token = api.get("/api/v1/auth/csrf/").json()["csrfToken"]
    for _ in range(5):  # AXES_FAILURE_LIMIT
        api.post(
            "/api/v1/auth/login/",
            {"email": "sale@twings.test", "password": "bad-password-x"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
    res = api.post(
        "/api/v1/auth/login/",
        {"email": "sale@twings.test", "password": "Very-Strong-Passw0rd!"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 429
    assert "permissions" not in res.json()
    # A colleague behind the same office IP is not locked out.
    res = api.post(
        "/api/v1/auth/login/",
        {"email": "colleague@twings.test", "password": "Very-Strong-Passw0rd!"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 200


def test_non_staff_user_cannot_login(api):
    from apps.accounts.models import User

    User.objects.create_user(email="learner@x.test", password="Very-Strong-Passw0rd!", name="L")
    token = api.get("/api/v1/auth/csrf/").json()["csrfToken"]
    res = api.post(
        "/api/v1/auth/login/",
        {"email": "learner@x.test", "password": "Very-Strong-Passw0rd!"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 400


# ------------------------------------------------------------------ RBAC
def test_staff_endpoints_require_login(api):
    assert api.get("/api/v1/staff/orders/").status_code in (401, 403)


def test_rbac_denies_and_allows(staff_client):
    assert staff_client(Role.CONTENT_SEO).get("/api/v1/staff/orders/").status_code == 403
    assert staff_client(Role.SALES_CRM).get("/api/v1/staff/orders/").status_code == 200
    assert staff_client(Role.SALES_CRM).get("/api/v1/staff/transactions/").status_code == 403
    assert staff_client(Role.FINANCE_ACCOUNTANT).get("/api/v1/staff/transactions/").status_code == 200


def test_sales_cannot_change_payment_fields(staff_client, course):
    order = Order.objects.create(customer_name="A", course=course, amount=100)
    client = staff_client(Role.SALES_CRM)
    assert (
        client.patch(
            f"/api/v1/staff/orders/{order.pk}/", {"crmStatus": "3. Đang tư vấn"}, format="json"
        ).status_code
        == 200
    )
    assert (
        client.patch(f"/api/v1/staff/orders/{order.pk}/", {"status": "paid"}, format="json").status_code
        == 403
    )
    order.refresh_from_db()
    assert order.status == "pending"


def test_only_super_admin_can_grant_super_admin(staff_client):
    target = make_staff(Role.SALES_CRM, "target@twings.test")
    client = staff_client(Role.ACADEMIC_MANAGEMENT)  # has rbac.view_users only
    assert (
        client.patch(f"/api/v1/staff/users/{target.pk}/", {"role": "super_admin"}, format="json").status_code
        == 403
    )


# ------------------------------------------------------------------ public API
def test_public_course_hides_paid_lesson_content(api, course):
    res = api.get(f"/api/v1/public/courses/{course.slug}/")
    assert res.status_code == 200
    text = json.dumps(res.json())
    assert "secret.example" not in text
    assert "paid" not in res.json()["syllabus"][0]["lessons"][1].get("readingContent", "")
    assert "quizQuestions" not in res.json()["syllabus"][0]["lessons"][0]
    assert res.json()["syllabus"][0]["lessons"][0]["youtubeId"] == "abc"


def test_registration_requires_consent(api, registration_payload):
    res = api.post(
        "/api/v1/public/registrations/", {**registration_payload, "privacyConsent": False}, format="json"
    )
    assert res.status_code == 400
    assert Order.objects.count() == 0


def test_registration_ignores_client_controlled_fields(api, registration_payload, cohorts):
    full, nxt = cohorts
    res = api.post(
        "/api/v1/public/registrations/",
        {
            **registration_payload,
            "status": "paid",
            "amount": 1,
            "crmStatus": "5. Đã đóng phí",
            "batchCohort": full.name,
        },
        format="json",
    )
    assert res.status_code == 201
    order = Order.objects.get()
    assert order.status == "pending" and order.crm_status == "1. Mới"
    assert order.cohort == nxt  # full cohort rerouted to its successor
    assert order.privacy_consent_at is not None


def test_checkout_prices_server_side_with_coupon(api, registration_payload, coupon):
    res = api.post(
        "/api/v1/public/checkout/",
        {**registration_payload, "couponCode": "hocbong20", "amount": 1},
        format="json",
    )
    assert res.status_code == 201
    body = res.json()
    assert body["amount"] == 8_490_000 - 1_000_000  # 20% capped at 1,000,000
    assert body["transferContent"] == body["orderCode"]
    assert body["orderCode"] in body["qrImageUrl"]
    coupon.refresh_from_db()
    assert coupon.usage_count == 1


def test_checkout_rejects_invalid_coupon(api, registration_payload):
    Coupon.objects.create(code="OLD", discount_percent=50, is_active=False)
    res = api.post("/api/v1/public/checkout/", {**registration_payload, "couponCode": "OLD"}, format="json")
    assert res.status_code == 400
    assert Order.objects.count() == 0


# ------------------------------------------------------------------ bank webhook
def _bank_payload(order, **extra):
    return {
        "id": 9001,
        "gateway": "MSB",
        "transactionDate": "2026-10-02 10:00:00",
        "accountNumber": "0123456789",
        "transferType": "in",
        "transferAmount": order.amount,
        "content": f"CK {order.order_code} hoc phi",
        "referenceCode": "FT123",
        **extra,
    }


def test_bank_webhook_rejects_bad_key(api, course):
    order = Order.objects.create(customer_name="A", course=course, amount=500)
    res = api.post(
        "/api/v1/webhooks/bank/", _bank_payload(order), format="json", HTTP_AUTHORIZATION="Apikey wrong"
    )
    assert res.status_code == 401
    assert BankTransaction.objects.count() == 0


def test_bank_webhook_marks_paid_once(api, course):
    order = Order.objects.create(customer_name="A", course=course, amount=500, total_receivable=500)
    for _ in range(3):  # provider retries
        res = api.post(
            "/api/v1/webhooks/bank/",
            _bank_payload(order),
            format="json",
            HTTP_AUTHORIZATION="Apikey test-bank-key",
        )
        assert res.status_code == 200
    order.refresh_from_db()
    assert order.status == "paid"
    assert order.total_paid_amount == 500
    assert order.payments.count() == 1


def test_bank_webhook_partial_payment_not_paid(api, course):
    order = Order.objects.create(customer_name="A", course=course, amount=500, total_receivable=500)
    api.post(
        "/api/v1/webhooks/bank/",
        _bank_payload(order, transferAmount=200),
        format="json",
        HTTP_AUTHORIZATION="Apikey test-bank-key",
    )
    order.refresh_from_db()
    assert order.status == "pending"
    assert order.payment_status_detail == "Đã đóng 1 phần"


# ------------------------------------------------------------------ Resend webhook
def _svix_headers(body: bytes, secret: str, msg_id="msg_1", ts=None):
    ts = str(int(ts or time.time()))
    key = base64.b64decode(secret.removeprefix("whsec_"))
    sig = base64.b64encode(hmac.new(key, f"{msg_id}.{ts}.".encode() + body, hashlib.sha256).digest()).decode()
    return {"HTTP_SVIX_ID": msg_id, "HTTP_SVIX_TIMESTAMP": ts, "HTTP_SVIX_SIGNATURE": f"v1,{sig}"}


def test_resend_webhook_signature(client, settings):
    log = EmailLog.objects.create(
        recipient_email="a@x.test", subject="s", status="sent", resend_message_id="re_1"
    )
    body = json.dumps({"type": "email.opened", "data": {"email_id": "re_1"}}).encode()
    url = "/api/v1/webhooks/resend/"

    bad = client.post(
        url,
        body,
        content_type="application/json",
        **_svix_headers(body, "whsec_" + base64.b64encode(b"other").decode()),
    )
    assert bad.status_code == 401
    stale = client.post(
        url,
        body,
        content_type="application/json",
        **_svix_headers(body, settings.RESEND_WEBHOOK_SECRET, ts=time.time() - 3600),
    )
    assert stale.status_code == 401

    headers = _svix_headers(body, settings.RESEND_WEBHOOK_SECRET)
    assert client.post(url, body, content_type="application/json", **headers).status_code == 200
    assert client.post(url, body, content_type="application/json", **headers).json()["duplicate"] is True
    log.refresh_from_db()
    assert log.status == "opened" and log.open_count == 1


# ------------------------------------------------------------------ encryption at rest
def test_citizen_id_encrypted_at_rest(course):
    order = Order.objects.create(customer_name="A", course=course, citizen_id="001099012345")
    with connection.cursor() as cur:
        cur.execute("SELECT citizen_id FROM crm_order WHERE id = %s", [order.pk])
        raw = cur.fetchone()[0]
    assert "001099012345" not in raw and raw.startswith("enc1:")
    assert Order.objects.get(pk=order.pk).citizen_id == "001099012345"


def test_duplicate_detection_uses_blind_index(api, registration_payload, course):
    Order.objects.create(
        customer_name="Old", course=course, customer_phone="0900000000", citizen_id="001099012345"
    )
    dup = Order(customer_name="New", course=course, citizen_id=" 001 099 012345 ")
    dup.save()
    assert dup.find_duplicates().count() == 1


# ------------------------------------------------------------------ headers & CSV
def test_security_headers(api):
    res = api.get("/api/v1/health/")
    assert res.status_code == 200
    assert res["Content-Security-Policy"].startswith("default-src 'none'")
    assert res["X-Content-Type-Options"] == "nosniff"
    assert res["Cache-Control"] == "no-store"


def test_csv_export_neutralises_formulas_and_omits_cccd(staff_client, course):
    Order.objects.create(customer_name='=HYPERLINK("http://evil")', course=course, citizen_id="001099012345")
    res = staff_client(Role.SALES_CRM).get("/api/v1/staff/orders/export/")
    assert res.status_code == 200
    content = b"".join(res.streaming_content).decode("utf-8")
    assert "'=HYPERLINK" in content
    assert "001099012345" not in content


# ------------------------------------------------------------------ reverse proxy
def test_real_ip_header_only_trusted_when_configured(rf, settings):
    from apps.core.middleware import ProxyRealIPMiddleware

    seen = {}

    def view(request):
        seen["ip"] = request.META["REMOTE_ADDR"]

    settings.REAL_IP_HEADER = ""
    ProxyRealIPMiddleware(view)(rf.get("/", HTTP_X_REAL_IP="203.0.113.7"))
    assert seen["ip"] == "127.0.0.1"

    settings.REAL_IP_HEADER = "X-Real-IP"
    mw = ProxyRealIPMiddleware(view)
    mw(rf.get("/", HTTP_X_REAL_IP="203.0.113.7"))
    assert seen["ip"] == "203.0.113.7"
    mw(rf.get("/", HTTP_X_REAL_IP="not-an-ip"))
    assert seen["ip"] == "127.0.0.1"
