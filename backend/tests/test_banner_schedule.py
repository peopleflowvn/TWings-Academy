"""Homepage banners: draft (hidden), shown, scheduled from a time, hidden again at an end."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.cms.models import HeroBanner

pytestmark = pytest.mark.django_db
STAFF = "/api/v1/staff/banners/"


def _public(client):
    return {b["title"] for b in client.get("/api/v1/public/banners/").json()}


def test_only_live_banners_reach_the_homepage(client):
    now = timezone.now()
    HeroBanner.objects.create(title="Nháp")
    HeroBanner.objects.create(title="Hiện", status="published")
    HeroBanner.objects.create(title="Sắp hiện", status="scheduled", starts_at=now + timedelta(hours=1))
    HeroBanner.objects.create(title="Đã đến giờ", status="scheduled", starts_at=now - timedelta(minutes=1))
    HeroBanner.objects.create(title="Hết hạn", status="published", ends_at=now - timedelta(minutes=1))
    HeroBanner.objects.create(title="Còn hạn", status="published", ends_at=now + timedelta(days=1))
    assert _public(client) == {"Hiện", "Đã đến giờ", "Còn hạn"}
    assert (
        HeroBanner.objects.get(title="Đã đến giờ").is_live
        and not HeroBanner.objects.get(title="Hết hạn").is_live
    )


def test_staff_schedule_rules(staff_client):
    staff = staff_client(Role.CONTENT_SEO)
    assert staff.post(STAFF, {"title": "A", "status": "scheduled"}, format="json").status_code == 400
    start = timezone.now() + timedelta(days=1)
    bad = {"title": "A", "status": "scheduled", "startsAt": start.isoformat(), "endsAt": start.isoformat()}
    assert staff.post(STAFF, bad, format="json").status_code == 400
    ok = staff.post(STAFF, {**bad, "endsAt": (start + timedelta(days=7)).isoformat()}, format="json")
    assert ok.status_code == 201 and ok.json()["isLive"] is False
    banner = HeroBanner.objects.get()
    res = staff.patch(f"{STAFF}{banner.pk}/", {"status": "published"}, format="json")
    assert res.status_code == 200 and res.json()["isLive"] is True
