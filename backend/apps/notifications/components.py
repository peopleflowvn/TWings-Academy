# ruff: noqa: E501  (inline e-mail HTML and CSS)
"""
Building blocks of e-mail bodies (inline styles: e-mail clients ignore most stylesheets).
Used by the default templates (defaults.py) and by the blocks code puts into them ({{payment_details}},
{{intake_block}}...), so every e-mail looks the same.
"""

from django.utils.html import escape

TWINGS = "#0056D2"
CORPORATE = "#C8102E"


def heading(title: str, subtitle: str = "") -> str:
    sub = (
        f'<p style="margin:0 0 22px 0;font-size:14px;line-height:1.5;color:#64748B;">{subtitle}</p>'
        if subtitle
        else ""
    )
    return (
        f'<h1 style="margin:0 0 6px 0;font-size:21px;line-height:1.35;font-weight:800;color:#0F172A;">{title}</h1>'
        + sub
    )


def info_table(rows: list[tuple[str, str]], accent: str = TWINGS) -> str:
    """Label / value rows in a light box. Values are HTML (escape them before)."""
    body = "".join(
        f'<tr><td valign="top" style="padding:6px 12px 6px 0;font-size:13px;color:#64748B;white-space:nowrap;width:38%;">{label}</td>'
        f'<td valign="top" style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;">{value}</td></tr>'
        for label, value in rows
        if value not in (None, "")
    )
    if not body:
        return ""
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:18px 0 20px 0;background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid {accent};border-radius:10px;">'
        f'<tr><td style="padding:12px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{body}</table></td></tr></table>'
    )


def button(url: str, label: str, color: str = TWINGS) -> str:
    """A button that also renders in Outlook (a link with padding inside a coloured cell)."""
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 22px 0;"><tr>'
        f'<td align="center" bgcolor="{color}" style="border-radius:10px;background:{color};">'
        f'<a href="{url}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;'
        f'color:#FFFFFF;text-decoration:none;border-radius:10px;">{label}</a></td></tr></table>'
    )


def note(html: str, tone: str = "info") -> str:
    colors = {
        "info": ("#EFF6FF", "#BFDBFE", "#1E3A8A"),
        "warning": ("#FFFBEB", "#FDE68A", "#92400E"),
        "success": ("#ECFDF5", "#A7F3D0", "#065F46"),
    }
    bg, border, text = colors.get(tone, colors["info"])
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:18px 0 20px 0;background:{bg};border:1px solid {border};border-radius:10px;">'
        f'<tr><td style="padding:14px 18px;font-size:14px;line-height:1.6;color:{text};">{html}</td></tr></table>'
    )


def code_box(code: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 22px 0;"><tr>'
        '<td style="padding:14px 28px;background:#F1F5F9;border:1px dashed #94A3B8;border-radius:10px;'
        f"font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:28px;font-weight:800;letter-spacing:6px;color:#0F172A;\">{code}</td>"
        "</tr></table>"
    )


def payment_block(qr: dict) -> str:
    """Amount, account, transfer content and the VietQR image of an unpaid order (qr = vietqr_payload)."""
    from apps.payments.reminders import _vnd

    table = info_table(
        [
            (
                "Số tiền cần chuyển",
                f'<span style="font-size:17px;color:{TWINGS};">{_vnd(qr["amount"])}</span>',
            ),
            ("Ngân hàng", escape(qr["bank_name"])),
            ("Số tài khoản", escape(qr["account_number"])),
            ("Chủ tài khoản", escape(qr["account_name"])),
            (
                "Nội dung chuyển khoản",
                f'<span style="font-family:Consolas,monospace;color:#B45309;">{escape(qr["transfer_content"])}</span>',
            ),
        ]
    )
    image = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr>'
        f'<td align="center"><img src="{qr["qr_image_url"]}" alt="Mã VietQR chuyển khoản" width="220" '
        'style="display:block;width:220px;max-width:100%;height:auto;border:1px solid #E2E8F0;border-radius:10px;">'
        '<div style="font-size:12px;color:#64748B;margin-top:8px;">Mở ứng dụng ngân hàng → Quét mã QR: số tiền và nội dung được điền sẵn.</div>'
        "</td></tr></table>"
        if qr.get("qr_image_url")
        else ""
    )
    return table + image
