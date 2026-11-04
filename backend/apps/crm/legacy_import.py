"""
Import of the CRM workbook kept before this system ("HELLO - CRM TWings Academy.xlsx", sheet "Data"):
every registration with its learner, the consultants' notes and the payments, and the RB / EB classes
("Khóa học N" in "Xếp lớp") the learners studied in, so the classes run elsewhere stay visible here.

How the sheet was used, and so how it is read:
- "Xếp lớp" = "Khóa học N": the learner paid and studied in class N of the program registered for
  ("Khóa đăng ký", else "Khóa quan tâm"); "Bảo lưu": paid, deferred; "Hủy": cancelled after paying.
- An empty "Xếp lớp": a lead, at the stage its "Trạng thái" gives (mapped onto this system's pipeline).
- Classes 1..N of RB / EB are created as taught on another platform (no Moodle), off the website; a class
  with registrations in the last 90 days is "Đang học", an older one "Đã kết thúc".
- The template's own labels left in cells ("Giới tính", "Học phí *"…), Excel errors (#N/A) and rows
  without a name are ignored; a row repeated in the sheet counts once; "0. Test" rows are skipped.
- Each registration keeps its "Mã đăng ký" (Order.attribution["legacy_code"]): importing the file again
  adds only the rows not imported yet (e.g. a class kept in another file), never changes imported ones.

Run by `manage.py import_legacy_crm` (preview unless --apply). Nothing is e-mailed and nobody is
enrolled on Moodle: it only brings back the old records.
"""

import re
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import Cohort, Course
from apps.payments.models import Payment, Refund

from . import stages
from .learners import attach_learner, phone_key
from .lists import normalize, plain
from .models import Activity, Installment, Order

LEGACY = "Nhập từ CRM cũ"
RB = "quan-he-khach-hang-ca-nhan-rb-dao-tao-thuc-chien-tai-msb"
EB = "quan-he-khach-hang-doanh-nghiep-eb-dao-tao-thuc-chien-tai-msb"
RUNNING_DAYS = 90  # a class with registrations this recent is still studying

# key: the sheet's header (accents, case and "*" ignored)
COLUMNS = {
    "code": "Mã đăng ký",
    "name": "Họ và tên",
    "birth": "Ngày sinh",
    "gender": "Giới tính",
    "phone": "Số điện thoại",
    "email": "Email",
    "citizen_id": "CCCD",
    "permanent": "Hộ khẩu",
    "issued": "Nơi cấp",
    "province": "Khu vực",
    "residence": "Nơi ở hiện tại",
    "ref_name": "Tên NGT",
    "ref_email": "Email NGT",
    "ref_phone": "SĐT NGT",
    "ref_code": "MNV NGT",
    "education": "Trình độ",
    "major": "Ngành học",
    "university": "Trường học",
    "grad_year": "Năm tốt nghiệp",
    "contact_name": "Tên Người liên hệ",
    "contact_phone": "SĐT Người liên hệ",
    "contact_rel": "Mối quan hệ NLH",
    "cv": "Link CV",
    "source": "Nguồn",
    "registered": "Ngày đăng ký",
    "approached": "Ngày tiếp cận",
    "need": "Cần tư vấn về",
    "interested": "Khóa quan tâm",
    "pic": "PIC",
    "study_area": "Khu vực học",
    "channel": "Hình thức tiếp cận",
    "interest": "Mức độ quan tâm",
    "status": "Trạng thái",
    "course": "Khóa đăng ký",
    "klass": "Xếp lớp",
    "promo": "CTKM",
    "detail": "Chi tiết",
    "fee": "Học phí",
    "receivable": "Số tiền phải thu",
    "paid1": "Số tiền đã đóng L1",
    "pay_status": "Trạng thái thanh toán",
    "pay_method": "Phương thức thanh toán",
    "paid_on": "Ngày thanh toán",
    "txn": "Mã giao dịch",
    "paid2": "Số tiền đã đóng L2",
    "paid_total": "Tổng tiền đã đóng",
    "pay_note": "Ghi chú thanh toán",
    "reward": "Số tiền thưởng GTNB",
    "reward_status": "Tình trạng thưởng GTNB",
    "program_status": "TT chương trình",
    "training_note": "Ghi chú QLĐT",
    "defer_from": "Ngày bắt đầu BL",
}
REQUIRED = ("name", "klass", "status")
# Labels of the template (and of the "Danh mục" sheet) typed into cells instead of a value.
PLACEHOLDERS = {plain(h) for h in COLUMNS.values()} | {
    plain(t)
    for t in (
        "Tỉnh/thành",
        "Nơi sinh",
        "Tình trạng",
        "Chương trình khuyến mại",
        "Mô tả 2",
        "Hộ khẩu",
        "Nơi ở hiện tại",
        "Mức độ quan tâm",
        "Hình thức tiếp cận",
        "Phương thức thanh toán",
        "Trạng thái thanh toán",
    )
}

