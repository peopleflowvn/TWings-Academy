"""
Lead attribution (journey step 3): where did this applicant come from?

The browser keeps the first and the last touch (utm_* parameters, ?ref= code, referrer, landing page)
and sends them with the registration / checkout form. Only marketing parameters are stored, never
anything that identifies the visitor beyond what the form itself collects.
"""

import re
from urllib.parse import urlparse

TOUCH_KEYS = ("source", "medium", "campaign", "content", "term", "ref", "referrer", "landing", "at")
SOURCE_LABELS = {
    "facebook": "Facebook",
    "fb": "Facebook",
    "instagram": "Instagram",
    "messenger": "Messenger",
    "zalo": "Zalo",
    "google": "Google",
    "tiktok": "TikTok",
    "youtube": "YouTube",
    "linkedin": "LinkedIn",
    "email": "Email",
    "coccoc": "Cốc Cốc",
    "bing": "Bing",
}
REFERRER_SOURCES = {
    "facebook.com": "facebook",
    "fb.com": "facebook",
    "m.facebook.com": "facebook",
    "l.facebook.com": "facebook",
    "lm.facebook.com": "facebook",
    "instagram.com": "instagram",
    "messenger.com": "messenger",
    "zalo.me": "zalo",
    "chat.zalo.me": "zalo",
    "google.com": "google",
    "google.com.vn": "google",
    "coccoc.com": "coccoc",
    "bing.com": "bing",
    "youtube.com": "youtube",
    "tiktok.com": "tiktok",
    "linkedin.com": "linkedin",
}


def _clean_value(value) -> str:
    return re.sub(r"[\x00-\x1f]", "", str(value or ""))[:200]


def clean(raw) -> dict:
    """Keep only {first, last} touches with known keys and short string values."""
    if not isinstance(raw, dict):
        return {}
    out = {}
    for touch in ("first", "last"):
        value = raw.get(touch)
        if isinstance(value, dict):
            cleaned = {k: _clean_value(value[k]) for k in TOUCH_KEYS if value.get(k)}
            if cleaned:
                out[touch] = cleaned
    return out


def source_key(touch: dict | None) -> str:
    """Normalised channel key of a touch: utm_source, else the referrer's site, else direct."""
    touch = touch or {}
    if touch.get("source"):
        return touch["source"].strip().lower()[:60]
    host = urlparse(touch.get("referrer", "")).hostname or ""
    host = host.removeprefix("www.")
    if not host:
        return "direct"
    for domain, key in REFERRER_SOURCES.items():
        if host == domain or host.endswith("." + domain):
            return key
    return "other"


def source_label(key: str) -> str:
    if key == "direct":
        return "Truy cập trực tiếp"
    if key == "other":
        return "Website khác"
    return SOURCE_LABELS.get(key, key)


def apply(order_fields: dict, attribution: dict) -> dict:
    """Fill source / campaign / referrer of a new order from the touches (form values win)."""
    from .models import AdmissionCampaign

    last = attribution.get("last") or attribution.get("first") or {}
    if attribution:
        order_fields["attribution"] = attribution
    if last.get("source") or last.get("referrer"):
        order_fields["source"] = (
            f"{order_fields.get('source') or 'Website'} · {source_label(source_key(last))}"[:100]
        )
    if last.get("campaign"):
        campaign = AdmissionCampaign.objects.filter(code__iexact=last["campaign"]).first()
        if campaign is not None:
            order_fields.setdefault("campaign", campaign)
            order_fields["campaign_code"] = order_fields.get("campaign_code") or campaign.code
        elif not order_fields.get("campaign_code"):
            order_fields["campaign_code"] = last["campaign"][:50]
    ref = (attribution.get("last") or {}).get("ref") or (attribution.get("first") or {}).get("ref")
    if ref and not order_fields.get("referrer_staff_code"):
        order_fields["referrer_staff_code"] = ref[:50]
    return order_fields
