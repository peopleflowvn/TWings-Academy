"""purge_courses: demo / test courses go with what only existed for them; the real catalogue stays."""

from io import StringIO

import pytest
from django.core.management import CommandError, call_command

from apps.catalog.models import Cohort, Course, Instructor, Partner
from apps.cms.models import HeroBanner
from apps.crm.models import Learner, Order
from apps.payments.models import Payment

pytestmark = pytest.mark.django_db


def _run(*args):
    out = StringIO()
    call_command("purge_courses", *args, stdout=out)
    return out.getvalue()


def _demo(course):
    shared = Instructor.objects.create(name="GV thật")
    course.instructors.add(shared)
    google = Partner.objects.create(id="google", name="Google")
    demo = Course.objects.create(slug="demo-google", title="Demo Google", partner=google)
    demo.instructors.add(shared, Instructor.objects.create(name="Google Team"))
    k9 = Cohort.objects.create(course=demo, name="K9 demo", status="in_progress")
    tester = Learner.objects.create(full_name="Học viên thử")
    lead = Order.objects.create(customer_name="Học viên thử", learner=tester, course=demo, cohort=k9)
    banner = HeroBanner.objects.create(title="Banner Chương Trình Mới 2026")
    return demo, shared, lead, banner


def test_the_preview_deletes_nothing_and_apply_deletes_only_the_demo(course):
    demo, shared, lead, banner = _demo(course)
    real_class = Cohort.objects.create(course=course, name="K10", status="opening")

    out = _run("--course", "demo-google", "--banner", str(banner.pk))
    assert "PREVIEW" in out and "demo-google" in out and lead.order_code in out
    assert Course.objects.filter(slug="demo-google").exists()
    assert HeroBanner.objects.filter(pk=banner.pk).exists()

    _run("--course", "demo-google", "--banner", str(banner.pk), "--apply")
    assert not Course.objects.filter(slug="demo-google").exists()
    assert not Cohort.objects.filter(name="K9 demo").exists()
    assert not Order.objects.filter(pk=lead.pk).exists()
    assert not Learner.objects.filter(full_name="Học viên thử").exists()
    assert not Partner.objects.filter(pk="google").exists()
    assert not Instructor.objects.filter(name="Google Team").exists()
    assert not HeroBanner.objects.filter(pk=banner.pk).exists()
    # The real course keeps its class and the teacher it shared with the demo.
    assert Course.objects.filter(pk=course.pk).exists() and Cohort.objects.filter(pk=real_class.pk).exists()
    assert list(course.instructors.all()) == [shared]


def test_orders_with_money_are_deleted_only_on_purpose(course):
    demo, _, lead, _ = _demo(course)
    Payment.objects.create(order=lead, amount=1_000, source="manual")
    with pytest.raises(CommandError, match="--with-payments"):
        _run("--course", "demo-google", "--apply")
    assert Course.objects.filter(pk=demo.pk).exists()

    _run("--course", "demo-google", "--apply", "--with-payments")
    assert not Course.objects.filter(pk=demo.pk).exists() and not Payment.objects.exists()


def test_unknown_courses_are_refused(course):
    with pytest.raises(CommandError, match="Unknown course"):
        _run("--course", "khong-co", "--apply")
    assert Course.objects.filter(pk=course.pk).exists()