# The old "Trạng thái" is this system's stage (apps.crm.stages: the same list); the lost reason a refusal
# stands for, for the lost-reason report.
LOST = {
    stages.REFUSED_3: "Không có nhu cầu",
    stages.UNREACHABLE: "Không liên lạc được",
    stages.MISTAKEN: "Đăng ký trùng / nhầm",
}
CANCELLED_AFTER_PAYING = "Hủy sau khi đã đóng tiền"


def legacy_stage(raw: str, *, enrolled: bool, paid_then_cancelled: bool, fully_paid: bool) -> tuple[str, str]:
    """
    The stage of an old registration and its lost reason: its "Trạng thái" when that agrees with what
    happened, else what the money says (studied: paid in full / in part; cancelled after paying: refused).
    """
    raw = raw if raw in stages.STAGES else ""
    if enrolled:
        return (raw if raw in stages.ENROLLED else stages.PAID if fully_paid else stages.PART_PAID), ""
    if paid_then_cancelled:
        return (raw if raw in stages.CLOSED else stages.REFUSED_3), CANCELLED_AFTER_PAYING
    if raw in stages.ENROLLED:  # said paid, nothing paid
        raw = stages.TO_PAY
    raw = raw or stages.POTENTIAL
    return raw, LOST.get(raw, "")


class LegacyImportError(Exception):
    pass


# ---------------------------------------------------------------- reading
def _text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = " ".join(str(value).split())
    key = plain(text)
    if not key or text.startswith("#") or text.endswith("*") or key in PLACEHOLDERS:
        return ""
    return text


def _money(value) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int | float):
        return max(int(value), 0)
    digits = re.sub(r"[.,\s]|đ|vnd", "", _text(value).lower())
    return int(digits) if digits.isdigit() else None


def _day(value) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = _text(value)
    if re.match(r"^\d{4}-\d{2}-\d{2}", text):  # ISO, as the compact copy of the sheet writes dates
        try:
            return datetime.fromisoformat(text).date()
        except ValueError:
            return None
    match = re.fullmatch(r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})", text)
    if match:
        try:
            return date(int(match[3]), int(match[2]), int(match[1]))
        except ValueError:
            return None
    return None


def _moment(value) -> datetime | None:
    if isinstance(value, str) and re.match(r"^\d{4}-\d{2}-\d{2}T", value):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            return None
    if isinstance(value, datetime):
        return timezone.make_aware(value) if timezone.is_naive(value) else value
    day = _day(value)
    return timezone.make_aware(datetime.combine(day, time(9, 0))) if day else None


def _phone(value) -> str:
    digits = phone_key(_text(value))
    if len(digits) == 9 and not digits.startswith("0"):
        digits = "0" + digits
    return digits if 9 <= len(digits) <= 11 else ""


def _email(value) -> str:
    email = _text(value).lower().replace(" ", "")
    try:
        validate_email(email)
    except ValidationError:
        return ""
    return email


