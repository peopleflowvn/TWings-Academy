"""
Public syllabus from Moodle: the template course's sections and activity names become the course's
syllabus on the website (titles and types only, never the learning content itself), and Moodle's course
summary fills an empty description. Staff trigger it per course from /app.
"""

import re
from html import unescape

from django.utils.html import strip_tags

from . import moodle
from .services import _find_course

# Moodle activity -> TWings lesson type (None: not shown publicly).
LESSON_TYPES = {
    "quiz": "quiz",
    "assign": "project",
    "workshop": "project",
    "page": "reading",
    "book": "reading",
    "lesson": "reading",
    "url": "reading",
    "forum": None,
    "resource": "pdf_material",
    "folder": "pdf_material",
    "scorm": "video",
    "h5pactivity": "video",
    "glossary": "flashcard",
    "label": None,
    "customcert": None,
    "attendance": None,
    "feedback": None,
    "choice": None,
}


class OutlineError(Exception):
    pass


def _plain(html: str) -> str:
    return re.sub(r"\s+", " ", unescape(strip_tags(html or ""))).strip()


def template_course(course) -> dict:
    for field, value in (("idnumber", course.id), ("shortname", course.slug)):
        found = _find_course(field, value)
        if found:
            return found
    raise OutlineError("Khóa học chưa có khóa mẫu trên Moodle (idnumber = mã khóa hoặc shortname = slug).")


def build_syllabus(contents: list[dict]) -> list[dict]:
    modules = []
    for number, section in enumerate(contents):
        if section.get("visible", 1) == 0 or section.get("uservisible") is False:
            continue
        lessons = []
        for mod in section.get("modules", []):
            kind = LESSON_TYPES.get(mod.get("modname"), "reading")
            if kind is None or mod.get("visible", 1) == 0 or mod.get("uservisible") is False:
                continue
            lessons.append(
                {
                    "id": f"moodle-{mod['id']}",
                    "title": _plain(mod.get("name", ""))[:200] or "Hoạt động",
                    "type": kind,
                    "duration": "",
                    "is_free_preview": False,
                }
            )
        if lessons:
            name = _plain(section.get("name", "")) or ("Giới thiệu" if number == 0 else f"Chương {number}")
            modules.append({"id": f"moodle-s{section['id']}", "title": name[:200], "lessons": lessons})
    return modules


def import_outline(course) -> dict:
    """Replace the course's public syllabus with the Moodle outline, keeping free-preview lessons."""
    if not moodle.is_configured():
        raise OutlineError("LMS chưa được cấu hình.")
    found = template_course(course)
    modules = build_syllabus(moodle.call("core_course_get_contents", courseid=found["id"]))
    if not modules:
        raise OutlineError("Khóa mẫu trên Moodle chưa có hoạt động nào hiển thị.")
    previews = [
        lesson
        for module in course.syllabus or []
        if isinstance(module, dict)
        for lesson in module.get("lessons", [])
        if isinstance(lesson, dict) and lesson.get("is_free_preview")
    ]
    if previews:
        modules.insert(0, {"id": "preview", "title": "Học thử miễn phí", "lessons": previews})
    course.syllabus = modules
    course.lessons_count = sum(len(m["lessons"]) for m in modules)
    fields = ["syllabus", "lessons_count", "updated_at"]
    summary = _plain(found.get("summary", ""))
    if summary and not course.description:
        course.description = summary
        fields.append("description")
    course.save(update_fields=fields)
    return {
        "moodleCourseId": found["id"],
        "modules": len(modules),
        "lessons": course.lessons_count,
        "descriptionFilled": "description" in fields,
    }
