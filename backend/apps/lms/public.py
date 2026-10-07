"""Public certificate verification: an HTML page for people and a JSON endpoint for integrations."""

from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET

from .models import Certificate

PAGE_CSP = (
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; "
    "frame-ancestors 'none'; base-uri 'none'"
)


def _lookup(code: str) -> Certificate:
    certificate = Certificate.objects.filter(code=(code or "").strip().upper()).first()
    if certificate is None:
        raise Http404
    return certificate


def _data(c: Certificate) -> dict:
    return {
        "code": c.code,
        "learnerName": c.learner_name,
        "courseTitle": c.course_title,
        "cohortName": c.cohort_name,
        "issuedAt": c.issued_at.date().isoformat(),
        "valid": not c.revoked,
    }


@require_GET
@cache_control(public=True, max_age=300)
def certificate_page(request, code):
    try:
        certificate = _lookup(code)
    except Http404:
        response = render(request, "lms/certificate.html", {"certificate": None, "code": code}, status=404)
    else:
        response = render(
            request, "lms/certificate.html", {"certificate": certificate, "code": certificate.code}
        )
    response["Content-Security-Policy"] = PAGE_CSP
    return response


@require_GET
def certificate_print(request, code: str):
    """A4 landscape certificate to print / save as PDF (same data as the verification page)."""
    from django.http import Http404
    from django.shortcuts import render

    from .completion import certificate_url
    from .models import Certificate

    cert = Certificate.objects.filter(code=code.upper(), revoked=False).first()
    if cert is None:
        raise Http404
    response = render(
        request, "lms/certificate_print.html", {"cert": cert, "verify_url": certificate_url(cert.code)}
    )
    response["Content-Security-Policy"] = (
        "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"
    )
    response["X-Robots-Tag"] = "noindex"
    return response


def certificate_json(request, code):
    return JsonResponse(_data(_lookup(code)))
