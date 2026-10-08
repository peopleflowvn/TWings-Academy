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
