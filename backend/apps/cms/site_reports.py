"""
Website reports for /app/reports:

- traffic: the cookie-less page views (apps.cms.analytics) over time, by channel, section and page,
  compared with the period before;
- SEO: visits from search engines, crawler activity (apps.cms.seo.record_crawl) and an audit of what
  crawlers actually get for every page of the sitemap (apps.cms.seo.resolve).
"""

from collections import Counter, defaultdict
from datetime import date, timedelta

from django.db.models import Max, Min, Q, Sum
from django.http import Http404
from django.utils import timezone

from .models import CrawlDaily, PageViewDaily

SEARCH = {"google", "coccoc", "bing", "yahoo", "duckduckgo", "yandex"}
SOCIAL = {"facebook", "fb", "instagram", "messenger", "zalo", "tiktok", "youtube", "linkedin", "threads", "x"}
GROUPS = {
    "search": "Tìm kiếm (Google, Cốc Cốc, Bing)",
    "social": "Mạng xã hội (Facebook, Zalo, TikTok…)",
    "direct": "Truy cập trực tiếp",
    "referral": "Website khác",
    "campaign": "Chiến dịch khác (UTM: email, SMS…)",
}
SECTIONS = {
    "home": "Trang chủ",
    "course": "Khóa học",
    "program": "Chương trình",
    "news": "Tin tức & Cẩm nang",
    "about": "Về chúng tôi",
}
BOT_LABELS = {
    "google": "Googlebot",
    "bing": "Bingbot",
    "coccoc": "Cốc Cốc bot",
    "search_other": "Bot tìm kiếm khác (Apple, DuckDuckGo, Yandex)",
    "facebook": "Facebook / Messenger (xem trước link)",
    "zalo": "Zalo (xem trước link)",
    "preview_other": "Xem trước link khác (LinkedIn, Telegram…)",
}
SEARCH_BOTS = ("google", "bing", "coccoc", "search_other")

# code: (severity, label). Severity weights the page score.
ISSUES = {
    "broken": ("error", "Trang lỗi, không mở được"),
    "noindex": ("error", "Chặn lập chỉ mục (noindex) nhưng vẫn nằm trong sitemap"),
    "desc_missing": ("error", "Thiếu mô tả (meta description)"),
    "title_long": ("warning", "Tiêu đề dài hơn 65 ký tự, Google sẽ cắt bớt"),
    "title_short": ("warning", "Tiêu đề quá ngắn (dưới 30 ký tự)"),
    "title_duplicate": ("warning", "Tiêu đề trùng với trang khác"),
    "desc_short": ("warning", "Mô tả ngắn (dưới 70 ký tự)"),
    "desc_duplicate": ("warning", "Mô tả trùng với trang khác"),
    "no_image": ("warning", "Thiếu ảnh chia sẻ (Facebook, Zalo)"),
    "thin": ("warning", "Nội dung mỏng"),
    "desc_cut": ("info", "Mô tả dài hơn 160 ký tự, bị cắt"),
    "no_keyword": ("info", "Bài viết chưa đặt từ khóa chính"),
    "keyword_not_in_title": ("info", "Từ khóa chính không có trong tiêu đề"),
}
PENALTY = {"error": 30, "warning": 10, "info": 3}
SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}


# ---------------------------------------------------------------- helpers
def channel_group(source: str) -> str:
    if source in SEARCH:
        return "search"
    if source in SOCIAL:
        return "social"
    if source == "direct":
        return "direct"
    if source == "other":
        return "referral"
    return "campaign"


def section(path: str) -> str:
    first = path.strip("/").split("/")[0]
    return {"": "home", "khoa-hoc": "course", "chuong-trinh": "program", "tin-tuc": "news"}.get(
        first, "about"
    )


def change(current: int, previous: int) -> int | None:
    return round(100 * (current - previous) / previous) if previous else None


def period(days: int) -> tuple[date, date, date]:
    """(start of the previous period, start of this period, today)."""
    today = timezone.localdate()
    since = today - timedelta(days=days - 1)
    return since - timedelta(days=days), since, today


def bucketing(since: date, today: date, days: int):
    """Chart buckets: days up to a month, weeks up to ~6 months, then months. -> (kind, starts, key fn)."""
    if days <= 31:
        kind, key = "day", lambda d: d
    elif days <= 186:
        kind, key = "week", lambda d: d - timedelta(days=d.weekday())
    else:
        kind, key = "month", lambda d: d.replace(day=1)
    starts, d = [], key(since)
    while d <= today:
        starts.append(d)
        d = key(d + timedelta(days={"day": 1, "week": 7, "month": 32}[kind]))
    return kind, starts, key


