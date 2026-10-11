"""
End-to-end test of the admissions screens (/app/sales/*) in a real browser, against a running stack
seeded with e2e/seed.py. Exits non-zero when a step fails or the browser reports a JS error / a 5xx.

    E2E_BASE=http://127.0.0.1:3005 python e2e/admissions_test.py
    E2E_CHANNEL=chrome  (optional: use the installed Chrome instead of Playwright's Chromium)
"""

import os
import sys
import traceback
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:3005")
OUT = Path(os.environ.get("E2E_ARTIFACTS", Path(__file__).parent / "artifacts"))
PASSWORD = "E2e-Test-Passw0rd!"
STEPS = []
results: list[tuple[str, str]] = []
problems: list[str] = []


def step(fn):
    STEPS.append(fn)
    return fn


def workspace_open(page: Page) -> bool:
    return page.locator("button:has-text('Chép link')").count() == 1


@step
def login(page: Page):
    page.goto(f"{BASE}/app")
    page.locator("input:not([type=password]):not([type=checkbox])").first.fill("admin@e2e.test")
    page.fill("input[type=password]", PASSWORD)
    page.keyboard.press("Enter")
    page.wait_for_selector("text=Tuyển sinh & Bán hàng", timeout=20000)


@step
def pipeline_counts_and_sla(page: Page):
    page.goto(f"{BASE}/app/sales/crm?view=kanban&campaignId=all")
    page.wait_for_selector("text=Nguyễn Văn An", timeout=20000)
    assert page.locator("text=37 lead").count() >= 1, "pipeline total"
    assert page.locator("text=Quá hạn").count() >= 1, "late first response badge"


@step
def kanban_column_loads_more(page: Page):
    more = page.locator("button:has-text('Xem thêm (2 lead nữa)')")
    assert more.count() == 1, "the 'care again' column should offer 2 more leads"
    more.click()
    page.wait_for_selector("text=Lead chăm sóc 00", timeout=20000)
    assert page.locator("button:has-text('Xem thêm')").count() == 0


@step
def workspace_note_and_stage_keep_it_open(page: Page):
    page.locator("text=Phạm Thị Dung").first.click()
    page.wait_for_selector("text=Mở hồ sơ học viên", timeout=20000)
    page.locator("button:has-text('Nhật ký')").first.click()
    page.fill("textarea[placeholder^='Ghi lại chi tiết']", "Đã gọi, hẹn gọi lại thứ Hai")
    page.locator("button:has-text('Ghi Nhật Ký')").click()
    page.wait_for_selector("text=Đã gọi, hẹn gọi lại thứ Hai", timeout=20000)
    assert workspace_open(page), "workspace closed after a note"
    assert page.locator("text=T21:").count() == 0 and page.locator("text=+07:00").count() == 0, "raw timestamps"
    page.locator("button[title='3. Đang tư vấn']").click()
    page.wait_for_timeout(1500)
    assert workspace_open(page), "workspace closed after a stage change"


@step
def workspace_email_has_no_sample_account(page: Page):
    page.locator("button:has-text('Gửi email')").first.click()
    page.wait_for_selector("text=Gửi email cho học viên", timeout=20000)
    page.locator("text=Thông Báo Học Phí").first.click()
    page.wait_for_timeout(1500)
    html = page.content() + "".join(f.content() for f in page.frames[1:])
    assert "03001010099999" not in html, "sample bank account in the tuition e-mail"
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    assert not workspace_open(page), "Esc did not close the workspace"


@step
def add_lead_and_table(page: Page):
    page.locator("button:has-text('Thêm lead')").click()
    form = page.locator("form").last
    form.locator("input").nth(0).fill("Võ Thị Em")
    form.locator("input").nth(1).fill("0912000009")
    form.locator("select").first.select_option(label="E2E Giao dịch viên")
    page.locator("button:has-text('Tạo lead')").click()
    page.wait_for_selector("text=Mở hồ sơ học viên", timeout=20000)
    page.keyboard.press("Escape")
    page.wait_for_timeout(800)
    page.locator("button:has-text('Bảng chi tiết')").click()
    page.wait_for_selector("th:has-text('Tư vấn viên')", timeout=20000)
    assert page.locator("tbody tr").count() >= 6
    assert page.locator("text=38 lead").count() >= 1, "table: 37 + the new lead"


