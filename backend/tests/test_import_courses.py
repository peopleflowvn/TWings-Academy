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
    assert (rb.price, rb.list_price(rb.sale_ends_on)) == (7_599_000, 9_490_000)  # struck price until the end
    assert Cohort.objects.filter(course=rb, name="Khóa 9", code="RB-K9", is_published=True).exists()
    # Every course has its instructors and a class recruiting (its admission campaign).
    assert not Course.objects.filter(instructors__isnull=True).exists()
    assert Cohort.objects.count() == 10 and Cohort.objects.exclude(code="").count() == 10

    Instructor.objects.filter(name="Vũ Thu Phương").update(avatar="https://x/a.jpg")
    call_command("import_courses", "--apply", "--publish")  # again: updated, not copied
    assert Course.objects.count() == 10 and Instructor.objects.count() == 4 and Cohort.objects.count() == 10
    assert Course.objects.filter(status="published").count() == 10  # every course passes the checklist
    assert Instructor.objects.get(name="Vũ Thu Phương").avatar == "https://x/a.jpg"  # staff's photo kept
    assert Cohort.objects.on_website().count() == 10


def test_the_stand_in_instructor_of_the_first_import_is_replaced():
    call_command("import_courses", "--apply")
    stand_in = Instructor.objects.create(name="Đội ngũ chuyên gia TWings Academy", title="x")
    agile = Course.objects.get(slug="khai-phong-suc-manh-tu-duy-agile")
    agile.instructors.add(stand_in)  # as the first import left it
    call_command("import_courses", "--apply")
    assert not Instructor.objects.filter(pk=stand_in.pk).exists()
    assert [i.name for i in agile.instructors.all()] == ["Nguyễn Kim Chi"]
