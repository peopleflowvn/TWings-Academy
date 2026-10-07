"""
Partner HR page (/doi-tac/<token>/): the candidates TWings referred – course, results, verified
certificate, CV – and a small form per candidate to record the interview, offer, start or rejection.
The unguessable token is the credential (only its hash is stored); links expire and can be revoked.
"""

import logging
from datetime import date, datetime

from django.http import FileResponse, Http404, HttpResponseRedirect
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.core.models import audit

from . import placement as svc

logger = logging.getLogger(__name__)
CSP = (
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; "
    "frame-ancestors 'none'; base-uri 'none'"
)
PARTNER_ACTIONS = {"interview", "offer", "hired", "rejected"}


def _secure(response):
    response["Content-Security-Policy"] = CSP
    response["X-Robots-Tag"] = "noindex, nofollow"
    response["Cache-Control"] = "private, no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response


def _share_or_404(token):
    share = svc.resolve_share(token)
    if share is None:
        raise Http404
    return share


def _parse_dt(value: str):
    try:
        dt = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None
    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt


def _parse_date(value: str):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


@csrf_exempt  # the secret token in the URL is the credential; no cookie-based session is involved
@require_http_methods(["GET", "POST"])
def partner_page(request, token: str):
    share = _share_or_404(token)
    message, error = request.GET.get("ok", ""), ""
    if request.method == "POST":
        p = share.placements.filter(pk=request.POST.get("placement")).select_related("order").first()
        action = request.POST.get("action", "")
        if p is None or action not in PARTNER_ACTIONS:
            raise Http404
        try:
            svc.move(
                p,
                action,
                actor_name=f"HR {share.employer} (link đối tác)",
                interview_at=_parse_dt(request.POST.get("interview_at", "")),
                interview_location=request.POST.get("interview_location", "").strip(),
                start_date=_parse_date(request.POST.get("start_date", "")),
                offer_salary=request.POST.get("offer_salary", "").strip(),
                reason=request.POST.get("reason", "").strip(),
                note=request.POST.get("note", "").strip()[:2000],
            )
        except svc.PlacementError as exc:
            error = f"{p.order.customer_name}: {exc}"
        else:
            audit(
                request,
                "placement.partner_update",
                p,
                stage=action,
                share=share.id,
                actor_label=f"partner:{share.employer}",
            )
            return HttpResponseRedirect(f"{request.path}?ok=1#p-{p.pk}")
    else:
        share.view_count += 1
        share.last_viewed_at = timezone.now()
        share.save(update_fields=["view_count", "last_viewed_at", "updated_at"])
    rows = [
        svc.placement_data(p)
        for p in svc.placements_qs().filter(shares=share).order_by("order__customer_name")
    ]
    for r in rows:
        r["actions"] = sorted(svc.TRANSITIONS[r["stage"]] & PARTNER_ACTIONS)
        r["certificate_url"] = f"/xac-minh/{r['certificate_code']}/" if r["certificate_code"] else ""
        at = _parse_dt(r["interview_at"]) if r["interview_at"] else None
        r["interview_text"] = f"{timezone.localtime(at):%H:%M %d/%m/%Y}" if at else ""
        start = _parse_date(r["start_date"]) if r["start_date"] else None
        r["start_text"] = f"{start:%d/%m/%Y}" if start else ""
    response = render(
        request,
        "crm/partner.html",
        {
            "share": share,
            "rows": rows,
            "message": "Đã ghi nhận. Cảm ơn anh/chị!" if message else "",
            "error": error,
            "labels": svc.STAGE_LABEL,
        },
        status=400 if error else 200,
    )
    return _secure(response)


@require_http_methods(["GET"])
def partner_cv(request, token: str, placement_id: str):
    from django.core.files.storage import storages

    share = _share_or_404(token)
    if not share.allow_cv:
        raise Http404
    p = share.placements.filter(pk=placement_id).select_related("order").first()
    if p is None or not p.order.cv_link.startswith("private:"):
        raise Http404
    name = p.order.cv_link.removeprefix("private:")
    audit(request, "placement.partner_cv", p, share=share.id, actor_label=f"partner:{share.employer}")
    return _secure(
        FileResponse(
            storages["private"].open(name, "rb"),
            as_attachment=True,
            filename=f"CV-{p.order.customer_name}-{p.order.order_code}.{name.rsplit('.', 1)[-1]}",
        )
    )
