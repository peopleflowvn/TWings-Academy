"""Server-side SEO: bot pages (link previews), page metadata for the SPA, sitemap and robots.txt."""

import json
import re

import pytest
from django.test import Client
from django.utils import timezone

from apps.catalog.models import Course
from apps.cms.models import Article
from apps.core.models import SiteConfig

pytestmark = pytest.mark.django_db
BASE = "https://tuyensinh.twings.edu.vn"


@pytest.fixture
def client():
    return Client()


@pytest.fixture
def article(db):
    return Article.objects.create(
        slug="lo-trinh-rm",
        title="Lộ trình trở thành RM",
        excerpt="Cẩm nang cho người mới.",
        content="<p>Nội dung <strong>chi tiết</strong></p><script>alert(1)</script>",
        featured_image="https://cdn.example/rm.jpg",
        status="published",
        published_at=timezone.now(),
        author="Ban biên tập",
    )


def _og(html: str, prop: str) -> str:
    m = re.search(rf'<meta property="{prop}" content="([^"]*)"', html)
    return m.group(1) if m else ""


def test_course_page_has_share_card_and_course_schema(client, course):
    course.subtitle = "Trở thành RM doanh nghiệp trong 12 tuần"
    course.thumbnail = "https://cdn.example/rm-dn.jpg"
    course.save()
    res = client.get(f"/_seo/khoa-hoc/{course.slug}")
    html = res.content.decode()
    assert res.status_code == 200
    assert _og(html, "og:title") == f"{course.title} | TWings Academy"
    assert _og(html, "og:description") == course.subtitle
    assert _og(html, "og:image") == course.thumbnail
    assert _og(html, "og:url") == f"{BASE}/khoa-hoc/{course.slug}"
    assert f'<link rel="canonical" href="{BASE}/khoa-hoc/{course.slug}">' in html
    data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html).group(1))
    assert data["@type"] == "Course" and data["offers"]["price"] == course.price
    assert "<script>" not in html.replace('<script type="application/ld+json">', "")  # no executable script
    assert "default-src 'none'" in res["Content-Security-Policy"]


def test_article_page_uses_seo_fields_and_sanitised_content(client, article):
    article.meta_title = "RM là gì?"
    article.save()
    html = client.get("/_seo/tin-tuc/lo-trinh-rm").content.decode()
    assert _og(html, "og:type") == "article" and _og(html, "og:title") == "RM là gì? | TWings Academy"
    assert "<strong>chi tiết</strong>" in html and "alert(1)" not in html
    assert 'property="article:published_time"' in html


def test_unpublished_and_unknown_pages_are_404(client, course, article):
    course.is_published = False
    course.save()
    article.status = "draft"
    article.save()
    for path in (f"/_seo/khoa-hoc/{course.slug}", "/_seo/tin-tuc/lo-trinh-rm", "/_seo/khong-co"):
        assert client.get(path).status_code == 404


def test_static_pages_render(client, course, article):
    SiteConfig.objects.create(
        key=SiteConfig.KEY_HOMEPAGE_SECTIONS,
        data={"about": {"title": "TWINGS", "lead": "Học viện thực chiến."}},
    )
    for path in ("", "khoa-hoc", "ve-chung-toi", "tin-tuc", "chuong-trinh"):
        res = client.get(f"/_seo/{path}")
        assert res.status_code == 200, path
    home = client.get("/_seo/").content.decode()
    assert f"{BASE}/khoa-hoc/{course.slug}" in home and f"{BASE}/tin-tuc/lo-trinh-rm" in home
    assert "Học viện thực chiến." in client.get("/_seo/ve-chung-toi").content.decode()


def test_seo_api_for_the_spa(client, course):
    body = client.get("/api/v1/public/seo/", {"path": f"/khoa-hoc/{course.slug}/"}).json()
    assert body["canonical"] == f"{BASE}/khoa-hoc/{course.slug}" and body["title"].startswith(course.title)
    assert client.get("/api/v1/public/seo/", {"path": "/khoa-hoc/nope"}).status_code == 404
    assert client.get("/api/v1/public/seo/", {"path": "/tai-khoan"}).json()["noindex"] is True


def test_sitemap_lists_published_pages(client, course, article):
    Course.objects.create(slug="nhap", title="Nháp", is_published=False)
    xml = client.get("/sitemap.xml").content.decode()
    assert (
        f"<loc>{BASE}/khoa-hoc/{course.slug}</loc>" in xml and f"<loc>{BASE}/tin-tuc/lo-trinh-rm</loc>" in xml
    )
    assert "/khoa-hoc/nhap" not in xml


def test_robots_keeps_private_areas_out_and_points_to_the_sitemap(client):
    SiteConfig.objects.create(
        key=SiteConfig.KEY_SITE_SEO,
        data={"robots_txt": "User-agent: *\nAllow: /\nSitemap: https://wrong.example/sitemap.xml"},
    )
    text = client.get("/robots.txt").content.decode()
    assert "Disallow: /app" in text and "Disallow: /tai-khoan" in text
    assert text.strip().endswith(f"Sitemap: {BASE}/sitemap.xml") and "wrong.example" not in text
