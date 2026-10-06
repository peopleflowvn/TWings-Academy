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

    class Meta:
        model = Course
        fields = "__all__"

    def validate_syllabus(self, value):
        return _validate_syllabus(value)


class PublicCourseSerializer(serializers.ModelSerializer):
    instructors = PublicInstructorSerializer(many=True, read_only=True)
    instructor = serializers.SerializerMethodField()
    partner = PartnerSerializer(read_only=True)
    syllabus = serializers.SerializerMethodField()
    chapters = serializers.SerializerMethodField()

    class Meta:
        model = Course
        exclude = ["is_published", "sort_order", "created_at", "updated_at"]

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
