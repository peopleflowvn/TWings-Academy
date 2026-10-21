"""
Client report links (/doi-tac/dn/<token>/): the client sees the published results of its classes
without an account. Read-only, time-limited, revocable; the unguessable token is the credential and
only its SHA-256 is stored. Shown: class figures (learners, completion, attendance, satisfaction) and,
when allowed, each employee's result. Never shown: other clients, costs, margins, personal contacts.
"""

import hashlib
import secrets
from datetime import timedelta

from django.http import Http404
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_GET

from apps.core.models import audit
from apps.crm.partner import _secure

from .models import ClientShare
from .services import CorporateError

DEFAULT_DAYS = 30  # TMS question C7
MAX_DAYS = 180
RESULT_LABEL = {"passed": "Đạt", "not_passed": "Chưa đạt", "pending": "Chờ xác minh"}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_share(
    client, *, user, title: str, days: int = DEFAULT_DAYS, corporate_class=None, include_learners=True
):
    """(share, token): the token is shown once."""
    if corporate_class is not None and corporate_class.client_id != client.pk:
        raise CorporateError("Lớp không thuộc khách hàng này.")
    token = secrets.token_urlsafe(32)
    share = ClientShare.objects.create(
        client=client,
        corporate_class=corporate_class,
        token_hash=_hash(token),
        title=title[:200],
        include_learners=include_learners,
        expires_at=timezone.now() + timedelta(days=max(1, min(days, MAX_DAYS))),
        created_by=user,
    )
    return share, token


def share_url(token: str) -> str:
    from apps.cms.seo import base_url

    return f"{base_url()}/doi-tac/dn/{token}/"


def report(share: ClientShare) -> list[dict]:
    classes = share.client.classes.exclude(status="cancelled").select_related("cohort__course")
    if share.corporate_class_id:
        classes = classes.filter(pk=share.corporate_class_id)
    out = []
    for c in classes.order_by("-cohort__start_date", "cohort__name"):
        snapshot = c.results.filter(status="published").first()
        if snapshot is None:
            continue  # nothing is shown before the results are published
        learners = [
            {
                "name": r["name"],
                "employee_code": r.get("employee_code", ""),
                "unit": r.get("unit", ""),
                "attendance": f"{r['sessions_attended']}/{r['sessions_taken']}"
                if r.get("sessions_taken")
                else "",
                "attendance_rate": r.get("attendance_rate"),
                "grade_percent": r.get("grade_percent"),
                "result": RESULT_LABEL.get(r["result"], r["result"]),
            }
            for r in snapshot.learners
        ]
        out.append(
            {
                "name": c.cohort.name,
                "course": c.cohort.course.title,
                "start_date": c.cohort.start_date,
                "version": snapshot.version,
                "published_at": snapshot.published_at,
                "kpis": snapshot.kpis,
                "learners": learners if share.include_learners else [],
            }
        )
    return out


@require_GET
def client_report_page(request, token: str):
    share = ClientShare.objects.select_related("client").filter(token_hash=_hash(token or "")).first()
    if share is None or not share.active:
        raise Http404
    ClientShare.objects.filter(pk=share.pk).update(
        last_viewed_at=timezone.now(), view_count=share.view_count + 1
    )
    audit(None, "corporate.share_view", share, actor_label=f"client-link:{share.client.code}")
    return _secure(
        render(request, "corporate/client_report.html", {"share": share, "classes": report(share)})
    )
