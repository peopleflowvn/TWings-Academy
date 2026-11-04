"""
The option lists (danh mục) every /app form offers, kept in the database (ListItem) and edited in
/app → Hệ thống → Danh mục. Each list says which record fields it fills, so a renamed value can be
carried onto the records that have it and the page can show how often each value is used. The CRM stages
are a list too, a "coded" one: a registration keeps the stage's fixed code (ListItem.code), so renaming
changes no record (apps.crm.stages).

The values first loaded (DEFAULTS) come from the "Danh mục" sheet of the CRM run before this system,
from how its data was really filled in, and from the CMS's former fixed lists. Statuses the system sets
by itself (order / class / payment status…) stay fixed in code, not here.

`normalize(kind, value)` turns the spellings found in imported or older data ("GTNB", "tnex", "TP HCM",
"Rất cao"…) into the list's own value; anything it does not know is kept as typed.
"""

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from django.db.models import Count

from . import stages


@dataclass(frozen=True)
class Kind:
    key: str
    label: str
    group: str
    api: str  # its name in GET /staff/crm/lists/
    fields: tuple  # ("app.Model", "field") it fills
    hint: str = ""
    coded: bool = False  # the records hold ListItem.code, not the value (the CRM stages)


CRM, PROFILE, CONTENT = "CRM & tuyển sinh", "Hồ sơ học viên", "Khóa học & nội dung"
KINDS = [
    Kind(
        stages.KIND,
        "Giai đoạn CRM (kanban)",
        CRM,
        "stages",
        (("crm.Order", "crm_status"),),
        "Thứ tự là thứ tự cột kanban. Đổi tên không đổi dữ liệu; nhóm quyết định hệ thống xử lý giai đoạn "
        "ra sao (13 giai đoạn hệ thống chỉ đổi tên / sắp xếp).",
        coded=True,
    ),
    Kind("source", "Nguồn khách hàng", CRM, "sources", (("crm.Order", "source"),)),
    Kind("interest_level", "Mức độ quan tâm", CRM, "interestLevels", (("crm.Order", "interest_level"),)),
    Kind("lost_reason", "Lý do hủy / không học", CRM, "lostReasons", (("crm.Order", "lost_reason"),)),
    Kind(
        "training_status",
        "Trạng thái đào tạo",
        CRM,
        "trainingStatuses",
        (("crm.Order", "training_status"),),
        "Tình trạng học của học viên trong chương trình.",
    ),
    Kind("gender", "Giới tính", PROFILE, "genders", (("crm.Learner", "gender"),)),
    Kind("province", "Khu vực (tỉnh / thành)", PROFILE, "provinces", (("crm.Learner", "area"),)),
    Kind("education_level", "Trình độ", PROFILE, "educationLevels", (("crm.Learner", "education_level"),)),
    Kind(
        "university",
        "Trường học",
        PROFILE,
        "universities",
        (("crm.Learner", "university"),),
        "Gợi ý khi nhập trường; vẫn gõ được tên trường khác.",
    ),
    Kind(
        "msb_unit",
        "Đơn vị tiếp nhận làm việc (MSB)",
        PROFILE,
        "msbUnits",
        (("crm.Placement", "unit"),),
        "Gợi ý khi giới thiệu việc làm cho MSB.",
    ),
    Kind(
        "course_category",
        "Lĩnh vực / chuyên mục",
        CONTENT,
        "courseCategories",
        (("catalog.Course", "category"), ("cms.Article", "category")),
        "Dùng chung cho lĩnh vực khóa học và chuyên mục bài viết; website lọc theo danh mục này.",
    ),
    Kind("course_level", "Cấp độ khóa học", CONTENT, "courseLevels", (("catalog.Course", "level"),)),
]
KIND = {k.key: k for k in KINDS}

