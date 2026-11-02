"""
Create or update courses from a JSON file (instead of typing them in /app one by one): their training
partner, instructors, syllabus and, for courses taught in classes, a first class.

    manage.py import_courses                       # preview (file: apps/catalog/data/khoa_hoc_2026_11.json)
    manage.py import_courses [file] --apply        # write; new courses stay drafts (staff publish in /app)
    manage.py import_courses [file] --apply --publish   # write, and put on sale what passes the checklist

A course is matched by its slug (from its title), so running it again updates it rather than adding a
copy; a course already on sale stays on sale. Partners and instructors are matched by name. The preview
runs the same writes inside a transaction and rolls them back.
"""

import json
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.catalog.models import Cohort, Course, Instructor, Partner, unidecode_vi
from apps.catalog.publishing import missing_required

DEFAULT_FILE = Path(__file__).resolve().parents[2] / "data" / "khoa_hoc_2026_11.json"
COURSE_FIELDS = (
    "title",
    "subtitle",
    "description",
    "overview",
    "category",
    "level",
    "type",
    "badge_section",
    "delivery_format",
    "location_text",
    "career_role",
    "duration",
    "price",
    "installment_count",
    "thumbnail",
    "skills",
    "highlights",
    "objectives",
    "target_audience",
    "requirements",
    "guarantees",
    "syllabus",
)


class _Preview(Exception):
    pass


class Command(BaseCommand):
    help = "Create or update courses from a JSON file (preview unless --apply)."

    def add_arguments(self, parser):
        parser.add_argument("file", nargs="?", default=str(DEFAULT_FILE))
        parser.add_argument("--apply", action="store_true", help="write (default: preview, nothing changes)")
        parser.add_argument(
            "--publish", action="store_true", help="put on sale the courses passing the checklist"
        )

    def handle(self, *args, **opts):
        path = Path(opts["file"])
        if not path.exists():
            raise CommandError(f"Không thấy file {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        try:
            with transaction.atomic():
                self.load(data, publish=opts["publish"])
                if not opts["apply"]:
                    raise _Preview
        except _Preview:
            self.stdout.write(self.style.WARNING("Xem trước: chưa ghi gì (thêm --apply để ghi)."))
            return
        self.stdout.write(self.style.SUCCESS("Đã ghi."))

    def load(self, data: dict, *, publish: bool) -> None:
        partners = {}
        for p in data.get("partners", []):
            name = p["name"]
            obj = Partner.objects.filter(name__iexact=name).first() or Partner(name=name)
            for k, v in p.items():
                setattr(obj, k, v)
            obj.save()
            partners[name] = obj
            self.stdout.write(f"partner   {name}")

        instructors = {}
        for i in data.get("instructors", []):
            name = i["name"]
            obj = Instructor.objects.filter(name__iexact=name).first()
            if obj is None:
                obj = Instructor(name=name)
            for k, v in i.items():
                if v or not getattr(obj, k, None):  # never blank out what staff filled in (e.g. the photo)
                    setattr(obj, k, v)
            obj.save()
            instructors[name] = obj
            self.stdout.write(f"giảng viên {name}")

        for c in data["courses"]:
            slug = c.get("slug") or slugify(unidecode_vi(c["title"]))[:80]
            course = Course.objects.filter(slug=slug).first()
            created = course is None
            if created:
                course = Course(slug=slug)
            for k in COURSE_FIELDS:
                if k in c:
                    setattr(course, k, c[k])
            course.lessons_count = sum(len(m.get("lessons", [])) for m in course.syllabus or [])
            course.partner = partners.get(c.get("partner") or "") or (
                Partner.objects.filter(name__iexact=c["partner"]).first() if c.get("partner") else None
            )
            course.save()
            names = c.get("instructors", [])
            course.instructors.set(
                [instructors.get(n) or Instructor.objects.get(name__iexact=n) for n in names]
            )

            klass = c.get("class")
            if klass:
                cohort = Cohort.objects.filter(course=course, name=klass["name"]).first() or Cohort(
                    course=course, name=klass["name"], status="opening", is_published=True
                )
                for k, v in klass.items():
                    if k in ("start_date", "registration_deadline") and v:
                        v = date.fromisoformat(v)
                    setattr(cohort, k, v)
                cohort.save()

            state = course.get_status_display()
            missing = missing_required(course)
            if publish and course.status != "published":
                if missing:
                    state += " (chưa mở bán được)"
                else:
                    course.status, course.published_at = "published", timezone.now()
                    course.save(update_fields=["status", "published_at", "updated_at"])
                    state = "Đang bán"
            self.stdout.write(
                f"{'tạo mới ' if created else 'cập nhật'} {slug} | {course.title} | {course.price:,}đ | "
                f"{course.lessons_count} bài | {state}"
                + (f" | lớp {klass['name']}" if klass else "")
                + (f" | thiếu: {'; '.join(missing)}" if missing else "")
            )
