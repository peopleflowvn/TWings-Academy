"""Resend integration: outbound sending and Svix-signed webhook verification."""

import base64
import hashlib
import hmac
import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
WEBHOOK_TOLERANCE_SECONDS = 5 * 60


class ResendError(Exception):
    pass


def send_email(*, to: str, subject: str, html: str, idempotency_key: str) -> str | None:
    """
    Send via Resend and return its message id, or None when no API key is configured (sandbox mode:
    the caller records the email as 'simulated').
    """
    api_key = settings.RESEND_API_KEY
    if not api_key:
        return None
    try:
        response = requests.post(
            RESEND_API_URL,
            json={"from": settings.RESEND_FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            headers={"Authorization": f"Bearer {api_key}", "Idempotency-Key": idempotency_key},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise ResendError("Không kết nối được Resend") from exc
    if response.status_code >= 400:
        # Never log the request (it carries the key); the response body is safe to keep.
        logger.warning("Resend rejected email: %s %s", response.status_code, response.text[:300])
        try:
            message = response.json().get("message", "")
        except ValueError:
            message = ""
        raise ResendError(message or f"Resend trả lỗi {response.status_code}")
    return response.json().get("id")


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
