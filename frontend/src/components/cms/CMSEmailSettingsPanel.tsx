import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Palette,
  PlugZap,
  Save,
  Send,
  ShieldCheck,
  Webhook
} from 'lucide-react';
import { linkProps } from '../../admin/router';
import {
  EmailConnectionCheck,
  EmailSettings,
  EmailSettingsResponse,
  EmailStats,
  checkEmailConnection,
  loadEmailSettings,
  loadEmailStats,
  previewEmail,
  saveEmailSettings
} from '../../utils/resendEmail';
import { ImageUploadField } from './ImageUploadField';
import { SandboxedHtmlPreview } from './SandboxedHtmlPreview';
import { EMAIL_STATUS_LABELS } from './emailCategories';

const SAMPLE_BODY = `<h1 style="margin:0 0 6px 0;font-size:21px;line-height:1.35;font-weight:800;color:#0F172A;">Tiêu đề email</h1>
<p style="margin:0 0 22px 0;font-size:14px;color:#64748B;">Dòng mô tả ngắn dưới tiêu đề</p>
<p>Chào Nguyễn Văn An,</p>
<p>Đây là bản xem trước khung email: logo, chữ ký và chân thư lấy theo cấu hình bên trái; hotline, email và địa chỉ lấy theo Cài đặt SEO website.</p>
<p>Cần hỗ trợ? Gọi hotline <strong>{{hotline}}</strong> hoặc trả lời email này.</p>`;

const SOURCE_LABEL: Record<string, string> = {
  system: 'Đã lưu trong hệ thống (mã hóa)',
  env: 'Lấy từ tệp .env của máy chủ',
  '': 'Chưa có'
};

type Brand = 'twings' | 'corporate';

const input = 'w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs disabled:bg-slate-100 disabled:text-slate-500';

