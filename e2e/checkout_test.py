"""
End-to-end test of buying a course in a real browser, against a running stack seeded with e2e/seed.py:
the course page's VietQR checkout shows the server's hold time, then finance credits a transfer that
had no order code to that order. Run after admissions_test.py (it adds a registration).

    E2E_BASE=http://127.0.0.1:3005 python e2e/checkout_test.py
"""

import os
import re
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
state: dict = {}


def step(fn):
    STEPS.append(fn)
    return fn


@step
def checkout_shows_the_hold(page: Page):
    page.goto(f"{BASE}/khoa-hoc/e2e-rm")
    page.locator("button:has-text('Hoặc thanh toán ngay bằng VietQR')").first.click()
    form = page.locator("form:has(button:has-text('Tạo Mã Thanh Toán VietQR'))")
    form.locator("input[placeholder='Họ và tên *']").fill("Học Viên Thanh Toán")
    form.locator("input[placeholder='Email *']").fill("thanhtoan@example.com")
    form.locator("input[placeholder='Số điện thoại *']").fill("0912999888")
    assert "E2E K9" in form.locator("label:has-text('Đợt khai giảng') select").inner_text(), "intake picker"
    form.locator("label:has-text('Tôi đồng ý để TWings Academy') input[type=checkbox]").check()
    form.locator("label:has-text('Tôi đã đọc và đồng ý') input[type=checkbox]").check()
    form.locator("button:has-text('Tạo Mã Thanh Toán VietQR')").click()
    page.wait_for_selector("text=Giữ chỗ và giá đến", timeout=20000)
    code = re.search(r"TW[0-9A-Z]{8}", page.locator("body").inner_text())  # the transfer memo
    assert code, "order code on the QR screen"
    state["order"] = code.group(0)


@step
def finance_credits_a_transfer_without_order_code(page: Page):
    page.goto(f"{BASE}/app")
    page.locator("input:not([type=password]):not([type=checkbox])").first.fill("admin@e2e.test")
    page.fill("input[type=password]", PASSWORD)
    page.keyboard.press("Enter")
    page.wait_for_selector("text=Tuyển sinh & Bán hàng", timeout=20000)
    page.goto(f"{BASE}/app/finance/transactions?status=unmatched")
    page.wait_for_selector("text=CHUYEN TIEN HOC PHI E2E", timeout=20000)
    row = page.locator("tr:has-text('CHUYEN TIEN HOC PHI E2E')")
    row.locator("input[placeholder='Mã đơn TW…']").fill(state["order"])
    row.locator("button:has-text('Ghi nhận vào đơn')").click()  # the confirm dialog is accepted
    page.wait_for_selector(f"tr:has-text('CHUYEN TIEN HOC PHI E2E') >> text=Kế toán ghi nhận vào {state['order']}", timeout=20000)
    assert row.locator("text=Đã khớp").count() == 1


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
    serious = [p for p in dict.fromkeys(problems) if not p.startswith("dialog: ")]
    for problem in serious:
        print("PROBLEM", problem)
    return 1 if serious or any(s == "FAIL" for s, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())
