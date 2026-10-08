"""
SEO and social sharing for the public site (a React SPA).

Facebook, Messenger, Zalo and other link-preview bots never run JavaScript, so the web container
(Caddy) sends their requests for site pages here (/_seo/<path>): a small server-rendered HTML page with
the page's real title, description, share image, canonical URL and structured data (plus the main
text and links, for search engines). People always get the SPA, which asks /api/v1/public/seo/ for the
same metadata when the route changes. Also serves /sitemap.xml and /robots.txt.

Routes (keep in step with frontend/src/lib/routes.ts):
  /  /khoa-hoc  /khoa-hoc/<slug>  /chuong-trinh  /chuong-trinh/<slug>  /ve-chung-toi  /tin-tuc
  /tin-tuc/<slug>  /chinh-sach-bao-mat  /dieu-khoan  (+ /learn/tai-khoan, never indexed)
"""

import json
import re
from dataclasses import dataclass, field
from html import unescape

from django.conf import settings
from django.db.models import Q
from django.http import Http404, HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.utils.html import strip_tags
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.catalog.models import Course, Program
from apps.core.models import SiteConfig

from .models import Article, HeroBanner

SITE_NAME = "TWings Academy"
PAGE_CSP = (
    "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
)


@dataclass
class Page:
    path: str
    title: str
    description: str = ""
    image: str = ""
    type: str = "website"
    heading: str = ""
    body_html: str = ""  # trusted / already-sanitised HTML
    links: list = field(default_factory=list)  # [(text, path)]
    jsonld: list = field(default_factory=list)
    canonical: str = ""
    noindex: bool = False
    published: str = ""


# ---------------------------------------------------------------- helpers
def base_url() -> str:
    return getattr(settings, "PUBLIC_SITE_URL", "").rstrip("/") or "https://tuyensinh.twings.edu.vn"


def absolute(url: str) -> str:
    if not url:
        return ""
    if url.startswith("https://") or url.startswith("http://"):
        return url
    return f"{base_url()}{url if url.startswith('/') else '/' + url}"


def plain(text: str, limit: int = 160) -> str:
    """HTML/markdown-ish text -> one clean line of at most `limit` characters."""
    text = re.sub(r"\s+", " ", unescape(strip_tags(text or ""))).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0].rstrip(",.;:-– ") + "…"


def _config(key: str) -> dict:
    doc = SiteConfig.objects.filter(key=key).first()
    return doc.data if doc and isinstance(doc.data, dict) else {}


def site_seo() -> dict:
    return _config(SiteConfig.KEY_SITE_SEO)


def default_image(seo: dict) -> str:
    if seo.get("og_image_url"):
        return seo["og_image_url"]
    banner = HeroBanner.objects.filter(is_active=True).exclude(image_url="").order_by("sort_order").first()
    return banner.image_url if banner else ""


def organization(seo: dict) -> dict:
    org = {"@type": "EducationalOrganization", "name": SITE_NAME, "url": base_url() + "/"}
    if seo.get("logo_url"):
        org["logo"] = absolute(seo["logo_url"])
    if seo.get("hotline"):
        org["telephone"] = seo["hotline"]
    if seo.get("email"):
        org["email"] = seo["email"]
    if seo.get("address"):
        org["address"] = seo["address"]
    return org


def _courses():
    return Course.objects.filter(is_published=True).order_by("sort_order", "-created_at")


def _programs():
    return Program.objects.filter(is_published=True).order_by("sort_order", "-created_at")


def _articles():
    """Same rule as the public articles API: published, or scheduled and due."""
    live = Q(status="published") | Q(status="scheduled", published_at__lte=timezone.now())
    return Article.objects.filter(live).order_by("-published_at", "-created_at")


def _list_html(items) -> str:
    return "".join(f"<li>{item}</li>" for item in items)


