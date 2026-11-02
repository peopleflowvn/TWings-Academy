"""The old CRM's workbook imported into this system (apps.crm.legacy_import), and the CRM's option lists."""

import base64
import io
import json
import lzma
import tempfile
from datetime import datetime, timedelta

import pytest
from django.core.management import CommandError, call_command
from django.utils import timezone
from openpyxl import Workbook

from apps.catalog.models import Cohort
from apps.crm import legacy_import
from apps.crm.lists import normalize
from apps.crm.models import Learner, Order
from apps.payments.models import Payment
from tests.conftest import Role

pytestmark = pytest.mark.django_db

HEADER = list(legacy_import.COLUMNS.values())
HEADER[HEADER.index("Hộ khẩu")] = "Hộ khẩu *"


def _row(**values):
    labels = {key: label for key, label in legacy_import.COLUMNS.items()}
    row = [None] * len(HEADER)
    for key, value in values.items():
        row[list(labels).index(key)] = value
    return row


def _table(rows) -> list[list]:
    return [HEADER, *rows, [None, None]]  # the formula rows left at the end of the sheet


def _compact(rows) -> str:
    """The sheet as the Ops task sends it: JSON rows (dates in ISO), xz, base64."""
    table = [[v.isoformat() if isinstance(v, datetime) else v for v in row] for row in _table(rows)]
    return base64.b64encode(lzma.compress(json.dumps(table, ensure_ascii=False).encode())).decode()


def _workbook(rows) -> str:
    book = Workbook()
    sheet = book.active
    sheet.title = "Data"
    for row in _table(rows):
        sheet.append(row)
    path = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False).name
    book.save(path)
    return path


OLD = datetime(2025, 6, 6, 12, 30)


def _rows():
    recent = (timezone.localtime() - timedelta(days=20)).replace(tzinfo=None)
    return [
        # Class 2 of EB, paid in full (the template's labels left in other cells)
        _row(
            code="0001_TW2_A",
            name="Nguyễn Văn A",
            phone=912345678,
            email="a@x.vn",
            gender="Giới tính",
            klass="Khóa học 2",
            course="Khóa Quan hệ Khách hàng doanh nghiệp",
            status="5. Đã đóng phí",
            fee=8_100_000,
            receivable=8_100_000,
            paid1=8_100_000,
            registered=OLD,
            source="GTNB",
            study_area="TP HCM",
            pic="HuongNT22",
        ),
        # the same row again (repeated in the sheet)
        _row(
            code="0001_TW2_A",
            name="Nguyễn Văn A",
            phone=912345678,
            email="a@x.vn",
            klass="Khóa học 2",
            course="Khóa Quan hệ Khách hàng doanh nghiệp",
            status="5. Đã đóng phí",
            fee=8_100_000,
            receivable=8_100_000,
            paid1=8_100_000,
            registered=OLD,
        ),
        # Class 8 of RB, recent, a deposit only
        _row(
            code="0002_TW3_B",
            name="Trần Thị B",
            phone="0987 654 321",
            klass="Khóa học 8",
            interested="Quan hệ khách hàng Cá nhân",
            status="6. Đã đóng 1 phần học phí",
            fee=7_599_000,
            receivable=7_599_000,
            paid1=2_000_000,
            registered=recent,
        ),
        # deferred after a deposit, and cancelled after a deposit
        _row(
            code="0003_C",
            name="Lê C",
            email="c@x.vn",
            klass="Bảo lưu",
            course="Khóa chuyên sâu Khách hàng doanh nghiệp",
            status="6. Đã đóng 1 phần học phí",
            fee=8_100_000,
            receivable=8_100_000,
            paid1=2_000_000,
            registered=OLD,
        ),
        _row(
            code="0004_D",
            name="Phạm D",
            email="d@x.vn",
            klass="Hủy",
            status="0. Từ chối lần 3",
            paid1=2_000_000,
            receivable=6_100_000,
            registered=OLD,
        ),
        # leads
        _row(
            code="0005_E",
            name="Đỗ E",
            email="e@x.vn",
            status="2. Đang tư vấn",
            interested="Quan hệ khách hàng Cá nhân",
            interest="Cao",
            detail="Hẹn gọi lại",
            registered=OLD,
            source="tnex",
        ),
        _row(code="0006_F", name="Vũ F", email="f@x.vn", status="0. Không gọi được", registered=OLD),
        _row(code="0007_G", name="Hà G", email="g@x.vn", status="0. Từ chối lần 1", registered=OLD),
        # a slip: put in a class, refused and paid nothing
        _row(
            code="0008_H",
            name="Mai H",
            email="h@x.vn",
            klass="Khóa học 1",
            status="0. Từ chối lần 1",
            interested="Quan hệ khách hàng Doanh nghiệp",
            fee="Học phí *",
            registered=OLD,
        ),
        _row(code="0009_test", name="test", status="1. Tiềm năng"),
        _row(name=None, code="#REF!"),
    ]


