import ipaddress

from django.conf import settings


class CloudflareRealIPMiddleware:
    """
    Use Cloudflare's CF-Connecting-IP as the client address so throttling and login lockouts
    target the real visitor instead of the tunnel.

    Only enable (TRUST_CLOUDFLARE_IP_HEADER=true) when the app is reachable exclusively through
    Cloudflare Tunnel; otherwise anyone could spoof the header.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.TRUST_CLOUDFLARE_IP_HEADER:
            candidate = request.META.get("HTTP_CF_CONNECTING_IP", "").strip()
            if candidate:
                try:
                    ipaddress.ip_address(candidate)
                except ValueError:
                    pass
                else:
                    request.META["REMOTE_ADDR"] = candidate
        return self.get_response(request)


API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
ADMIN_CSP = (
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
)


class SecurityHeadersMiddleware:
    """Adds Content-Security-Policy and Permissions-Policy, which Django does not set itself."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        is_api = request.path.startswith("/api/")
        response.headers.setdefault("Content-Security-Policy", API_CSP if is_api else ADMIN_CSP)
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
        )
        if is_api:
            response.headers.setdefault("Cache-Control", "no-store")
        return response
