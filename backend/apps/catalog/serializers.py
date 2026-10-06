from rest_framework import serializers

from .models import Cohort, Coupon, Course, Instructor, Partner, Program, ProgramCourse

LESSON_TYPES = {"video", "reading", "quiz", "project", "audio_listening", "flashcard", "pdf_material"}
# JSON keys are stored snake_case (the camelCase parser converts nested keys too) and camelised on output.
PUBLIC_LESSON_FIELDS = {"id", "title", "duration", "type", "is_free_preview", "video_duration_seconds"}


class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        exclude = ["created_at", "updated_at"]


class PublicInstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instructor
        exclude = ["email", "phone", "created_at", "updated_at"]


class InstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instructor
        exclude = ["created_at", "updated_at"]


def _validate_syllabus(value):
    if not isinstance(value, list):
        raise serializers.ValidationError("Syllabus must be a list of modules.")
    for module in value:
        if not isinstance(module, dict) or not isinstance(module.get("lessons", []), list):
            raise serializers.ValidationError("Each module needs a 'lessons' list.")
        for lesson in module.get("lessons", []):
            if not isinstance(lesson, dict) or lesson.get("type") not in LESSON_TYPES:
                raise serializers.ValidationError(f"Invalid lesson type: {lesson!r:.80}")
    return value


def public_syllabus(syllabus):
    """Strip paid content (video URLs, readings, quiz answers) from lessons that are not free previews."""
    result = []
    for module in syllabus or []:
        lessons = []
        for lesson in module.get("lessons", []):
            if lesson.get("is_free_preview"):
                # Preview lessons are fully visible, except quiz answers.
                safe = {k: v for k, v in lesson.items() if k != "quiz_questions"}
            else:
                safe = {k: v for k, v in lesson.items() if k in PUBLIC_LESSON_FIELDS}
            lessons.append(safe)
        result.append({**{k: v for k, v in module.items() if k != "lessons"}, "lessons": lessons})
    return result


class CourseSerializer(serializers.ModelSerializer):
    """Staff serializer: full content, instructors written by id."""

    instructor_ids = serializers.PrimaryKeyRelatedField(
        source="instructors", many=True, queryset=Instructor.objects.all(), required=False
    )
    partner_id = serializers.PrimaryKeyRelatedField(
        source="partner", queryset=Partner.objects.all(), required=False, allow_null=True
    )
    instructors = InstructorSerializer(many=True, read_only=True)
    partner = PartnerSerializer(read_only=True)
    readiness = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = "__all__"
        # Changed only through the publishing workflow (apps.catalog.publishing).
        read_only_fields = ["status", "is_published", "published_at", "review_note"]

    def get_readiness(self, obj):
        from .publishing import readiness

        return readiness(obj)

    def validate_syllabus(self, value):
        return _validate_syllabus(value)

    def validate(self, attrs):
        """A course on sale keeps the price it was approved with unless the user may set prices."""
        from apps.accounts.rbac import has_perm_code

        from .publishing import PRICE_FIELDS

        course, request = self.instance, self.context.get("request")
        if course is not None and course.status == "published" and request is not None:
            changed = [f for f in PRICE_FIELDS if f in attrs and attrs[f] != getattr(course, f)]
            if changed and not has_perm_code(request.user, "courses.pricing"):
                raise serializers.ValidationError(
                    {"price": "Khóa đang bán: đổi học phí / trả góp cần quyền Định giá (courses.pricing)."}
                )
        return attrs


def upcoming_cohorts(course) -> list[dict]:
    """Intakes a visitor can still join: opening or upcoming, not started yet (or no date set)."""
    from django.db.models import Count, Q
    from django.utils import timezone

    today = timezone.localdate()
    rows = (
        course.cohorts.filter(status__in=("opening", "upcoming"))
        .filter(Q(start_date__isnull=True) | Q(start_date__gte=today))
        .annotate(taken=Count("orders", filter=Q(orders__learning_access=True)))
        .order_by("start_date")[:4]
    )
    return [
        {
            "name": c.name,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "registration_deadline": c.registration_deadline.isoformat() if c.registration_deadline else None,
            "location": c.location,
            "status": c.status,
            "seats_left": max(c.capacity - c.taken, 0),
            "schedule_text": c.schedule_text,
            "price": c.price(today),
            "early_bird_deadline": c.early_bird_deadline.isoformat() if c.early_bird_active(today) else None,
        }
        for c in rows.select_related("course")
    ]


