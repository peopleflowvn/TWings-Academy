from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ActionPermission, require_perms
from apps.accounts.rbac import has_perm_code
from apps.core.models import AuditLog, audit

from .models import Cohort, Coupon, Course, CourseReview, Instructor, Partner, Program, ProgramCourse
from .serializers import (
    CohortSerializer,
    CouponSerializer,
    CourseReviewSerializer,
    CourseSerializer,
    InstructorSerializer,
    PartnerSerializer,
    ProgramSerializer,
    PublicCourseSerializer,
    PublicInstructorSerializer,
    PublicProgramSerializer,
)

PROGRAM_COURSES = Prefetch("program_courses", queryset=ProgramCourse.objects.select_related("course"))

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

    def retrieve(self, request, *args, **kwargs):
        """Unpublished courses can be previewed with a signed link from /app (never indexed)."""
        from .publishing import course_from_preview

        token = request.query_params.get("preview")
        if token:
            course = course_from_preview(token)
            if course is None or course.slug != kwargs.get("slug"):
                return Response({"detail": "Link xem trước không hợp lệ hoặc đã hết hạn."}, status=404)
            response = Response(self.get_serializer(course).data)
            response["X-Robots-Tag"] = "noindex"
            response["Cache-Control"] = "no-store"
            return response
        return super().retrieve(request, *args, **kwargs)


class PublicProgramViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicProgramSerializer
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        return Program.objects.filter(is_published=True).prefetch_related(PROGRAM_COURSES)


class PublicInstructorViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicInstructorSerializer
    pagination_class = None
    # Only people who teach a course on sale: no placeholder or foreign-brand "instructors".
    queryset = Instructor.objects.exclude(status="on_leave").filter(courses__is_published=True).distinct()


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
    permission_map = {
        **perm_map(["courses.view"], ["courses.edit_info", "courses.curriculum"], ["courses.delete"]),
        "workflow": ["courses.edit_info", "courses.curriculum", "courses.publish"],
        "readiness": ["courses.view"],
        "history": ["courses.view"],
        "preview_link": ["courses.view"],
        "moodle_template": ["courses.curriculum", "lms.manage"],
    }
    search_fields = ["title", "slug", "category"]
    filterset_fields = ["category", "is_published", "status"]
    queryset = Course.objects.select_related("partner").prefetch_related("instructors")

    # ---- audit trail: what changed (prices with old -> new values)
    def perform_create(self, serializer):
        course = serializer.save()
        audit(self.request, "course.create", course, title=course.title, price=course.price)

    def perform_update(self, serializer):
        from .publishing import PRICE_FIELDS

        instance = serializer.instance
        before = {
            f: getattr(instance, f)
            for f in serializer.validated_data
            if f != "instructors" and hasattr(instance, f)
        }
        course = serializer.save()
        changed = {f: (old, getattr(course, f)) for f, old in before.items() if old != getattr(course, f)}
        prices = {f: {"from": a, "to": b} for f, (a, b) in changed.items() if f in PRICE_FIELDS}
        if prices:
            audit(self.request, "course.price_change", course, **prices)
        other = sorted(f for f in changed if f not in PRICE_FIELDS)
        if other:
            audit(self.request, "course.update", course, fields=other)

    def perform_destroy(self, instance):
        if instance.orders.exists():
            raise serializers.ValidationError(
                {"detail": "Khóa học đã có đơn hàng / học viên: không xóa được, hãy chuyển sang Ngừng bán."}
            )
        audit(self.request, "course.delete", instance, title=instance.title)
        instance.delete()

    # ---- publishing workflow (apps.catalog.publishing)
    @action(detail=True, methods=["post"])
    def workflow(self, request, pk=None):
        from .publishing import WorkflowError, transition

        course = self.get_object()
        step = str(request.data.get("action", ""))
        if step not in ("submit", "publish", "return", "unpublish"):
            raise serializers.ValidationError({"action": "Thao tác không hợp lệ."})
        needs = ["courses.publish"]
        if step == "submit":
            needs += ["courses.edit_info", "courses.curriculum"]
        if not any(has_perm_code(request.user, c) for c in needs):
            raise PermissionDenied("Cần quyền Duyệt & xuất bản khóa học.")
        try:
            transition(request, course, step, str(request.data.get("note", ""))[:2000])
        except WorkflowError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["get"])
    def readiness(self, request, pk=None):
        from apps.lms import moodle
        from apps.lms.services import _find_course

        from .publishing import readiness

        course = self.get_object()
        template = None
        if moodle.is_configured():
            try:
                found = _find_course("idnumber", course.id) or _find_course("shortname", course.slug)
                template = found is not None
            except moodle.MoodleError:
                template = None
        return Response(readiness(course, moodle_template=template))

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        course = self.get_object()
        rows = AuditLog.objects.filter(object_type="catalog.Course", object_id=str(course.pk)).order_by(
            "-at"
        )[:100]
        return Response(
            [{"at": r.at, "actor": r.actor_label, "action": r.action, "details": r.details} for r in rows]
        )

    @action(detail=True, methods=["post"], url_path="preview-link")
    def preview_link(self, request, pk=None):
        from apps.cms.seo import base_url

        from .publishing import preview_token

        course = self.get_object()
        return Response({"url": f"{base_url()}/khoa-hoc/{course.slug}?preview={preview_token(course)}"})

    @action(detail=True, methods=["post"], url_path="moodle-template")
    def moodle_template(self, request, pk=None):
        """Create (or find) the course's template on Moodle, where the learning content is built."""
        from apps.lms import moodle
        from apps.lms.overview import links
        from apps.lms.services import ensure_course

        course = self.get_object()
        if not moodle.is_configured():
            return Response({"detail": "LMS chưa được cấu hình."}, status=400)
        try:
            moodle_id = ensure_course(course)
        except moodle.MoodleError as exc:
            return Response({"detail": f"Moodle báo lỗi: {exc}"}, status=502)
        audit(request, "course.moodle_template", course, moodle_course_id=moodle_id)
        return Response({"moodleCourseId": moodle_id, "links": links(course_id=moodle_id)})


class ProgramViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(["courses.view"], ["courses.programs"])
    search_fields = ["title", "slug"]
    pagination_class = None

    def get_queryset(self):
        return Program.objects.prefetch_related(PROGRAM_COURSES).annotate(
            orders_count=Count("orders", filter=Q(orders__parent__isnull=True, orders__learning_access=True))
        )


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
            enrolled_count=Count("orders", filter=Q(orders__learning_access=True))
        )


class CouponViewSet(viewsets.ModelViewSet):
    serializer_class = CouponSerializer
    permission_classes = [ActionPermission]
    permission_map = perm_map(["finance.transactions", "crm.view_leads"], ["finance.confirm_manual"])
    queryset = Coupon.objects.all()


# ---------------------------------------------------------------- intakes (journey step 2)
class IntakesOverviewView(APIView):
    """Intakes with seats, payments, early bird and schedule; campaign quotas vs enrolments."""

    permission_classes = [require_perms("courses.view", "crm.view_leads")]

    def get(self, request):
        from .intakes import overview

        return Response(overview())


class SessionInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    location = serializers.CharField(max_length=300, required=False, allow_blank=True)
    online = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if attrs["ends_at"] <= attrs["starts_at"]:
            raise serializers.ValidationError("Giờ kết thúc phải sau giờ bắt đầu.")
        return attrs


class SessionsPayloadSerializer(serializers.Serializer):
    sessions = SessionInputSerializer(many=True)
    schedule_text = serializers.CharField(max_length=200, required=False, allow_blank=True)
    sync = serializers.BooleanField(default=True)


class CohortSessionsView(APIView):
    """GET the intake's class sessions; PUT replaces them (and pushes them to the Moodle calendar)."""

    def get_permissions(self):
        codes = ["courses.view", "crm.view_leads"] if self.request.method == "GET" else ["courses.edit_info"]
        return [require_perms(*codes)()]

    def get(self, request, pk):
        from .intakes import session_rows

        return Response(session_rows(get_object_or_404(Cohort, pk=pk)))

    def put(self, request, pk):
        from apps.lms import moodle

        from .intakes import ScheduleError, replace_sessions, session_rows, sync_sessions

        cohort = get_object_or_404(Cohort.objects.select_related("course"), pk=pk)
        ser = SessionsPayloadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if len(data["sessions"]) > 200:
            raise serializers.ValidationError({"sessions": "Tối đa 200 buổi."})
        try:
            replace_sessions(cohort, data["sessions"])
        except ScheduleError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc
        if "schedule_text" in data:
            cohort.schedule_text = data["schedule_text"]
            cohort.save(update_fields=["schedule_text", "updated_at"])
        sync = {"synced": 0}
        if data["sync"]:
            try:
                sync = sync_sessions(cohort)
            except moodle.MoodleError as exc:
                sync = {"synced": 0, "detail": f"Chưa đồng bộ được lịch sang Moodle: {exc}"}
        audit(request, "cohort.sessions", cohort, count=len(data["sessions"]), synced=sync.get("synced", 0))
        return Response({"sessions": session_rows(cohort), "sync": sync})


class CourseReviewViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Learner reviews to approve before they appear on the course page."""

    serializer_class = CourseReviewSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["courses.reviews", "courses.view"],
        "update": ["courses.reviews"],
        "partial_update": ["courses.reviews"],
    }
    filterset_fields = ["status", "course"]
    queryset = CourseReview.objects.select_related("course", "order")

    def perform_update(self, serializer):
        review = serializer.save()
        audit(self.request, "review.moderate", review, status=review.status)
