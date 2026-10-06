"""
Cookie-less page analytics (journey step 3). The SPA reports a view as {path, source}; we only add 1
to a daily counter per page and channel. Nothing identifies the visitor (no IP, no cookie, no user id).
"""

import re
from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PageViewDaily

TRACKED = re.compile(
    r"^/(|khoa-hoc(/[a-z0-9-]+)?|chuong-trinh(/[a-z0-9-]+)?|tin-tuc(/[a-z0-9-]+)?|ve-chung-toi)$"
)
BOT = re.compile(r"bot|crawl|spider|preview|facebookexternalhit|headless|lighthouse", re.I)


class TrackSerializer(serializers.Serializer):
    path = serializers.CharField(max_length=200)
    source = serializers.CharField(max_length=60, required=False, allow_blank=True)


class TrackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "track"

    def post(self, request):
        ser = TrackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        path = ser.validated_data["path"].rstrip("/") or "/"
        if not TRACKED.match(path) or BOT.search(request.headers.get("User-Agent", "")):
            return Response(status=204)
        source = (
            re.sub(r"[^a-z0-9._-]", "", (ser.validated_data.get("source") or "direct").lower())[:60]
            or "direct"
        )
        row, _ = PageViewDaily.objects.get_or_create(date=timezone.localdate(), path=path, source=source)
        PageViewDaily.objects.filter(pk=row.pk).update(views=F("views") + 1)
        return Response(status=204)


def marketing_report(days: int = 30) -> dict:
    """Views -> leads -> paid, per course page and per channel, over the last `days` days."""
    from apps.catalog.models import Course
    from apps.crm.attribution import source_key, source_label
    from apps.crm.models import Order

    since = timezone.localdate() - timedelta(days=days - 1)
    views = PageViewDaily.objects.filter(date__gte=since)
    orders = Order.objects.filter(parent__isnull=True, created_at__date__gte=since)

    by_path = dict(views.values_list("path").annotate(n=Sum("views")).order_by())
    pages = []
    for course in Course.objects.filter(is_published=True):
        leads = orders.filter(course=course)
        stats = leads.aggregate(n=Count("id"), paid=Count("id", filter=Q(learning_access=True)))
        v = by_path.get(f"/khoa-hoc/{course.slug}", 0)
        pages.append(
            {
                "title": course.title,
                "path": f"/khoa-hoc/{course.slug}",
                "views": v,
                "leads": stats["n"],
                "paid": stats["paid"],
                "lead_rate": round(100 * stats["n"] / v, 1) if v else None,
            }
        )

    channel_views = dict(views.values_list("source").annotate(n=Sum("views")).order_by())
    channels: dict[str, dict] = {}
    for order in orders.only("attribution", "learning_access"):
        touch = (order.attribution or {}).get("last") or (order.attribution or {}).get("first")
        key = source_key(touch) if touch else "unknown"
        row = channels.setdefault(key, {"leads": 0, "paid": 0})
        row["leads"] += 1
        row["paid"] += int(order.learning_access)
    for key in channel_views:
        channels.setdefault(key, {"leads": 0, "paid": 0})
    channel_rows = sorted(
        (
            {
                "key": key,
                "label": "Chưa rõ nguồn (đơn cũ / nhập tay)" if key == "unknown" else source_label(key),
                "views": channel_views.get(key, 0),
                **row,
                "lead_rate": round(100 * row["leads"] / channel_views[key], 1)
                if channel_views.get(key)
                else None,
            }
            for key, row in channels.items()
        ),
        key=lambda r: (-r["views"], -r["leads"]),
    )
    total_views = sum(channel_views.values())
    return {
        "days": days,
        "views": total_views,
        "leads": orders.count(),
        "paid": orders.filter(learning_access=True).count(),
        "pages": sorted(pages, key=lambda r: -r["views"]),
        "channels": channel_rows,
        "top_pages": [
            {"path": p, "views": n} for p, n in sorted(by_path.items(), key=lambda kv: -kv[1])[:10]
        ],
    }
