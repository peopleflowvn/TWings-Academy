"""
A class's link on the public site. One class = one admission campaign, shown on its course: the card of the
class (homepage "Đang tuyển sinh", catalogue) opens the course page with the class chosen
(/khoa-hoc/<course>?lop=<slug>), where its details come with the course (PublicCourseSerializer
upcoming_cohorts). Links shared before (/tuyen-sinh/<slug>) are sent there too.
"""

from django.db.models import F
from django.http import Http404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Cohort


def class_course(slug: str) -> Cohort | None:
    """The class behind a link: a public class of a course on sale (one taken off still opens its course)."""
    return (
        Cohort.objects.public().filter(slug=slug, course__status="published").select_related("course").first()
    )


class PublicClassView(APIView):
    """Where a class link goes. `?view=1` (the course page opened on the class) counts a view of the class."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        c = class_course(slug)
        if c is None:
            raise Http404
        listed = Cohort.objects.on_website().filter(pk=c.pk).exists()
        if listed and request.query_params.get("view") == "1":
            Cohort.objects.filter(pk=c.pk).update(view_count=F("view_count") + 1)
        return Response({"slug": c.slug, "course_slug": c.course.slug, "listed": listed})
