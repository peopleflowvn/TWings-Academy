"""
Admission campaigns on the public site (/tuyen-sinh, /tuyen-sinh/<slug>), like job postings on a career
site: only what AdmissionCampaign.objects.on_website() returns (published, recruiting, started, not
past its deadline), featured first then the nearest deadline. A campaign's page lists its courses on
sale with their next intake and, when the campaign shows it, the places left.
"""

from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Cohort

from .models import AdmissionCampaign, Order


def _enrolled(camp: AdmissionCampaign, course_id=None) -> int:
    """Learners who may study (paid, or first installment paid): same rule as the staff screens."""
    qs = Order.objects.filter(Q(campaign=camp) | Q(campaign_code__iexact=camp.code)).filter(
        learning_access=True, parent__isnull=True
    )
    return qs.filter(course_id=course_id).count() if course_id else qs.count()


def _card(camp: AdmissionCampaign, today) -> dict:
    courses = [p.course for p in camp.positions.all() if p.course.sellable]
    data = {
        "slug": camp.slug,
        "code": camp.code,
        "name": camp.name,
        "summary": camp.summary or (camp.description or "")[:240],
        "image": camp.image or next((c.thumbnail for c in courses if c.thumbnail), ""),
        "start_date": camp.start_date,
        "deadline": camp.deadline,
        "days_left": (camp.deadline - today).days if camp.deadline else None,
        "location": camp.location,
        "is_featured": camp.is_featured,
        "has_scholarship": camp.scholarship_budget > 0,
        "courses": [{"slug": c.slug, "title": c.title} for c in courses],
    }
    if camp.show_quota and camp.target_headcount:
        data["places_left"] = max(camp.target_headcount - _enrolled(camp), 0)
        data["quota"] = camp.target_headcount
    return data


class PublicCampaignListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        today = timezone.localdate()
        camps = (
            AdmissionCampaign.objects.on_website(today)
            .prefetch_related("positions__course")
            .order_by("-is_featured", F("deadline").asc(nulls_last=True), "name")
        )
        return Response([_card(c, today) for c in camps])


class PublicCampaignDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        today = timezone.localdate()
        camp = get_object_or_404(
            AdmissionCampaign.objects.on_website(today).prefetch_related("positions__course"), slug=slug
        )
        AdmissionCampaign.objects.filter(pk=camp.pk).update(view_count=F("view_count") + 1)
        data = _card(camp, today)
        data["description"] = camp.description
        rows = []
        for pos in camp.positions.all():
            course = pos.course
            if not course.sellable:
                continue
            intake = (
                Cohort.objects.filter(course=course, status="opening")
                .order_by(F("start_date").asc(nulls_last=True))
                .first()
            )
            row = {
                "course_id": course.pk,
                "slug": course.slug,
                "title": course.title,
                "thumbnail": course.thumbnail,
                "price": intake.price(today) if intake else course.price,
                "original_price": course.original_price or course.price,
                "next_intake": {"name": intake.name, "start_date": intake.start_date} if intake else None,
                "job_title": pos.position_title,
                "income": pos.salary_range,
            }
            if camp.show_quota and pos.target_quota:
                row["quota"] = pos.target_quota
                row["places_left"] = max(pos.target_quota - _enrolled(camp, course.pk), 0)
            rows.append(row)
        data["courses"] = rows
        return Response(data)
