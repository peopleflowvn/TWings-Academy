"""
E-mail settings, edited in /app/content/email → "Cấu hình gửi thư" (SiteConfig "email_settings").

Every value has a fallback, so an empty field never breaks sending:
- sender / reply-to / Resend keys: the server's environment (.env: RESEND_*, CORPORATE_*);
- logo, hotline, support address, postal address: the website settings (/app/content/seo, "site_seo"),
  so the e-mails always show the same contact details as the website.

The Resend API key and webhook signing secret may be stored here too: encrypted (FIELD_ENCRYPTION_KEYS),
never sent back to the browser (only "…last 4 characters").
"""

import re

from django.conf import settings
from django.utils import timezone

from apps.core.models import SiteConfig

KEY = SiteConfig.KEY_EMAIL_SETTINGS
SECRET_FIELDS = ("api_key", "webhook_secret")

DEFAULTS: dict = {
    # Sender (B2C, TWings)
    "from_name": "TWings Academy",
    "from_address": "",  # empty: the address of RESEND_FROM_EMAIL
    "reply_to": "",  # empty: the website's contact e-mail (site_seo.email)
    # Sender (B2B corporate training, TNTalent)
    "corporate_from_name": "",  # empty: CORPORATE_BRAND_NAME
    "corporate_from_address": "",  # empty: CORPORATE_FROM_EMAIL, else the TWings sender address
    "corporate_reply_to": "",  # empty: CORPORATE_CONTACT_EMAIL
    # Delivery
    "bcc_archive": "",  # a mailbox that gets a hidden copy of every learner e-mail (never codes / links)
    "redirect_to": "",  # test mode: every e-mail goes to this mailbox instead of the real recipient
    # Frame
    "logo_url": "",  # empty: the website logo (site_seo.logo_url)
    "corporate_logo_url": "",
    "tagline": "Học viện đào tạo thực chiến Tài chính – Ngân hàng",
    "corporate_tagline": "Giải pháp đào tạo nhân lực doanh nghiệp",
    "signature": "Trân trọng,\nĐội ngũ TWings Academy",
    "corporate_signature": "",  # empty: "Trân trọng,\nĐội ngũ <CORPORATE_BRAND_NAME>"
    "company_name": "",  # legal name printed in the footer (optional)
    "footer_note": (
        "Bạn nhận được email này vì đã đăng ký tư vấn, đăng ký học hoặc đang học tại TWings Academy."
    ),
    "show_hotline": True,
    "show_address": True,
}

EMAIL_FIELDS = (
    "from_address",
    "reply_to",
    "corporate_from_address",
    "corporate_reply_to",
    "bcc_archive",
    "redirect_to",
)
URL_FIELDS = ("logo_url", "corporate_logo_url")
BOOL_FIELDS = ("show_hotline", "show_address")
EMAIL_RE = re.compile(r"^[^@\s<>\"]+@[^@\s<>\"]+\.[^@\s<>\"]+$")
PHONE_RE = re.compile(r"\+?\d[\d .\-]{6,}\d")


# ---------------------------------------------------------------- storage
def _doc() -> dict:
    doc = SiteConfig.objects.filter(key=KEY).first()
    return doc.data if doc and isinstance(doc.data, dict) else {}


def stored() -> dict:
    """Settings as edited (no secrets), every key present."""
    data = _doc()
    return {k: data.get(k, default) for k, default in DEFAULTS.items()}


def save(changes: dict, secrets: dict | None = None) -> dict:
    """Validated settings (see validate()) and optional secrets: "" clears, None keeps."""
    from apps.core.crypto import encrypt_str

    doc, _ = SiteConfig.objects.get_or_create(key=KEY)
    data = dict(doc.data) if isinstance(doc.data, dict) else {}
    data.update(changes)
    for name, value in (secrets or {}).items():
        if name not in SECRET_FIELDS or value is None:
            continue
        if value == "":
            data.pop(f"{name}_enc", None)
        else:
            data[f"{name}_enc"] = encrypt_str(value)
    doc.data = data
    doc.save()
    return stored()


def validate(raw: dict) -> tuple[dict, dict]:
    """(clean values, errors by field). Unknown keys are ignored."""
    clean, errors = {}, {}
    for key in DEFAULTS:
        if key not in raw:
            continue
        value = raw[key]
        if key in BOOL_FIELDS:
            clean[key] = bool(value)
            continue
        value = str(value or "").strip()
        if key in EMAIL_FIELDS and value and not EMAIL_RE.match(value):
            errors[key] = "Địa chỉ email không hợp lệ."
        elif key in URL_FIELDS and value and not (value.startswith("https://") or value.startswith("/")):
            errors[key] = "Đường dẫn ảnh phải bắt đầu bằng https:// hoặc là ảnh đã tải lên."
        elif key.endswith("from_name") and any(c in value for c in '<>"@'):
            errors[key] = 'Tên người gửi không được chứa các ký tự < > " @.'
        elif len(value) > 500:
            errors[key] = "Tối đa 500 ký tự."
        clean[key] = value
    return clean, errors


def _secret(name: str) -> tuple[str, str]:
    """(value, source): source is "system" (saved here), "env" (.env of the server) or ""."""
    from apps.core.crypto import decrypt_str

    enc = _doc().get(f"{name}_enc")
    if enc:
        try:
            return decrypt_str(enc), "system"
        except ValueError:
            pass
    env_value = settings.RESEND_API_KEY if name == "api_key" else settings.RESEND_WEBHOOK_SECRET
    return (env_value, "env") if env_value else ("", "")