class PublicCourseSerializer(serializers.ModelSerializer):
    instructors = PublicInstructorSerializer(many=True, read_only=True)
    upcoming_cohorts = serializers.SerializerMethodField()
    instructor = serializers.SerializerMethodField()
    partner = PartnerSerializer(read_only=True)
    syllabus = serializers.SerializerMethodField()
    chapters = serializers.SerializerMethodField()

    class Meta:
        model = Course
        exclude = ["is_published", "sort_order", "created_at", "updated_at"]

    def get_upcoming_cohorts(self, obj):
        return upcoming_cohorts(obj)

    def get_instructor(self, obj):
        first = next(iter(obj.instructors.all()), None)
        return PublicInstructorSerializer(first).data if first else None

    def get_syllabus(self, obj):
        return public_syllabus(obj.syllabus)

    def get_chapters(self, obj):
        return public_syllabus(obj.syllabus)


class CohortSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    lead_instructor_name = serializers.CharField(source="lead_instructor.name", read_only=True, default="")
    next_cohort_name = serializers.CharField(source="next_cohort.name", read_only=True, default="")
    enrolled_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Cohort
        fields = "__all__"
        read_only_fields = ["calendar_cleanup"]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        exclude = ["created_at", "updated_at"]
        read_only_fields = ["usage_count"]


class ProgramCourseSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            "id",
            "slug",
            "title",
            "subtitle",
            "thumbnail",
            "duration",
            "level",
            "price",
            "delivery_format",
        ]


class _ProgramBase(serializers.ModelSerializer):
    courses = serializers.SerializerMethodField()
    courses_total_price = serializers.SerializerMethodField()

    def _ordered(self, obj):
        return [link.course for link in obj.program_courses.all()]

    def get_courses(self, obj):
        return ProgramCourseSummarySerializer(self._ordered(obj), many=True).data

    def get_courses_total_price(self, obj):
        return sum(c.price for c in self._ordered(obj))


class ProgramSerializer(_ProgramBase):
    """Staff: courses written as an ordered list of ids."""

    course_ids = serializers.ListField(
        child=serializers.CharField(max_length=64), write_only=True, required=False
    )
    orders_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Program
        exclude = ["created_at", "updated_at"]

    def validate(self, attrs):
        """Same rules as courses: publishing needs courses.publish, re-pricing a live one courses.pricing."""
        from apps.accounts.rbac import has_perm_code

        request, program = self.context.get("request"), self.instance
        if request is None:
            return attrs
        publishing = "is_published" in attrs and attrs["is_published"] != (
            program.is_published if program else False
        )
        if publishing and not has_perm_code(request.user, "courses.publish"):
            raise serializers.ValidationError(
                {"is_published": "Mở / ngừng bán chương trình cần quyền Duyệt & xuất bản."}
            )
        if program is not None and program.is_published:
            fields = ("price", "original_price", "installment_count", "installment_interval_days")
            if any(f in attrs and attrs[f] != getattr(program, f) for f in fields) and not has_perm_code(
                request.user, "courses.pricing"
            ):
                raise serializers.ValidationError(
                    {"price": "Chương trình đang bán: đổi giá cần quyền Định giá."}
                )
        return attrs

    def validate_course_ids(self, value):
        unique = list(dict.fromkeys(value))
        found = {c.pk: c for c in Course.objects.filter(pk__in=unique)}
        missing = [pk for pk in unique if pk not in found]
        if missing:
            raise serializers.ValidationError(f"Khóa học không tồn tại: {', '.join(missing)}")
        return [found[pk] for pk in unique]

    def _set_courses(self, program, courses):
        if courses is None:
            return
        program.program_courses.all().delete()
        ProgramCourse.objects.bulk_create(
            ProgramCourse(program=program, course=c, position=i) for i, c in enumerate(courses)
        )

    def create(self, validated_data):
        courses = validated_data.pop("course_ids", None)
        program = super().create(validated_data)
        self._set_courses(program, courses)
        return program

    def update(self, instance, validated_data):
        courses = validated_data.pop("course_ids", None)
        program = super().update(instance, validated_data)
        self._set_courses(program, courses)
        return program


class PublicProgramSerializer(_ProgramBase):
    class Meta:
        model = Program
        exclude = ["is_published", "sort_order", "created_at", "updated_at"]

    def get_courses(self, obj):
        return ProgramCourseSummarySerializer(
            [c for c in self._ordered(obj) if c.is_published], many=True
        ).data