def _run(apply):
    return legacy_import.run(_table(_rows()), apply=apply)


def test_preview_writes_nothing_and_counts_what_comes():
    call_command("import_courses", "--apply")
    summary = _run(apply=False)
    assert not Order.objects.exists() and not Cohort.objects.filter(external_lms=True).exists()
    assert summary["registrations"] == 8
    assert summary["skipped"] == {"repeated": 1, "test": 1, "empty": 2}
    assert [(c["code"], c["learners"]) for c in summary["classes"]] == [("EB-K2", 1), ("RB-K8", 1)]
    assert any("Mai H" in w and "không xếp lớp" in w for w in summary["warnings"])


def test_import_creates_the_old_classes_learners_and_payments_once():
    call_command("import_courses", "--apply")
    _run(apply=True)
    eb2 = Cohort.objects.get(code="EB-K2")
    rb8 = Cohort.objects.get(code="RB-K8")
    assert (eb2.status, rb8.status) == (
        "completed",
        "in_progress",
    )  # registrations 20 days ago: still studying
    assert eb2.external_lms and rb8.external_lms and not eb2.is_published and eb2.name == "Khóa 2"

    a = Order.objects.get(customer_name="Nguyễn Văn A")
    assert (a.cohort, a.status, a.crm_status, a.learning_access) == (eb2, "paid", "5. Đã đóng phí", True)
    assert (
        a.customer_phone == "0912345678"
        and a.source == "Giới thiệu nội bộ (GTNB)"
        and a.training_status == "Hoàn thành"
    )
    assert (
        a.created_at.date() == OLD.date() and a.learner.area == "TP. Hồ Chí Minh" and a.learner.gender == ""
    )
    assert a.attribution["legacy_code"] == "0001_TW2_A"
    assert a.timeline_activities.get().title == legacy_import.LEGACY

    b = Order.objects.get(customer_name="Trần Thị B")  # a deposit: studies on the first installment
    assert (b.cohort, b.status, b.total_paid_amount, b.learning_access) == (rb8, "pending", 2_000_000, True)
    assert [i.amount for i in b.installments.order_by("sequence")] == [2_000_000, 5_599_000]
    assert b.training_status == "Đang học"

    c = Order.objects.get(customer_name="Lê C")
    assert (c.cohort, c.training_status, c.crm_status) == (None, "Bảo lưu", "5. Đã đóng phí")
    d = Order.objects.get(customer_name="Phạm D")
    assert (d.status, d.crm_status, d.lost_reason, d.total_paid_amount) == (
        "cancelled",
        "7. Đã hủy",
        "Hủy sau khi đã đóng tiền",
        2_000_000,
    )
    stages = {o.customer_name: (o.crm_status, o.lost_reason) for o in Order.objects.all()}
    assert stages["Đỗ E"] == ("3. Đang tư vấn", "") and stages["Vũ F"] == ("7. Đã hủy", "Không liên lạc được")
    assert stages["Hà G"][0] == "6. Chăm sóc lại" and stages["Mai H"][0] == "6. Chăm sóc lại"
    assert Order.objects.get(customer_name="Mai H").cohort is None
    assert Order.objects.get(customer_name="Đỗ E").source == "TNEX"
    assert Payment.objects.count() == 4 and Learner.objects.count() == 8

    again = _run(apply=True)  # the file again: nothing new, nothing changed
    assert again["registrations"] == 0 and again["skipped"]["imported"] == 8
    assert Order.objects.count() == 8 and Cohort.objects.filter(external_lms=True).count() == 2


def test_the_command_reads_the_compact_copy_from_stdin_or_a_workbook(monkeypatch):
    call_command("import_courses", "--apply")
    out = io.StringIO()
    monkeypatch.setattr("sys.stdin", io.StringIO(_compact(_rows())))
    call_command("import_legacy_crm", "-", stdout=out)
    assert "8 đăng ký" in out.getvalue() and "EB-K2" in out.getvalue() and not Order.objects.exists()
    monkeypatch.setattr("sys.stdin", io.StringIO(_compact(_rows())))
    call_command("import_legacy_crm", "-", "--apply", stdout=io.StringIO())
    assert Order.objects.count() == 8
    assert (
        Order.objects.get(customer_name="Nguyễn Văn A").created_at.date() == OLD.date()
    )  # ISO dates read back
    call_command("import_legacy_crm", _workbook(_rows()), "--apply", stdout=out)  # an .xlsx works too
    assert Order.objects.count() == 8
    monkeypatch.setattr("sys.stdin", io.StringIO("not a copy"))
    with pytest.raises(CommandError):
        call_command("import_legacy_crm", "-")


