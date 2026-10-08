"""
The TWings e-mail frame (brand bar, body, footer links), shared by every e-mail the backend sends.
Moodle's e-mails use the same frame: lms/public/theme/twings/templates/core/email_html.mustache (keep
both in step). A message that is already a full HTML document (staff templates) is sent as it is.
"""

import re

FULL_DOCUMENT = re.compile(r"<(html|body)\b", re.IGNORECASE)
TABLE = 'role="presentation" width="100%" cellpadding="0" cellspacing="0"'
CARD = (
    "max-width:600px;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;"
    "font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0F172A;font-size:14px;line-height:1.6"
)
BAR = (
    "background-color:#0056D2;border-radius:16px 16px 0 0;padding:16px 24px;color:#ffffff;"
    "font-weight:800;font-size:16px"
)
FOOTER = "padding:16px 24px;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px"


def wrap(html: str) -> str:
    if FULL_DOCUMENT.search(html):
        return html
    from apps.lms.emails import account_url, learn_url

    return f"""<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:#F8FAFC">
<table {TABLE} style="background:#F8FAFC;padding:24px 12px">
<tr><td align="center">
<table {TABLE} style="{CARD}">
<tr><td style="{BAR}">TWings Academy</td></tr>
<tr><td style="padding:24px">{html}</td></tr>
<tr><td style="{FOOTER}">
<a href="{learn_url()}" style="color:#0056D2">Cổng học viên</a> ·
<a href="{account_url()}" style="color:#0056D2">Học phí &amp; hồ sơ</a> · hello@twings.edu.vn
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""
