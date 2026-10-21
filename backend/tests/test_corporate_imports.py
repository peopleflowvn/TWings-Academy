"""Excel imports of corporate training: class lists (DSHV) and training plans, preview then confirm."""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook

from apps.accounts.rbac import Role
from apps.corporate import services
from apps.corporate.imports import match_columns, normalize
from apps.corporate.models import ClientUnit, CorporateEmployee, CorporateEnrollment, TrainingPlan
from apps.crm.models import Learner

pytestmark = pytest.mark.django_db

URL = "/api/v1/staff/corporate/imports/"


def xlsx(rows, name="dshv.xlsx") -> SimpleUploadedFile:
    book = Workbook()
    sheet = book.active
    for row in rows:
        sheet.append(row)
    buf = BytesIO()
    book.save(buf)
    return SimpleUploadedFile(name, buf.getvalue(), content_type="application/vnd.ms-excel")


@pytest.fixture
def corp(staff_client):
    return staff_client(Role.CORPORATE_TRAINING)


@pytest.fixture
def cls(course):
    client = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    return services.create_class(client=client, course=course, name="NHM – Lớp 1", cohort_fields={})


ROSTER_HEADER = [
    "STT",
    "Họ và tên",
    "Mã CBNV",
    "Email",
    "Số điện thoại",
    "Phòng ban",
    "Họ tên CBQL",
    "Email CBQL",
]


def roster(*rows):
    # A real HR file: a title and a blank line above the header row.
    return xlsx([["DANH SÁCH CỬ ĐI HỌC – LỚP KỸ NĂNG BÁN HÀNG"], [], ROSTER_HEADER, *rows])


def test_headers_are_recognised_whatever_the_wording():
    assert normalize("Mã CBNV (*)") == "ma cbnv"
    cols = match_columns(ROSTER_HEADER, "roster")
    assert cols == {
        "full_name": 1,
        "employee_code": 2,
        "email": 3,
        "phone": 4,
        "unit": 5,
        "manager_name": 6,
        "manager_email": 7,
    }


def test_roster_preview_then_confirm(corp, cls):
    Learner.objects.create(full_name="Trần Thị Bình", email="binh@nhm.test")
    upload = roster(
        [1, "Trần Thị Bình", "NV01", "binh@nhm.test", 912000111, "Khối Bán lẻ", "Lê Quản Lý", "ql@nhm.test"],
        [
            2,
            "Lê Văn Cường",
            "NV02",
            "CUONG@nhm.test",
            "0912000222",
            "Khối Bán lẻ",
            "Lê Quản Lý",
            "ql@nhm.test",
        ],
        [3, "Trùng Email", "NV03", "cuong@nhm.test", "", "", "", ""],
        [4, "", "NV04", "khongten@nhm.test", "", "", "", ""],
        [5, "Sai Email", "NV05", "sai-email", "", "", "", ""],
    )
    res = corp.post(URL, {"kind": "roster", "corporateClass": cls.pk, "file": upload}, format="multipart")
    assert res.status_code == 201, res.content
    batch = res.json()
    assert batch["status"] == "previewed"
    assert [r["action"] for r in batch["rows"]] == ["add", "add", "error", "error", "error"]
    assert batch["rows"][0]["values"]["phone"] == "0912000111"  # Excel had dropped the leading 0
    assert "Đã có hồ sơ học viên" in " ".join(batch["rows"][0]["notes"])
    assert batch["rows"][2]["errors"] == ["Trùng email với dòng phía trên"]
    assert batch["summary"] == {"add": 2, "update": 0, "unchanged": 0, "error": 3}
    assert not CorporateEnrollment.objects.exists()  # nothing before confirmation

    res = corp.post(f"{URL}{batch['id']}/confirm/")
    assert res.status_code == 200 and res.json()["summary"]["applied"] == 2
    assert CorporateEnrollment.objects.filter(corporate_class=cls).count() == 2
    assert Learner.objects.filter(email="binh@nhm.test").count() == 1  # the same person, not a copy
    unit = ClientUnit.objects.get(client=cls.client, name="Khối Bán lẻ")
    assert CorporateEmployee.objects.filter(unit=unit, manager_email="ql@nhm.test").count() == 2
    assert corp.post(f"{URL}{batch['id']}/confirm/").status_code == 400  # runs once


