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


def modal(page: Page, title: str):
    """The open dialog showing this text (never just "the last overlay": other layers exist)."""
    dialog = page.locator("div.fixed.inset-0", has_text=title).last
    dialog.wait_for(timeout=20000)
    return dialog


def close(dialog):
    dialog.locator("button").first.click()  # the X in the dialog header
    dialog.wait_for(state="detached", timeout=20000)


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
    m = modal(page, "Tên khách hàng")
    field(m, "Tên khách hàng").fill("Ngân hàng E2E")
    field(m, "Mã viết tắt").fill("NHE2E")
    field(m, "Tên miền email").fill("nhe2e.test")
    m.locator("button:has-text('Lưu')").click()
    page.wait_for_selector("text=NHE2E – Ngân hàng E2E", timeout=20000)
    page.locator("text=Pháp nhân").first.wait_for(timeout=20000)  # a client starts with its legal entity

    page.locator("button:has-text('Thêm hợp đồng')").click()
    m = modal(page, "Số hợp đồng")
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
    m = modal(page, "Tên kế hoạch")
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
    m = modal(page, "Tạo lớp doanh nghiệp")
    field(m, "Tên lớp").fill("NHE2E – Bán hàng – Lớp 1")
    field(m, "Hợp đồng").select_option(label="HD-E2E-01")
    m.locator("button:has-text('Lưu')").click()
    page.wait_for_selector("h2:has-text('NHE2E – Bán hàng – Lớp 1')", timeout=20000)
    page.locator("text=HĐ HD-E2E-01").wait_for(timeout=20000)  # the class keeps its contract


@step
def learner_listed_with_manager(page: Page):
    field(page, "Họ tên").fill("Trần Thị E2E")
    field(page, "Email").fill("tran.e2e@nhe2e.test")
    field(page, "Mã nhân viên").fill("NV001")
    field(page, "CBQL – email").fill("quanly@nhe2e.test")
    page.locator("button:has-text('Thêm vào lớp')").click()
    page.wait_for_selector("td:has-text('Trần Thị E2E')", timeout=20000)
    page.locator("td:has-text('quanly@nhe2e.test')").first.wait_for(timeout=20000)  # line manager listed


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
    m = modal(page, "Nhập danh sách học viên từ Excel")
    m.locator("input[type=file]").set_input_files(str(path))
    m.locator("text=1 thêm").wait_for(timeout=20000)
    m.locator("text=Thiếu email").wait_for(timeout=20000)  # the row without e-mail is flagged
    m.locator("button:has-text('Nhập 1 dòng')").click()
    m.locator("text=Đã nhập 1 dòng").wait_for(timeout=20000)
    close(m)
    page.wait_for_selector("td:has-text('Lê Văn Nhập')", timeout=20000)


@step
def class_schedule(page: Page):
    page.locator("button:has-text('Lịch học')").click()
    m = modal(page, "Tạo nhanh theo mẫu")
    m.locator("input[type=number]").first.fill("3")
    m.locator("button:has-text('Tạo lịch')").click()
    m.locator("button:has-text('Lưu lịch')").click()
    # Saved; without Moodle (CI) the editor says the calendar could not be pushed yet.
    m.locator("text=/Đã lưu 3 buổi|LMS chưa cấu hình/").wait_for(timeout=20000)
    close(m)
    page.wait_for_selector("text=· 3 buổi", timeout=20000)


@step
def invitations_with_manager_in_cc(page: Page):
    page.locator("button:has-text('Gửi thư mời')").click()
    dialog = modal(page, "Thư mời học")
    row = dialog.locator("tr", has_text="tran.e2e@nhe2e.test")
    row.locator("td:has-text('quanly@nhe2e.test')").wait_for(timeout=20000)  # line manager in CC
    dialog.locator("button:has-text('Gửi 2 thư mời')").click()
    dialog.locator("text=Đã gửi 2 thư").wait_for(timeout=20000)
    close(dialog)
    page.wait_for_selector("text=Đã gửi thư mời", timeout=20000)


@step
def attendance_tab(page: Page):
    page.locator("button:has-text('Điểm danh')").first.click()
    page.wait_for_selector("text=Buổi học & mã QR điểm danh", timeout=20000)
    # Without Moodle (CI) the sessions are listed but not on Moodle yet; the sheet lists the learners.
    page.locator("text=chưa lên Moodle").nth(2).wait_for(timeout=20000)
    page.locator("td:has-text('Trần Thị E2E')").first.wait_for(timeout=20000)


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
    m = modal(page, "Tạo lớp doanh nghiệp")
    field(m, "Khách hàng").select_option(label="NHE2E – Ngân hàng E2E")
    field(m, "Khóa học").select_option(label="E2E RM Doanh nghiệp")
    field(m, "Tên lớp").fill("NHE2E – Bán hàng – Lớp 2")
    m.locator("button:has-text('Lưu')").click()
    page.wait_for_selector("h2:has-text('NHE2E – Bán hàng – Lớp 2')", timeout=20000)

    page.goto(f"{BASE}/app/corporate/classes")
    page.locator("td:has-text('NHE2E – Bán hàng – Lớp 1')").click()
    page.wait_for_selector("td:has-text('Trần Thị E2E')", timeout=20000)
    page.locator("tr", has_text="Trần Thị E2E").locator("button[title='Chuyển lớp']").click()
    m = modal(page, "Chuyển lớp – Trần Thị E2E")
    m.locator("select").select_option(label="NHE2E – Bán hàng – Lớp 2 · E2E RM Doanh nghiệp")
    m.locator("button:has-text('Chuyển')").click()
    page.wait_for_selector("td:has-text('Đã chuyển lớp')", timeout=20000)


