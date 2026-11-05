"""
Every e-mail leaves in one frame: the website's logo, its hotline / e-mail / address (Cài đặt SEO website),
the sender and options of /app/content/email. Full HTML documents (staff templates) are sent unchanged.
"""

import re

import pytest

from apps.core.models import SiteConfig
from apps.notifications import config, resend
from apps.notifications.defaults import TEMPLATES
from apps.notifications.layout import wrap
from tests.conftest import Role

pytestmark = pytest.mark.django_db

SEO = {
    "logoUrl": "/media/uploads/logo.png",
    "hotline": "0843 314 382 (Ms. Hường)",
    "email": "hello@twings.edu.vn",
    "address": "Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội",
}


@pytest.fixture
def seo():
    from djangorestframework_camel_case.util import underscoreize

    SiteConfig.objects.update_or_create(key=SiteConfig.KEY_SITE_SEO, defaults={"data": underscoreize(SEO)})


@pytest.fixture
def resend_ok(settings, monkeypatch):
    settings.RESEND_API_KEY = "re_test_only"
    sent = []

    class Ok:
        status_code = 200

        @staticmethod
        def json():
            return {"id": f"msg-{len(sent)}"}

    monkeypatch.setattr(resend.requests, "post", lambda url, json, **kw: sent.append(json) or Ok())
    return sent


def test_fragments_get_the_twings_frame_documents_do_not():
    framed = wrap("<p>Chào An,</p>")
    assert framed.startswith("<!doctype html>") and "<p>Chào An,</p>" in framed
    assert "TWings Academy" in framed and "/learn/tai-khoan" in framed
    document = "<html><body><p>Mẫu của nhân viên</p></body></html>"
    assert wrap(document) == document


def test_frame_uses_the_website_logo_and_contact_details(seo):
    framed = wrap("<p>Hotline: {{hotline}}</p>")
    assert '<img src="https://twings.edu.vn/media/uploads/logo.png"' in framed
    assert 'href="tel:0843314382"' in framed and "0843 314 382 (Ms. Hường)" in framed
    assert "<p>Hotline: 0843 314 382 (Ms. Hường)</p>" in framed  # brand variables are filled
    assert "hello@twings.edu.vn" in framed and "54A Nguyễn Chí Thanh" in framed
    assert "1900" not in framed and "Đội ngũ TWings Academy" in framed


def test_no_standard_template_hard_codes_a_hotline_and_all_render_completely(seo):
    from apps.notifications.engine import render_template

    for t in TEMPLATES:
        assert "1900" not in t["subject"] + t["body"], t["code"]
        assert "twings.edu.vn" not in t["body"], t["code"]  # links come from variables
        context = {name: f"<{name}>" for name in t["variables"]}
        subject, body = render_template(t["code"], context)
        left = re.findall(r"\{\{\s*\w+\s*\}\}", subject + body)
        assert not left, (t["code"], left)
        assert subject.endswith(" | TNTalent" if t["brand"] == "corporate" else " | TWings Academy") or (
            t["code"] == "auth_otp"
        ), (t["code"], subject)


def test_resend_receives_the_framed_message_with_reply_to(seo, resend_ok):
    assert resend.send_email(to="a@example.vn", subject="S", html="<p>X</p>", idempotency_key="k") == "msg-1"
    (sent,) = resend_ok
    assert sent["html"].startswith("<!doctype html>") and "<p>X</p>" in sent["html"]
    assert sent["reply_to"] == "hello@twings.edu.vn"  # replies reach the website's mailbox


def test_settings_change_sender_archive_and_test_redirect(seo, resend_ok):
    config.save({"from_name": "TWings Tuyển sinh", "from_address": "tuyensinh@twings.edu.vn"})
    config.save({"bcc_archive": "luu@twings.edu.vn", "reply_to": "tuvan@twings.edu.vn"})
    resend.send_email(to="hv@example.com", subject="S", html="<p>x</p>", idempotency_key="a")
    resend.send_email(
        to="hv@example.com", subject="Mã", html="<p>1</p>", idempotency_key="b", kind="sensitive"
    )
    learner, code = resend_ok
    assert learner["from"] == "TWings Tuyển sinh <tuyensinh@twings.edu.vn>"
    assert learner["bcc"] == ["luu@twings.edu.vn"] and learner["reply_to"] == "tuvan@twings.edu.vn"
    assert "bcc" not in code  # sign-in codes are never copied

    config.save({"redirect_to": "test@twings.edu.vn"})
    resend.send_email(to="hv@example.com", subject="S", html="<p>x</p>", idempotency_key="c")
    resend.send_email(
        to="hv@example.com", subject="Mã", html="<p>1</p>", idempotency_key="d", kind="sensitive"
    )
    redirected, code = resend_ok[2:]
    assert redirected["to"] == ["test@twings.edu.vn"] and "hv@example.com" in redirected["subject"]
    assert code["to"] == ["hv@example.com"]  # a sign-in code still reaches its owner only