def test_same_file_twice_and_a_changed_manager(corp, cls):
    rows = [[1, "Lê Văn Cường", "NV02", "cuong@nhm.test", "", "", "Lê Quản Lý", "ql@nhm.test"]]
    content = roster(*rows).read()  # the very same file twice (a rebuilt workbook has a new timestamp)
    first = corp.post(
        URL,
        {"kind": "roster", "corporateClass": cls.pk, "file": SimpleUploadedFile("dshv.xlsx", content)},
        format="multipart",
    )
    corp.post(f"{URL}{first.json()['id']}/confirm/")
    again = corp.post(
        URL,
        {"kind": "roster", "corporateClass": cls.pk, "file": SimpleUploadedFile("dshv.xlsx", content)},
        format="multipart",
    )
    assert again.status_code == 400 and "đã được nhập" in again.json()["detail"]

    rows = [
        [1, "Lê Văn Cường", "NV02", "cuong@nhm.test", "", "", "Phạm Mới", "moi@nhm.test"],
        [2, "Ngô Thị Dung", "NV06", "dung@nhm.test", "", "", "", ""],
    ]
    res = corp.post(
        URL, {"kind": "roster", "corporateClass": cls.pk, "file": roster(*rows)}, format="multipart"
    )
    assert [r["action"] for r in res.json()["rows"]] == ["update", "add"]


def test_template_maps_a_client_specific_header(corp, cls):
    res = corp.post(
        "/api/v1/staff/corporate/import-templates/",
        {
            "client": cls.client.pk,
            "kind": "roster",
            "name": "DSHV NHM",
            "mapping": {"full_name": "Tên đầy đủ", "email": "Hộp thư"},
        },
        format="json",
    )
    assert res.status_code == 201, res.content
    upload = xlsx([["Tên đầy đủ", "Hộp thư"], ["Đỗ Văn Em", "em@nhm.test"]])
    batch = corp.post(
        URL,
        {"kind": "roster", "corporateClass": cls.pk, "template": res.json()["id"], "file": upload},
        format="multipart",
    ).json()
    assert batch["rows"][0]["values"]["fullName"] == "Đỗ Văn Em" and batch["rows"][0]["action"] == "add"
    bad = corp.post(
        "/api/v1/staff/corporate/import-templates/",
        {"client": cls.client.pk, "kind": "roster", "name": "X", "mapping": {"salary": "Lương"}},
        format="json",
    )
    assert bad.status_code == 400


def test_plan_import_into_a_draft(corp, cls, course):
    plan = TrainingPlan.objects.create(client=cls.client, name="KH 2026")
    upload = xlsx(
        [
            ["Nội dung đào tạo", "Đơn vị", "Từ ngày", "Đến ngày", "Số lớp", "Số học viên", "Ngân sách"],
            [course.title, "Khối Bán lẻ", "01/11/2026", "30/11/2026", 2, 60, "120.000.000"],
            ["Khóa chưa có trong danh mục", "", "", "", "", "", ""],
            ["Sai ngày", "", "31/02/2026", "", "", "", ""],
        ],
        name="kehoach.xlsx",
    )
    batch = corp.post(URL, {"kind": "plan", "plan": plan.pk, "file": upload}, format="multipart").json()
    assert [r["action"] for r in batch["rows"]] == ["add", "add", "error"]
    assert (
        batch["rows"][0]["values"]["course"] == course.pk
        and batch["rows"][0]["values"]["budget"] == 120_000_000
    )
    corp.post(f"{URL}{batch['id']}/confirm/")
    lines = list(plan.lines.order_by("sort_order"))
    assert [line.title for line in lines] == [course.title, "Khóa chưa có trong danh mục"]
    assert (
        lines[0].planned_classes == 2
        and str(lines[0].planned_start) == "2026-11-01"
        and lines[0].unit.name == "Khối Bán lẻ"
    )

    services.approve_plan(plan, None)
    upload = xlsx([["Nội dung"], ["Thêm"]], name="kehoach2.xlsx")
    res = corp.post(URL, {"kind": "plan", "plan": plan.pk, "file": upload}, format="multipart")
    assert res.status_code == 400


def test_only_xlsx_and_only_with_the_import_right(corp, cls, staff_client):
    fake = SimpleUploadedFile("dshv.xlsx", b"not an excel file")
    res = corp.post(URL, {"kind": "roster", "corporateClass": cls.pk, "file": fake}, format="multipart")
    assert res.status_code == 400
    missing = corp.post(
        URL,
        {"kind": "roster", "corporateClass": cls.pk, "file": xlsx([["Họ tên"], ["A"]])},
        format="multipart",
    )
    assert missing.status_code == 400 and "Email" in missing.json()["detail"]
    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    res = finance.post(
        URL, {"kind": "roster", "corporateClass": cls.pk, "file": roster()}, format="multipart"
    )
    assert res.status_code == 403
