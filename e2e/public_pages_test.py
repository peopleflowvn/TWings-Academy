"""
Every public page in a real browser (desktop and phone), against a running stack seeded with
e2e/seed.py: each course, article and program page from the public API, plus the static pages. A page
fails on a JS error, a 5xx, a blank page, a horizontal scroll, or raw values on screen ("undefined",
"NaN", an ISO time). Data-dependent crashes (a field the API leaves out) are caught here.

    E2E_BASE=http://127.0.0.1:3005 E2E_API=http://127.0.0.1:8000 python e2e/public_pages_test.py
"""

import json
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3005")
API = os.environ.get("E2E_API", "http://127.0.0.1:8000")
RAW_VALUES = ("undefined", "NaN", "T00:00:00", "[object Object]")


def get(path):
    with urllib.request.urlopen(API + path, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
    return data.get("results", data) if isinstance(data, dict) else data


def search_works(page) -> list[str]:
    """Header search: a course found from words of its title typed without accents opens; Enter opens the catalogue."""
    import unicodedata

    problems = []
    course = get("/api/v1/public/courses/")[0]
    plain = unicodedata.normalize("NFD", course["title"]).encode("ascii", "ignore").decode().replace("đ", "d").lower()
    query = " ".join(plain.split()[:3])  # e.g. "quan he khach"
    page.goto(BASE + "/", wait_until="load")
    box = page.locator("header input[type=search]").first
    box.click()
    box.fill(query)
    try:
        page.locator("[role=listbox] a", has_text=course["title"]).first.click(timeout=15000)
        page.wait_for_url(lambda url: url.rstrip("/").endswith(f"/khoa-hoc/{course['slug']}"), timeout=20000)
    except Exception as exc:  # noqa: BLE001
        problems.append(f"suggestion for {query!r} did not open {course['slug']}: {exc}")
    page.goto(BASE + "/", wait_until="load")
    box = page.locator("header input[type=search]").first
    box.click()
    box.fill(query)
    try:
        # Suggestions shown = the page has the query (slow CI runners: Enter must not race the typing).
        page.wait_for_selector("[role=listbox]", timeout=15000)
        box.press("Enter")
        page.wait_for_url(lambda url: "/khoa-hoc" in url and "q=" in url, timeout=20000)
        page.wait_for_selector("text=khóa học phù hợp", timeout=15000)
    except Exception as exc:  # noqa: BLE001
        problems.append(f"Enter did not open the filtered catalogue: {exc}")
    return problems


def homepage_offers_every_course(page, courses) -> list[str]:
    """On the loaded homepage: every course on sale is on a shelf, also one staff put on none (e2e-gdv)."""
    shelves = page.locator("section[id$='-shelf']").all_inner_texts()
    return [f"{c['slug']} not on any homepage shelf" for c in courses if not any(c["title"] in t for t in shelves)]


def main() -> int:
    paths = ["/", "/khoa-hoc", "/tin-tuc", "/ve-chung-toi", "/tuyen-sinh", "/chuong-trinh", "/dieu-khoan", "/chinh-sach-bao-mat"]
    courses = get("/api/v1/public/courses/")
    paths += [f"/khoa-hoc/{c['slug']}" for c in courses]
    paths += [f"/tin-tuc/{a['slug']}" for a in get("/api/v1/public/articles/")]
    paths += [f"/chuong-trinh/{p['slug']}" for p in get("/api/v1/public/programs/")]
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get("E2E_CHANNEL") or None, headless=True)
        search_page = browser.new_page(viewport={"width": 1440, "height": 900}, locale="vi-VN")
        search_problems = search_works(search_page)
        search_page.close()
        print(f"{'FAIL' if search_problems else 'OK  '} search {'; '.join(search_problems)}")
        failures += bool(search_problems)
        for device, viewport in (("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})):
            ctx = browser.new_context(viewport=viewport, locale="vi-VN", is_mobile=device == "phone", has_touch=device == "phone")
            for path in paths:
                page = ctx.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda e, errors=errors: errors.append(f"JS error: {e}"))
                page.on("response", lambda r, errors=errors: r.status >= 500 and errors.append(f"HTTP {r.status} {r.url}"))
                page.goto(BASE + path, wait_until="load", timeout=60000)
                if path == "/":
                    # The live homepage remains on its loader until all public API calls settle.
                    # Two seconds is occasionally too short on shared CI runners.
                    page.wait_for_selector("section[id$='-shelf']", timeout=20000)
                page.wait_for_timeout(2000)
                height = page.evaluate("document.body.scrollHeight")
                width = page.evaluate("document.documentElement.scrollWidth")
                text = page.evaluate("document.body.innerText")
                if height < 500:
                    errors.append(f"blank page (height {height})")
                if width > viewport["width"] + 1:
                    errors.append(f"horizontal scroll ({width}px)")
                errors += [f"raw value on screen: {v}" for v in RAW_VALUES if v in text]
                if path == "/":
                    errors += homepage_offers_every_course(page, courses)
                print(f"{'FAIL' if errors else 'OK  '} {device:7} {path} {'; '.join(errors)}")
                failures += bool(errors)
                page.close()
            ctx.close()
        browser.close()
    print(f"{len(paths) * 2 - failures}/{len(paths) * 2} pages OK")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
