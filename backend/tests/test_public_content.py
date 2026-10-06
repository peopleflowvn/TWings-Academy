"""Audit fixes: demo catalog hidden, intakes and instructors on public pages, legal pages, Moodle outline."""

from datetime import timedelta
from importlib import import_module

import pytest
from django.apps import apps as django_apps
from django.utils import timezone

from apps.catalog.models import Cohort, Course, Instructor, Partner
from apps.cms.models import HeroBanner
from apps.core.models import SiteConfig
from apps.lms import moodle
from tests.conftest import Role

pytestmark = pytest.mark.django_db


def _migration(app, name):
    return import_module(f"apps.{app}.migrations.{name}")


def test_demo_catalog_is_hidden_not_deleted(course):
    google = Partner.objects.create(name="Google")
    msb = Partner.objects.create(name="MSB Ngân hàng TMCP Hàng Hải")
    foreign = Course.objects.create(slug="phan-tich-du-lieu-google", title="GDA", partner=google)
    draft = Course.objects.create(
        slug="khoa-hoc-moi-123", title="Khóa Học Nghiệp Vụ Mới 2026", reviews=[{"id": 1}]
    )
    edited = Course.objects.create(slug="khoa-hoc-moi-456", title="Đã soạn", description="Nội dung thật")
    _migration("catalog", "0003_hide_demo_catalog").hide_demo_catalog(django_apps, None)
    for c in (foreign, draft, edited, course):
        c.refresh_from_db()
    assert not foreign.is_published and not draft.is_published and draft.reviews == []
    assert edited.is_published and course.is_published  # real content stays
    assert not Partner.objects.get(pk=google.pk).is_active and Partner.objects.get(pk=msb.pk).is_active


def test_demo_banners_and_seo_placeholders_are_cleaned(settings):
    keep = HeroBanner.objects.create(title="Đột phá Sự nghiệp Ngân hàng Thực chiến")
    demo = HeroBanner.objects.create(title="Learn AI from the companies building it")
    _migration("cms", "0002_hide_demo_banners").hide_demo_banners(django_apps, None)
    assert HeroBanner.objects.get(pk=keep.pk).is_active and not HeroBanner.objects.get(pk=demo.pk).is_active

    SiteConfig.objects.create(
        key=SiteConfig.KEY_SITE_SEO,
        data={
            "google_analytics_id": "G-TWINGS2026",
            "facebook_pixel_id": "1098245582910",
            "canonical_domain": "https://twings.edu.vn",
            "robots_txt": "User-agent: *\nDisallow: /cms/",
            "site_name": "TWINGS",
        },
    )
    _migration("core", "0004_fix_seo_settings").fix_seo_settings(django_apps, None)
    data = SiteConfig.objects.get(key=SiteConfig.KEY_SITE_SEO).data
    assert data["google_analytics_id"] == "" and data["facebook_pixel_id"] == ""
    assert data["canonical_domain"] == settings.PUBLIC_SITE_URL and "/cms/" not in data["robots_txt"]
    assert data["site_name"] == "TWINGS"


def test_public_course_lists_upcoming_intakes_with_seats(api, course):
    today = timezone.localdate()
    soon = Cohort.objects.create(
        course=course, name="Khóa 12", status="opening", start_date=today + timedelta(days=10), capacity=20
    )
    Cohort.objects.create(
        course=course, name="Khóa 9", status="completed", start_date=today - timedelta(days=90)
    )
    Cohort.objects.create(
        course=course, name="Khóa 10", status="in_progress", start_date=today - timedelta(days=5)
    )
    from apps.crm.models import Order

    order = Order.objects.create(customer_name="A", course=course, cohort=soon, amount=1)
    order.status = "paid"
    order.save()
    data = api.get(f"/api/v1/public/courses/{course.slug}/").json()
    assert [c["name"] for c in data["upcomingCohorts"]] == ["Khóa 12"]
    assert data["upcomingCohorts"][0]["seatsLeft"] == 19


def test_public_instructors_are_only_those_teaching_published_courses(api, course):
    teaching = Instructor.objects.create(name="GV Thật", title="RM")
    idle = Instructor.objects.create(name="Andrew Ng", title="Founder")
    course.instructors.add(teaching)
    hidden = Course.objects.create(slug="an", title="Ẩn", is_published=False)
    hidden.instructors.add(idle)
    names = [i["name"] for i in api.get("/api/v1/public/instructors/").json()]
    assert names == ["GV Thật"]