@step
def results_published_and_locked(page: Page):
    # Class 2 now has the transferred learner; no completion condition set: everyone passes.
    page.goto(f"{BASE}/app/corporate/classes")
    page.locator("td:has-text('NHE2E – Bán hàng – Lớp 2')").click()
    page.locator("button:has-text('Kết quả')").first.click()
    page.locator("button:has-text('Tính kết quả')").click()
    page.wait_for_selector("text=Phiên bản 1 · Bản nháp", timeout=20000)
    page.locator("td:has-text('Trần Thị E2E')").wait_for(timeout=20000)
    page.locator("button:has-text('Phát hành')").click()  # confirm accepted by the harness
    page.wait_for_selector("text=Phiên bản 1 · Đã phát hành", timeout=20000)
    # The class reloads after publishing: locked, it offers to reopen.
    page.wait_for_selector("button:has-text('Mở lại để sửa')", timeout=20000)


@step
def results_emailed_after_approval(page: Page):
    page.locator("button:has-text('Truyền thông')").first.click()
    page.locator("button:has-text('Tạo lô thư kết quả')").click()
    dialog = modal(page, "Lời nhắn")
    dialog.locator("textarea").fill("Cảm ơn anh chị đã tham gia.")
    dialog.locator("button:has-text('Tạo lô')").click()
    page.wait_for_selector("text=Chờ duyệt", timeout=20000)
    page.wait_for_selector("td:has-text('quanly@nhe2e.test')", timeout=20000)  # manager in CC, frozen
    page.get_by_role("button", name="Duyệt", exact=True).click()  # not the header saying "Chờ duyệt"
    page.wait_for_selector("text=Đã duyệt lô thư", timeout=20000)
    page.locator("button:has-text('Gửi 1 thư')").click()
    page.wait_for_selector("text=Đã gửi 1 thư", timeout=20000)


@step
def acceptance_from_published_results(page: Page):
    # Class 1 is on contract HD-E2E-01 (2.000.000 đ per learner); its remaining learner is billed.
    page.goto(f"{BASE}/app/corporate/classes")
    page.locator("td:has-text('NHE2E – Bán hàng – Lớp 1')").click()
    page.locator("button:has-text('Kết quả')").first.click()
    page.locator("button:has-text('Tính kết quả')").click()
    page.wait_for_selector("text=Phiên bản 1 · Bản nháp", timeout=20000)
    page.locator("button:has-text('Phát hành')").click()
    page.wait_for_selector("text=Phiên bản 1 · Đã phát hành", timeout=20000)

    page.goto(f"{BASE}/app/corporate/acceptance")
    page.locator("button:has-text('Lập đợt nghiệm thu')").click()
    m = modal(page, "Lập đợt nghiệm thu")
    field(m, "Khách hàng").select_option(label="NHE2E – Ngân hàng E2E")
    field(m, "Hợp đồng").select_option(label="HD-E2E-01")
    m.locator("text=NHE2E – Bán hàng – Lớp 1").wait_for(timeout=20000)  # the eligible class
    field(m, "Tên đợt").fill("Nghiệm thu đợt 1")
    m.locator("button:has-text('Lập đợt')").click()
    page.wait_for_selector("h2:has-text('Nghiệm thu đợt 1')", timeout=20000)
    page.locator("td:has-text('2.000.000')").first.wait_for(timeout=20000)
    page.locator("button:has-text('Gửi duyệt')").click()
    page.get_by_role("button", name="Duyệt", exact=True).click()
    page.locator("button:has-text('Khách hàng đã nghiệm thu')").click()
    d = modal(page, "Sau bước này")
    field(d, "Số hóa đơn").fill("0000123")
    d.locator("button:has-text('Xác nhận')").click()
    page.wait_for_selector("text=hóa đơn 0000123", timeout=20000)


@step
def documents_checklist(page: Page):
    page.goto(f"{BASE}/app/corporate/classes")
    page.locator("td:has-text('NHE2E – Bán hàng – Lớp 1')").click()
    page.locator("button:has-text('Hồ sơ')").first.click()
    page.wait_for_selector("text=Checklist hồ sơ nghiệm thu", timeout=20000)
    path = OUT / "diem-danh-co-ky.pdf"
    path.write_bytes(b"%PDF-1.4 e2e")
    page.locator("input[type=file]").set_input_files(str(path))
    page.locator("button:has-text('Tải lên')").click()
    page.locator("td:has-text('diem-danh-co-ky.pdf')").wait_for(timeout=20000)
    page.locator("li", has_text="Danh sách điểm danh có ký").locator("text=đã tải lên").wait_for(timeout=20000)


