# ruff: noqa: E501  (one-off generator: e-mail HTML)
"""
Update frontend/src/utils/resendEmail.ts with:
1. Standardized 19 templates from fixtures/seed_content.json.
2. wrapEmailPreview() function.
3. testSendEmailWithBackend() function.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
FIXTURE_PATH = ROOT / "backend" / "fixtures" / "seed_content.json"
RESEND_PATH = ROOT / "frontend" / "src" / "utils" / "resendEmail.ts"

with open(FIXTURE_PATH, encoding="utf-8") as f:
    fixture_data = json.load(f)

templates = fixture_data.get("emailTemplates", [])

# Read current resendEmail.ts
with open(RESEND_PATH, encoding="utf-8") as f:
    content = f.read()

# Generate INITIAL_EMAIL_TEMPLATES TypeScript code
tmpl_code = "export const INITIAL_EMAIL_TEMPLATES: EmailTemplate[] = [\n"
for idx, t in enumerate(templates):
    tmpl_code += "  {\n"
    tmpl_code += f"    id: {json.dumps(t['id'])},\n"
    tmpl_code += f"    code: {json.dumps(t['code'])},\n"
    tmpl_code += f"    name: {json.dumps(t['name'], ensure_ascii=False)},\n"
    tmpl_code += f"    category: {json.dumps(t['category'])},\n"
    tmpl_code += f"    subject: {json.dumps(t['subject'], ensure_ascii=False)},\n"
    tmpl_code += f"    description: {json.dumps(t['description'], ensure_ascii=False)},\n"
    tmpl_code += f"    variables: {json.dumps(t['variables'])},\n"
    tmpl_code += f"    isDefault: {json.dumps(t.get('isDefault', True))},\n"
    tmpl_code += f"    updatedAt: {json.dumps(t.get('updatedAt', '22/10/2026'))},\n"
    tmpl_code += f"    body: {json.dumps(t['body'], ensure_ascii=False)}\n"
    tmpl_code += f"  }}{',' if idx < len(templates) - 1 else ''}\n"
tmpl_code += "];\n"

# Cut existing INITIAL_EMAIL_TEMPLATES from resendEmail.ts
# It starts at "export const INITIAL_EMAIL_TEMPLATES: EmailTemplate[] = ["
# and ends right before "export const INITIAL_EMAIL_SEND_LOGS: EmailSendLog[] = ["
start_marker = "export const INITIAL_EMAIL_TEMPLATES: EmailTemplate[] = ["
end_marker = "export const INITIAL_EMAIL_SEND_LOGS: EmailSendLog[] = ["

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    raise ValueError(f"Could not locate markers in {RESEND_PATH}")

new_content = content[:start_idx] + tmpl_code + "\n" + content[end_idx:]

# Now check if wrapEmailPreview is already present
wrap_preview_code = """/**
 * Wraps an inner HTML body into the master branded email frame.
 * If the HTML already contains <html> or <body>, it is returned unchanged.
 * Brands supported: 'twings' (default) and 'corporate'.
 */