def test_legal_pages_default_and_custom(api, client):
    privacy = api.get("/api/v1/public/legal/privacy/").json()
    assert (
        privacy["title"] == "Chính sách bảo mật"
        and "Luật Bảo vệ" in privacy["html"]
        and not privacy["custom"]
    )
    SiteConfig.objects.create(
        key=SiteConfig.KEY_SITE_SEO, data={"terms_html": "<h2>Điều 1</h2><script>x()</script><p>OK</p>"}
    )
    terms = api.get("/api/v1/public/legal/terms/").json()
    assert terms["custom"] and "<h2>Điều 1</h2>" in terms["html"] and "<script>" not in terms["html"]
    assert api.get("/api/v1/public/legal/other/").status_code == 404
    html = client.get("/_seo/chinh-sach-bao-mat", HTTP_USER_AGENT="facebookexternalhit/1.1").content.decode()
    assert "Chính sách bảo mật | TWings Academy" in html
    assert "/dieu-khoan</loc>" in client.get("/sitemap.xml").content.decode()


class FakeOutlineMoodle:
    def __init__(self, course):
        self.course = course

    def __call__(self, function, **params):
        if function == "core_course_get_courses_by_field":
            if params["field"] == "shortname" and params["value"] == self.course.slug:
                return {"courses": [{"id": 7, "summary": "<p>Khóa học <b>thực chiến</b> 12 tuần.</p>"}]}
            return {"courses": []}
        assert function == "core_course_get_contents" and params == {"courseid": 7}
        return [
            {"id": 1, "name": "", "modules": [{"id": 10, "modname": "forum", "name": "Thông báo"}]},
            {
                "id": 2,
                "name": "Chương 1: Tổng quan RM",
                "modules": [
                    {"id": 11, "modname": "page", "name": "Vai trò của RM"},
                    {"id": 12, "modname": "quiz", "name": "Kiểm tra chương 1"},
                    {"id": 13, "modname": "label", "name": "nhãn"},
                    {"id": 14, "modname": "assign", "name": "Ẩn", "visible": 0},
                ],
            },
        ]


def test_import_outline_from_moodle(course, staff_client, settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL, settings.MOODLE_WS_TOKEN = "http://lms:8080/learn", "t" * 32
    monkeypatch.setattr(moodle, "call", FakeOutlineMoodle(course))
    course.description = ""
    course.save()
    res = staff_client(Role.ACADEMIC_MANAGEMENT).post(
        f"/api/v1/staff/lms/courses/{course.pk}/import-outline/"
    )
    assert res.status_code == 200, res.content
    assert res.json() == {"moodleCourseId": 7, "modules": 2, "lessons": 3, "descriptionFilled": True}
    course.refresh_from_db()
    assert course.syllabus[0]["title"] == "Học thử miễn phí"  # the existing free preview is kept
    assert [lesson["title"] for lesson in course.syllabus[1]["lessons"]] == [
        "Vai trò của RM",
        "Kiểm tra chương 1",
    ]
    assert course.syllabus[1]["lessons"][1]["type"] == "quiz"
    assert course.description == "Khóa học thực chiến 12 tuần."
    sales = staff_client(Role.SALES_CRM).post(f"/api/v1/staff/lms/courses/{course.pk}/import-outline/")
    assert sales.status_code == 403


def test_course_editor_saves_instructors_by_id(course, staff_client, api):
    teacher = Instructor.objects.create(name="GV Lưu", title="RM")
    res = staff_client(Role.ACADEMIC_MANAGEMENT).patch(
        f"/api/v1/staff/courses/{course.pk}/",
        {"instructorIds": [teacher.pk], "instructors": [{"id": "demo-1", "name": "Mẫu"}]},
        format="json",
    )
    assert res.status_code == 200, res.content
    assert list(course.instructors.values_list("name", flat=True)) == ["GV Lưu"]
    public = api.get(f"/api/v1/public/courses/{course.slug}/").json()
    assert [i["name"] for i in public["instructors"]] == ["GV Lưu"]