@step
def costs_and_overview(page: Page):
    page.locator("button:has-text('Chi phí')").first.click()
    page.wait_for_selector("text=Ghi nhận khoản chi", timeout=20000)
    field(page, "Nội dung").fill("Thù lao giảng viên")
    field(page, "Số tiền trước thuế").fill("500000")
    page.locator("button:has-text('Ghi nhận')").last.click()
    page.locator("td:has-text('Thù lao giảng viên')").wait_for(timeout=20000)

    page.goto(f"{BASE}/app/corporate/overview")
    page.wait_for_selector("text=Tổng quan đào tạo doanh nghiệp", timeout=20000)
    # Class 1: accepted 2.000.000 đ, cost 500.000 đ -> margin 1.500.000 đ.
    page.locator("tr", has_text="NHE2E – Bán hàng – Lớp 1").locator("text=1.500.000").wait_for(timeout=20000)


@step
def receivables_payment(page: Page):
    # The accepted batch (2.000.000 đ, no VAT): 500.000 đ received -> 1.500.000 đ still owed.
    page.goto(f"{BASE}/app/corporate/receivables")
    page.wait_for_selector("text=Công nợ đào tạo doanh nghiệp", timeout=20000)
    page.locator("tr", has_text="Nghiệm thu đợt 1").locator("button:has-text('Ghi nhận tiền về')").click()
    m = modal(page, "Tiền về – Nghiệm thu đợt 1")
    field(m, "Số tiền").fill("500000")
    field(m, "Chứng từ").fill("UNC-E2E")
    m.locator("button:has-text('Ghi nhận')").click()
    page.locator("tr", has_text="Nghiệm thu đợt 1").locator("td:has-text('1.500.000')").wait_for(timeout=20000)


@step
def shared_cost_allocated(page: Page):
    page.goto(f"{BASE}/app/corporate/clients")
    page.locator("td:has-text('NHE2E')").first.click()
    page.wait_for_selector("text=Chi phí chung theo hợp đồng", timeout=20000)
    box = page.locator("div.space-y-3", has_text="Chi phí chung theo hợp đồng").last  # the card, not its title
    field(box, "Hợp đồng").select_option(label="HD-E2E-01")
    field(box, "Nội dung").fill("Hội trường cả đợt")
    field(box, "Số tiền").fill("300000")
    box.locator("button:has-text('Ghi nhận')").click()
    page.locator("li", has_text="Hội trường cả đợt").wait_for(timeout=20000)
    page.locator("li", has_text="Hội trường cả đợt").locator("button:has-text('Phân bổ')").click()
    page.locator("li", has_text="Hội trường cả đợt").locator("text=đã phân bổ 300.000").wait_for(timeout=20000)



@step
def client_request_with_sla(page: Page):
    page.goto(f"{BASE}/app/corporate/requests")
    page.wait_for_selector("text=Yêu cầu của khách hàng", timeout=20000)
    page.locator("button:has-text('Ghi nhận yêu cầu')").click()
    m = modal(page, "Người yêu cầu")
    field(m, "Tiêu đề").fill("Bổ sung 2 học viên")
    field(m, "Ưu tiên").select_option("urgent")
    field(m, "Người xử lý").select_option(index=1)
    m.locator("button:has-text('Lưu')").click()
    row = page.locator("tr", has_text="Bổ sung 2 học viên")
    row.locator("text=Khẩn").wait_for(timeout=20000)  # deadline computed by the API (4 working hours)

    row.click()
    m = modal(page, "Kết quả xử lý")
    field(m, "Trạng thái").select_option("done")
    field(m, "Kết quả xử lý").fill("Đã thêm vào danh sách lớp")
    m.locator("button:has-text('Lưu')").click()
    row.wait_for(state="detached", timeout=20000)  # only open requests are listed by default
    page.locator("label:has-text('Chỉ đang mở') input").uncheck()
    row.locator("text=Đã xong").wait_for(timeout=20000)


@step
def manager_changed_from_a_date(page: Page):
    page.goto(f"{BASE}/app/corporate/employees")
    page.wait_for_selector("text=Học viên & cán bộ quản lý", timeout=20000)
    page.locator("tr", has_text="Trần Thị E2E").first.click()
    m = modal(page, "Lịch sử đơn vị / CBQL")
    field(m, "Email CBQL").fill("quanly.moi@nhe2e.test")
    m.locator("button:has-text('Lưu thay đổi')").click()
    m.wait_for(state="detached", timeout=20000)
    page.locator("tr", has_text="Trần Thị E2E").locator("text=quanly.moi@nhe2e.test").first.wait_for(timeout=20000)

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
