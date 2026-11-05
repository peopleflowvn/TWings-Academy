import { EmailTemplate, Order, ResendEmailStatus } from '../types';
import { api, isBackendEnabled } from '../lib/api';

/**
 * E-mails are sent, framed (logo, signature, footer) and previewed by the TWings server only: the Resend
 * key never reaches the browser, and the frame has one source (backend/apps/notifications/layout.py).
 * Settings (sender, reply-to, logo, keys...) live in /app/content/email → Cấu hình gửi thư.
 */
export function isLiveEmailEnabled(): boolean {
  return isBackendEnabled();
}

// ------------------------------------------------------------------ settings (GET/PUT /staff/emails/settings/)
export interface EmailSettings {
  fromName: string;
  fromAddress: string;
  replyTo: string;
  corporateFromName: string;
  corporateFromAddress: string;
  corporateReplyTo: string;
  bccArchive: string;
  redirectTo: string;
  logoUrl: string;
  corporateLogoUrl: string;
  tagline: string;
  corporateTagline: string;
  signature: string;
  corporateSignature: string;
  companyName: string;
  footerNote: string;
  showHotline: boolean;
  showAddress: boolean;
}

export interface EmailBrandEffective {
  sender: string;
  replyTo: string;
  logoUrl: string;
  hotline: string;
  supportEmail: string;
  address: string;
  fromAddress: string;
}

export interface EmailSettingsResponse {
  canEdit: boolean;
  settings: EmailSettings;
  defaults: EmailSettings;
  secrets: { apiKey?: { source: 'system' | 'env' | ''; hint: string }; webhookSecret?: { source: 'system' | 'env' | ''; hint: string } };
  live: boolean;
  webhookConfigured: boolean;
  webhookUrl: string;
  webhookEvents: string[];
  effective: { twings: EmailBrandEffective; corporate: EmailBrandEffective; redirectTo: string; bccArchive: string };
  site: { logoUrl: string; hotline: string; email: string; address: string };
  globalVariables: { name: string; label: string }[];
  standardTemplates: { code: string; name: string; category: string; trigger: string }[];
}

export interface EmailConnectionCheck {
  ok: boolean;
  restricted?: boolean;
  detail: string;
  domains?: { name: string; status: string; region: string; createdAt: string }[];
  senders?: { brand: string; domain: string; verified: boolean | null }[];
}

export interface EmailStats {
  days: number;
  total: number;
  byStatus: Record<string, number>;
  deliveryRate: number | null;
  openRate: number | null;
  bounceRate: number | null;
  topTemplates: { templateCode: string; n: number }[];
}

export const loadEmailSettings = () => api.get<EmailSettingsResponse>('/staff/emails/settings/');

export const saveEmailSettings = (body: { settings?: Partial<EmailSettings>; apiKey?: string; webhookSecret?: string }) =>
  api.put<EmailSettingsResponse>('/staff/emails/settings/', body);

export const checkEmailConnection = () => api.post<EmailConnectionCheck>('/staff/emails/settings/check/', {});

export const loadEmailStats = (days = 30) => api.get<EmailStats>(`/staff/emails/stats/?days=${days}`);