@step
def learner_with_two_registrations(page: Page):
    page.goto(f"{BASE}/app/sales/learners")
    page.wait_for_selector("tr:has-text('Nguyễn Văn An')", timeout=20000)
    page.locator("tr:has-text('Nguyễn Văn An')").click()
    page.wait_for_selector("text=Khóa đã đăng ký (2)", timeout=20000)
    page.locator("button:has-text('Thông tin cá nhân')").click()
    page.locator("label:has-text('Ngành học') input").fill("Kế toán")
    page.locator("button:has-text('Lưu thông tin')").click()
    page.wait_for_selector("text=Đã lưu", timeout=20000)


@step
def campaign_quota_and_new_campaign(page: Page):
    page.goto(f"{BASE}/app/sales/crm?view=campaigns")
    page.wait_for_selector("text=CAMP-E2E", timeout=20000)
    page.locator("button[title='Sửa chiến dịch, chỉ tiêu']").first.click()
    page.wait_for_selector("text=Khóa học & chỉ tiêu theo khóa", timeout=20000)
    assert page.locator("text=0/10 đã đóng phí").count() == 1, "course quota progress"
    page.locator("button:has-text('Hủy')").click()
    page.goto(f"{BASE}/app/sales/crm?view=campaigns&action=new_campaign")
    page.wait_for_selector("text=Chiến dịch tuyển sinh mới", timeout=20000)
    page.locator("label:has-text('Mã chiến dịch') input").fill("CAMP-UI")
    page.locator("label:has-text('Tên chiến dịch') input").fill("Chiến dịch tạo từ UI")
    page.locator("label:has-text('Chỉ tiêu tổng') input").fill("20")
    page.locator("button:has-text('Thêm khóa')").click()
    page.locator("table select").last.select_option(label="E2E Giao dịch viên")
    page.locator("table input[type=number]").last.fill("20")
    page.locator("button:has-text('Tạo chiến dịch')").click()
    page.wait_for_selector("h2:has-text('Chiến dịch tuyển sinh mới')", state="detached", timeout=20000)
    page.wait_for_timeout(2500)
    page.goto(f"{BASE}/app/sales/crm?view=campaigns")
    page.wait_for_selector("text=CAMP-UI", timeout=20000)


@step
def other_sales_pages(page: Page):
    for path, marker in (
        ("/app/sales/consulting", "Lịch hẹn tư vấn sắp tới"),
        ("/app/sales/intakes", "E2E K9"),
        ("/app/content/email", "Mẫu"),
    ):
        page.goto(f"{BASE}{path}")
        page.wait_for_selector(f"text={marker}", timeout=20000)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get("E2E_CHANNEL") or None, headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900}, locale="vi-VN")
        page.on("pageerror", lambda e: problems.append(f"JS error: {e}"))
        page.on("dialog", lambda d: (problems.append(f"dialog: {d.message[:200]}"), d.accept()))
        page.on(
            "response",
            lambda r: r.status >= 500 and "/api/" in r.url and problems.append(f"HTTP {r.status} {r.url}"),
        )
        for fn in STEPS:
            try:
                fn(page)
                results.append(("OK", fn.__name__))
            except Exception as exc:  # noqa: BLE001
                results.append(("FAIL", f"{fn.__name__}: {exc}"))
                traceback.print_exc()
                page.screenshot(path=str(OUT / f"{fn.__name__}.png"))
        browser.close()
    for status, name in results:
        print(f"{status:5} {name}")
    # Alerts the app shows on purpose (confirmations) are fine; server errors and JS errors are not.
    serious = [p for p in dict.fromkeys(problems) if not p.startswith("dialog: ")]
    for problem in serious:
        print("PROBLEM", problem)
    return 1 if serious or any(s == "FAIL" for s, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())