export function wrapEmailPreview(html: string, brandName: string = 'twings'): string {
  if (/<(html|body)\\b/i.test(html)) {
    return html;
  }
  const isCorp = brandName === 'corporate';
  const brand = isCorp
    ? {
        name: 'TNTalent - Corporate Training',
        badgeGradient: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)',
        badgeShadow: 'rgba(200, 16, 46, 0.4)',
        monogram: 'TN',
        tagline: 'Giải Pháp Đào Tạo Nhân Lực Doanh Nghiệp',
        taglineColor: '#FCA5A5',
        badgeLabel: 'CORPORATE',
        accentGradient: 'linear-gradient(90deg, #991B1B 0%, #DC2626 50%, #F87171 100%)',
        footerLinks: '<a href="https://twings.edu.vn/learn" style="color:#C8102E;text-decoration:none;font-weight:700;">Học trực tuyến</a> · <a href="mailto:hello@tntalent.vn" style="color:#C8102E;text-decoration:none;">hello@tntalent.vn</a>',
        addressInfo: 'Công ty CP Quản trị Nguồn nhân lực TNTalent<br>Tòa nhà ROX Tower, số 54A Nguyễn Chí Thanh, Phường Láng Hạ, Hà Nội',
      }
    : {
        name: 'TWings Academy',
        badgeGradient: 'linear-gradient(135deg, #00388A 0%, #0073C1 100%)',
        badgeShadow: 'rgba(0, 115, 193, 0.4)',
        monogram: 'TW',
        tagline: 'Học Viện Đào Tạo Thực Chiến Tài Chính Ngân Hàng',
        taglineColor: '#93C5FD',
        badgeLabel: 'CỔNG THÔNG BÁO',
        accentGradient: 'linear-gradient(90deg, #00388A 0%, #0073C1 50%, #38BDF8 100%)',
        footerLinks: '<a href="https://twings.edu.vn/learn" style="color:#0056D2;text-decoration:none;font-weight:700;">Cổng học viên LMS</a> · <a href="https://twings.edu.vn" style="color:#0056D2;text-decoration:none;font-weight:700;">Học phí &amp; hồ sơ</a> · <a href="mailto:hello@twings.edu.vn" style="color:#0056D2;text-decoration:none;">hello@twings.edu.vn</a>',
        addressInfo: 'Trụ sở: Tòa nhà ROX Tower, 54A Nguyễn Chí Thanh, Q. Đống Đa, TP. Hà Nội<br>Hotline: 1900 633 898 / 0843 314 382 · Website: <a href="https://twings.edu.vn" style="color:#64748B;text-decoration:none;">twings.edu.vn</a>',
      };

  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${brand.name}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F5F9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    p { margin: 0 0 14px 0; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-header { padding: 20px 18px !important; }
      .email-body { padding: 24px 18px !important; }
      .email-footer { padding: 20px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:32px 12px;">
<tr><td align="center">
<!--[if mso]>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.06);">
  <!-- Brand Header Bar with Logo Monogram -->
  <tr>
    <td class="email-header" style="background:#0F172A;padding:24px 30px;border-radius:16px 16px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="width:44px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" valign="middle" style="width:40px;height:40px;border-radius:10px;background:${brand.badgeGradient};color:#ffffff;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:900;font-size:16px;text-align:center;box-shadow:0 4px 12px ${brand.badgeShadow};">
                  ${brand.monogram}
                </td>
              </tr>
            </table>
          </td>
          <td valign="middle" style="padding-left:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:800;font-size:17px;line-height:1.2;color:#ffffff;letter-spacing:0.3px;">${brand.name}</td>
              </tr>
            </table>
            <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10px;font-weight:600;color:${brand.taglineColor};letter-spacing:0.8px;text-transform:uppercase;margin-top:3px;">
              ${brand.tagline}
            </div>
          </td>
          <td align="right" valign="middle">
            <span style="display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:20px;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;font-size:10px;font-weight:700;color:#93C5FD;letter-spacing:0.5px;">
              ${brand.badgeLabel}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td height="3" style="background:${brand.accentGradient};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td class="email-body" style="padding:32px 30px 24px 30px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;font-size:14px;line-height:1.65;">
      ${html}
    </td>
  </tr>
  <tr>
    <td class="email-footer" style="background:#F8FAFC;border-top:1px solid #E2E8F0;border-radius:0 0 16px 16px;padding:24px 30px;text-align:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#475569;">
        ${brand.footerLinks}
      </div>
      <div style="font-size:11px;color:#94A3B8;line-height:1.6;margin-bottom:8px;">
        ${brand.addressInfo}
      </div>
      <div style="font-size:10px;color:#CBD5E1;">
        &copy; 2026 ${brand.name}. Bản quyền được bảo lưu. Email được gửi tự động từ hệ thống.
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
</body></html>`;
}

/**
 * 1-click test send email via the TWings backend API (/staff/emails/test-send/).
 */
export async function testSendEmailWithBackend(params: {
  to: string;
  code?: string;
  subject?: string;
  body?: string;
  brand?: string;
  variables?: Record<string, string | number>;
}): Promise<{ success: boolean; messageId: string; status: ResendEmailStatus; error?: string }> {
  if (isBackendEnabled()) {
    try {
      const data = await api.post<{ id: string; status: ResendEmailStatus; messageId?: string; error?: string }>(
        '/staff/emails/test-send/',
        {
          to: params.to,
          code: params.code || '',
          subject: params.subject || '',
          body: params.body || '',
          brand: params.brand || 'twings',
          variables: params.variables || {},
          sync: true
        }
      );
      return {
        success: data.status === 'sent' || data.status === 'simulated',
        messageId: data.messageId || data.id,
        status: data.status,
        error: data.error
      };
    } catch (err) {
      return {
        success: false,
        messageId: '',
        status: 'failed',
        error: err instanceof Error ? err.message : 'Lỗi gửi email thử nghiệm qua máy chủ'
      };
    }
  }
  return sendEmailWithResend({
    to: params.to,
    subject: `[TEST] ${params.subject || 'Thử nghiệm'}`,
    html: wrapEmailPreview(params.body || '', params.brand || 'twings'),
    templateCode: params.code
  });
}
"""

if "wrapEmailPreview" not in new_content:
    new_content += "\n" + wrap_preview_code + "\n"

with open(RESEND_PATH, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Successfully updated {RESEND_PATH} with {len(templates)} templates and helper functions.")
