# ruff: noqa: E501  (inline e-mail HTML and CSS)
"""
The e-mail frame (logo header, body, signature, footer), shared by every e-mail the backend sends.
Two brands: "twings" (B2C, the default) and "corporate" (B2B corporate training, TNTalent).

What the frame shows comes from /app/content/email (config.py) with the website settings
(/app/content/seo) as fallback: logo, hotline, support e-mail and address are the website's.
Moodle's e-mails use a static copy of this frame: lms/public/theme/twings/templates/core/email_html.mustache
(its logo is /api/v1/public/email-logo/, so it follows the configured logo).

A message that is already a full HTML document is sent as it is.
"""

import re

from django.utils.html import escape

from . import config

FULL_DOCUMENT = re.compile(r"<(html|body)\b", re.IGNORECASE)
TABLE = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"'
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def sender_address() -> str:
    """The bare TWings sender address (settings, else RESEND_FROM_EMAIL)."""
    return config.effective("twings")["from_address"]


def brand(name: str = "twings") -> dict:
    """Effective settings of a brand (sender, reply-to, logo, contact details...)."""
    return config.effective("corporate" if name == "corporate" else "twings")


def _logo(b: dict) -> str:
    if b["logo_url"]:
        return (
            f'<img src="{escape(b["logo_url"])}" alt="{escape(b["brand_name"])}" height="44" '
            f'style="display:block;height:44px;width:auto;max-width:220px;border:0;outline:none;text-decoration:none;">'
        )
    # No logo uploaded yet: the name as a wordmark.
    return (
        f'<span style="font-family:{FONT};font-size:20px;font-weight:800;letter-spacing:0.2px;'
        f'color:{b["color"]};">{escape(b["brand_name"])}</span>'
    )


def _signature(b: dict) -> str:
    lines = [escape(line.strip()) for line in (b["signature"] or "").splitlines() if line.strip()]
    if not lines:
        return ""
    *first, last = lines
    head = "<br>".join(first)
    return (
        f'<p style="margin:24px 0 0 0;color:#334155;">{head + "<br>" if head else ""}'
        f'<strong style="color:#0F172A;">{last}</strong></p>'
    )


def _footer(b: dict) -> str:
    link = f"color:{b['color']};text-decoration:none;font-weight:700;"
    if b["brand_name"] == "TWings Academy":
        links = [
            f'<a href="{b["site_url"]}/" style="{link}">Website</a>',
            f'<a href="{b["learn_url"]}" style="{link}">Vào học (LMS)</a>',
            f'<a href="{b["account_url"]}" style="{link}">Học phí &amp; hồ sơ</a>',
        ]
    else:
        links = [f'<a href="{b["learn_url"]}" style="{link}">Vào học trực tuyến</a>']
    contact = []
    if b["show_hotline"] and b["hotline"]:
        number = escape(b["hotline"])
        contact.append(
            f'Hotline: <a href="tel:{b["hotline_tel"]}" style="color:#475569;text-decoration:none;font-weight:700;">{number}</a>'
            if b["hotline_tel"]
            else f"Hotline: {number}"
        )
    if b["support_email"]:
        mail = escape(b["support_email"])
        contact.append(
            f'Email: <a href="mailto:{mail}" style="color:#475569;text-decoration:none;">{mail}</a>'
        )
    lines = []
    if b["company_name"]:
        lines.append(f'<strong style="color:#475569;">{escape(b["company_name"])}</strong>')
    if b["show_address"] and b["address"]:
        lines.append(escape(b["address"]))
    if contact:
        lines.append(" · ".join(contact))
    note = f"{escape(b['footer_note'])}<br>" if b["footer_note"] else ""
    return f"""<div style="font-size:12px;font-weight:700;margin-bottom:10px;">{" &nbsp;·&nbsp; ".join(links)}</div>
      <div style="font-size:12px;color:#64748B;line-height:1.7;margin-bottom:10px;">{"<br>".join(lines)}</div>
      <div style="font-size:11px;color:#94A3B8;line-height:1.6;">{note}&copy; {b["year"]} {escape(b["brand_name"])}.</div>"""


def wrap(html: str, brand_name: str = "twings", *, signature: bool = True, preheader: str = "") -> str:
    """Frame a message body and fill the brand variables ({{hotline}}, {{support_email}}...)."""
    from .engine import interpolate

    b = brand(brand_name)
    html = interpolate(html, config.global_context(brand_name, b))
    if FULL_DOCUMENT.search(html):
        return html
    hidden = (
        f'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F1F5F9;">{escape(preheader)}</div>'
        if preheader
        else ""
    )
    tagline = (
        f'<td class="email-tagline" align="right" valign="middle" style="font-family:{FONT};font-size:11px;font-weight:600;color:#64748B;line-height:1.4;">{escape(b["tagline"])}</td>'
        if b["tagline"]
        else ""
    )
    return f"""<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>{escape(b["brand_name"])}</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #F1F5F9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
    p {{ margin: 0 0 14px 0; }}
    a {{ color: {b["color"]}; }}
    @media only screen and (max-width: 620px) {{
      .email-container {{ width: 100% !important; max-width: 100% !important; }}
      .email-pad {{ padding-left: 20px !important; padding-right: 20px !important; }}
      .email-tagline {{ display: none !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:{FONT};-webkit-font-smoothing:antialiased;">
{hidden}
<table {TABLE} style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table {TABLE} class="email-container" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;">
  <tr>
    <td height="4" style="background:{b["color"]};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td class="email-pad" style="padding:22px 32px 18px 32px;border-bottom:1px solid #E2E8F0;">
      <table {TABLE}>
        <tr>
          <td valign="middle"><a href="{b["site_url"]}/" style="text-decoration:none;">{_logo(b)}</a></td>
          {tagline}
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="email-pad" style="padding:30px 32px 28px 32px;font-family:{FONT};color:#1E293B;font-size:15px;line-height:1.65;">
      {html}
      {_signature(b) if signature else ""}
    </td>
  </tr>
  <tr>
    <td class="email-pad" style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:22px 32px;text-align:center;font-family:{FONT};">
      {_footer(b)}
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body></html>"""