# The values first loaded into each list (migration 0020); after that the database is what counts.
SOURCES = [
    "Website",
    "Facebook ads",
    "Zalo",
    "TikTok",
    "Google",
    "YouTube",
    "Giới thiệu nội bộ (GTNB)",
    "TNEX",
    "Email marketing",
    "SMS marketing",
    "Hotline",
    "Hội thảo / Roadshow",
    "Sự kiện",
    "Học viên cũ quay lại",
    "Nhập tay",
]
INTEREST_LEVELS = ["Cao", "Trung bình", "Thấp"]
GENDERS = ["Nam", "Nữ", "Khác"]
EDUCATION_LEVELS = ["Trung cấp", "Cao đẳng", "Đại học", "Cao học", "Khác"]
# The 34 provinces and cities since 1 July 2025 (Nghị quyết 202/2025/QH15).
PROVINCES = [
    "Hà Nội",
    "TP. Hồ Chí Minh",
    "Hải Phòng",
    "Đà Nẵng",
    "Huế",
    "Cần Thơ",
    "An Giang",
    "Bắc Ninh",
    "Cà Mau",
    "Cao Bằng",
    "Đắk Lắk",
    "Điện Biên",
    "Đồng Nai",
    "Đồng Tháp",
    "Gia Lai",
    "Hà Tĩnh",
    "Hưng Yên",
    "Khánh Hòa",
    "Lai Châu",
    "Lâm Đồng",
    "Lạng Sơn",
    "Lào Cai",
    "Nghệ An",
    "Ninh Bình",
    "Phú Thọ",
    "Quảng Ngãi",
    "Quảng Ninh",
    "Quảng Trị",
    "Sơn La",
    "Tây Ninh",
    "Thái Nguyên",
    "Thanh Hóa",
    "Tuyên Quang",
    "Vĩnh Long",
]
LOST_REASONS = [
    "Không có nhu cầu",
    "Học phí cao",
    "Chưa sắp xếp được thời gian",
    "Ở xa / khu vực chưa mở lớp",
    "Đã học / chọn nơi khác",
    "Không liên lạc được",
    "Khóa học chưa phù hợp nhu cầu",
    "Đăng ký trùng / nhầm",
]
# The learner's state in the program (the old CRM's "Trạng thái khóa học" and "Trạng thái chương trình").
TRAINING_STATUSES = [
    "Chưa khai giảng",
    "Đang học",
    "Chờ xét tốt nghiệp",
    "Hoàn thành",
    "Không đạt",
    "Bảo lưu",
    "Dừng chương trình",
]
COURSE_CATEGORIES = [
    "Ngân Hàng & Tín Dụng",
    "Quản Trị & Lãnh Đạo (OKR/MBO)",
    "Tư Duy & Đột Phá",
    "Trí tuệ nhân tạo (AI)",
    "Dữ Liệu & Phân Tích",
    "Chứng chỉ Chuyên môn",
]
COURSE_LEVELS = [
    "Người mới bắt đầu",
    "Chuyên viên Mới (Fresher)",
    "Chuyên viên Chính",
    "Quản lý / Trưởng nhóm",
    "Nâng cao",
    "Mọi cấp độ",
]


@cache
def _reference() -> dict:
    return json.loads((Path(__file__).parent / "data" / "danh_muc.json").read_text(encoding="utf-8"))


def defaults() -> dict[str, list[str]]:
    return {
        "source": SOURCES,
        "interest_level": INTEREST_LEVELS,
        "lost_reason": LOST_REASONS,
        "training_status": TRAINING_STATUSES,
        "gender": GENDERS,
        "province": PROVINCES,
        "education_level": EDUCATION_LEVELS,
        "university": _reference()["universities"],
        "msb_unit": _reference()["msb_units"],
        "course_category": COURSE_CATEGORIES,
        "course_level": COURSE_LEVELS,
    }


_ALIASES = {
    "source": {
        "gtnb": "Giới thiệu nội bộ (GTNB)",
        "gntb": "Giới thiệu nội bộ (GTNB)",
        "gioi thieu": "Giới thiệu nội bộ (GTNB)",
        "gioi thieu noi bo": "Giới thiệu nội bộ (GTNB)",
        "facebook": "Facebook ads",
        "fb": "Facebook ads",
        "email mkt": "Email marketing",
        "sms mkt": "SMS marketing",
        "email": "Email marketing",
        "sms": "SMS marketing",
        "website form tu van": "Website",
        "web": "Website",
        "hoi thao": "Hội thảo / Roadshow",
        "hoi thao truong dh": "Hội thảo / Roadshow",
        "roadshow": "Hội thảo / Roadshow",
    },
    "interest_level": {"rat cao": "Cao", "dang phan van": "Trung bình"},
    "gender": {"khong ro": ""},
    "education_level": {"thac si": "Cao học", "tien si": "Cao học", "cu nhan": "Đại học"},
    "province": {
        "tp hcm": "TP. Hồ Chí Minh",
        "hcm": "TP. Hồ Chí Minh",
        "ho chi minh": "TP. Hồ Chí Minh",
        "tp ho chi minh": "TP. Hồ Chí Minh",
        "sai gon": "TP. Hồ Chí Minh",
        "ha noi": "Hà Nội",
        "hn": "Hà Nội",
        "thua thien hue": "Huế",
    },
    "training_status": {
        "da tot nghiep": "Hoàn thành",
        "da hoan thanh": "Hoàn thành",
        "dat": "Hoàn thành",
        "thoi hoc": "Dừng chương trình",
    },
}


