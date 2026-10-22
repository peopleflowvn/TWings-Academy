"""Every e-mail leaves in the TWings frame; full HTML documents (staff templates) are sent unchanged."""

from apps.notifications import resend
from apps.notifications.layout import wrap


def test_fragments_get_the_twings_frame_documents_do_not():
    framed = wrap("<p>Chào An,</p>")
    assert framed.startswith("<!doctype html>") and "<p>Chào An,</p>" in framed
    assert "TWings Academy" in framed and "/learn/tai-khoan" in framed
    document = "<html><body><p>Mẫu của nhân viên</p></body></html>"
    assert wrap(document) == document


def test_resend_receives_the_framed_message(settings, monkeypatch):
    settings.RESEND_API_KEY = "re_test_only"
    sent = {}

    class Ok:
        status_code = 200

        @staticmethod
        def json():
            return {"id": "msg-1"}

    monkeypatch.setattr(resend.requests, "post", lambda url, json, **kw: sent.update(json) or Ok())
    assert resend.send_email(to="a@example.vn", subject="S", html="<p>X</p>", idempotency_key="k") == "msg-1"
    assert sent["html"].startswith("<!doctype html>") and "<p>X</p>" in sent["html"]


def test_render_template_fallback_and_db(db):
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


def test_preview_and_test_send_endpoints(db, staff_client, monkeypatch):
    from apps.accounts.rbac import Role
    from apps.notifications import resend

    client = staff_client(Role.SUPER_ADMIN)

    # 1. Preview endpoint returns wrapped HTML with Master Layout
    resp = client.post(
        "/api/v1/staff/emails/preview/",
        {
            "subject": "Thư chào mừng {{customerName}}",
            "html": "<p>Nội dung thử nghiệm</p>",
            "variables": {"customerName": "Le Van C"},
            "brand": "twings",
        },
        format="json",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["subject"] == "Thư chào mừng Le Van C"
    assert data["html"].startswith("<!doctype html>")
    assert "TWings Academy" in data["html"]
    assert "Nội dung thử nghiệm" in data["html"]

    # 2. Test-send endpoint sends immediate email with [TEST] prefix
    class Ok:
        status_code = 200

        @staticmethod
        def json():
            return {"id": "test-resend-id"}

    sent = {}
    monkeypatch.setattr(resend.requests, "post", lambda url, json, **kw: sent.update(json) or Ok())

    send_resp = client.post(
        "/api/v1/staff/emails/test-send/",
        {
            "to": "test@example.com",
            "subject": "Xin chào {{name}}",
            "html": "<p>Kiểm tra gửi email</p>",
            "variables": {"name": "Admin"},
            "brand": "twings",
        },
        format="json",
    )
    assert send_resp.status_code == 200
    assert send_resp.json()["subject"] == "[TEST] Xin chào Admin"


def test_deliver_email_task_background(db, settings, monkeypatch):
    from apps.notifications import resend
    from apps.notifications.models import EmailLog
    from apps.notifications.tasks import deliver_email_task

    settings.RESEND_API_KEY = "re_test_key"

    class Ok:
        status_code = 200

        @staticmethod
        def json():
            return {"id": "async-msg-123"}

    monkeypatch.setattr(resend.requests, "post", lambda url, json, **kw: Ok())

    log = EmailLog.objects.create(
        recipient_email="async@example.vn",
        subject="Async Subject",
        rendered_html="<p>Async Content</p>",
        status="queued",
    )
    deliver_email_task.enqueue(str(log.pk))
    log.refresh_from_db()
    assert log.status == "sent"
    assert log.resend_message_id == "async-msg-123"