def api_key() -> str:
    return _secret("api_key")[0]


def webhook_secret() -> str:
    return _secret("webhook_secret")[0]


def secret_status() -> dict:
    out = {}
    for name in SECRET_FIELDS:
        value, source = _secret(name)
        out[name] = {"source": source, "hint": f"…{value[-4:]}" if len(value) >= 8 else ""}
    return out


# ---------------------------------------------------------------- what the e-mails use
def _site_seo() -> dict:
    from apps.cms.seo import site_seo

    return site_seo()


def _absolute(url: str) -> str:
    from apps.cms.seo import absolute

    return absolute(url) if url else ""


def _env_address(value: str) -> str:
    """ "Name <a@b>" -> "a@b"."""
    value = (value or "").strip()
    return value[value.rfind("<") + 1 : -1] if value.endswith(">") and "<" in value else value


def tel(phone: str) -> str:
    """The first phone number of a hotline text, digits only ("0843 314 382 (Ms. Hường)" -> 0843314382)."""
    match = PHONE_RE.search(phone or "")
    return re.sub(r"[^\d+]", "", match.group(0)) if match else ""


def site_url() -> str:
    from apps.cms.seo import base_url

    return base_url()


def effective(brand: str = "twings") -> dict:
    """Everything the frame and the sending need for one brand, fallbacks applied."""
    from apps.lms.emails import account_url, learn_url

    cfg, seo = stored(), _site_seo()
    corporate = brand == "corporate"
    twings_address = cfg["from_address"] or _env_address(settings.RESEND_FROM_EMAIL)
    hotline = str(seo.get("hotline") or "").strip()
    support_email = str(seo.get("email") or "").strip() or "hello@twings.edu.vn"
    address = str(seo.get("address") or "").strip()
    site_name = "TWings Academy"
    data = {
        "site_name": site_name,
        "site_url": site_url(),
        "learn_url": learn_url(),
        "account_url": account_url(),
        "year": str(timezone.localdate().year),
        "show_hotline": cfg["show_hotline"],
        "show_address": cfg["show_address"],
        "footer_note": cfg["footer_note"],
        "company_name": cfg["company_name"],
    }
    if corporate:
        name = cfg["corporate_from_name"] or settings.CORPORATE_BRAND_NAME
        env_from = settings.CORPORATE_FROM_EMAIL
        from_address = cfg["corporate_from_address"] or _env_address(env_from) or twings_address
        provider = settings.CORPORATE_PROVIDER
        contact = cfg["corporate_reply_to"] or settings.CORPORATE_CONTACT_EMAIL
        data.update(
            brand_name=settings.CORPORATE_BRAND_NAME,
            color=settings.CORPORATE_BRAND_COLOR,
            from_name=name,
            from_address=from_address,
            reply_to=contact,
            logo_url=_absolute(cfg["corporate_logo_url"]),
            tagline=cfg["corporate_tagline"],
            signature=cfg["corporate_signature"] or f"Trân trọng,\nĐội ngũ {settings.CORPORATE_BRAND_NAME}",
            hotline=provider.get("phone", ""),
            support_email=contact,
            address=provider.get("address", ""),
            company_name=provider.get("legal_name", "") or cfg["company_name"],
            footer_note="Email gửi tới học viên các lớp đào tạo doanh nghiệp do "
            f"{settings.CORPORATE_BRAND_NAME} tổ chức.",
        )
    else:
        data.update(
            brand_name=site_name,
            color="#0056D2",
            from_name=cfg["from_name"] or site_name,
            from_address=twings_address,
            reply_to=cfg["reply_to"] or support_email,
            logo_url=_absolute(cfg["logo_url"] or str(seo.get("logo_url") or "")),
            tagline=cfg["tagline"],
            signature=cfg["signature"],
            hotline=hotline,
            support_email=support_email,
            address=address,
        )
    data["name"] = data["brand_name"]  # printable pages (corporate reports) use brand.name / brand.color
    data["hotline_tel"] = tel(data["hotline"])
    data["sender"] = f"{data['from_name']} <{data['from_address']}>"
    data["bcc_archive"] = cfg["bcc_archive"]
    data["redirect_to"] = cfg["redirect_to"]
    return data


# Variables every template can use (filled when the e-mail is framed).
GLOBAL_VARIABLES = {
    "site_name": "Tên thương hiệu (TWings Academy / TNTalent)",
    "hotline": "Hotline (theo Cài đặt SEO website)",
    "support_email": "Email hỗ trợ (theo Cài đặt SEO website)",
    "address": "Địa chỉ (theo Cài đặt SEO website)",
    "site_url": "Địa chỉ website",
    "learn_url": "Cổng học trực tuyến (LMS)",
    "account_url": "Trang Học phí & hồ sơ của học viên",
}


def global_context(brand: str = "twings", data: dict | None = None) -> dict:
    from django.utils.html import escape

    data = data or effective(brand)
    return {
        "site_name": escape(data["brand_name"]),
        "brand_name": escape(data["brand_name"]),
        "hotline": escape(data["hotline"]),
        "hotline_tel": data["hotline_tel"],
        "support_email": escape(data["support_email"]),
        "address": escape(data["address"]),
        "site_url": data["site_url"],
        "learn_url": data["learn_url"],
        "account_url": data["account_url"],
    }
