"""
The CRM's option lists (danh mục): one set used by every form of /app and by the imports, taken from
the "Danh mục" sheet of the CRM run before this system and from how its data was really filled in.

`normalize(kind, value)` turns the spellings found in that data and in older records ("GTNB", "tnex",
"TP HCM", "Rất cao"…) into the list's own value; anything it does not know is kept as typed.
"""

import json
import re
import unicodedata
from functools import cache
from pathlib import Path

SOURCES = [
    "Website",
    "Facebook ads",
    "Zalo",
    "TikTok",
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
_LISTS = {
    "source": SOURCES,
    "interest_level": INTEREST_LEVELS,
    "gender": GENDERS,
    "education_level": EDUCATION_LEVELS,
    "province": PROVINCES,
    "training_status": TRAINING_STATUSES,
    "lost_reason": LOST_REASONS,
}


def plain(text) -> str:
    """Lower case, no accents or punctuation: how a value is compared ("TP. HCM" == "tp hcm")."""
    text = str(text or "").replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def normalize(kind: str, value) -> str:
    """The list's own spelling of `value` (an alias or a different case / accent), else `value` as typed."""
    value = " ".join(str(value or "").split())
    if not value:
        return ""
    key = plain(value)
    for item in _LISTS[kind]:
        if plain(item) == key:
            return item
    return _ALIASES.get(kind, {}).get(key, value)


@cache
def _reference() -> dict:
    return json.loads((Path(__file__).parent / "data" / "danh_muc.json").read_text(encoding="utf-8"))


def all_lists() -> dict:
    """Every list, as /app reads them (GET /staff/crm/lists/)."""
    from .models import Order

    pics = sorted(
        {p.strip() for p in Order.objects.exclude(pic="").values_list("pic", flat=True).distinct()},
        key=str.lower,
    )
    return {
        "sources": SOURCES,
        "interestLevels": INTEREST_LEVELS,
        "genders": GENDERS,
        "educationLevels": EDUCATION_LEVELS,
        "provinces": PROVINCES,
        "lostReasons": LOST_REASONS,
        "trainingStatuses": TRAINING_STATUSES,
        "universities": _reference()["universities"],
        "msbUnits": _reference()["msb_units"],
        "pics": pics,
    }
