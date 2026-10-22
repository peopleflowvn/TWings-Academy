"""
End-to-end test of the CRM follow-up in a real browser, against a running stack seeded with e2e/seed.py:
a consultant's "Hôm nay của tôi" on a phone (overdue lead, one tap to log the contact), the stage rules
(call-back day, reason to cancel), the unassigned queue and bulk assignment, the consultant report.
Run after admissions_test.py.

    E2E_BASE=http://127.0.0.1:3005 python e2e/crm_test.py
"""

import os
import sys
import traceback
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3005")
OUT = Path(os.environ.get("E2E_ARTIFACTS", Path(__file__).parent / "artifacts"))
PASSWORD = "E2e-Test-Passw0rd!"
results: list[tuple[str, str]] = []
problems: list[str] = []


def login(page: Page, email: str):
    page.goto(f"{BASE}/app")
    page.locator("input:not([type=password]):not([type=checkbox])").first.fill(email)
    page.fill("input[type=password]", PASSWORD)
    page.keyboard.press("Enter")
    page.wait_for_selector("text=Tuyển sinh & Bán hàng", timeout=20000)


def my_day_on_a_phone(page: Page):
    login(page, "tuvan@e2e.test")
    page.goto(f"{BASE}/app/sales/today")
    page.wait_for_selector("h1:has-text('Hôm nay của tôi')", timeout=20000)
    width = page.evaluate("document.documentElement.scrollWidth")
    assert width <= 391, f"horizontal scroll on a phone ({width}px)"
    overdue = page.locator("section:has(h2:has-text('Quá hạn liên hệ lần đầu'))")
    assert overdue.locator("text=Đỗ Văn Hùng").count() == 1, "the overdue lead is listed"
    assert overdue.locator("a[href^='tel:']").count() >= 1, "one tap to call"
    overdue.locator("div:has-text('Đỗ Văn Hùng') >> button:has-text('Đã liên hệ')").first.click()
    page.wait_for_timeout(2000)
    assert overdue.locator("text=Đỗ Văn Hùng").count() == 0, "logged contact leaves the overdue list"


def stage_rules(page: Page):
    login(page, "admin@e2e.test")
    page.goto(f"{BASE}/app/sales/crm?view=kanban&campaignId=all&layout=table")
    page.wait_for_selector("text=Trần Thị Bình", timeout=20000)
    row = page.locator("tr:has-text('Trần Thị Bình')")
    row.locator("select").first.select_option(label="Chăm sóc lại")
    page.wait_for_selector("text=Ngày gọi lại", timeout=10000)
    page.locator("button:has-text('Ngày mai')").click()
    page.locator("button:has-text('Hẹn gọi lại')").click()
    page.wait_for_timeout(2000)
    assert "Chăm sóc lại" in row.locator("select").first.input_value(), "moved after the call-back day"
    row.locator("select").first.select_option(label="Đã hủy")
    page.wait_for_selector("text=Lý do", timeout=10000)
    page.locator("label:has-text('Học phí cao')").click()
    page.locator("[role=dialog] button:has-text('Hủy đăng ký')").click()
    page.wait_for_timeout(2000)
    assert "Đã hủy" in row.locator("select").first.input_value(), "cancelled with a reason"


def unassigned_queue_and_bulk_assign(page: Page):
    page.goto(f"{BASE}/app/sales/consulting")
    page.wait_for_selector("text=Lead chưa có tư vấn viên", timeout=20000)
    queue = page.locator("section:has(h2:has-text('Lead chưa có tư vấn viên'))")
    queue.locator("thead input[type=checkbox]").check()
    queue.locator("select").select_option(index=1)  # the first consultant
    queue.locator("button:has-text('Giao')").click()
    page.wait_for_timeout(2500)
    assert page.locator("text=Lead chưa có tư vấn viên").count() == 0, "queue emptied"


def consultant_report(page: Page):
    page.goto(f"{BASE}/app/reports")
    page.wait_for_selector("text=Hiệu suất tư vấn viên", timeout=20000)
    card = page.locator("div:has(> div > h3:has-text('Hiệu suất tư vấn viên')), section:has-text('Hiệu suất tư vấn viên')").first
    assert card.locator("text=Tư vấn Lan").count() >= 1, "a row per consultant"
    assert page.locator("text=Học phí cao").count() >= 1, "lost reason reported"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get("E2E_CHANNEL") or None, headless=True)
        phone = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="vi-VN")
        desk = browser.new_context(viewport={"width": 1440, "height": 900}, locale="vi-VN")
        steps = [(phone, my_day_on_a_phone), (desk, stage_rules), (desk, unassigned_queue_and_bulk_assign), (desk, consultant_report)]
        pages = {}
        for ctx, fn in steps:
            page = pages.setdefault(id(ctx), ctx.new_page())
            if len(pages) and not getattr(page, "_hooked", False):
                page.on("pageerror", lambda e: problems.append(f"JS error: {e}"))
                page.on("dialog", lambda d: d.accept())
                page.on(
                    "response",
                    lambda r: r.status >= 500 and "/api/" in r.url and problems.append(f"HTTP {r.status} {r.url}"),
                )
                page._hooked = True
            try:
                fn(page)
                results.append(("OK", fn.__name__))
            except Exception as exc:  # noqa: BLE001
                results.append(("FAIL", f"{fn.__name__}: {exc}"))
                traceback.print_exc()
                page.screenshot(path=str(OUT / f"crm-{fn.__name__}.png"))
        browser.close()
    for status, name in results:
        print(f"{status:5} {name}")
    for problem in dict.fromkeys(problems):
        print("PROBLEM", problem)
    return 1 if problems or any(s == "FAIL" for s, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())
