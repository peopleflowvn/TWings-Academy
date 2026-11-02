"""Courses typed in from the course sheets (docs/Thong tin khoa hoc*): manage.py import_courses."""

import pytest
from django.core.management import call_command

from apps.catalog.models import Cohort, Course, Instructor, Partner

pytestmark = pytest.mark.django_db


def test_preview_writes_nothing():
    call_command("import_courses")
    assert not Course.objects.exists() and not Instructor.objects.exists()


def test_import_creates_the_courses_once_and_publishes_what_is_ready():
    call_command("import_courses", "--apply")
    assert Course.objects.count() == 10 and not Course.objects.filter(status="published").exists()
    rb = Course.objects.get(slug="quan-he-khach-hang-ca-nhan-rb-dao-tao-thuc-chien-tai-msb")
    assert rb.partner == Partner.objects.get(name="MSB") and rb.instructors.count() == 4
    assert rb.lessons_count == sum(len(m["lessons"]) for m in rb.syllabus) and rb.delivery_format == "hybrid"
    assert Cohort.objects.filter(course=rb, name="Khóa 1", is_published=True).exists()

    Instructor.objects.filter(name="Vũ Thu Phương").update(avatar="https://x/a.jpg")
    call_command("import_courses", "--apply", "--publish")  # again: updated, not copied
    assert Course.objects.count() == 10 and Instructor.objects.count() == 5 and Cohort.objects.count() == 2
    assert Course.objects.filter(status="published").count() == 10  # every course passes the checklist
    assert Instructor.objects.get(name="Vũ Thu Phương").avatar == "https://x/a.jpg"  # staff's photo kept