def partial(starts: list[date], kind: str, since: date, today: date) -> dict[date, bool]:
    """Buckets only partly inside the period: the first may start before `since`, the last is not over."""

    def end(start: date) -> date:
        if kind == "week":
            return start + timedelta(days=6)
        if kind == "month":
            return (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        return start

    return {s: s < since or end(s) > today for s in starts}


def page_titles() -> dict[str, str]:
    from apps.catalog.models import Course, Program

    from .models import Article

    titles = {
        "/": "Trang chủ",
        "/khoa-hoc": "Danh sách khóa học",
        "/chuong-trinh": "Danh sách chương trình",
        "/tin-tuc": "Tin tức & Cẩm nang",
        "/ve-chung-toi": "Về chúng tôi",
    }
    for model, prefix in ((Course, "/khoa-hoc/"), (Program, "/chuong-trinh/"), (Article, "/tin-tuc/")):
        titles.update({prefix + slug: title for slug, title in model.objects.values_list("slug", "title")})
    return titles


def _sum_by(queryset, *fields) -> dict:
    rows = queryset.values_list(*fields).annotate(n=Sum("views")).order_by()
    return {(r[0] if len(fields) == 1 else r[:-1]): r[-1] for r in rows}


# ---------------------------------------------------------------- traffic
def traffic_report(days: int) -> dict:
    from apps.crm.attribution import source_label

    prev_since, since, today = period(days)
    current = PageViewDaily.objects.filter(date__gte=since)
    previous = PageViewDaily.objects.filter(date__gte=prev_since, date__lt=since)
    titles = page_titles()

    by_source, prev_by_source = _sum_by(current, "source"), _sum_by(previous, "source")
    by_path_source = _sum_by(current, "path", "source")
    prev_by_path = _sum_by(previous, "path")
    views, prev_views = sum(by_source.values()), sum(prev_by_source.values())

    kind, starts, key = bucketing(since, today, days)
    cut = partial(starts, kind, since, today)
    series = {s: dict.fromkeys(GROUPS, 0) for s in starts}
    for (day, source), n in _sum_by(current, "date", "source").items():
        series[key(day)][channel_group(source)] += n

    groups, prev_groups = Counter(), Counter()
    for source, n in by_source.items():
        groups[channel_group(source)] += n
    for source, n in prev_by_source.items():
        prev_groups[channel_group(source)] += n

    pages: dict[str, dict] = {}
    for (path, source), n in by_path_source.items():
        row = pages.setdefault(path, {"views": 0, "search": 0})
        row["views"] += n
        row["search"] += n if source in SEARCH else 0
    sections, prev_sections = Counter(), Counter()
    for path, row in pages.items():
        sections[section(path)] += row["views"]
    for path, n in prev_by_path.items():
        sections.setdefault(section(path), 0)
        prev_sections[section(path)] += n

    last7 = PageViewDaily.objects.filter(date__gt=today - timedelta(days=7)).aggregate(n=Sum("views"))["n"]
    return {
        "days": days,
        "since": since,
        "bucket": kind,
        "views": views,
        "previous_views": prev_views,
        "change": change(views, prev_views),
        "today": current.filter(date=today).aggregate(n=Sum("views"))["n"] or 0,
        "last7": last7 or 0,
        "daily_average": round(views / days, 1),
        "tracking_since": PageViewDaily.objects.aggregate(d=Min("date"))["d"],
        "series": [{"start": s, "partial": cut[s], **series[s]} for s in starts],
        "channels": [
            {
                "key": g,
                "label": label,
                "views": groups[g],
                "previous": prev_groups[g],
                "change": change(groups[g], prev_groups[g]),
            }
            for g, label in GROUPS.items()
        ],
        "sources": sorted(
            (
                {
                    "key": s,
                    "label": source_label(s),
                    "group": channel_group(s),
                    "views": by_source.get(s, 0),
                    "previous": prev_by_source.get(s, 0),
                }
                for s in set(by_source) | set(prev_by_source)
            ),
            key=lambda r: (-r["views"], -r["previous"]),
        ),
        "sections": sorted(
            (
                {"key": k, "label": SECTIONS[k], "views": sections[k], "previous": prev_sections[k]}
                for k in sections
            ),
            key=lambda r: -r["views"],
        ),
        "pages": sorted(
            (
                {
                    "path": path,
                    "title": titles.get(path, path),
                    "views": row["views"],
                    "search": row["search"],
                    "previous": prev_by_path.get(path, 0),
                    "change": change(row["views"], prev_by_path.get(path, 0)),
                }
                for path, row in pages.items()
            ),
            key=lambda r: -r["views"],
        )[:50],
    }


# ---------------------------------------------------------------- SEO
def audit_pages() -> list[dict]:
    """Every sitemap page as crawlers get it, with its issues and a 0-100 score."""
    from .models import Article
    from .seo import Moved, plain, resolve, sitemap_paths

    keywords = {f"/tin-tuc/{slug}": kw for slug, kw in Article.objects.values_list("slug", "focus_keyword")}
    editor = {f"/tin-tuc/{slug}": s for slug, s in Article.objects.values_list("slug", "seo_score")}
    rows = []
    for path, updated in sitemap_paths():
        row = {
            "path": path,
            "kind": section(path),
            "updated": updated,
            "title": "",
            "description": "",
            "issues": [],
        }
        try:
            page = resolve(path)
        except (Http404, Moved):
            row["issues"].append("broken")
            rows.append(row)
            continue
        row["title"], row["description"] = page.title, page.description
        issues = row["issues"]
        if page.noindex:
            issues.append("noindex")
        if len(page.title) > 65:
            issues.append("title_long")
        elif len(page.title) < 30:
            issues.append("title_short")
        if not page.description:
            issues.append("desc_missing")
        elif page.description.endswith("…"):
            issues.append("desc_cut")
        elif len(page.description) < 70:
            issues.append("desc_short")
        if not page.image:
            issues.append("no_image")
        detail = path.count("/") == 2 and path.split("/")[1] in ("khoa-hoc", "chuong-trinh", "tin-tuc")
        if detail:
            text = len(plain(page.body_html, 100_000))
            row["text_length"] = text
            if text < (1500 if path.startswith("/tin-tuc/") else 300):
                issues.append("thin")
        if path in keywords:
            row["focus_keyword"] = keywords[path]
            row["editor_score"] = editor[path]
            if not keywords[path]:
                issues.append("no_keyword")
            elif keywords[path].lower() not in page.title.lower():
                issues.append("keyword_not_in_title")
        rows.append(row)

    for field, code in (("title", "title_duplicate"), ("description", "desc_duplicate")):
        seen = Counter(r[field].strip().lower() for r in rows if r[field])
        for r in rows:
            if r[field] and seen[r[field].strip().lower()] > 1:
                r["issues"].append(code)
    for r in rows:
        r["issues"].sort(key=lambda c: SEVERITY_ORDER[ISSUES[c][0]])
        r["score"] = max(0, 100 - sum(PENALTY[ISSUES[c][0]] for c in r["issues"]))
    return rows


def site_checks() -> list[dict]:
    from django.conf import settings

    from .seo import default_image, site_seo, sitemap_paths

    seo = site_seo()
    robots = [line.strip().lower().replace(" ", "") for line in str(seo.get("robots_txt") or "").splitlines()]
    blocked = "disallow:/" in robots
    site_url = getattr(settings, "PUBLIC_SITE_URL", "") or ""
    checks = [
        ("meta_title", bool(seo.get("default_meta_title")), "Tiêu đề mặc định của trang chủ", ""),
        ("meta_description", bool(seo.get("default_meta_description")), "Mô tả mặc định của trang chủ", ""),
        ("share_image", bool(default_image(seo)), "Ảnh chia sẻ mặc định", ""),
        ("logo", bool(seo.get("logo_url")), "Logo trong dữ liệu có cấu trúc (Google)", ""),
        (
            "contact",
            bool(seo.get("hotline") or seo.get("email")),
            "Hotline / email trong dữ liệu có cấu trúc",
            "",
        ),
        (
            "robots",
            not blocked,
            "robots.txt cho phép Google thu thập",
            'robots.txt đang có "Disallow: /": Google sẽ không thu thập trang nào.' if blocked else "",
        ),
        ("https", site_url.startswith("https://"), "Địa chỉ website dùng HTTPS", site_url),
        ("sitemap", True, "Sitemap tự động (sitemap.xml)", f"{len(sitemap_paths())} trang"),
    ]
    return [{"key": k, "ok": ok, "label": label, "detail": detail} for k, ok, label, detail in checks]


def seo_report(days: int) -> dict:
    from .models import Article

    prev_since, since, today = period(days)
    current = PageViewDaily.objects.filter(date__gte=since, source__in=SEARCH)
    previous = PageViewDaily.objects.filter(date__gte=prev_since, date__lt=since, source__in=SEARCH)
    titles = page_titles()

    engines, prev_engines = _sum_by(current, "source"), _sum_by(previous, "source")
    landing, prev_landing = _sum_by(current, "path"), _sum_by(previous, "path")
    organic, prev_organic = sum(engines.values()), sum(prev_engines.values())

    crawls = CrawlDaily.objects.filter(date__gte=since)
    prev_crawls = CrawlDaily.objects.filter(date__gte=prev_since, date__lt=since)
    hits = dict(crawls.values_list("bot").annotate(n=Sum("hits")).order_by())
    prev_hits = dict(prev_crawls.values_list("bot").annotate(n=Sum("hits")).order_by())
    errors = dict(crawls.filter(status__gte=400).values_list("bot").annotate(n=Sum("hits")).order_by())
    last_seen = dict(CrawlDaily.objects.values_list("bot").annotate(d=Max("date")).order_by())

    kind, starts, key = bucketing(since, today, days)
    cut = partial(starts, kind, since, today)
    google = defaultdict(int)
    for day, n in crawls.filter(bot="google").values_list("date").annotate(n=Sum("hits")).order_by():
        google[key(day)] += n
    search_views = defaultdict(int)
    for day, n in current.values_list("date").annotate(n=Sum("views")).order_by():
        search_views[key(day)] += n

    google_last = dict(
        CrawlDaily.objects.filter(bot="google", status=200)
        .values_list("path")
        .annotate(d=Max("date"))
        .order_by()
    )
    all_views = _sum_by(PageViewDaily.objects.filter(date__gte=since), "path")
    pages = audit_pages()
    for p in pages:
        p["views"] = all_views.get(p["path"], 0)
        p["search_views"] = landing.get(p["path"], 0)
        p["google_last_crawl"] = google_last.get(p["path"])
    issue_counts = Counter(c for p in pages for c in p["issues"])

    live = Q(status="published") | Q(status="scheduled", published_at__lte=timezone.now())
    articles = Article.objects.filter(live)
    now = timezone.now()
    return {
        "days": days,
        "bucket": kind,
        "organic": {
            "views": organic,
            "previous": prev_organic,
            "change": change(organic, prev_organic),
            "engines": sorted(
                (
                    {
                        "key": e,
                        "label": {"coccoc": "Cốc Cốc"}.get(e, e.capitalize()),
                        "views": engines.get(e, 0),
                        "previous": prev_engines.get(e, 0),
                    }
                    for e in set(engines) | set(prev_engines)
                ),
                key=lambda r: -r["views"],
            ),
            "landing": sorted(
                (
                    {"path": p, "title": titles.get(p, p), "views": n, "previous": prev_landing.get(p, 0)}
                    for p, n in landing.items()
                ),
                key=lambda r: -r["views"],
            )[:20],
        },
        "series": [
            {"start": s, "partial": cut[s], "search_views": search_views[s], "googlebot": google[s]} for s in starts
        ],
        "crawl": {
            "tracking_since": CrawlDaily.objects.aggregate(d=Min("date"))["d"],
            "search_hits": sum(hits.get(b, 0) for b in SEARCH_BOTS),
            "not_found": crawls.filter(status=404).aggregate(n=Sum("hits"))["n"] or 0,
            "redirects": crawls.filter(status=301).aggregate(n=Sum("hits"))["n"] or 0,
            "bots": [
                {
                    "key": b,
                    "label": label,
                    "search": b in SEARCH_BOTS,
                    "hits": hits.get(b, 0),
                    "previous": prev_hits.get(b, 0),
                    "errors": errors.get(b, 0),
                    "last_seen": last_seen.get(b),
                }
                for b, label in BOT_LABELS.items()
            ],
        },
        "audit": {
            "pages": sorted(pages, key=lambda p: (p["score"], -p["views"])),
            "summary": {
                "pages": len(pages),
                "healthy": sum(1 for p in pages if not any(ISSUES[c][0] != "info" for c in p["issues"])),
                "average_score": round(sum(p["score"] for p in pages) / len(pages)) if pages else None,
                "never_crawled": sum(1 for p in pages if not p["google_last_crawl"]),
                "no_views": sum(1 for p in pages if not p["views"]),
            },
            "issues": sorted(
                (
                    {"code": c, "severity": ISSUES[c][0], "label": ISSUES[c][1], "count": n}
                    for c, n in issue_counts.items()
                ),
                key=lambda r: (SEVERITY_ORDER[r["severity"]], -r["count"]),
            ),
        },
        "site": site_checks(),
        "content": {
            "articles": articles.count(),
            "published30d": articles.filter(published_at__gte=now - timedelta(days=30)).count(),
            "published90d": articles.filter(published_at__gte=now - timedelta(days=90)).count(),
            "last_published": articles.aggregate(d=Max("published_at"))["d"],
            "drafts": Article.objects.filter(status="draft").count(),
            "scheduled": Article.objects.filter(status="scheduled", published_at__gt=now).count(),
        },
    }
