"""/app/reports: website traffic and SEO (organic visits, crawler log, page audit)."""

from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.cms.models import Article, CrawlDaily, PageViewDaily
from apps.core.models import SiteConfig
from tests.conftest import Role

pytestmark = pytest.mark.django_db
GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"


@pytest.fixture
def article(db):
    return Article.objects.create(
        slug="lo-trinh-rm",
        title="Lộ trình trở thành RM",
        excerpt="Cẩm nang cho người mới.",
        content="<p>Ngắn.</p>",
        status="published",
        published_at=timezone.now(),
        focus_keyword="quan hệ khách hàng",
    )


def _views(path, source, n, days_ago=0):
    PageViewDaily.objects.create(
        date=timezone.localdate() - timedelta(days=days_ago), path=path, source=source, views=n
    )


def test_crawler_visits_are_counted_without_storing_made_up_urls(course):
    bot = Client(HTTP_USER_AGENT=GOOGLEBOT)
    bot.get(f"/_seo/khoa-hoc/{course.slug}")
    bot.get(f"/_seo/khoa-hoc/{course.slug}")
    bot.get("/_seo/khong-co-trang-nay")
    Client(HTTP_USER_AGENT="facebookexternalhit/1.1").get("/_seo/")
    rows = set(CrawlDaily.objects.values_list("bot", "path", "status", "hits"))
    assert rows == {
        ("google", f"/khoa-hoc/{course.slug}", 200, 2),
        ("google", "", 404, 1),
        ("facebook", "/", 200, 1),
    }


def test_traffic_report_groups_channels_and_compares_with_the_previous_period(staff_client, course):
    page = f"/khoa-hoc/{course.slug}"
    _views(page, "google", 5)
    _views(page, "facebook", 3, days_ago=2)
    _views("/", "direct", 2)
    _views("/", "newsletter", 1)
    _views(page, "google", 4, days_ago=40)  # previous 30-day period
    data = staff_client(Role.CONTENT_SEO).get("/api/v1/staff/reports/?months=1").json()
    assert "finance" not in data and "sales" not in data  # the SEO editor sees the website only
    t = data["traffic"]
    assert (t["views"], t["previousViews"], t["change"], t["today"], t["bucket"]) == (11, 4, 175, 8, "day")
    channels = {c["key"]: c["views"] for c in t["channels"]}
    assert channels == {"search": 5, "social": 3, "direct": 2, "referral": 0, "campaign": 1}
    assert sum(sum(s[g] for g in channels) for s in t["series"]) == 11 and len(t["series"]) == 30
    top = t["pages"][0]
    assert (top["path"], top["title"], top["views"], top["search"], top["previous"]) == (
        page,
        course.title,
        8,
        5,
        4,
    )
    assert {s["key"]: s["views"] for s in t["sections"]} == {"course": 8, "home": 3}


def test_seo_report_audits_what_crawlers_get(staff_client, course, article):
    SiteConfig.objects.create(key=SiteConfig.KEY_SITE_SEO, data={"robots_txt": "User-agent: *\nDisallow: /"})
    _views(f"/tin-tuc/{article.slug}", "coccoc", 2)
    Client(HTTP_USER_AGENT=GOOGLEBOT).get(f"/_seo/tin-tuc/{article.slug}")
    seo = staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/reports/?months=3").json()["seo"]

    assert seo["organic"]["views"] == 2 and seo["organic"]["engines"][0]["label"] == "Cốc Cốc"
    assert seo["organic"]["landing"][0]["title"] == article.title
    google = next(b for b in seo["crawl"]["bots"] if b["key"] == "google")
    assert google["hits"] == 1 and google["lastSeen"] == timezone.localdate().isoformat()
    assert seo["bucket"] == "week"

    pages = {p["path"]: p for p in seo["audit"]["pages"]}
    assert set(pages) >= {"/", "/khoa-hoc", f"/khoa-hoc/{course.slug}", f"/tin-tuc/{article.slug}"}
    post = pages[f"/tin-tuc/{article.slug}"]
    assert {"thin", "no_image", "keyword_not_in_title"} <= set(post["issues"])
    assert post["googleLastCrawl"] == timezone.localdate().isoformat() and post["searchViews"] == 2
    assert post["score"] < 100 and seo["audit"]["summary"]["pages"] == len(pages)
    assert not next(c for c in seo["site"] if c["key"] == "robots")["ok"]
    assert seo["content"]["articles"] == 1 and seo["content"]["published30d"] == 1


def test_reports_need_a_website_or_business_permission(staff_client):
    assert staff_client(Role.CORPORATE_TRAINING).get("/api/v1/staff/reports/").status_code == 200  # lms.view
    data = staff_client(Role.CORPORATE_TRAINING).get("/api/v1/staff/reports/").json()
    assert "traffic" not in data and "seo" not in data