# Values the system itself writes or relies on (new website / staff leads, the UTM channel of a lead,
# LMS completion, the homepage "AI" shelf): they can be ordered but not renamed, hidden or deleted.
LOCKED = {
    "source": {
        "Website",
        "Nhập tay",
        "Facebook ads",
        "Zalo",
        "TikTok",
        "Google",
        "YouTube",
        "Email marketing",
        "SMS marketing",
    },
    "training_status": {"Chờ xét tốt nghiệp", "Hoàn thành"},
    "course_category": {"Trí tuệ nhân tạo (AI)"},
}
# Lists whose value must be one of the list (others keep what was typed, in the list's spelling if known).
STRICT = {"gender"}


def plain(text) -> str:
    """Lower case, no accents or punctuation: how a value is compared ("TP. HCM" == "tp hcm")."""
    text = str(text or "").replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def values(kind: str, include_hidden: bool = False) -> list[str]:
    from .models import ListItem

    items = ListItem.objects.filter(kind=kind)
    if not include_hidden:
        items = items.filter(is_active=True)
    return list(items.order_by("position", "value").values_list("value", flat=True))


def normalize(kind: str, value, items: list[str] | None = None) -> str:
    """The list's own spelling of `value` (an alias or a different case / accent), else `value` as typed."""
    value = " ".join(str(value or "").split())
    if not value:
        return ""
    items = values(kind, include_hidden=True) if items is None else items
    key = plain(value)
    for item in items:
        if plain(item) == key:
            return item
    alias = _ALIASES.get(kind, {}).get(key)
    if alias is not None and (alias == "" or alias in items):
        return alias
    return value


def max_length(kind: str) -> int:
    """The longest value every field of the list can hold."""
    if KIND[kind].coded:
        return 60  # a name only: the records hold the code
    return min(_model(label)._meta.get_field(field).max_length for label, field in KIND[kind].fields)


def _model(label: str):
    from django.apps import apps

    return apps.get_model(label)


def usage(kind: str) -> dict[str, int]:
    """How many records have each value of the list's fields (values not in the list included)."""
    counts: dict[str, int] = {}
    if KIND[kind].coded:
        from .models import ListItem

        name = dict(ListItem.objects.filter(kind=kind).exclude(code="").values_list("code", "value"))
        for label, field in KIND[kind].fields:
            for row in _model(label).objects.values(field).annotate(n=Count("pk")):
                value = name.get(row[field], row[field])
                counts[value] = counts.get(value, 0) + row["n"]
        return counts
    for label, field in KIND[kind].fields:
        rows = _model(label).objects.exclude(**{field: ""}).values(field).annotate(n=Count("pk"))
        for row in rows:
            counts[row[field]] = counts.get(row[field], 0) + row["n"]
    return counts


def replace_in_records(kind: str, old: str, new: str) -> int:
    """Write `new` wherever the list's fields hold `old`; the number of records changed."""
    if KIND[kind].coded:
        return 0  # the records hold the code: a new name changes none of them
    changed = 0
    for label, field in KIND[kind].fields:
        changed += _model(label).objects.filter(**{field: old}).update(**{field: new})
    return changed


def all_lists() -> dict:
    """Every list's offered values, as /app reads them (GET /staff/crm/lists/)."""
    from .models import ListItem, Order

    lists = {k.api: [] for k in KINDS if not k.coded}
    for kind, value in (
        ListItem.objects.filter(is_active=True).order_by("position", "value").values_list("kind", "value")
    ):
        if kind in KIND and not KIND[kind].coded:
            lists[KIND[kind].api].append(value)
    # Every stage, hidden ones included (their name is still shown on the registrations that have them).
    lists["stages"] = stages.table()
    lists["pics"] = sorted(
        {p.strip() for p in Order.objects.exclude(pic="").values_list("pic", flat=True).distinct()},
        key=str.lower,
    )
    return lists


# A person's list-backed fields (Learner; the public form and the learner's own file write them too).
PERSON_LIST_FIELDS = {
    "gender": "gender",
    "area": "province",
    "education_level": "education_level",
    "university": "university",
}


class NormalizeListFields:
    """
    Serializer mixin: the list-backed fields (`list_fields`: field -> list) are written in the list's own
    spelling ("tp hcm" -> "TP. Hồ Chí Minh"); a field of a STRICT list must hold one of its values.
    """

    list_fields: dict[str, str] = {}

    def to_internal_value(self, data):
        from rest_framework.exceptions import ValidationError

        attrs = super().to_internal_value(data)
        errors = {}
        for field, kind in self.list_fields.items():
            if not isinstance(attrs.get(field), str):
                continue
            items = values(kind, include_hidden=True)
            value = normalize(kind, attrs[field], items)
            if kind in STRICT and value and value not in items:
                errors[field] = f"Chọn một giá trị trong danh mục: {', '.join(values(kind))}."
            attrs[field] = value
        if errors:
            raise ValidationError(errors)
        return attrs
