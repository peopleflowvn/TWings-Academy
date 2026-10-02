import ipaddress

from django.conf import settings


class ProxyRealIPMiddleware:
    """
    Use the client address set by the reverse proxy (REAL_IP_HEADER, e.g. Caddy's X-Real-IP) so
    throttling and login lockouts target the real visitor instead of the proxy.

    Only set REAL_IP_HEADER when the app is reachable exclusively through a proxy that overwrites
    that header; otherwise anyone could spoof it.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        header = settings.REAL_IP_HEADER.strip()
        self.meta_key = "HTTP_" + header.upper().replace("-", "_") if header else ""

    def __call__(self, request):
        if self.meta_key:
            candidate = request.META.get(self.meta_key, "").strip()
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