export const CMSEmailSettingsPanel: React.FC = () => {
  const [data, setData] = useState<EmailSettingsResponse | null>(null);
  const [form, setForm] = useState<EmailSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<EmailConnectionCheck | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [previewBrand, setPreviewBrand] = useState<Brand>('twings');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadError, setLoadError] = useState('');

  const apply = (res: EmailSettingsResponse) => {
    setData(res);
    setForm(res.settings);
  };

  useEffect(() => {
    loadEmailSettings()
      .then(apply)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Không tải được cấu hình email'));
    loadEmailStats(30).then(setStats).catch(() => undefined);
  }, []);

  const refreshPreview = useCallback(() => {
    previewEmail({ subject: 'Xem trước', html: SAMPLE_BODY, brand: previewBrand })
      .then((r) => setPreviewHtml(r.html))
      .catch(() => undefined);
  }, [previewBrand]);
  useEffect(refreshPreview, [refreshPreview, data]);

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl p-4 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" /> {loadError}
      </div>
    );
  }
  if (!data || !form) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Đang tải cấu hình email…
      </div>
    );
  }

  const canEdit = data.canEdit;
  const set = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) => setForm({ ...form, [key]: value });

  const save = async () => {
    setSaving(true);
    setStatus(null);
    setErrors({});
    try {
      const body: { settings: EmailSettings; apiKey?: string; webhookSecret?: string } = { settings: form };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();
      apply(await saveEmailSettings(body));
      setApiKey('');
      setWebhookSecret('');
      setStatus({ tone: 'ok', text: 'Đã lưu cấu hình gửi email. Áp dụng ngay cho mọi email gửi đi.' });
    } catch (err: any) {
      setErrors(err?.body?.errors || {});
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Chưa lưu được cấu hình' });
    } finally {
      setSaving(false);
    }
  };

  const clearSecret = async (name: 'apiKey' | 'webhookSecret') => {
    const label = name === 'apiKey' ? 'khóa API' : 'signing secret';
    if (!window.confirm(`Xóa ${label} đã lưu trong hệ thống? (Nếu tệp .env của máy chủ có giá trị, hệ thống sẽ dùng giá trị đó.)`)) return;
    try {
      apply(await saveEmailSettings({ [name]: '' }));
      setStatus({ tone: 'ok', text: `Đã xóa ${label} lưu trong hệ thống.` });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Không xóa được' });
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      setCheck(await checkEmailConnection());
    } catch (err) {
      setCheck({ ok: false, detail: err instanceof Error ? err.message : 'Không kiểm tra được' });
    } finally {
      setChecking(false);
    }
  };

  const field = (key: keyof EmailSettings, label: string, opts: { placeholder?: string; hint?: string; type?: string } = {}) => (
    <div>
      <label className="font-bold text-slate-700 block mb-1 text-xs">{label}</label>
      <input
        type={opts.type || 'text'}
        value={String(form[key] ?? '')}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={opts.placeholder}
        disabled={!canEdit}
        className={`${input} ${errors[key] ? 'border-red-400' : ''}`}
      />
      {errors[key] ? (
        <span className="text-[11px] text-red-600 mt-1 block">{errors[key]}</span>
      ) : (
        opts.hint && <span className="text-[11px] text-slate-500 mt-1 block">{opts.hint}</span>
      )}
    </div>
  );

  const secretRow = (name: 'apiKey' | 'webhookSecret', label: string, value: string, setValue: (v: string) => void, prefix: string) => {
    const info = data.secrets[name];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="font-bold text-slate-700 text-xs">{label}</label>
          {info && (
            <span className={`text-[11px] font-bold ${info.source ? 'text-emerald-700' : 'text-amber-700'}`}>
              {SOURCE_LABEL[info.source]} {info.hint && <span className="font-mono">{info.hint}</span>}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Dán ${prefix}… để thay mới (để trống: giữ nguyên)`}
            disabled={!canEdit}
            className={`${input} font-mono ${errors[name] ? 'border-red-400' : ''}`}
          />
          {canEdit && info?.source === 'system' && (
            <button type="button" onClick={() => clearSecret(name)} className="px-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer whitespace-nowrap">
              Xóa
            </button>
          )}
        </div>
        {errors[name] && <span className="text-[11px] text-red-600 block">{errors[name]}</span>}
      </div>
    );
  };

  const card = 'bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs';
  const title = (icon: React.ReactNode, text: string) => (
    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
      {icon}
      <span>{text}</span>
    </h3>
  );
  const pct = (v: number | null) => (v === null ? '–' : `${v}%`);

  return (
    <div className="space-y-5">
      {!canEdit && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          Bạn đang xem cấu hình. Thay đổi cần quyền <strong>Cấu hình gửi email (email.settings)</strong>.
        </div>
      )}
      {data.effective.redirectTo && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Đang bật chế độ thử nghiệm:</strong> mọi email (trừ mã đăng nhập) được chuyển tới{' '}
            <strong>{data.effective.redirectTo}</strong>, học viên không nhận được. Tắt bằng cách xóa ô “Chuyển mọi email tới hộp thư thử nghiệm”.
          </span>
        </div>
      )}
      {!data.live && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
          Chưa có khóa API Resend: email chỉ được ghi nhật ký ở chế độ mô phỏng, không gửi tới người nhận.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-7 space-y-5">
          {/* 1. Resend */}
          <div className={card}>
            {title(<PlugZap className="w-4 h-4 text-indigo-600" />, '1. Kết nối Resend')}
            {secretRow('apiKey', 'Khóa API Resend', apiKey, setApiKey, 're_')}
            <p className="text-[11px] text-slate-500">
              Tạo tại resend.com → API Keys. Nên dùng quyền <strong>Full access</strong> để hệ thống kiểm tra được trạng thái xác minh tên miền
              (khóa “Sending access” vẫn gửi được). Khóa được mã hóa khi lưu và không bao giờ hiển thị lại.
            </p>
            {secretRow('webhookSecret', 'Signing secret của webhook', webhookSecret, setWebhookSecret, 'whsec_')}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Webhook className="w-3.5 h-3.5 text-indigo-600" /> Địa chỉ webhook (khai báo trong Resend → Webhooks)
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(data.webhookUrl)}
                  className="text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Sao chép
                </button>
              </div>
              <div className="font-mono text-[11px] bg-white border border-slate-200 rounded-lg p-2 select-all break-all">{data.webhookUrl}</div>
              <div className="flex flex-wrap gap-1.5">
                {data.webhookEvents.map((ev) => (
                  <span key={ev} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] border border-indigo-100">
                    {ev}
                  </span>
                ))}
              </div>
              <p className={`text-[11px] font-bold ${data.webhookConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                {data.webhookConfigured
                  ? 'Đã có signing secret: trạng thái đã nhận / đã mở / bị trả về được cập nhật tự động.'
                  : 'Chưa có signing secret: hệ thống từ chối mọi webhook, trạng thái thư sẽ dừng ở “Đã gửi”.'}
              </p>
            </div>
            {canEdit && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={runCheck}
                  disabled={checking}
                  className="px-4 py-2 rounded-xl border border-indigo-300 text-indigo-700 font-bold flex items-center gap-2 hover:bg-indigo-50 disabled:opacity-50 cursor-pointer"
                >
                  {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Kiểm tra kết nối &amp; tên miền gửi
                </button>
                {check && (
                  <div className={`rounded-xl border p-3 space-y-2 ${check.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <div className={`font-bold flex items-center gap-1.5 ${check.ok ? 'text-emerald-800' : 'text-red-800'}`}>
                      {check.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {check.ok ? 'Khóa API hợp lệ.' : 'Kết nối thất bại.'} {check.detail}
                    </div>
                    {!!check.domains?.length && (
                      <table className="w-full text-[11px]">
                        <thead className="text-slate-500 text-left">
                          <tr><th className="py-1">Tên miền</th><th>Trạng thái</th><th>Khu vực</th></tr>
                        </thead>
                        <tbody>
                          {check.domains.map((d) => (
                            <tr key={d.name} className="border-t border-emerald-100">
                              <td className="py-1 font-mono">{d.name}</td>
                              <td className={d.status === 'verified' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                {d.status === 'verified' ? 'Đã xác minh' : d.status}
                              </td>
                              <td>{d.region}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {check.senders?.map((s) => (
                      <div key={s.brand} className="text-[11px]">
                        Tên miền người gửi {s.brand === 'corporate' ? 'doanh nghiệp' : 'TWings'} <strong className="font-mono">{s.domain}</strong>:{' '}
                        {s.verified === null ? (
                          <span className="text-slate-600">không kiểm tra được</span>
                        ) : s.verified ? (
                          <span className="text-emerald-700 font-bold">đã xác minh</span>
                        ) : (
                          <span className="text-red-700 font-bold">chưa xác minh – Resend sẽ từ chối gửi</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Senders */}
          <div className={card}>
            {title(<Send className="w-4 h-4 text-[#0073C1]" />, '2. Người gửi')}
            <p className="text-[11px] text-slate-500">
              Địa chỉ gửi phải thuộc tên miền đã xác minh trên Resend. Để trống một ô: hệ thống dùng giá trị hiển thị mờ trong ô.
            </p>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TWings Academy (học viên cá nhân)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('fromName', 'Tên người gửi', { placeholder: 'TWings Academy' })}
              {field('fromAddress', 'Địa chỉ gửi', { type: 'email', placeholder: data.effective.twings.fromAddress })}
              {field('replyTo', 'Địa chỉ nhận phản hồi (Reply-To)', {
                type: 'email',
                placeholder: data.site.email || 'hello@twings.edu.vn',
                hint: 'Học viên bấm “Trả lời” sẽ gửi tới đây. Trống: email liên hệ trong Cài đặt SEO.'
              })}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-2">Đào tạo doanh nghiệp (TNTalent)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('corporateFromName', 'Tên người gửi', { placeholder: 'TNTalent' })}
              {field('corporateFromAddress', 'Địa chỉ gửi', { type: 'email', placeholder: data.effective.corporate.fromAddress })}
              {field('corporateReplyTo', 'Địa chỉ nhận phản hồi', { type: 'email', placeholder: data.effective.corporate.replyTo || 'Chưa có' })}
            </div>
          </div>

          {/* 3. Delivery */}
          <div className={card}>
            {title(<ShieldCheck className="w-4 h-4 text-emerald-600" />, '3. Lưu trữ & thử nghiệm')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('bccArchive', 'Lưu bản sao (BCC) tới hộp thư', {
                type: 'email',
                placeholder: 'luutru@twings.edu.vn',
                hint: 'Nhận bản sao ẩn của mọi email gửi học viên. Không áp dụng cho mã đăng nhập, liên kết đặt lại mật khẩu và thông báo nội bộ.'
              })}
              {field('redirectTo', 'Chuyển mọi email tới hộp thư thử nghiệm', {
                type: 'email',
                placeholder: 'Để trống khi vận hành thật',
                hint: 'Chỉ dùng khi chạy thử: người nhận thật không nhận được thư (tiêu đề ghi người nhận gốc).'
              })}
            </div>
          </div>

          {/* 4. Frame */}
          <div className={card}>
            {title(<Palette className="w-4 h-4 text-pink-600" />, '4. Khung email: logo, chữ ký, chân thư')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                {canEdit ? (
                  <ImageUploadField
                    label="Logo trong email (TWings)"
                    value={form.logoUrl}
                    onChange={(url) => set('logoUrl', url)}
                    accept="image/png,image/jpeg"
                    hint="PNG/JPG nền trong suốt hoặc nền trắng, cao ~88px. Để trống: dùng logo website."
                    previewClassName="w-24 h-10 object-contain"
                  />
                ) : (
                  <div className="font-bold text-slate-700">Logo trong email (TWings)</div>
                )}
                <div className="text-[11px] text-slate-500">
                  Đang dùng:{' '}
                  {data.effective.twings.logoUrl ? (
                    <img src={data.effective.twings.logoUrl} alt="Logo" className="inline-block h-6 align-middle ml-1 bg-white border rounded" />
                  ) : (
                    <span className="text-amber-700 font-bold">chưa có logo (hiển thị chữ “TWings Academy”) – tải logo ở Cài đặt SEO hoặc tại đây</span>
                  )}
                </div>
              </div>
              {canEdit ? (
                <ImageUploadField
                  label="Logo trong email (doanh nghiệp)"
                  value={form.corporateLogoUrl}
                  onChange={(url) => set('corporateLogoUrl', url)}
                  accept="image/png,image/jpeg"
                  hint="Để trống: hiển thị chữ “TNTalent”."
                  previewClassName="w-24 h-10 object-contain"
                />
              ) : (
                <div />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('tagline', 'Dòng giới thiệu cạnh logo (TWings)')}
              {field('corporateTagline', 'Dòng giới thiệu cạnh logo (doanh nghiệp)')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['signature', 'corporateSignature'] as const).map((key) => (
                <div key={key}>
                  <label className="font-bold text-slate-700 block mb-1">
                    {key === 'signature' ? 'Chữ ký cuối thư (TWings)' : 'Chữ ký cuối thư (doanh nghiệp)'}
                  </label>
                  <textarea
                    rows={3}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={key === 'corporateSignature' ? 'Trân trọng,\nĐội ngũ TNTalent' : ''}
                    disabled={!canEdit}
                    className={input}
                  />
                  <span className="text-[11px] text-slate-500">Dòng cuối được in đậm. Không áp dụng cho thông báo nội bộ.</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('companyName', 'Tên pháp nhân ở chân thư (tùy chọn)', { placeholder: 'Công ty Cổ phần TWings Academy' })}
              {field('footerNote', 'Ghi chú chân thư', { hint: 'Lý do người nhận nhận được email (khuyến nghị chống spam).' })}
            </div>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['showHotline', 'Hiện hotline ở chân thư'],
                  ['showAddress', 'Hiện địa chỉ ở chân thư']
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => set(key, e.target.checked)} disabled={!canEdit} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* 5. Contact details from SEO */}
          <div className={card}>
            {title(<Globe className="w-4 h-4 text-sky-600" />, '5. Thông tin liên hệ (lấy theo Cài đặt SEO website)')}
            <p className="text-[11px] text-slate-500">
              Hotline, email và địa chỉ trong mọi email dùng chung một nguồn với website (biến <code>{'{{hotline}}'}</code>,{' '}
              <code>{'{{support_email}}'}</code>, <code>{'{{address}}'}</code>). Muốn đổi, sửa tại Cài đặt SEO website.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ['Hotline', data.site.hotline],
                ['Email liên hệ', data.site.email],
                ['Địa chỉ', data.site.address]
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className={`font-bold ${value ? 'text-slate-900' : 'text-amber-700'}`}>{value || 'Chưa nhập'}</div>
                </div>
              ))}
            </div>
            <a {...linkProps('/content/seo')} className="inline-flex items-center gap-1 text-[#0073C1] font-bold">
              <ExternalLink className="w-3.5 h-3.5" /> Mở Cài đặt SEO website
            </a>
          </div>

          {canEdit && (
            <div className="flex items-center justify-end gap-3 sticky bottom-3">
              {status && (
                <span className={`text-xs font-bold px-3 py-2 rounded-xl ${status.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  {status.text}
                </span>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cấu hình
              </button>
            </div>
          )}
        </div>

        {/* Right: preview + stats */}
        <div className="xl:col-span-5 space-y-5 xl:sticky xl:top-4">
          <div className={card}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Xem trước khung email</h3>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                {(['twings', 'corporate'] as Brand[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setPreviewBrand(b)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${previewBrand === b ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'}`}
                  >
                    {b === 'twings' ? 'TWings' : 'Doanh nghiệp'}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 space-y-0.5">
              <div>
                Người gửi: <strong className="font-mono">{data.effective[previewBrand].sender}</strong>
              </div>
              <div>
                Reply-To: <strong className="font-mono">{data.effective[previewBrand].replyTo || '(không có)'}</strong>
              </div>
            </div>
            <div className="bg-slate-100 rounded-2xl p-2 border border-slate-200">
              <SandboxedHtmlPreview html={previewHtml} minHeight={520} className="rounded-xl" />
            </div>
            <p className="text-[11px] text-slate-500">Bản xem trước theo cấu hình đã lưu: bấm “Lưu cấu hình” để thấy thay đổi.</p>
          </div>

          {stats && (
            <div className={card}>
              {title(<BarChart3 className="w-4 h-4 text-emerald-600" />, `Hiệu quả gửi thư ${stats.days} ngày qua`)}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Tới hộp thư', pct(stats.deliveryRate)],
                  ['Tỷ lệ mở', pct(stats.openRate)],
                  ['Bị trả về', pct(stats.bounceRate)]
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <div className="text-lg font-black text-slate-900">{value}</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px]">Tổng {stats.total}</span>
                {Object.entries(stats.byStatus).map(([s, n]) => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {EMAIL_STATUS_LABELS[s] || s}: {n}
                  </span>
                ))}
              </div>
              {data.live && !data.webhookConfigured && (
                <p className="text-[11px] text-amber-700">Chưa có webhook: tỷ lệ tới hộp thư / mở thư chưa phản ánh đúng.</p>
              )}
            </div>
          )}
          <div className={`${card} !space-y-2`}>
            {title(<Key className="w-4 h-4 text-slate-600" />, 'Bảo mật')}
            <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-1">
              <li>Khóa API và signing secret được mã hóa trong cơ sở dữ liệu, không trả về trình duyệt; mọi thay đổi được ghi nhật ký kiểm toán.</li>
              <li>Mã đăng nhập (OTP) và liên kết đặt lại mật khẩu không bao giờ được sao lưu BCC hay chuyển hướng thử nghiệm.</li>
              <li>Mẫu chứa mã đăng nhập / liên kết đặt lại mật khẩu chỉ quản trị hệ thống sửa được.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