# ---------------------------------------------------------------- pages
def _home(seo) -> Page:
    title = seo.get("default_meta_title") or f"{SITE_NAME} – Đào tạo & Tuyển sinh Nhân sự Ngân hàng"
    links = [(c.title, f"/khoa-hoc/{c.slug}") for c in _courses()[:20]]
    links += [(p.title, f"/chuong-trinh/{p.slug}") for p in _programs()[:10]]
    links += [(a.title, f"/tin-tuc/{a.slug}") for a in _articles()[:10]]
    links += [("Về chúng tôi", "/ve-chung-toi"), ("Tin tức & Cẩm nang", "/tin-tuc")]
    return Page(
        path="/",
        title=title,
        description=plain(seo.get("default_meta_description") or ""),
        image=default_image(seo),
        heading=seo.get("site_name") or SITE_NAME,
        links=links,
        jsonld=[{"@context": "https://schema.org", **organization(seo)}],
    )


def _catalog(seo) -> Page:
    courses = list(_courses())
    return Page(
        path="/khoa-hoc",
        title=f"Khóa học & Chương trình đào tạo | {SITE_NAME}",
        description=plain(
            "Khóa học thực chiến nghiệp vụ ngân hàng, tài chính, AI và kỹ năng nghề nghiệp: "
            + ", ".join(c.title for c in courses[:6])
        ),
        image=default_image(seo),
        heading="Khóa học & Chương trình đào tạo",
        links=[(p.title, f"/chuong-trinh/{p.slug}") for p in _programs()]
        + [(c.title, f"/khoa-hoc/{c.slug}") for c in courses],
        jsonld=[
            {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": [
                    {"@type": "ListItem", "position": i + 1, "url": f"{base_url()}/khoa-hoc/{c.slug}"}
                    for i, c in enumerate(courses)
                ],
            }
        ],
    )


def _offer(price: int) -> dict:
    return {
        "@type": "Offer",
        "price": price,
        "priceCurrency": "VND",
        "category": "Paid" if price else "Free",
        "availability": "https://schema.org/InStock",
    }


def _course(seo, slug) -> Page:
    course = _courses().filter(slug=slug).first()
    if course is None:
        raise Http404
    description = plain(course.subtitle or course.description or course.overview)
    body = [f"<p>{plain(course.description or course.overview, 2000)}</p>"]
    if course.learning_objectives:
        body.append(
            "<h2>Bạn sẽ học được gì</h2><ul>" + _list_html(map(str, course.learning_objectives)) + "</ul>"
        )
    facts = [f for f in (course.level, course.duration, course.location_text) if f]
    if facts:
        body.append("<p>" + " · ".join(facts) + "</p>")
    if course.price:
        body.append(f"<p>Học phí: {course.price:,}đ</p>".replace(",", "."))
    return Page(
        path=f"/khoa-hoc/{course.slug}",
        title=f"{course.title} | {SITE_NAME}",
        description=description,
        image=course.thumbnail or default_image(seo),
        heading=course.title,
        body_html="".join(body),
        links=[("Tất cả khóa học", "/khoa-hoc")],
        jsonld=[
            {
                "@context": "https://schema.org",
                "@type": "Course",
                "name": course.title,
                "description": description or course.title,
                "provider": organization(seo),
                **({"image": absolute(course.thumbnail)} if course.thumbnail else {}),
                "offers": _offer(course.price),
                "inLanguage": "vi",
            },
            _breadcrumb([("Khóa học", "/khoa-hoc"), (course.title, f"/khoa-hoc/{course.slug}")]),
        ],
    )


def _programs_page(seo) -> Page:
    programs = list(_programs())
    return Page(
        path="/chuong-trinh",
        title=f"Chương trình đào tạo trọn gói | {SITE_NAME}",
        description=plain(
            "Lộ trình nhiều khóa học, học phí trọn gói, có thể trả góp: "
            + ", ".join(p.title for p in programs)
        ),
        image=default_image(seo),
        heading="Chương trình đào tạo trọn gói",
        links=[(p.title, f"/chuong-trinh/{p.slug}") for p in programs],
    )


def _program(seo, slug) -> Page:
    program = _programs().filter(slug=slug).prefetch_related("program_courses__course").first()
    if program is None:
        raise Http404
    courses = [link.course for link in program.program_courses.all() if link.course.is_published]
    description = plain(program.subtitle or program.description)
    body = f"<p>{plain(program.description, 2000)}</p>"
    if program.highlights:
        body += "<ul>" + _list_html(map(str, program.highlights)) + "</ul>"
    return Page(
        path=f"/chuong-trinh/{program.slug}",
        title=f"{program.title} | {SITE_NAME}",
        description=description,
        image=program.thumbnail or (courses[0].thumbnail if courses else "") or default_image(seo),
        heading=program.title,
        body_html=body,
        links=[(c.title, f"/khoa-hoc/{c.slug}") for c in courses],
        jsonld=[
            {
                "@context": "https://schema.org",
                "@type": "Course",
                "name": program.title,
                "description": description or program.title,
                "provider": organization(seo),
                "offers": _offer(program.price),
                "hasPart": [
                    {"@type": "Course", "name": c.title, "url": f"{base_url()}/khoa-hoc/{c.slug}"}
                    for c in courses
                ],
            }
        ],
    )


