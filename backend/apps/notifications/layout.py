# ruff: noqa: E501  (inline e-mail HTML and CSS)
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


def sender_address() -> str:
    """The bare address of RESEND_FROM_EMAIL ("Name <a@b>" -> "a@b")."""
    from django.conf import settings

    value = settings.RESEND_FROM_EMAIL.strip()
    return value[value.rfind("<") + 1 : -1] if value.endswith(">") and "<" in value else value


def brand(name: str = "twings") -> dict:
    """Display name, colour, sender, logo badges and footer of a brand."""
    from django.conf import settings

    from apps.lms.emails import account_url, learn_url

    if name == "corporate":
        sender = settings.CORPORATE_FROM_EMAIL or f"{settings.CORPORATE_BRAND_NAME} <{sender_address()}>"
        contact = settings.CORPORATE_CONTACT_EMAIL
        footer_links = f'<a href="{learn_url()}" style="color:{settings.CORPORATE_BRAND_COLOR};text-decoration:none;font-weight:700;">Học trực tuyến</a>'
        if contact:
            footer_links += f' · <a href="mailto:{contact}" style="color:{settings.CORPORATE_BRAND_COLOR};text-decoration:none;">{contact}</a>'
        provider_name = settings.CORPORATE_PROVIDER.get(
            "legal_name", "Công ty CP Quản trị Nguồn nhân lực TNTalent"
        )
        address_info = (
            f"{provider_name}<br>Tòa nhà ROX Tower, số 54A Nguyễn Chí Thanh, Phường Láng Hạ, Hà Nội"
        )
        return {
            "name": settings.CORPORATE_BRAND_NAME,
            "color": settings.CORPORATE_BRAND_COLOR,
            "badge_gradient": "linear-gradient(135deg, #991B1B 0%, #DC2626 100%)",
            "badge_shadow": "rgba(200, 16, 46, 0.4)",
            "monogram": "TN",
            "tagline": "Giải Pháp Đào Tạo Nhân Lực Doanh Nghiệp",
            "tagline_color": "#FCA5A5",
            "badge_label": "CORPORATE",
            "accent_gradient": "linear-gradient(90deg, #991B1B 0%, #DC2626 50%, #F87171 100%)",
            "sender": sender,
            "footer_links": footer_links,
            "address_info": address_info,
            "footer": footer_links + (f" · {contact}" if contact else ""),
        }

    footer_links = (
        f'<a href="{learn_url()}" style="color:#0056D2;text-decoration:none;font-weight:700;">Cổng học viên LMS</a> · '
        f'<a href="{account_url()}" style="color:#0056D2;text-decoration:none;font-weight:700;">Học phí &amp; hồ sơ</a> · '
        f'<a href="mailto:hello@twings.edu.vn" style="color:#0056D2;text-decoration:none;font-weight:700;">hello@twings.edu.vn</a>'
    )
    address_info = (
        "Trụ sở: Tòa nhà ROX Tower, 54A Nguyễn Chí Thanh, Q. Đống Đa, TP. Hà Nội<br>"
        'Hotline: 1900 633 898 / 0843 314 382 · Website: <a href="https://twings.edu.vn" style="color:#64748B;text-decoration:none;">twings.edu.vn</a>'
    )
    return {
        "name": "TWings Academy",
        "color": "#0056D2",
        "badge_gradient": "linear-gradient(135deg, #00388A 0%, #0073C1 100%)",
        "badge_shadow": "rgba(0, 115, 193, 0.4)",
        "monogram": "TW",
        "tagline": "Học Viện Đào Tạo Thực Chiến Tài Chính Ngân Hàng",
        "tagline_color": "#93C5FD",
        "badge_label": "CỔNG THÔNG BÁO",
        "accent_gradient": "linear-gradient(90deg, #00388A 0%, #0073C1 50%, #38BDF8 100%)",
        "sender": settings.RESEND_FROM_EMAIL,
        "footer_links": footer_links,
        "address_info": address_info,
        "footer": f'<a href="{learn_url()}" style="color:#0056D2">Cổng học viên</a> · '
        f'<a href="{account_url()}" style="color:#0056D2">Học phí &amp; hồ sơ</a> · hello@twings.edu.vn',
    }


def wrap(html: str, brand_name: str = "twings") -> str:
    if FULL_DOCUMENT.search(html):
        return html
    b = brand(brand_name)
    return f"""<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>{b["name"]}</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #F1F5F9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
    p {{ margin: 0 0 14px 0; }}
    @media only screen and (max-width: 620px) {{
      .email-container {{ width: 100% !important; max-width: 100% !important; }}
      .email-header {{ padding: 20px 18px !important; }}
      .email-body {{ padding: 24px 18px !important; }}
      .email-footer {{ padding: 20px 18px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table {TABLE} border="0" style="background-color:#F1F5F9;padding:32px 12px;">
<tr><td align="center">
<!--[if mso]>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td>
<![endif]-->
<table {TABLE} border="0" class="email-container" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.06);">
  <!-- Brand Header Bar with Logo Monogram -->
  <tr>
    <td class="email-header" style="background:#0F172A;padding:24px 30px;border-radius:16px 16px 0 0;">
      <table {TABLE} border="0">
        <tr>
          <td valign="middle" style="width:44px;">
            <!-- Brand Monogram Logo Badge -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" valign="middle" style="width:40px;height:40px;border-radius:10px;background:{b["badge_gradient"]};color:#ffffff;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:900;font-size:16px;text-align:center;box-shadow:0 4px 12px {b["badge_shadow"]};">
                  {b["monogram"]}
                </td>
              </tr>
            </table>
          </td>
          <td valign="middle" style="padding-left:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:800;font-size:17px;line-height:1.2;color:#ffffff;letter-spacing:0.3px;">{b["name"]}</td>
              </tr>
            </table>
            <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10px;font-weight:600;color:{b["tagline_color"]};letter-spacing:0.8px;text-transform:uppercase;margin-top:3px;">
              {b["tagline"]}
            </div>
          </td>
          <td align="right" valign="middle">
            <span style="display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:20px;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;font-size:10px;font-weight:700;color:#93C5FD;letter-spacing:0.5px;">
              {b["badge_label"]}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Brand Accent Separator Line -->
  <tr>
    <td height="3" style="background:{b["accent_gradient"]};font-size:0;line-height:0;">&nbsp;</td>
  </tr>

  <!-- Content Body Area -->
  <tr>
    <td class="email-body" style="padding:32px 30px 24px 30px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;font-size:14px;line-height:1.65;">
      {html}
    </td>
  </tr>

  <!-- Brand Footer -->
  <tr>
    <td class="email-footer" style="background:#F8FAFC;border-top:1px solid #E2E8F0;border-radius:0 0 16px 16px;padding:24px 30px;text-align:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#475569;">
        {b["footer_links"]}
      </div>
      <div style="font-size:11px;color:#94A3B8;line-height:1.6;margin-bottom:8px;">
        {b["address_info"]}
      </div>
      <div style="font-size:10px;color:#CBD5E1;">
        &copy; 2026 {b["name"]}. Bản quyền được bảo lưu. Email được gửi tự động từ hệ thống.
      </div>
    </td>
  </tr>
</table>
<!--[if mso]>
</td></tr>
</table>
<![endif]-->
</td></tr>
</table>
</body></html>"""
