"""
Short-lived secrets for the SSO flow, kept in the cache and only as SHA-256 hashes:

- one-time e-mail codes (learners prove they own the e-mail of a paid order),
- authorization codes (single use, 60 s, bound to client + redirect URI),
- access tokens (5 min, only usable on the userinfo endpoint).
"""

import hashlib
import hmac
import secrets
import time

from django.core.cache import cache

from apps.accounts.models import User
from apps.crm.models import Order
from apps.lms.services import split_vietnamese_name

OTP_TTL = 10 * 60
OTP_MAX_ATTEMPTS = 5
CODE_TTL = 60
TOKEN_TTL = 5 * 60
LEARNER_SESSION_TTL = 12 * 60 * 60


def _h(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


# ---------------------------------------------------------------- who may sign in
def identity_for_email(email: str) -> dict | None:
    """A learner with a paid order, or an active staff member; None otherwise."""
    email = normalize_email(email)
    if not email:
        return None
    staff = User.objects.filter(email=email, is_active=True).first()
    if staff:
        return staff_identity(staff)
    order = Order.objects.filter(customer_email__iexact=email, status="paid").order_by("-paid_at").first()
    if order is None:
        return None
    given, family = split_vietnamese_name(order.customer_name)
    return {
        "sub": f"learner:{_h(email)[:32]}",
        "email": email,
        "name": order.customer_name,
        "given_name": given,
        "family_name": family,
    }


def staff_identity(user: User) -> dict:
    given, family = split_vietnamese_name(user.name or user.email)
    return {
        "sub": f"staff:{user.pk}",
        "email": user.email.lower(),
        "name": user.name,
        "given_name": given,
        "family_name": family,
    }


# ---------------------------------------------------------------- rate limits
def allow(bucket: str, limit: int, window: int) -> bool:
    key = f"sso:rl:{_h(bucket)}"
    cache.add(key, 0, window)
    try:
        count = cache.incr(key)
    except ValueError:  # expired between add and incr
        cache.set(key, 1, window)
        count = 1
    return count <= limit


# ---------------------------------------------------------------- one-time e-mail codes
def issue_otp(email: str) -> str:
    code = f"{secrets.randbelow(10**6):06d}"
    cache.set(f"sso:otp:{_h(normalize_email(email))}", {"hash": _h(code), "attempts": 0}, OTP_TTL)
    return code


def check_otp(email: str, code: str) -> bool:
    key = f"sso:otp:{_h(normalize_email(email))}"
    record = cache.get(key)
    if not record:
        return False
    if record["attempts"] >= OTP_MAX_ATTEMPTS:
        cache.delete(key)
        return False
    if hmac.compare_digest(record["hash"], _h((code or "").strip())):
        cache.delete(key)
        return True
    record["attempts"] += 1
    cache.set(key, record, OTP_TTL)
    return False


# ---------------------------------------------------------------- authorization codes / tokens
def issue_code(identity: dict, client_id: str, redirect_uri: str) -> str:
    code = secrets.token_urlsafe(32)
    cache.set(
        f"sso:code:{_h(code)}",
        {"identity": identity, "client_id": client_id, "redirect_uri": redirect_uri, "at": time.time()},
        CODE_TTL,
    )
    return code


def redeem_code(code: str, client_id: str, redirect_uri: str) -> dict | None:
    key = f"sso:code:{_h(code or '')}"
    record = cache.get(key)
    cache.delete(key)  # single use, whatever the outcome
    if not record or record["client_id"] != client_id or record["redirect_uri"] != redirect_uri:
        return None
    return record["identity"]


def issue_token(identity: dict) -> str:
    token = secrets.token_urlsafe(32)
    cache.set(f"sso:token:{_h(token)}", identity, TOKEN_TTL)
    return token


def identity_for_token(token: str) -> dict | None:
    return cache.get(f"sso:token:{_h(token or '')}") if token else None