def _about(seo) -> Page:
    about = _config(SiteConfig.KEY_HOMEPAGE_SECTIONS).get("about") or {}
    lead = about.get("lead") or seo.get("default_meta_description") or ""
    body = "".join(f"<p>{plain(part, 3000)}</p>" for part in str(lead).split("\n\n") if part.strip())
    for key, label in (("vision", "Tầm nhìn"), ("mission", "Sứ mệnh")):
        if about.get(key):
            body += f"<h2>{label}</h2><p>{plain(str(about[key]), 2000)}</p>"
    return Page(
        path="/ve-chung-toi",
        title=f"Về chúng tôi | {SITE_NAME}",
        description=plain(lead),
        image=default_image(seo),
        heading=about.get("title") or SITE_NAME,
        body_html=body,
        links=[("Khóa học", "/khoa-hoc")],
        jsonld=[{"@context": "https://schema.org", "@type": "AboutPage", "mainEntity": organization(seo)}],
    )


def _news(seo) -> Page:
    articles = list(_articles()[:50])
    return Page(
        path="/tin-tuc",
        title=f"Tin tức & Cẩm nang nghề nghiệp | {SITE_NAME}",
        description=plain(
            "Tin tức, cẩm nang nghề ngân hàng – tài chính và kinh nghiệm tuyển dụng: "
            + ", ".join(a.title for a in articles[:4])
        ),
        image=default_image(seo),
        heading="Tin tức & Cẩm nang",
        links=[(a.title, f"/tin-tuc/{a.slug}") for a in articles],
    )


def _article(seo, slug) -> Page:
    article = _articles().filter(slug=slug).first()
    if article is None:
        raise Http404
    description = plain(article.meta_description or article.excerpt or article.content)
    published = article.published_at.isoformat() if article.published_at else ""
    return Page(
        path=f"/tin-tuc/{article.slug}",
        title=f"{article.meta_title or article.title} | {SITE_NAME}",
        description=description,
        image=article.featured_image or default_image(seo),
        type="article",
        heading=article.title,
        body_html=article.content,  # sanitised when saved (apps.core.sanitize)
        links=[("Tin tức & Cẩm nang", "/tin-tuc")],
        canonical=article.canonical_url,
        published=published,
        jsonld=[
            {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": article.title[:110],
                "description": description,
                **({"image": [absolute(article.featured_image)]} if article.featured_image else {}),
                **({"datePublished": published} if published else {}),
                "dateModified": article.updated_at.isoformat(),
                "author": {"@type": "Person", "name": article.author}
                if article.author
                else organization(seo),
                "publisher": organization(seo),
            },
            _breadcrumb([("Tin tức", "/tin-tuc"), (article.title, f"/tin-tuc/{article.slug}")]),
        ],
    )


def _legal(key: str, path: str) -> Page:
    from .legal import legal_page

    page = legal_page(key)
    return Page(
        path=path,
        title=f"{page['title']} | {SITE_NAME}",
        description=plain(page["html"]),
        heading=page["title"],
        body_html=page["html"],
    )


def _breadcrumb(items) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": f"{base_url()}{path}"}
            for i, (name, path) in enumerate(items)
        ],
    }