def read_workbook(path) -> list[list]:
    """The sheet "Data" of the workbook, as rows of cell values (the header first)."""
    from openpyxl import load_workbook

    try:
        book = load_workbook(path, read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001 - any unreadable file
        raise LegacyImportError("Không đọc được file Excel (.xlsx).") from exc
    sheet = book["Data"] if "Data" in book.sheetnames else book.active
    table = [list(r) for r in sheet.iter_rows(values_only=True)]
    book.close()
    return table


def read_compact(text: str) -> list[list]:
    """The compact copy of the sheet (JSON rows, xz, base64): how the data reaches the server."""
    import base64
    import json
    import lzma

    try:
        return json.loads(lzma.decompress(base64.b64decode(text.strip())))
    except Exception as exc:  # noqa: BLE001 - any damaged copy
        raise LegacyImportError("Dữ liệu CRM cũ không đọc được (bản nén hỏng).") from exc


def read_rows(table: list[list]) -> list[dict]:
    rows = iter(table)
    header = [plain(str(h or "").replace("*", "")) for h in next(rows, ())]
    index = {}
    for key, label in COLUMNS.items():
        if plain(label) in header:
            index[key] = header.index(plain(label))  # the first column of that name
    missing = [COLUMNS[k] for k in REQUIRED if k not in index]
    if missing:
        raise LegacyImportError(
            "Không phải file CRM cũ: thiếu cột " + ", ".join(missing) + " ở dòng đầu của sheet Data."
        )
    out = []
    for number, raw in enumerate(rows, start=2):
        row = {k: (raw[i] if i < len(raw) else None) for k, i in index.items()}
        row["_line"] = number
        out.append(row)
    return out


# ---------------------------------------------------------------- planning
def _program(row: dict, short_courses: dict) -> str | None:
    """'rb' / 'eb' / a short course's id, from the registered course, else the course of interest."""
    for key in ("registered_course", "interest_course"):
        text = plain(row.get(key))
        if "ca nhan" in text:
            return "rb"
        if "doanh nghiep" in text:
            return "eb"
        if text in short_courses:
            return short_courses[text]
    return None


def _class_number(value) -> int | str | None:
    text = _text(value)
    match = re.search(r"(\d+)", text)
    if match and "khoa" in plain(text):
        return int(match[1])
    key = plain(text)
    if key == "bao luu":
        return "deferred"
    if key in ("huy", "da huy"):
        return "cancelled"
    return None


def _clean(row: dict) -> dict:
    birth = _day(row.get("birth"))
    if birth and not (1950 <= birth.year <= timezone.localdate().year - 15):
        birth = None  # the template's default date, not a birthday
    voucher = ""
    ref_name = _text(row.get("ref_name"))
    if re.match(r"^v\.?\s*\d+\s*%", ref_name.lower()):  # "V.100% Công đoàn lớp 1": a voucher, not a person
        voucher, ref_name = ref_name, ""
    return {
        "line": row["_line"],
        "code": _text(row.get("code")),
        "name": _text(row.get("name")),
        "phone": _phone(row.get("phone")),
        "email": _email(row.get("email")),
        "person": {
            "birth_date": birth,
            "gender": normalize("gender", _text(row.get("gender"))),
            "area": normalize("province", _text(row.get("study_area")) or _text(row.get("province"))),
            "citizen_id": re.sub(r"\D", "", _text(row.get("citizen_id")))[:20],
            "issued_place": _text(row.get("issued"))[:200],
            "permanent_address": _text(row.get("permanent")),
            "current_residence": _text(row.get("residence")),
            "education_level": normalize("education_level", _text(row.get("education")))[:100],
            "major": _text(row.get("major"))[:200],
            "university": _text(row.get("university"))[:200],
            "graduation_year": _text(row.get("grad_year"))[:10],
            "contact_person_name": _text(row.get("contact_name"))[:200],
            "contact_person_phone": _phone(row.get("contact_phone")),
            "contact_relation": _text(row.get("contact_rel"))[:50],
            "cv_link": _text(row.get("cv"))[:500] if _text(row.get("cv")).startswith("http") else "",
        },
        "source": normalize("source", _text(row.get("source")))[:100],
        "registered": _moment(row.get("registered")),
        "approached": _moment(row.get("approached")),
        "need": _text(row.get("need")),
        "registered_course": _text(row.get("course")),
        "interest_course": _text(row.get("interested")),
        "interested": _text(row.get("course")) or _text(row.get("interested")),
        "pic": _text(row.get("pic"))[:100],
        "channel": _text(row.get("channel")),
        "interest": normalize("interest_level", _text(row.get("interest")))[:30],
        "status": _text(row.get("status")),
        "klass": _class_number(row.get("klass")),
        "promo": _text(row.get("promo")),
        "detail": _text(row.get("detail")),
        "fee": _money(row.get("fee")),
        "receivable": _money(row.get("receivable")),
        "paid": [a for a in (_money(row.get("paid1")), _money(row.get("paid2"))) if a],
        "paid_total": _money(row.get("paid_total")),
        "pay_status": _text(row.get("pay_status")),
        "pay_method": _text(row.get("pay_method")),
        "paid_on": _moment(row.get("paid_on")),
        "txn": _text(row.get("txn")),
        "pay_note": _text(row.get("pay_note")),
        "reward": _money(row.get("reward")),
        "reward_status": _text(row.get("reward_status")),
        "program_status": _text(row.get("program_status")),
        "training_note": _text(row.get("training_note")),
        "defer_from": _day(row.get("defer_from")),
        "referrer": {
            "referrer_name": ref_name[:200],
            "referrer_phone": _phone(row.get("ref_phone")),
            "referrer_staff_code": _text(row.get("ref_code"))[:50],
        },
        "ref_email": _email(row.get("ref_email")),
        "voucher": voucher,
    }


def _filled(entry: dict) -> int:
    return sum(1 for v in entry.values() if v not in (None, "", [], {})) + sum(
        1 for v in entry["person"].values() if v
    )


def _money_plan(e: dict) -> dict:
    """Fee, receivable, payments and whether the registration counts as paid in full."""
    receivable = e["receivable"] if e["receivable"] is not None else e["fee"]
    paid_sum = sum(e["paid"]) or (e["paid_total"] or 0)
    payments = e["paid"] or ([paid_sum] if paid_sum else [])
    said_paid = plain(e["pay_status"]) == "da dong phi" or e["status"] in ("5. Đã đóng phí", "7. Onboard")
    if receivable is None:
        receivable = paid_sum
    full = paid_sum >= receivable or said_paid
    return {
        "fee": e["fee"] if e["fee"] is not None else receivable,
        "receivable": receivable,
        "payments": payments,
        "paid_sum": paid_sum,
        "full": full,
    }


def plan(rows: list[dict]) -> tuple[list[dict], dict]:
    courses = {c.slug: c for c in Course.objects.filter(slug__in=(RB, EB))}
    if len(courses) < 2:
        raise LegacyImportError("Chưa có khóa RB / EB trên hệ thống (cần nhập danh mục khóa học trước).")
    short_courses = {plain(c.title): c.pk for c in Course.objects.exclude(slug__in=(RB, EB))}
    courses_by_id = {c.pk: c for c in Course.objects.all()}
    imported = set(
        Order.objects.filter(attribution__has_key="legacy_code").values_list(
            "attribution__legacy_code", flat=True
        )
    )
    skipped = Counter()
    warnings = []
    by_key: dict[str, dict] = {}
    for raw in rows:
        e = _clean(raw)
        if not e["name"]:
            skipped["empty"] += 1
            continue
        nameless = plain(e["name"]) in ("chua co thong tin", "chua co ten") and not (e["phone"] or e["email"])
        if e["status"] == "0. Test" or plain(e["name"]) == "test" or nameless:
            skipped["test"] += 1
            continue
        key = e["code"] or f"{e['phone'] or e['email']}|{plain(e['name'])}"
        if key in by_key:
            skipped["repeated"] += 1
            if _filled(e) <= _filled(by_key[key]):
                continue
        by_key[key] = e

    entries = []
    for e in by_key.values():
        if e["code"] and e["code"] in imported:
            skipped["imported"] += 1
            continue
        program = _program(e, short_courses)
        e["course"] = courses[RB] if program == "rb" else courses[EB] if program == "eb" else None
        if program not in (None, "rb", "eb"):
            e["course"] = courses_by_id[program]
        klass = e["klass"]
        refused = e["status"].startswith("0.")
        who = f"Dòng {e['line']} ({e['name']})"
        if isinstance(klass, int) and refused and not (e["paid"] or e["paid_total"]):
            # Put in a class, but refused and paid nothing: a slip in "Xếp lớp", kept as the lead it is.
            warnings.append(
                f"{who}: ghi Khóa học {klass} nhưng trạng thái “{e['status']}” và chưa đóng tiền: "
                "nhập như lead, không xếp lớp."
            )
            klass = e["klass"] = None
        elif isinstance(klass, int) and refused:
            warnings.append(f"{who}: đã đóng tiền, xếp Khóa học {klass} nhưng trạng thái “{e['status']}”.")
        if isinstance(klass, int) and program not in ("rb", "eb"):
            e["course"] = courses[EB]  # every class of the old CRM is RB or EB; EB when it does not say
            warnings.append(f"Dòng {e['line']} ({e['name']}): không rõ RB/EB, xếp vào khóa EB.")
        e["money"] = money = _money_plan(e)
        e["class_no"] = klass if isinstance(klass, int) else None
        e["cancelled"] = klass == "cancelled"
        e["enrolled"] = (
            isinstance(klass, int)
            or klass == "deferred"
            or (not e["cancelled"] and e["status"] in stages.ENROLLED)
        )
        e["stage"], e["lost"] = legacy_stage(
            e["status"],
            enrolled=e["enrolled"],
            paid_then_cancelled=e["cancelled"],
            fully_paid=money["full"],
        )
        if e["enrolled"] and e["course"] is None:
            warnings.append(f"Dòng {e['line']} ({e['name']}): đã đóng phí nhưng không rõ khóa.")
        if e["enrolled"] and e["class_no"] is None and klass != "deferred":
            warnings.append(f"Dòng {e['line']} ({e['name']}): đã đóng phí nhưng CRM cũ chưa xếp lớp.")
        if not e["phone"] and not e["email"]:
            warnings.append(f"Dòng {e['line']} ({e['name']}): không có số điện thoại / email hợp lệ.")
        entries.append(e)

    classes = defaultdict(list)
    for e in entries:
        if e["class_no"]:
            classes[(e["course"].slug, e["class_no"])].append(e)
    today = timezone.localdate()
    class_rows = []
    for (slug, number), members in sorted(classes.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        last = max((m["registered"] for m in members if m["registered"]), default=None)
        first = min((m["registered"] for m in members if m["registered"]), default=None)
        running = last is not None and (today - timezone.localdate(last)).days <= RUNNING_DAYS
        class_rows.append(
            {
                "course": courses[slug],
                "number": number,
                "code": f"{'RB' if slug == RB else 'EB'}-K{number}",
                "status": "in_progress" if running else "completed",
                "members": members,
                "first": first,
                "last": last,
            }
        )
    summary = {
        "rows": len(rows),
        "skipped": dict(skipped),
        "registrations": len(entries),
        "stages": dict(Counter(e["stage"] for e in entries)),
        "deferred": sum(1 for e in entries if e["klass"] == "deferred"),
        "paidWithoutClass": sum(
            1 for e in entries if e["enrolled"] and not e["class_no"] and e["klass"] != "deferred"
        ),
        "classes": [
            {
                "course": c["course"].title,
                "name": f"Khóa {c['number']}",
                "code": c["code"],
                "status": dict(Cohort.STATUS_CHOICES)[c["status"]],
                "learners": len(c["members"]),
                "paidInFull": sum(1 for m in c["members"] if m["money"]["full"]),
                "exists": Cohort.objects.filter(code=c["code"]).exists(),
            }
            for c in class_rows
        ],
        "warnings": warnings,
    }
    return entries, {"summary": summary, "classes": class_rows}


# ---------------------------------------------------------------- writing
def _cohort(c: dict) -> Cohort:
    cohort = Cohort.objects.filter(code=c["code"]).first()
    if cohort is not None:
        return cohort
    span = ""
    if c["first"] and c["last"]:
        span = (
            f" Tuyển sinh từ {timezone.localdate(c['first']):%d/%m/%Y}"
            f" đến {timezone.localdate(c['last']):%d/%m/%Y} (theo ngày đăng ký)."
        )
    return Cohort.objects.create(
        course=c["course"],
        name=f"Khóa {c['number']}",
        code=c["code"],
        status=c["status"],
        is_published=False,
        external_lms=True,
        auto_rollover_waitlist=False,
        capacity=max(len(c["members"]), 1),
        notes=f"Lớp đã học trên nền tảng cũ, {LEGACY.lower()} ngày {timezone.localdate():%d/%m/%Y}.{span}",
    )


def _pic_users() -> dict:
    users = {}
    for user in User.objects.filter(is_active=True).only("pk", "email"):
        users.setdefault(user.email.split("@")[0].lower(), user)
    return users


def _note(e: dict) -> str:
    lines = [f"Mã đăng ký cũ: {e['code'] or '–'}", f"Trạng thái cũ: {e['status'] or '–'}"]
    for label, key in (
        ("Ngày tiếp cận", "approached"),
        ("Hình thức tiếp cận", "channel"),
        ("Cần tư vấn về", "need"),
        ("Chi tiết tư vấn", "detail"),
        ("CTKM", "promo"),
        ("Voucher", "voucher"),
        ("Trạng thái thanh toán", "pay_status"),
        ("Phương thức thanh toán", "pay_method"),
        ("Mã giao dịch", "txn"),
        ("Ghi chú thanh toán", "pay_note"),
        ("Email người giới thiệu", "ref_email"),
        ("Thưởng GTNB", "reward"),
        ("Tình trạng thưởng GTNB", "reward_status"),
        ("TT chương trình", "program_status"),
        ("Ghi chú QLĐT", "training_note"),
        ("Bảo lưu từ", "defer_from"),
    ):
        value = e.get(key)
        if value:
            if isinstance(value, datetime):
                value = f"{timezone.localdate(value):%d/%m/%Y}"
            elif isinstance(value, date):
                value = f"{value:%d/%m/%Y}"
            elif isinstance(value, int):
                value = f"{value:,}đ".replace(",", ".")
            lines.append(f"{label}: {value}")
    return "\n".join(lines)


def _write(e: dict, cohort: Cohort | None, users: dict, actor: str) -> Order:
    money = e["money"]
    stage = e["stage"]
    enrolled, cancelled = e["enrolled"], e["cancelled"] or stage in stages.CLOSED
    partial = enrolled and not money["full"] and money["receivable"] > money["paid_sum"]
    # A learner of a class who still owed part of the fee studies on the first installment (what was paid);
    # without a class the debt stays on the registration.
    installments = partial and cohort is not None
    if cancelled:
        status = "cancelled"
    elif enrolled and not partial:
        status = "paid"
    else:
        status = "pending"
    free = enrolled and money["receivable"] == 0
    owner = users.get(e["pic"].lower()) if e["pic"] else None
    training = ""
    if e["klass"] == "deferred":
        training = "Bảo lưu"
    elif cohort is not None:
        training = "Đang học" if cohort.status == "in_progress" else "Hoàn thành"
    registered = e["registered"] or timezone.now()
    worked = stage != stages.POTENTIAL or bool(e["detail"] or e["pic"] or e["approached"] or e["interest"])
    order = Order(
        course=e["course"],
        course_title=e["course"].title if e["course"] else "",
        cohort=cohort,
        amount=money["receivable"] if enrolled or cancelled else (e["fee"] or 0),
        original_amount=money["fee"] or money["receivable"] or 0,
        discount_amount=max((money["fee"] or 0) - (money["receivable"] or 0), 0),
        discount_code=e["voucher"][:50],
        tuition_fee=money["fee"] or 0,
        total_receivable=money["receivable"] or 0,
        status=status,
        payment_method="free" if free else "transfer",
        paid_at=(e["paid_on"] or registered) if status == "paid" else None,
        customer_name=e["name"][:200],
        customer_phone=e["phone"],
        customer_email=e["email"],
        source=e["source"],
        consult_need=e["need"],
        interested_course=e["interested"][:300],
        pic=e["pic"],
        assigned_to=owner,
        interest_level=e["interest"],
        crm_status=stage,
        consult_detail=e["detail"],
        training_status=training,
        lost_reason=e["lost"],
        first_response_at=(e["approached"] or registered) if worked else None,
        installment_count=2 if installments else 1,
        # Old leads are not "new" for the response alerts nor the managers' unassigned digest.
        overdue_alerted_at=timezone.now(),
        escalated_at=timezone.now(),
        attribution={"legacy_code": e["code"] or f"dong-{e['line']}", "imported": LEGACY},
        **e["referrer"],
    )
    order.save()
    attach_learner(order, e["person"])
    if owner and not order.learner.owner_id:
        order.learner.owner = owner
        order.learner.save(update_fields=["owner", "updated_at"])
    paid_day = e["paid_on"] or registered
    for n, amount in enumerate(money["payments"], start=1):
        payment = Payment.objects.create(
            order=order, amount=amount, source="manual", note=f"{LEGACY} – lần đóng {n}"
        )
        Payment.objects.filter(pk=payment.pk).update(created_at=paid_day)
    if installments:
        first = money["paid_sum"]
        Installment.objects.create(
            order=order, sequence=1, amount=first, due_date=timezone.localdate(paid_day), paid_at=paid_day
        )
        Installment.objects.create(
            order=order,
            sequence=2,
            amount=money["receivable"] - first,
            due_date=timezone.localdate(paid_day) + timedelta(days=30),
        )
    order.total_paid_amount = money["paid_sum"]
    order.save(update_fields=["total_paid_amount", "updated_at"])  # recomputes learning access
    Order.objects.filter(pk=order.pk).update(created_at=registered)
    activity = Activity.objects.create(order=order, type="note", title=LEGACY, content=_note(e), actor=actor)
    Activity.objects.filter(pk=activity.pk).update(created_at=registered)
    return order


def run(table: list[list], *, apply: bool, user=None) -> dict:
    """Preview (apply=False: nothing written) or import the sheet's rows (`table`, the header first)."""
    entries, planned = plan(read_rows(table))
    summary = planned["summary"]
    if not apply:
        summary["applied"] = False
        return summary
    actor = f"{LEGACY} ({user.name or user.email})" if user else LEGACY
    users = _pic_users()
    with transaction.atomic():
        cohorts = {(c["course"].slug, c["number"]): _cohort(c) for c in planned["classes"]}
        for e in entries:
            cohort = cohorts.get((e["course"].slug, e["class_no"])) if e["class_no"] else None
            _write(e, cohort, users, actor)
    summary["applied"] = True
    return summary


# ---------------------------------------------------------------- corrections after the import
def fix(fixes: list[dict], *, apply: bool) -> list[str]:
    """
    Corrections staff give after the import, each for one registration (its "Mã đăng ký"):
      {"code": …, "class": N}                      studied in class N of its program (RB / EB)
      {"code": …, "cancel": "reason"}              cancelled; the money paid is kept
      {"code": …, "cancel": "reason", "refund": n} cancelled and n refunded
      {"code": …, "contacted": "YYYY-MM-DD"}       first contacted on that day
    Returns what was (or would be) done; nothing is e-mailed.
    """
    done = []
    with transaction.atomic():
        for f in fixes:
            code = " ".join(str(f["code"]).split())
            order = Order.objects.filter(attribution__legacy_code=code).select_related("course").first()
            if order is None:
                done.append(f"! {code}: không tìm thấy đăng ký")
                continue
            who = f"{order.customer_name} ({code})"
            notes = []
            if "class" in f:
                number = int(f["class"])
                if order.course is None or order.course.slug not in (RB, EB):
                    done.append(f"! {who}: không phải khóa RB / EB")
                    continue
                cohort_code = f"{'RB' if order.course.slug == RB else 'EB'}-K{number}"
                cohort = Cohort.objects.filter(code=cohort_code).first()
                if apply:
                    cohort = cohort or _cohort(
                        {
                            "course": order.course,
                            "number": number,
                            "code": cohort_code,
                            "status": "completed",
                            "members": [order],
                            "first": None,
                            "last": None,
                        }
                    )
                    order.cohort, order.batch_cohort = cohort, cohort.name
                    order.crm_status = stages.paid_stage(order)
                    order.training_status = "Hoàn thành" if cohort.status == "completed" else "Đang học"
                notes.append(f"xếp vào Khóa {number} ({cohort_code}{'' if cohort else ', tạo lớp mới'})")
            if "cancel" in f:
                refund = int(f.get("refund") or 0)
                if apply:
                    order.cohort, order.batch_cohort = None, ""
                    order.crm_status, order.lost_reason = stages.REFUSED_3, str(f["cancel"])[:200]
                    order.training_status = ""
                    order.installments.filter(paid_at__isnull=True).delete()
                    order.installment_count = 1
                    order.status = "refunded" if refund else "cancelled"
                    if refund:
                        Refund.objects.create(order=order, amount=refund, reason=str(f["cancel"])[:300])
                        order.refunded_amount = refund
                notes.append(
                    f"hủy ({f['cancel']})"
                    + (f", hoàn {refund:,}đ".replace(",", ".") if refund else ", giữ tiền cọc")
                )
            if "contacted" in f:
                day = _moment(f["contacted"] + "T09:00:00")
                if apply:
                    order.first_response_at = day
                notes.append(f"liên hệ lần đầu {timezone.localdate(day):%d/%m/%Y}")
            if apply:
                order.save()
                Activity.objects.create(
                    order=order,
                    type="note",
                    title="Chỉnh dữ liệu CRM cũ",
                    content="; ".join(notes),
                    actor=LEGACY,
                )
            done.append(f"{who}: " + "; ".join(notes))
    return done


def restage(statuses: dict[str, str], *, apply: bool) -> dict:
    """
    Put each imported registration ({"Mã đăng ký": old "Trạng thái"}) in the stage its old status names,
    unless what happened since says otherwise (legacy_stage); a registration in a closed stage with
    nothing paid is cancelled. Returns the counts per stage and what changed; nothing is e-mailed.
    """
    moved, missing = Counter(), []
    result = Counter()
    with transaction.atomic():
        orders = {
            o.attribution.get("legacy_code"): o
            for o in Order.objects.filter(attribution__has_key="legacy_code")
        }
        for code, raw in statuses.items():
            order = orders.get(" ".join(str(code).split()))
            if order is None:
                missing.append(code)
                continue
            raw = " ".join(str(raw or "").split())
            stage, lost = legacy_stage(
                raw,
                # studies, or paid and deferred (bảo lưu: no class, the money kept)
                enrolled=order.learning_access
                or (raw in stages.ENROLLED and order.total_paid_amount > 0 and order.status == "pending"),
                paid_then_cancelled=order.status in ("cancelled", "refunded") and order.total_paid_amount > 0,
                fully_paid=order.status == "paid"
                or order.total_paid_amount >= (order.total_receivable or order.amount),
            )
            result[stage] += 1
            if stage == order.crm_status:
                continue
            moved[f"{order.crm_status} → {stage}"] += 1
            if apply:
                old = order.crm_status
                order.crm_status = stage
                if stage in stages.CLOSED:
                    order.lost_reason = order.lost_reason or lost
                    if order.status == "pending" and not order.total_paid_amount:
                        order.status = "cancelled"
                elif order.status == "cancelled" and not order.total_paid_amount:
                    order.status = "pending"
                order.save(update_fields=["crm_status", "lost_reason", "status", "updated_at"])
                Activity.objects.create(
                    order=order,
                    type="note",
                    title="Giai đoạn theo CRM cũ",
                    content=f"{old} → {stage}" + (f" (trạng thái cũ: {raw})" if raw and raw != stage else ""),
                    actor=LEGACY,
                )
    return {"stages": dict(result), "moved": dict(moved), "missing": missing}
