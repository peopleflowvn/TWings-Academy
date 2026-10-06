import base64
import re
from urllib.parse import parse_qs, urlparse

import pytest
from django.core.cache import cache
from django.test import Client

from apps.accounts.rbac import Role
from apps.crm.models import Order
from apps.sso import views

from .conftest import make_staff

pytestmark = pytest.mark.django_db

CALLBACK = "https://lms.example.vn/learn/admin/oauth2callback.php"
CLIENT_SECRET = "s3cret-value"  # test-only value


@pytest.fixture(autouse=True)
def sso_settings(settings):
    settings.SSO_CLIENT_ID = "moodle"
    settings.SSO_CLIENT_SECRET = CLIENT_SECRET
    settings.SSO_REDIRECT_URIS = [CALLBACK]
    settings.MOODLE_INTERNAL_URL = ""  # no LMS enrolment side effects here
    cache.clear()


@pytest.fixture
def sent(monkeypatch):
    mails = []
    monkeypatch.setattr(views, "send_email", lambda **kw: mails.append(kw))
    return mails


@pytest.fixture
def learner(course):
    order = Order.objects.create(
        customer_name="Lê Hoàng Tùng", customer_email="hv@example.com", course=course, amount=1
    )
    order.status = "paid"
    order.save()
    return order


def _authorize(client, **extra):
    params = {
        "response_type": "code",
        "client_id": "moodle",
        "redirect_uri": CALLBACK,
        "state": "xyz",
        "scope": "openid profile email",
    }
    return client.get("/api/v1/sso/authorize/", {**params, **extra})


def _csrf(client, path="/api/v1/sso/login/"):
    html = client.get(path).content.decode()
    return re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', html).group(1)


def _token(client, code, secret=CLIENT_SECRET, redirect_uri=CALLBACK):
    return Client().post(
        "/api/v1/sso/token/",
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": "moodle",
            "client_secret": secret,
        },
    )


def test_learner_signs_in_with_emailed_code(learner, sent):
    client = Client(enforce_csrf_checks=True)
    res = _authorize(client)
    assert res.status_code == 302 and res["Location"] == "/api/v1/sso/login/"

    res = client.post(
        "/api/v1/sso/login/",
        {"action": "send", "email": " HV@example.com ", "csrfmiddlewaretoken": _csrf(client)},
    )
    assert res.status_code == 200 and len(sent) == 1
    code = re.search(r"(\d{6})", sent[0]["subject"]).group(1)
    assert "Content-Security-Policy" in res and "form-action 'self'" in res["Content-Security-Policy"]

    res = client.post(
        "/api/v1/sso/login/", {"action": "verify", "code": code, "csrfmiddlewaretoken": _csrf(client)}
    )
    assert res.status_code == 302
    location = urlparse(res["Location"])
    assert f"{location.scheme}://{location.netloc}{location.path}" == CALLBACK
    query = parse_qs(location.query)
    assert query["state"] == ["xyz"]

    token_res = _token(client, query["code"][0])
    assert token_res.status_code == 200 and "no-store" in token_res["Cache-Control"]
    access = token_res.json()["access_token"]

    info = Client().get("/api/v1/sso/userinfo/", HTTP_AUTHORIZATION=f"Bearer {access}").json()
    assert info["email"] == "hv@example.com" and info["email_verified"] is True
    assert (info["given_name"], info["family_name"]) == ("Tùng", "Lê Hoàng")

    # Codes are single use.
    assert _token(client, query["code"][0]).status_code == 400

    # Already signed in: the next authorization needs no new code.
    again = _authorize(client)
    assert again.status_code == 302 and again["Location"].startswith(CALLBACK)


def test_unknown_email_gets_same_answer_but_no_mail(db, sent):
    client = Client()
    _authorize(client)
    res = client.post("/api/v1/sso/login/", {"action": "send", "email": "stranger@example.com"})
    assert res.status_code == 200 and "Nhập mã đăng nhập" in res.content.decode()
    assert sent == []


def test_code_attempts_are_limited(learner, sent):
    client = Client()
    _authorize(client)
    client.post("/api/v1/sso/login/", {"action": "send", "email": "hv@example.com"})
    real = re.search(r"(\d{6})", sent[0]["subject"]).group(1)
    wrong = "000000" if real != "000000" else "111111"
    for _ in range(5):
        res = client.post("/api/v1/sso/login/", {"action": "verify", "code": wrong})
        assert res.status_code == 200
    res = client.post("/api/v1/sso/login/", {"action": "verify", "code": real})
    assert res.status_code == 200  # locked out: the right code no longer works


def test_resend_is_rate_limited(learner, sent):
    client = Client()
    _authorize(client)
    for _ in range(3):
        client.post("/api/v1/sso/login/", {"action": "send", "email": "hv@example.com"})
    assert len(sent) == 1  # one mail per minute per address


def test_staff_session_is_reused(db):
    client = Client()
    client.force_login(make_staff(Role.CONTENT_SEO, "editor@twings.test"))
    res = _authorize(client)
    assert res.status_code == 302 and res["Location"].startswith(CALLBACK)


def test_rejects_unregistered_client_or_redirect(db):
    client = Client()
    assert _authorize(client, redirect_uri="https://evil.example/cb").status_code == 400
    assert _authorize(client, client_id="other").status_code == 400


def test_token_endpoint_checks_secret_and_redirect(learner, sent):
    client = Client()
    client.force_login(make_staff(Role.SUPER_ADMIN, "boss@twings.test"))
    code = parse_qs(urlparse(_authorize(client)["Location"]).query)["code"][0]
    assert _token(client, code, secret="wrong").status_code == 401
    code = parse_qs(urlparse(_authorize(client)["Location"]).query)["code"][0]
    assert _token(client, code, redirect_uri="https://lms.example.vn/other").status_code == 400

    code = parse_qs(urlparse(_authorize(client)["Location"]).query)["code"][0]
    basic = base64.b64encode(b"moodle:s3cret-value").decode()
    res = Client().post(
        "/api/v1/sso/token/",
        {"grant_type": "authorization_code", "code": code, "redirect_uri": CALLBACK},
        HTTP_AUTHORIZATION=f"Basic {basic}",
    )
    assert res.status_code == 200


def test_userinfo_requires_valid_token(db):
    assert Client().get("/api/v1/sso/userinfo/", HTTP_AUTHORIZATION="Bearer nope").status_code == 401


def test_disabled_without_secret(settings, db):
    settings.SSO_CLIENT_SECRET = ""
    assert _authorize(Client()).status_code == 404


def test_instructor_can_sign_in_with_an_email_code(db, sent):
    from apps.catalog.models import Instructor

    Instructor.objects.create(name="Trần Minh Đức", title="GV", email="duc@msb.example")
    client = Client()
    _authorize(client)
    client.post("/api/v1/sso/login/", {"action": "send", "email": "duc@msb.example"})
    assert len(sent) == 1
