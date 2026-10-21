"""
The e-mail frame (brand bar, body, footer links), shared by every e-mail the backend sends. Two brands:
"twings" (B2C, the default) and "corporate" (B2B corporate training, TNTalent: settings
CORPORATE_BRAND_*). Moodle's e-mails use the TWings frame: lms/public/theme/twings/templates/core/
email_html.mustache (keep both in step). A message that is already a full HTML document (staff
templates) is sent as it is.
"""

import re

FULL_DOCUMENT = re.compile(r"<(html|body)\b", re.IGNORECASE)
TABLE = 'role="presentation" width="100%" cellpadding="0" cellspacing="0"'
CARD = (
    "max-width:600px;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;"
    "font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0F172A;font-size:14px;line-height:1.6"
)
BAR = (
    "background-color:{color};border-radius:16px 16px 0 0;padding:16px 24px;color:#ffffff;"
    "font-weight:800;font-size:16px"
)
FOOTER = "padding:16px 24px;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px"


def brand(name: str = "twings") -> dict:
    """Display name, colour, sender and footer of a brand."""
    from django.conf import settings

    from apps.lms.emails import account_url, learn_url

    if name == "corporate":
        sender = settings.CORPORATE_FROM_EMAIL or f"{settings.CORPORATE_BRAND_NAME} <{sender_address()}>"
        contact = settings.CORPORATE_CONTACT_EMAIL
        footer = f'<a href="{learn_url()}" style="color:{settings.CORPORATE_BRAND_COLOR}">Học trực tuyến</a>'
        return {
            "name": settings.CORPORATE_BRAND_NAME,
            "color": settings.CORPORATE_BRAND_COLOR,
            "sender": sender,
            "footer": footer + (f" · {contact}" if contact else ""),
        }
    return {
        "name": "TWings Academy",
        "color": "#0056D2",
        "sender": settings.RESEND_FROM_EMAIL,
        "footer": f'<a href="{learn_url()}" style="color:#0056D2">Cổng học viên</a> · '
        f'<a href="{account_url()}" style="color:#0056D2">Học phí &amp; hồ sơ</a> · hello@twings.edu.vn',
    }


def sender_address() -> str:
    """The bare address of RESEND_FROM_EMAIL ("Name <a@b>" -> "a@b")."""
    from django.conf import settings

    value = settings.RESEND_FROM_EMAIL.strip()
    return value[value.rfind("<") + 1 : -1] if value.endswith(">") and "<" in value else value


def wrap(html: str, brand_name: str = "twings") -> str:
    if FULL_DOCUMENT.search(html):
        return html
    b = brand(brand_name)
    return f"""<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:#F8FAFC">
<table {TABLE} style="background:#F8FAFC;padding:24px 12px">
<tr><td align="center">
<table {TABLE} style="{CARD}">
<tr><td style="{BAR.format(color=b["color"])}">{b["name"]}</td></tr>
<tr><td style="padding:24px">{html}</td></tr>
<tr><td style="{FOOTER}">
{b["footer"]}
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""
