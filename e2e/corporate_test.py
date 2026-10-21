"""
End-to-end test of corporate training (/app/corporate/*) in a real browser, against a running stack
seeded with e2e/seed.py: client + contract with a rate, a plan approved then used to open a class, a
learner listed with a line manager, the class schedule, a transfer. Exits non-zero on a failed step,
a JS error or a 5xx.

    E2E_BASE=http://127.0.0.1:3005 python e2e/corporate_test.py
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


def modal(page: Page):
    return page.locator("div.fixed.inset-0").last


def field(scope, label: str):
    """The input / select / textarea inside the <label> that starts with this text."""
    return scope.locator("label", has_text=label).first.locator("input, select, textarea").first


@step
def login(page: Page):
    page.goto(f"{BASE}/app")
    page.locator("input:not([type=password]):not([type=checkbox])").first.fill("admin@e2e.test")
    page.fill("input[type=password]", PASSWORD)
    page.keyboard.press("Enter")
    page.wait_for_selector("text=Đào tạo doanh nghiệp", timeout=20000)


@step
def client_with_contract_and_rate(page: Page):
    page.goto(f"{BASE}/app/corporate/clients")
    page.locator("button:has-text('Thêm khách hàng')").click()
    m = modal(page)
    field(m, "Tên khách hàng").fill("Ngân hàng E2E")
    field(m, "Mã viết tắt").fill("NHE2E")
    field(m, "Tên miền email").fill("nhe2e.test")
    m.locator("button:has-text('Lưu')").click()
    page.wait_for_selector("text=NHE2E – Ngân hàng E2E", timeout=20000)
    assert page.locator("text=Pháp nhân").count() >= 1, "a client starts with its legal entity"

    page.locator("button:has-text('Thêm hợp đồng')").click()
    m = modal(page)
    field(m, "Số hợp đồng").fill("HD-E2E-01")
    field(m, "Trạng thái").select_option("active")
    m.locator("button:has-text('Thêm đơn giá')").click()
    m.locator("input[placeholder='Đơn giá (đ)']").fill("2000000")
    m.locator("button:has-text('Lưu hợp đồng')").click()
    page.wait_for_selector("td:has-text('HD-E2E-01')", timeout=20000)


@step
def plan_approved_then_opens_a_class(page: Page):
    page.goto(f"{BASE}/app/corporate/plans")
    page.locator("button:has-text('Thêm kế hoạch')").click()
    m = modal(page)
    field(m, "Khách hàng").select_option(label="NHE2E – Ngân hàng E2E")
    field(m, "Tên kế hoạch").fill("Kế hoạch E2E")
    m.locator("button:has-text('Tạo')").click()
    page.wait_for_selector("text=Kế hoạch E2E · v1", timeout=20000)
    page.locator("button:has-text('Thêm dòng')").click()
    row = page.locator("tbody tr").first
    row.locator("input").first.fill("Kỹ năng bán hàng")
    row.locator("select").first.select_option(label="E2E RM Doanh nghiệp")
    page.locator("button:has-text('Lưu các dòng')").click()
    page.wait_for_timeout(1000)
    page.locator("button:has-text('Duyệt')").click()  # the confirm dialog is accepted by the harness
    page.wait_for_selector("text=Đã duyệt", timeout=20000)

    page.locator("button:has-text('Tạo lớp')").first.click()
    page.wait_for_selector("text=Tạo lớp doanh nghiệp", timeout=20000)
    m = modal(page)
    field(m, "Tên lớp").fill("NHE2E – Bán hàng – Lớp 1")
    field(m, "Hợp đồng").select_option(label="HD-E2E-01")
    m.locator("button:has-text('Lưu')").click()
    page.wait_for_selector("h2:has-text('NHE2E – Bán hàng – Lớp 1')", timeout=20000)
    assert page.locator("text=HĐ HD-E2E-01").count() == 1, "the class keeps its contract"


@step
def learner_listed_with_manager(page: Page):
    field(page, "Họ tên").fill("Trần Thị E2E")
    field(page, "Email").fill("tran.e2e@nhe2e.test")
    field(page, "Mã nhân viên").fill("NV001")
    field(page, "CBQL – email").fill("quanly@nhe2e.test")
    page.locator("button:has-text('Thêm vào lớp')").click()
    page.wait_for_selector("td:has-text('Trần Thị E2E')", timeout=20000)
    assert page.locator("text=quanly@nhe2e.test").count() == 1, "line manager on the list"


@step
def roster_imported_from_excel(page: Page):
    from openpyxl import Workbook

    book = Workbook()
    for row in (
        ["DANH SÁCH CỬ ĐI HỌC"],
        [],
        ["STT", "Họ và tên", "Mã CBNV", "Email", "Phòng ban", "Email CBQL"],
        [1, "Lê Văn Nhập", "NV002", "nhap@nhe2e.test", "Khối Bán lẻ", "quanly@nhe2e.test"],
        [2, "Không Có Email", "NV003", "", "", ""],
    ):
        book.active.append(row)
    path = OUT / "dshv_e2e.xlsx"
    book.save(path)
    page.locator("button:has-text('Nhập từ Excel')").click()
    m = modal(page)
    m.locator("input[type=file]").set_input_files(str(path))
    page.wait_for_selector("text=1 thêm", timeout=20000)
    assert m.locator("text=Thiếu email").count() == 1, "row without e-mail flagged"
    m.locator("button:has-text('Nhập 1 dòng')").click()
    page.wait_for_selector("text=Đã nhập 1 dòng", timeout=20000)
    m.locator("button").first.click()  # close
    page.wait_for_selector("td:has-text('Lê Văn Nhập')", timeout=20000)


@step
def class_schedule(page: Page):
    page.locator("button:has-text('Lịch học')").click()
    page.wait_for_selector("text=Tạo nhanh theo mẫu", timeout=20000)
    m = modal(page)
    m.locator("input[type=number]").first.fill("3")
    m.locator("button:has-text('Tạo lịch')").click()
    m.locator("button:has-text('Lưu lịch')").click()
    # Saved; without Moodle (CI) the editor says the calendar could not be pushed yet.
    page.wait_for_selector("text=/Đã lưu 3 buổi|LMS chưa cấu hình/", timeout=20000)
    m.locator("button").first.click()  # close
    page.wait_for_selector("text=· 3 buổi", timeout=20000)


@step
def invitations_with_manager_in_cc(page: Page):
    page.locator("button:has-text('Gửi thư mời')").click()
    dialog = page.locator("div.fixed.inset-0", has_text="Thư mời học")
    row = dialog.locator("tr", has_text="tran.e2e@nhe2e.test")
    row.wait_for(timeout=20000)  # the preview (the class list behind shows the same e-mail)
    assert row.locator("td:has-text('quanly@nhe2e.test')").count() == 1, "line manager in CC"
    dialog.locator("button:has-text('Gửi 2 thư mời')").click()
    page.wait_for_selector("text=Đã gửi 2 thư", timeout=20000)
    dialog.locator("button").first.click()  # close
    page.wait_for_selector("text=Đã gửi thư mời", timeout=20000)


@step
def attendance_tab(page: Page):
    page.locator("button:has-text('Điểm danh')").first.click()
    page.wait_for_selector("text=Buổi học & mã QR điểm danh", timeout=20000)
    # Without Moodle (CI) the sessions are listed but not on Moodle yet; the sheet lists the learners.
    assert page.locator("text=chưa lên Moodle").count() == 3, "three sessions"
    assert page.locator("td:has-text('Trần Thị E2E')").count() == 1, "learner row in the sheet"


@step
def surveys_tab(page: Page):
    page.locator("button:has-text('Khảo sát')").first.click()
    page.wait_for_selector("text=Lớp chưa có khảo sát nào trên Moodle", timeout=20000)


@step
def corporate_class_is_not_an_intake_for_sale(page: Page):
    page.goto(f"{BASE}/app/sales/intakes")
    page.wait_for_selector("text=E2E K9", timeout=20000)
    assert page.locator("text=NHE2E – Bán hàng – Lớp 1").count() == 0, "corporate class listed as an intake"


@step
def transfer_to_another_class(page: Page):
    page.goto(f"{BASE}/app/corporate/classes")
    page.locator("button:has-text('Tạo lớp')").click()
    m = modal(page)
    field(m, "Khách hàng").select_option(label="NHE2E – Ngân hàng E2E")
    field(m, "Khóa học").select_option(label="E2E RM Doanh nghiệp")
    field(m, "Tên lớp").fill("NHE2E – Bán hàng – Lớp 2")
    m.locator("button:has-text('Lưu')").click()
    page.wait_for_selector("h2:has-text('NHE2E – Bán hàng – Lớp 2')", timeout=20000)

    page.goto(f"{BASE}/app/corporate/classes")
    page.locator("td:has-text('NHE2E – Bán hàng – Lớp 1')").click()
    page.wait_for_selector("td:has-text('Trần Thị E2E')", timeout=20000)
    page.locator("tr", has_text="Trần Thị E2E").locator("button[title='Chuyển lớp']").click()
    m = modal(page)
    m.locator("select").select_option(label="NHE2E – Bán hàng – Lớp 2 · E2E RM Doanh nghiệp")
    m.locator("button:has-text('Chuyển')").click()
    page.wait_for_selector("td:has-text('Đã chuyển lớp')", timeout=20000)


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
                page.screenshot(path=str(OUT / f"corporate_{fn.__name__}.png"))
        browser.close()
    for status, name in results:
        print(f"{status:5} {name}")
    serious = [p for p in dict.fromkeys(problems) if not p.startswith("dialog: ")]
    for problem in serious:
        print("PROBLEM", problem)
    return 1 if serious or any(s == "FAIL" for s, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())
