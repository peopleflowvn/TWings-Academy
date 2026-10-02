from django.db.models import Count, Q
from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny

from apps.accounts.permissions import ActionPermission

from .models import Cohort, Coupon, Course, Instructor, Partner
from .serializers import (
    CohortSerializer,
    CouponSerializer,
    CourseSerializer,
    InstructorSerializer,
    PartnerSerializer,
    PublicCourseSerializer,
    PublicInstructorSerializer,
)

READ = ["list", "retrieve"]


def perm_map(read, write, delete=None):
    mapping = dict.fromkeys(READ, read)
    mapping.update(dict.fromkeys(["create", "update", "partial_update"], write))
    mapping["destroy"] = delete or write
    return mapping


# ---------------------------------------------------------------- public (read-only, anonymous)
class PublicCourseViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicCourseSerializer
    lookup_field = "slug"
    filterset_fields = ["category", "badge_section", "type", "delivery_format"]
    search_fields = ["title", "subtitle", "category", "skills"]
    pagination_class = None

    def get_queryset(self):
        return (
            Course.objects.filter(is_published=True).select_related("partner").prefetch_related("instructors")
        )


class PublicInstructorViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicInstructorSerializer
    pagination_class = None
    queryset = Instructor.objects.exclude(status="on_leave")


class PublicPartnerViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PartnerSerializer
    pagination_class = None
    queryset = Partner.objects.filter(is_active=True)


# ---------------------------------------------------------------- staff
class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(
        ["courses.view"], ["courses.edit_info", "courses.curriculum"], ["courses.delete"]
    )
    search_fields = ["title", "slug", "category"]
    filterset_fields = ["category", "is_published"]
    queryset = Course.objects.select_related("partner").prefetch_related("instructors")


class InstructorViewSet(viewsets.ModelViewSet):
    serializer_class = InstructorSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(["courses.view"], ["courses.instructors"])
    search_fields = ["name", "title", "organization"]
    queryset = Instructor.objects.all()


class PartnerViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(["homepage.partners", "courses.view"], ["homepage.partners"])
    queryset = Partner.objects.all()


class CohortViewSet(viewsets.ModelViewSet):
    serializer_class = CohortSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(["courses.view", "crm.view_leads"], ["courses.edit_info"])
    filterset_fields = ["course", "status"]

    def get_queryset(self):
        return Cohort.objects.select_related("course", "lead_instructor", "next_cohort").annotate(
            enrolled_count=Count("orders", filter=Q(orders__status="paid"))
        )


class CouponViewSet(viewsets.ModelViewSet):
    serializer_class = CouponSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(["finance.transactions", "crm.view_leads"], ["finance.confirm_manual"])
    queryset = Coupon.objects.all()
