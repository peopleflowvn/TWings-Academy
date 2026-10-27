"""
Classes recruiting on the public site (/tuyen-sinh/<slug>), like job postings on a career site: only what
Cohort.objects.on_website() returns (switched on, taking registrations, not past the registration
deadline), featured first then the nearest deadline. One class = one admission campaign: its course, its
dates, its places left (the capacity minus the seats taken, holds included, as at checkout) and, for
train-to-hire classes, the job it leads to.
"""

from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.intakes import seats_taken
from apps.catalog.models import Cohort


def _card(c: Cohort, today) -> dict:
    course = c.course
    deadline = c.registration_deadline
    data = {
        "slug": c.slug,
        "code": c.code,
        "name": c.display_name,
        "summary": c.summary or (c.description or course.subtitle or "")[:240],
        "image": c.image or course.thumbnail,
        "start_date": c.start_date,
        "deadline": deadline,
        "days_left": (deadline - today).days if deadline else None,
        "location": c.location,
        "is_featured": c.is_featured,
        "has_scholarship": c.scholarship_budget > 0,
        "courses": [{"slug": course.slug, "title": course.title}] if course.sellable else [],
    }
    if c.show_quota and c.capacity:
        data["quota"] = c.capacity
        data["places_left"] = max(c.capacity - seats_taken(c), 0)
    return data


def _listed(today):
    return Cohort.objects.on_website(today).select_related("course").filter(course__status="published")


class PublicCampaignListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        today = timezone.localdate()
        classes = _listed(today).order_by(
            "-is_featured",
            F("registration_deadline").asc(nulls_last=True),
            F("start_date").asc(nulls_last=True),
        )
        return Response([_card(c, today) for c in classes])


class PublicCampaignDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        today = timezone.localdate()
        c = get_object_or_404(_listed(today), slug=slug)
        Cohort.objects.filter(pk=c.pk).update(view_count=F("view_count") + 1)
        data = _card(c, today)
        data["description"] = c.description
        course = c.course
        row = {
            "course_id": course.pk,
            "slug": course.slug,
            "title": course.title,
            "thumbnail": course.thumbnail,
            "price": c.price(today),
            "original_price": course.list_price(today),
            "next_intake": {"name": c.name, "start_date": c.start_date},
            "schedule": c.schedule_text,
            "job_title": c.job_title,
            "income": c.salary_range,
        }
        if c.show_quota and c.capacity:
            row["quota"] = c.capacity
            row["places_left"] = data["places_left"]
        data["courses"] = [row]
        return Response(data)
