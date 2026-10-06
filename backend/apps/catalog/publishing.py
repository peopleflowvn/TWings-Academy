"""
Course publishing workflow (first step of the learner journey: authoring and pricing).

  draft --submit--> review --publish--> published --unpublish--> archived
    ^                 |                     (price changes on a live course need courses.pricing)
    +----return-------+

`readiness()` is the checklist shown in /app; required items must pass before submitting or publishing.
Every transition and every price change is written to the audit log (course history in /app).
"""

import re
from html import unescape

from django.core import signing
from django.utils import timezone
from django.utils.html import strip_tags

PREVIEW_SALT = "course-preview"
PREVIEW_MAX_AGE = 7 * 24 * 3600
PRICE_FIELDS = (
    "price",
    "original_price",
    "installment_count",
    "installment_interval_days",
    "is_free_enrollment_available",
)


class WorkflowError(Exception):
    pass


def _text(value) -> str:
    return re.sub(r"\s+", " ", unescape(strip_tags(str(value or "")))).strip()


def _lessons(course) -> int:
    return sum(len(m.get("lessons", [])) for m in course.syllabus or [] if isinstance(m, dict))


def readiness(course, *, moodle_template: bool | None = None) -> list[dict]:
    """Checklist items: key, label, required, ok, hint."""
    from django.db.models import Q

    today = timezone.localdate()
    upcoming = course.cohorts.filter(status__in=("opening", "upcoming")).filter(
        Q(start_date__isnull=True) | Q(start_date__gte=today)
    )
    needs_intake = course.delivery_format in ("offline", "hybrid")
    description = _text(course.description or course.overview)
    items = [
        ("title", "Tên khóa học rõ ràng (≥ 10 ký tự)", True, len(course.title.strip()) >= 10, ""),
        ("subtitle", "Mô tả ngắn (dòng dưới tên khóa)", True, bool(course.subtitle.strip()), ""),
        (
            "description",
            "Giới thiệu khóa học (≥ 200 ký tự)",
            True,
            len(description) >= 200,
            f"Hiện có {len(description)} ký tự",
        ),
        ("thumbnail", "Ảnh đại diện", True, bool(course.thumbnail), ""),
        ("category", "Danh mục và trình độ", True, bool(course.category and course.level), ""),
        (
            "instructors",
            "Ít nhất 1 giảng viên",
            True,
            course.instructors.exists(),
            "Gán ở tab Giảng viên (danh sách từ trang Giảng viên)",
        ),
        (
            "syllabus",
            "Đề cương ≥ 3 bài",
            True,
            _lessons(course) >= 3,
            "Soạn ở tab Đề cương hoặc lấy từ khóa mẫu Moodle",
        ),
        (
            "price",
            "Học phí (hoặc đánh dấu miễn phí)",
            True,
            course.price > 0 or course.is_free_enrollment_available,
            "",
        ),
        (
            "intake",
            "Có đợt khai giảng đang tuyển" if needs_intake else "Đợt khai giảng (nếu học theo lớp)",
            needs_intake,
            upcoming.exists(),
            "Khóa học trực tiếp / kết hợp cần ít nhất 1 đợt sắp mở",
        ),
        ("objectives", "≥ 3 mục tiêu đầu ra", False, len(course.learning_objectives or []) >= 3, ""),
        (
            "original_price",
            "Giá niêm yết ≥ học phí",
            False,
            not course.original_price or course.original_price >= course.price,
            "",
        ),
        (
            "guarantees",
            "Cam kết / quyền lợi của khóa",
            False,
            bool(course.guarantees),
            "Chỉ ghi điều có văn bản",
        ),
        ("video", "Video học thử", False, bool(course.youtube_video_id), ""),
    ]
    if moodle_template is not None:
        items.append(
            (
                "moodle",
                "Khóa mẫu trên Moodle",
                False,
                moodle_template,
                "Nội dung học, bài kiểm tra, điều kiện hoàn thành soạn trên Moodle",
            )
        )
    return [
        {"key": k, "label": label, "required": req, "ok": ok, "hint": hint}
        for k, label, req, ok, hint in items
    ]


def missing_required(course) -> list[str]:
    return [item["label"] for item in readiness(course) if item["required"] and not item["ok"]]


def transition(request, course, action: str, note: str = "") -> None:
    from apps.core.models import audit

    allowed = {
        "submit": ({"draft"}, "review"),
        "publish": ({"draft", "review", "archived"}, "published"),
        "return": ({"review"}, "draft"),
        "unpublish": ({"published"}, "archived"),
    }
    sources, target = allowed[action]
    if course.status not in sources:
        raise WorkflowError(
            f"Không thể thực hiện khi khóa đang ở trạng thái “{course.get_status_display()}”."
        )
    if action in ("submit", "publish"):
        missing = missing_required(course)
        if missing:
            raise WorkflowError("Chưa đủ điều kiện: " + "; ".join(missing))
    previous = course.status
    course.status = target
    fields = ["status", "updated_at"]
    if action == "return":
        course.review_note = note
        fields.append("review_note")
    if action == "publish":
        course.published_at = timezone.now()
        course.review_note = ""
        fields += ["published_at", "review_note"]
    course.save(update_fields=fields)
    audit(
        request,
        f"course.{action}",
        course,
        **{
            "from": previous,
            "to": target,
            "note": note,
            "price": course.price,
            "original_price": course.original_price,
            "installments": course.installment_count,
        },
    )


def preview_token(course) -> str:
    return signing.dumps({"c": course.pk}, salt=PREVIEW_SALT)


def course_from_preview(token: str):
    from .models import Course

    try:
        data = signing.loads(token, salt=PREVIEW_SALT, max_age=PREVIEW_MAX_AGE)
    except signing.BadSignature:
        return None
    return Course.objects.filter(pk=data.get("c")).first()
