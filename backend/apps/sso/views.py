"""
Minimal OAuth 2.0 authorization-code provider so Moodle's built-in "OAuth 2" login (auth_oauth2) can
sign people in with their TWings identity:

  learners - prove they own the e-mail of a paid order with a one-time code sent by e-mail;
  staff    - are recognised from their CMS session.

One client only (Moodle), configured from settings; redirect URIs must match exactly.
"""

import base64
import hmac
import logging
import secrets
import time
from urllib.parse import unquote, urlencode

from django.conf import settings
from django.http import Http404, HttpResponseBadRequest, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.notifications.resend import ResendError, send_email

from . import services

logger = logging.getLogger(__name__)

PENDING = "sso_pending"  # the authorization request waiting for a sign-in
LEARNER = "sso_learner"  # {"email": ..., "at": ...} once the e-mail code was verified
OTP_EMAIL = "sso_otp_email"

LOGIN_CSP = (
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; "
    "frame-ancestors 'none'; base-uri 'none'"
)


def _enabled():
    if not (settings.SSO_CLIENT_ID and settings.SSO_CLIENT_SECRET and settings.SSO_REDIRECT_URIS):
        raise Http404


def _current_identity(request) -> dict | None:
    user = request.user
    if user.is_authenticated and user.is_active and user.is_staff:
        return services.staff_identity(user)
    learner = request.session.get(LEARNER)
    if learner and time.time() - learner["at"] < services.LEARNER_SESSION_TTL:
        return services.identity_for_email(learner["email"])
    return None


def _finish(pending: dict, identity: dict) -> HttpResponseRedirect:
    code = services.issue_code(identity, pending["client_id"], pending["redirect_uri"])
    query = {"code": code}
    if pending.get("state"):
        query["state"] = pending["state"]
    return HttpResponseRedirect(f"{pending['redirect_uri']}?{urlencode(query)}")


@never_cache
@require_http_methods(["GET"])
def authorize(request):
    _enabled()
    p = request.GET
    client_id, redirect_uri = p.get("client_id", ""), p.get("redirect_uri", "")
    # Never redirect to an unregistered URI (open redirect / code leakage): fail on our own page.
    if client_id != settings.SSO_CLIENT_ID or redirect_uri not in settings.SSO_REDIRECT_URIS:
        return HttpResponseBadRequest("invalid client or redirect_uri")
    if p.get("response_type") != "code":
        return HttpResponseRedirect(f"{redirect_uri}?{urlencode({'error': 'unsupported_response_type'})}")
    pending = {"client_id": client_id, "redirect_uri": redirect_uri, "state": p.get("state", "")[:500]}
    identity = _current_identity(request)
    if identity is None:
        request.session[PENDING] = pending
        return HttpResponseRedirect(reverse("sso-login"))
    return _finish(pending, identity)


@never_cache
@require_http_methods(["GET", "POST"])
def login(request):
    _enabled()
    pending = request.session.get(PENDING)
    context = {"step": "email", "learn_url": "/learn/"}
    if not pending:
        context["step"] = "start"
    elif request.method == "POST" and request.POST.get("action") == "send":
        email = services.normalize_email(request.POST.get("email", ""))
        ip = request.META.get("REMOTE_ADDR", "")
        context.update(step="code", email=email)
        request.session[OTP_EMAIL] = email
        if (
            "@" in email
            and services.allow(f"send:{email}", 1, 60)
            and services.allow(f"send-hour:{email}", 5, 3600)
            and services.allow(f"send-ip:{ip}", 20, 3600)
        ):
            identity = services.identity_for_email(email)
            if identity is not None:
                _send_code(email, services.issue_otp(email))
        # Same answer whether or not the e-mail is known: no account enumeration.
    elif request.method == "POST" and request.POST.get("action") == "verify":
        email = request.session.get(OTP_EMAIL, "")
        if email and services.check_otp(email, request.POST.get("code", "")):
            request.session.cycle_key()  # new session id after authentication
            request.session[LEARNER] = {"email": email, "at": time.time()}
            request.session.pop(OTP_EMAIL, None)
            identity = services.identity_for_email(email)
            if identity is not None:
                request.session.pop(PENDING, None)
                return _finish(pending, identity)
        context.update(step="code", email=email, error="Mã không đúng hoặc đã hết hạn. Vui lòng thử lại.")
    response = render(request, "sso/login.html", context)
    response["Content-Security-Policy"] = LOGIN_CSP
    return response


def _send_code(email: str, code: str) -> None:
    html = (
        "<p>Xin chào,</p>"
        f"<p>Mã đăng nhập TWings Academy của bạn là: <strong style='font-size:20px'>{code}</strong></p>"
        "<p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này.</p>"
    )
    try:
        send_email(
            to=email,
            subject=f"Mã đăng nhập TWings: {code}",
            html=html,
            idempotency_key=f"sso-otp-{secrets.token_hex(8)}",
        )
    except ResendError:
        logger.warning("Could not send the SSO login code e-mail")


def _client_credentials(request) -> tuple[str, str]:
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if header.startswith("Basic "):
        try:
            raw = base64.b64decode(header[6:]).decode()
            client_id, _, secret = raw.partition(":")
            return unquote(client_id), unquote(secret)
        except (ValueError, UnicodeDecodeError):
            return "", ""
    return request.POST.get("client_id", ""), request.POST.get("client_secret", "")


def _json(data: dict, status: int = 200) -> JsonResponse:
    response = JsonResponse(data, status=status)
    response["Cache-Control"] = "no-store"
    response["Pragma"] = "no-cache"
    return response


@csrf_exempt  # server-to-server; authenticated by the client secret
@never_cache
@require_http_methods(["POST"])
def token(request):
    _enabled()
    client_id, secret = _client_credentials(request)
    if client_id != settings.SSO_CLIENT_ID or not hmac.compare_digest(
        secret.encode(), settings.SSO_CLIENT_SECRET.encode()
    ):
        return _json({"error": "invalid_client"}, 401)
    if request.POST.get("grant_type") != "authorization_code":
        return _json({"error": "unsupported_grant_type"}, 400)
    identity = services.redeem_code(
        request.POST.get("code", ""), client_id, request.POST.get("redirect_uri", "")
    )
    if identity is None:
        return _json({"error": "invalid_grant"}, 400)
    return _json(
        {
            "access_token": services.issue_token(identity),
            "token_type": "Bearer",
            "expires_in": services.TOKEN_TTL,
            "scope": "openid profile email",
        }
    )


@csrf_exempt
@never_cache
@require_http_methods(["GET", "POST"])
def userinfo(request):
    _enabled()
    header = request.META.get("HTTP_AUTHORIZATION", "")
    raw = header[7:] if header.startswith("Bearer ") else request.GET.get("access_token", "")
    identity = services.identity_for_token(raw)
    if identity is None:
        response = _json({"error": "invalid_token"}, 401)
        response["WWW-Authenticate"] = 'Bearer error="invalid_token"'
        return response
    return _json({**identity, "email_verified": True, "locale": "vi"})