def test_queued_corporate_mail_keeps_its_brand(settings, resend_ok):
    from apps.notifications.outbox import send_logged
    from apps.notifications.tasks import deliver_email_task

    settings.TASKS_QUEUE = "database"
    log = send_logged(to="hv@nhm.vn", subject="S", html="<p>x</p>", brand="corporate")
    assert log.status == "queued" and log.brand == "corporate"
    deliver_email_task.call(str(log.pk))
    assert resend_ok[-1]["from"].startswith("TNTalent <")


def test_api_key_is_stored_encrypted_and_never_returned(staff_client, settings, monkeypatch):
    settings.RESEND_API_KEY = ""
    admin = staff_client(Role.SUPER_ADMIN)
    url = "/api/v1/staff/emails/settings/"
    res = admin.put(url, {"settings": {"fromName": "TWings"}, "apiKey": "re_secret_key_1234"}, format="json")
    assert res.status_code == 200, res.content
    assert "re_secret_key_1234" not in res.content.decode()
    assert res.json()["secrets"]["apiKey"] == {"source": "system", "hint": "…1234"} and res.json()["live"]
    stored = SiteConfig.objects.get(key=SiteConfig.KEY_EMAIL_SETTINGS).data
    assert stored["api_key_enc"].startswith("enc1:") and config.api_key() == "re_secret_key_1234"

    bad = admin.put(url, {"settings": {"replyTo": "khong-phai-email"}, "apiKey": "abc"}, format="json")
    assert bad.status_code == 400 and set(bad.json()["errors"]) == {"replyTo", "apiKey"}
    assert admin.put(url, {"apiKey": ""}, format="json").json()["secrets"]["apiKey"]["source"] == ""


def test_only_email_settings_holders_change_settings(staff_client):
    url = "/api/v1/staff/emails/settings/"
    sales = staff_client(Role.SALES_CRM)
    data = sales.get(url).json()
    assert data["canEdit"] is False and data["secrets"] == {}  # reading is fine, key hints are not
    assert sales.put(url, {"settings": {"fromName": "X"}}, format="json").status_code == 403
    assert sales.post("/api/v1/staff/emails/settings/check/").status_code == 403
    assert staff_client(Role.CONTENT_SEO).get(url).status_code == 403


def test_standard_templates_can_be_restored(staff_client):
    from apps.notifications.models import EmailTemplate

    t = EmailTemplate.objects.get(code="payment_receipt")
    t.body = "<p>sửa hỏng</p>"
    t.save()
    client = staff_client(Role.SALES_CRM)
    res = client.post(f"/api/v1/staff/email-templates/{t.pk}/restore/")
    assert res.status_code == 200 and "{{receipt_url}}" in res.json()["body"] and res.json()["isStandard"]
    assert client.delete(f"/api/v1/staff/email-templates/{t.pk}/").status_code == 400
    EmailTemplate.objects.filter(code="bank_tour_invite").delete()
    assert client.post("/api/v1/staff/email-templates/restore-missing/").json()["created"] == [
        "bank_tour_invite"
    ]


def test_render_template_fallback_and_db():
    from apps.notifications.engine import render_template
    from apps.notifications.models import EmailTemplate

    # 1. Fallback when not in DB
    subj, body = render_template(
        "custom_code",
        {"name": "Nguyen Van A", "code": "ABC"},
        default_subject="Hello {{name}}",
        default_body="<p>Your code is {code}</p>",
    )
    assert subj == "Hello Nguyen Van A"
    assert body == "<p>Your code is ABC</p>"

    # 2. Database template overrides fallback
    EmailTemplate.objects.create(
        code="custom_code",
        name="Custom",
        subject="DB Subject {{name}}",
        body="<div>DB Content {{code}}</div>",
    )
    subj2, body2 = render_template(
        "custom_code",
        {"name": "Tran B", "code": "XYZ"},
        default_subject="Fallback",
        default_body="Fallback",
    )
    assert subj2 == "DB Subject Tran B"
    assert body2 == "<div>DB Content XYZ</div>"

    # 3. A standard template removed from the database still renders (defaults.py)
    EmailTemplate.objects.filter(code="consultation_received").delete()
    subj3, _ = render_template("consultation_received", {"course_title": "RM"})
    assert subj3 == "Đã nhận đăng ký tư vấn khóa RM | TWings Academy"
