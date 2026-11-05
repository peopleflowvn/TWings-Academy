"""Resend integration: outbound sending and Svix-signed webhook verification."""

import base64
import hashlib
import hmac
import logging
import time

import requests

from .layout import wrap

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_DOMAINS_URL = "https://api.resend.com/domains"
WEBHOOK_TOLERANCE_SECONDS = 5 * 60


class ResendError(Exception):
    pass


# kind: "learner" (default: signed, archived), "internal" (staff notices: no signature, not archived),
# "sensitive" (sign-in codes, password links: never archived nor redirected to the test mailbox).
KINDS = ("learner", "internal", "sensitive")


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    idempotency_key: str,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    reply_to: str = "",
    attachments: list[dict] | None = None,
    brand: str = "twings",
    kind: str = "learner",
) -> str | None:
    """
    Send via Resend and return its message id, or None when no API key is configured (sandbox mode:
    the caller records the email as 'simulated'). One message: `to` is a single person, `cc` / `bcc`
    are who else receives that same message (Resend reports delivery per message, not per copy).
    `attachments`: [{"filename": "lich-hoc.ics", "content": <bytes>, "content_type": "text/calendar"}].
    `brand`: "twings" (B2C) or "corporate" (B2B, TNTalent): sender, reply-to and e-mail frame.
    Sender, reply-to, archive copy and test redirect come from /app/content/email (config.py).
    """
    from . import config

    api_key = config.api_key()
    if not api_key:
        return None
    b = config.effective(brand)
    cc, bcc = list(cc or []), list(bcc or [])
    if b["redirect_to"] and kind != "sensitive":
        # Test mode: nobody but the test mailbox receives anything.
        others = ", ".join([to, *cc, *bcc])
        subject = f"[THỬ NGHIỆM → {others}] {subject}"[:300]
        to, cc, bcc = b["redirect_to"], [], []
    elif b["bcc_archive"] and kind == "learner" and b["bcc_archive"] not in (to, *cc, *bcc):
        bcc.append(b["bcc_archive"])
    payload = {
        "from": b["sender"],
        "to": [to],
        "subject": subject,
        "html": wrap(html, brand, signature=kind != "internal"),
    }
    if cc:
        payload["cc"] = cc
    if bcc:
        payload["bcc"] = bcc
    reply_to = reply_to or b["reply_to"]
    if reply_to:
        payload["reply_to"] = reply_to
    if attachments:
        payload["attachments"] = [
            {
                "filename": a["filename"],
                "content": base64.b64encode(a["content"]).decode(),
                **({"content_type": a["content_type"]} if a.get("content_type") else {}),
            }
            for a in attachments
        ]
    try:
        response = requests.post(
            RESEND_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Idempotency-Key": idempotency_key},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise ResendError("Không kết nối được Resend") from exc
    if response.status_code >= 400:
        # Never log the request (it carries the key); the response body is safe to keep.
        logger.warning("Resend rejected email: %s %s", response.status_code, response.text[:300])
        raise ResendError(_message(response) or f"Resend trả lỗi {response.status_code}")
    return response.json().get("id")


def _message(response) -> str:
    try:
        return str(response.json().get("message", ""))
    except ValueError:
        return ""


def check_connection(api_key: str | None = None) -> dict:
    """
    Is the key valid, and which sending domains does the Resend account have (status, region)?
    A "sending access" key cannot list domains: it is reported as valid but restricted.
    """
    from . import config

    key = api_key if api_key is not None else config.api_key()
    if not key:
        return {"ok": False, "detail": "Chưa có khóa API Resend (chế độ mô phỏng: thư không được gửi đi)."}
    try:
        response = requests.get(RESEND_DOMAINS_URL, headers={"Authorization": f"Bearer {key}"}, timeout=10)
    except requests.RequestException:
        return {"ok": False, "detail": "Không kết nối được Resend."}
    if response.status_code in (401, 403) and "restricted" in response.text:
        return {
            "ok": True,
            "restricted": True,
            "domains": [],
            "detail": "Khóa hợp lệ, chỉ có quyền gửi (không xem được danh sách tên miền).",
        }
    if response.status_code in (401, 403):
        return {"ok": False, "detail": "Khóa API không hợp lệ hoặc đã bị thu hồi."}
    if response.status_code >= 400:
        return {"ok": False, "detail": _message(response) or f"Resend trả lỗi {response.status_code}"}
    domains = [
        {
            "name": d.get("name", ""),
            "status": d.get("status", ""),
            "region": d.get("region", ""),
            "created_at": d.get("created_at", ""),
        }
        for d in response.json().get("data", [])
    ]
    return {"ok": True, "restricted": False, "domains": domains, "detail": ""}


class InvalidSignature(Exception):
    pass


def verify_svix_signature(
    *, secret: str, msg_id: str, timestamp: str, signature_header: str, body: bytes
) -> None:
    """
    Verify a Svix webhook (used by Resend): HMAC-SHA256 over "{id}.{timestamp}.{body}" with the
    base64 secret after the "whsec_" prefix. Rejects stale timestamps to stop replays.
    """
    if not (secret and msg_id and timestamp and signature_header):
        raise InvalidSignature("missing headers")
    try:
        ts = int(timestamp)
    except ValueError as exc:
        raise InvalidSignature("bad timestamp") from exc
    if abs(time.time() - ts) > WEBHOOK_TOLERANCE_SECONDS:
        raise InvalidSignature("timestamp outside tolerance")

    key = base64.b64decode(secret.removeprefix("whsec_"))
    signed = f"{msg_id}.{timestamp}.".encode() + body
    expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()

    for candidate in signature_header.split():
        version, _, sig = candidate.partition(",")
        if version == "v1" and hmac.compare_digest(sig, expected):
            return
    raise InvalidSignature("no matching signature")