def resolve(path: str) -> Page:
    """Page for a site path; Http404 when it does not exist."""
    path = "/" + path.strip("/")
    seo = site_seo()
    parts = [p for p in path.split("/") if p]
    match parts:
        case []:
            return _home(seo)
        case ["khoa-hoc"]:
            return _catalog(seo)
        case ["khoa-hoc", slug]:
            return _course(seo, slug)
        case ["chuong-trinh"]:
            return _programs_page(seo)
        case ["chuong-trinh", slug]:
            return _program(seo, slug)
        case ["ve-chung-toi"]:
            return _about(seo)
        case ["tin-tuc"]:
            return _news(seo)
        case ["tin-tuc", slug]:
            return _article(seo, slug)
        case ["chinh-sach-bao-mat"]:
            return _legal("privacy", "/chinh-sach-bao-mat")
        case ["dieu-khoan"]:
            return _legal("terms", "/dieu-khoan")
        case ["learn", "tai-khoan"] | ["tai-khoan"]:  # learner portal page (old path redirects)
            return Page(path="/learn/tai-khoan", title=f"Học phí & hồ sơ | {SITE_NAME}", noindex=True)
    raise Http404


def meta(page: Page) -> dict:
    canonical = page.canonical or f"{base_url()}{page.path}"
    return {
        "title": page.title,
        "description": page.description,
        "canonical": canonical,
        "image": absolute(page.image),
        "type": page.type,
        "noindex": page.noindex,
        "site_name": site_seo().get("site_name") or SITE_NAME,
        "published": page.published,
        "jsonld": page.jsonld,
    }


# ---------------------------------------------------------------- views
@require_GET
def prerender(request, path=""):
    """HTML for bots (sent here by Caddy based on the User-Agent)."""
    try:
        page = resolve(path)
        status = 200
    except Http404:
        page, status = (
            Page(path="/" + path.strip("/"), title=f"Không tìm thấy trang | {SITE_NAME}", noindex=True),
            404,
        )
    data = meta(page)
    response = render(
        request,
        "seo/page.html",
        {
            "page": page,
            "meta": data,
            "links": [(text, f"{base_url()}{href}") for text, href in page.links],
            "jsonld": [json.dumps(item, ensure_ascii=False).replace("</", "<\\/") for item in page.jsonld],
            "base": base_url(),
        },
        status=status,
    )
    response["Content-Security-Policy"] = PAGE_CSP
    response["Cache-Control"] = "public, max-age=300"
    response["Vary"] = "User-Agent"
    if page.noindex:
        response["X-Robots-Tag"] = "noindex"
    return response


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def page_meta(request):
    """Metadata of a site path for the SPA (title, description, canonical, share image, JSON-LD)."""
    try:
        page = resolve(request.query_params.get("path", "/")[:300])
    except Http404:
        return Response({"detail": "Không tìm thấy trang."}, status=404)
    return Response(meta(page))


@require_GET
def sitemap(request):
    base = base_url()
    pages = ("/", "/khoa-hoc", "/ve-chung-toi", "/tin-tuc", "/chinh-sach-bao-mat", "/dieu-khoan")
    urls = [(f"{base}{p}", None) for p in pages]
    if _programs().exists():
        urls.append((f"{base}/chuong-trinh", None))
    urls += [(f"{base}/khoa-hoc/{c.slug}", c.updated_at) for c in _courses()]
    urls += [(f"{base}/chuong-trinh/{p.slug}", p.updated_at) for p in _programs()]
    urls += [(f"{base}/tin-tuc/{a.slug}", a.updated_at) for a in _articles()]
    rows = "".join(
        f"<url><loc>{loc}</loc>" + (f"<lastmod>{at.date().isoformat()}</lastmod>" if at else "") + "</url>"
        for loc, at in urls
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{rows}</urlset>'
    return HttpResponse(
        xml, content_type="application/xml; charset=utf-8", headers={"Cache-Control": "public, max-age=3600"}
    )


ALWAYS_DISALLOWED = ("/app", "/api/", "/learn", "/tai-khoan", "/_seo/")


@require_GET
def robots(request):
    """Staff's robots.txt (SEO settings) with the private areas always disallowed and the right sitemap."""
    custom = str(site_seo().get("robots_txt") or "")
    lines = [line for line in custom.splitlines() if line.strip() and not line.lower().startswith("sitemap:")]
    if not any(line.lower().startswith("user-agent") for line in lines):
        lines.insert(0, "User-agent: *")
    lines += [f"Disallow: {p}" for p in ALWAYS_DISALLOWED if f"Disallow: {p}" not in lines]
    lines.append(f"Sitemap: {base_url()}/sitemap.xml")
    return HttpResponse("\n".join(lines) + "\n", content_type="text/plain; charset=utf-8")