// ------------------------------------------------------------------ variables
const toSnake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// The innermost {{#if name}}…{{else}}…{{/if}} (no other {{#if inside): nested sections resolve inside out.
const CONDITION = /{{\s*#if\s+(\w+)\s*}}((?:(?!{{\s*#if\s)[\s\S])*?){{\s*\/if\s*}}/g;

/**
 * Fill {{variable}} (camelCase or snake_case, same meaning) and the {{#if variable}} sections of known
 * variables; unknown ones are left for the server (brand variables: {{site_name}}, {{hotline}}...).
 */
export function renderEmailTemplate(
  templateString: string,
  variables: Record<string, string | number | undefined>
): string {
  const values: Record<string, string | number | undefined> = {};
  Object.entries(variables).forEach(([k, v]) => (values[toSnake(k)] = v));
  let out = templateString;
  let previous = '';
  while (previous !== out) {
    previous = out;
    out = out.replace(CONDITION, (block, name: string, inner: string) => {
      const key = toSnake(name);
      if (!(key in values)) return block; // a brand variable: the server decides
      const [yes, no = ''] = inner.split(/{{\s*else\s*}}/);
      const v = values[key];
      return v !== undefined && v !== '' && v !== 0 && v !== '0' ? yes : no;
    });
  }
  return out.replace(/{{\s*(\w+)\s*}}/g, (tag, name: string) => {
    const v = values[toSnake(name)];
    return v === undefined ? tag : String(v);
  });
}

function formatVND(num?: number) {
  if (num === undefined || num === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

/** Variables of a registration, and what they mean (the editor's chips and "missing data" warnings). */
export const EMAIL_VARIABLE_LABELS: Record<string, string> = {
  customer_name: 'Họ tên học viên',
  course_title: 'Tên khóa học',
  batch_cohort: 'Lớp / đợt khai giảng',
  start_date: 'Ngày khai giảng',
  instructor_name: 'Giảng viên phụ trách lớp',
  amount: 'Số tiền cần đóng',
  order_code: 'Mã đăng ký',
  bank_account: 'Tài khoản nhận học phí (một dòng)',
  qr_image_url: 'Ảnh mã VietQR của đơn',
  bank_name: 'Ngân hàng nhận học phí',
  account_number: 'Số tài khoản nhận học phí',
  account_name: 'Chủ tài khoản nhận học phí',
  transfer_content: 'Nội dung chuyển khoản (mã đơn)',
  location: 'Địa điểm học',
  pic: 'Tư vấn viên phụ trách',
  customer_phone: 'SĐT học viên',
  customer_email: 'Email học viên'
};

/** Meaning of the variables of the automatic e-mails (chips of the template editor). */
export const EMAIL_TEMPLATE_VARIABLE_LABELS: Record<string, string> = {
  cohort_name: 'Tên lớp (trống nếu chưa xếp lớp)',
  installment_count: 'Số kỳ trả góp (trống nếu đóng một lần)',
  overdue: 'Có giá trị khi kỳ học phí đã quá hạn',
  remaining: 'Số tiền còn lại (trống khi đã đóng đủ)',
  certificate_code: 'Mã chứng chỉ (trống nếu chưa cấp)',
  certificate_url: 'Trang xác minh chứng chỉ',
  suggestions: 'Danh sách khóa gợi ý học tiếp (HTML)',
  location: 'Địa điểm / link họp nhân viên nhập',
  is_call: 'Có giá trị khi hẹn qua điện thoại',
  is_zalo: 'Có giá trị khi hẹn qua Zalo',
  is_online: 'Có giá trị khi họp trực tuyến',
  is_office: 'Có giá trị khi gặp tại văn phòng',
  is_correction: 'Có giá trị khi thư đính chính thư trước',
  lead_list: 'Danh sách lead (HTML)',
  late_list: 'Lead quá hạn lâu (HTML, trống nếu không có)',
  unassigned_list: 'Lead chưa có tư vấn viên (HTML, trống nếu không có)',
  lead_count: 'Số lead',
  response_hours: 'Số giờ cam kết liên hệ',
  crm_url: 'Đường dẫn mở CRM',
  request_list: 'Danh sách yêu cầu (HTML)',
  request_count: 'Số yêu cầu',
  requests_url: 'Đường dẫn danh sách yêu cầu',
  result_details: 'Bảng kết quả của học viên (HTML)',
  results_table: 'Bảng kết quả nhân viên (HTML)',
  staff_count: 'Số nhân viên',
  manager_name: 'Tên quản lý (trống: “Anh/Chị”)',
  message: 'Lời nhắn của cán bộ đào tạo (HTML)'
};

/**
 * Preview values of the {{#if}} switches (an example of each case would show every branch at once):
 * an appointment by phone, a reminder not yet overdue, not a correction.
 */
export const EMAIL_PREVIEW_SWITCHES: Record<string, string> = {
  is_call: '1',
  is_zalo: '',
  is_online: '',
  is_office: '',
  overdue: '',
  is_correction: ''
};

/** Facts about a registration that are not on the order itself (loaded by the screen that sends). */
export interface EmailContext {
  /** Payment instructions and amount due (GET /staff/orders/<id>/billing/). */
  billing?: {
    amountDueNow: number;
    payment: { bankName: string; accountNumber: string; accountName: string; transferContent: string; qrImageUrl: string } | null;
  } | null;
  /** The intake of the registration (GET /staff/cohorts/<id>/). */
  cohort?: { startDate?: string | null; location?: string; leadInstructorName?: string } | null;
}

/**
 * Template variables of one registration, from real data only: what is not known is left empty (the
 * sending screen lists it) rather than filled with an example value.
 */
export function extractOrderEmailVariables(order: Order, ctx: EmailContext = {}): Record<string, string | number> {
  const pay = ctx.billing?.payment;
  const due = ctx.billing ? ctx.billing.amountDueNow : order.totalReceivable || order.amount;
  const start = ctx.cohort?.startDate;
  return {
    customer_name: order.customerName || '',
    course_title: order.courseTitle || '',
    batch_cohort: order.batchCohort || '',
    order_code: order.orderCode || '',
    amount: due ? formatVND(due) : '',
    customer_phone: order.customerPhone || '',
    customer_email: order.customerEmail || '',
    pic: order.pic || '',
    start_date: start ? start.slice(0, 10).split('-').reverse().join('/') : '',
    location: ctx.cohort?.location || '',
    bank_account: pay ? `${pay.accountNumber} – ${pay.accountName} – ${pay.bankName} (nội dung: ${pay.transferContent})` : '',
    // The order's own payment instructions (same as the learner's payment page and the bank webhook).
    qr_image_url: pay?.qrImageUrl || '',
    bank_name: pay?.bankName || '',
    account_number: pay?.accountNumber || '',
    account_name: pay?.accountName || '',
    transfer_content: pay?.transferContent || '',
    instructor_name: ctx.cohort?.leadInstructorName || ''
  };
}

/** Variables the texts use that have no value for this registration. */
export function missingEmailVariables(texts: string[], variables: Record<string, string | number | undefined>): string[] {
  const used = new Set<string>();
  texts.forEach((t) => (t.match(/{{\s*(\w+)\s*}}/g) || []).forEach((m) => used.add(toSnake(m.replace(/[{}\s]/g, '')))));
  return [...used].filter((k) => k in variables && (variables[k] === '' || variables[k] === undefined));
}

/** For previews without a real registration: every empty variable shows as [its meaning]. */
export function withPlaceholders(variables: Record<string, string | number>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, v === '' ? `[${EMAIL_VARIABLE_LABELS[k] || k}]` : v])
  );
}

/** Templates a consultant may send by hand (not sign-in codes, not B2B mail). */
export const isManualTemplate = (t: EmailTemplate) =>
  t.category !== 'security' && t.category !== 'corporate' && t.category !== 'internal';

// ------------------------------------------------------------------ preview / send
/** The e-mail exactly as it will be sent (server frame: logo, signature, footer, brand variables). */
export async function previewEmail(params: {
  subject: string;
  html: string;
  code?: string;
  brand?: 'twings' | 'corporate';
  variables?: Record<string, string | number>;
}): Promise<{ subject: string; html: string }> {
  if (!isBackendEnabled()) return { subject: params.subject, html: params.html };
  return api.post<{ subject: string; html: string }>('/staff/emails/preview/', {
    templateCode: params.code || '',
    subject: params.subject,
    html: params.html,
    brand: params.brand || 'twings',
    variables: params.variables || {}
  });
}

export async function sendEmailWithResend(params: {
  to: string;
  subject: string;
  html: string;
  recipientName?: string;
  /** Server template code (EmailTemplate.code) and the order the e-mail belongs to (CRM history). */
  templateCode?: string;
  orderId?: string;
}): Promise<{ success: boolean; messageId: string; status: ResendEmailStatus; error?: string }> {
  if (!isBackendEnabled()) {
    return { success: false, messageId: '', status: 'failed', error: 'Chưa kết nối máy chủ TWings: không gửi được email.' };
  }
  try {
    const data = await api.post<{ id: string; resendMessageId: string | null; status: ResendEmailStatus }>(
      '/staff/emails/send/',
      {
        to: params.to,
        subject: params.subject,
        html: params.html,
        templateCode: params.templateCode || '',
        recipientName: params.recipientName,
        orderId: params.orderId || ''
      }
    );
    return { success: true, messageId: data.resendMessageId || '', status: data.status };
  } catch (err) {
    return {
      success: false,
      messageId: '',
      status: 'failed',
      error: err instanceof Error ? err.message : 'Lỗi gửi email qua máy chủ'
    };
  }
}

/** A test of a template (subject gets "[TEST]"), framed and sent at once by the server. */
export async function testSendEmailWithBackend(params: {
  to: string;
  code?: string;
  subject?: string;
  body?: string;
  brand?: string;
  variables?: Record<string, string | number>;
}): Promise<{ success: boolean; messageId: string; status: ResendEmailStatus; error?: string }> {
  if (!isBackendEnabled()) {
    return { success: false, messageId: '', status: 'failed', error: 'Chưa kết nối máy chủ TWings.' };
  }
  try {
    const data = await api.post<{ id: string; status: ResendEmailStatus; resendMessageId?: string | null }>(
      '/staff/emails/test-send/',
      {
        to: params.to,
        templateCode: params.code || '',
        subject: params.subject || '',
        html: params.body || '',
        brand: params.brand || 'twings',
        variables: params.variables || {}
      }
    );
    return {
      success: data.status === 'sent' || data.status === 'simulated',
      messageId: data.resendMessageId || data.id,
      status: data.status
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