def test_the_lists_and_their_aliases(staff_client):
    assert normalize("source", "gtnb") == "Giới thiệu nội bộ (GTNB)" and normalize(
        "source", "Website · Facebook"
    )
    assert (
        normalize("interest_level", "Rất cao") == "Cao"
        and normalize("province", "tp hcm") == "TP. Hồ Chí Minh"
    )
    assert normalize("training_status", "Đã tốt nghiệp") == "Hoàn thành" and normalize("gender", "nữ") == "Nữ"
    lists = staff_client(Role.SALES_CRM).get("/api/v1/staff/crm/lists/").json()
    assert "Facebook ads" in lists["sources"] and len(lists["provinces"]) == 34
    assert len(lists["universities"]) > 500 and len(lists["msbUnits"]) > 200


def test_an_external_class_is_not_put_on_moodle(settings, monkeypatch):
    from apps.lms import moodle, signals

    queued = []
    monkeypatch.setattr(moodle, "is_configured", lambda: True)
    monkeypatch.setattr(
        signals, "_later", lambda task, *args: queued.append(task.name if hasattr(task, "name") else task)
    )
    call_command("import_courses", "--apply")
    queued.clear()
    _run(apply=True)
    assert queued == []  # no Moodle course for the old classes, nobody enrolled


def test_the_old_classes_are_campaigns_with_their_learners(staff_client):
    call_command("import_courses", "--apply")
    _run(apply=True)
    rows = staff_client(Role.SALES_CRM).get("/api/v1/staff/intakes/").json()["intakes"]
    old = {r["code"]: r for r in rows if r["externalLms"]}
    assert set(old) == {"EB-K2", "RB-K8"}  # the finished class too: it is the campaign of its learners
    assert old["EB-K2"]["status"] == "completed" and old["EB-K2"]["paid"] == 1
    assert old["EB-K2"]["funnel"]["leads"] == 1 and old["RB-K8"]["paid"] == 1


def test_corrections_after_the_import(monkeypatch):
    from apps.payments.models import Refund

    call_command("import_courses", "--apply")
    _run(apply=True)
    fixes = {
        "fixes": [
            {"code": "0003_C", "class": 1},  # the deferred EB learner studied in class 1 (created)
            {"code": "0002_TW3_B", "cancel": "Hủy sau khi đặt cọc", "refund": 2_000_000},
            {"code": "0001_TW2_A", "cancel": "Hủy sau khi đặt cọc"},
            {"code": "0005_E", "contacted": "2026-03-23"},
            {"code": "nobody", "class": 1},
        ]
    }
    payload = base64.b64encode(lzma.compress(json.dumps(fixes).encode())).decode()
    out = io.StringIO()
    monkeypatch.setattr("sys.stdin", io.StringIO(payload))
    call_command("import_legacy_crm", "-", stdout=out)
    assert "tạo lớp mới" in out.getvalue() and not Cohort.objects.filter(code="EB-K1").exists()
    monkeypatch.setattr("sys.stdin", io.StringIO(payload))
    call_command("import_legacy_crm", "-", "--apply", stdout=out)
    assert "! nobody" in out.getvalue()
    c = Order.objects.get(customer_name="Lê C")
    assert (c.cohort.code, c.cohort.status, c.cohort.external_lms, c.training_status) == (
        "EB-K1",
        "completed",
        True,
        "Hoàn thành",
    )
    b = Order.objects.get(customer_name="Trần Thị B")
    assert (b.status, b.cohort, b.crm_status, b.refunded_amount) == ("refunded", None, "7. Đã hủy", 2_000_000)
    assert Refund.objects.get().order == b and not b.installments.filter(paid_at__isnull=True).exists()
    a = Order.objects.get(customer_name="Nguyễn Văn A")
    assert (a.status, a.cohort, a.total_paid_amount) == ("cancelled", None, 8_100_000)  # the money stays
    assert (
        timezone.localdate(Order.objects.get(customer_name="Đỗ E").first_response_at).isoformat()
        == "2026-03-23"
    )
