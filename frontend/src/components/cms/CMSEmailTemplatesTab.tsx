import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Paginated } from '../../lib/api';
import { useServerCollection } from '../../lib/serverCollection';
import { EMAIL_TEMPLATES, emailLogFromServer } from '../../lib/cmsCollections';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Lock,
  Mail,
  Monitor,
  MousePointer,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { EmailSendLog, EmailTemplate, Order } from '../../types';
import {
  EMAIL_VARIABLE_LABELS,
  EmailSettingsResponse,
  extractOrderEmailVariables,
  loadEmailSettings,
  previewEmail,
  testSendEmailWithBackend,
  withPlaceholders,
  EMAIL_PREVIEW_SWITCHES,
  EMAIL_TEMPLATE_VARIABLE_LABELS
} from '../../utils/resendEmail';
import { CMSEmailDetailModal } from './CMSEmailDetailModal';
import { CMSEmailSettingsPanel } from './CMSEmailSettingsPanel';
import { SandboxedHtmlPreview } from './SandboxedHtmlPreview';
import { EMAIL_CATEGORIES, EMAIL_CATEGORY_LABELS, EMAIL_STATUS_LABELS } from './emailCategories';

interface CMSEmailTemplatesTabProps {
  orders: Order[];
}

const NEW_TEMPLATE_BODY = `<h1 style="margin:0 0 6px 0;font-size:21px;line-height:1.35;font-weight:800;color:#0F172A;">Tiêu đề email</h1>
<p style="margin:0 0 22px 0;font-size:14px;line-height:1.5;color:#64748B;">Một dòng mô tả ngắn</p>
<p>Chào {{customer_name}},</p>
<p>Nội dung chính của email về khóa học <strong>{{course_title}}</strong>.</p>
<p>Cần hỗ trợ? Gọi hotline <strong>{{hotline}}</strong> hoặc trả lời email này.</p>`;

const STATUS_STYLE: Record<string, string> = {
  clicked: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  opened: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-slate-100 text-slate-700 border-slate-200',
  queued: 'bg-slate-100 text-slate-600 border-slate-200',
  simulated: 'bg-amber-50 text-amber-800 border-amber-200',
  bounced: 'bg-rose-100 text-rose-800 border-rose-200',
  complained: 'bg-rose-100 text-rose-800 border-rose-200',
  failed: 'bg-red-100 text-red-800 border-red-200'
};

const isAutomatic = (t: EmailTemplate) => t.description.startsWith('Tự động');

export const CMSEmailTemplatesTab: React.FC<CMSEmailTemplatesTabProps> = ({ orders }) => {
  const { items: templates, update: setTemplates, reload, live } = useServerCollection<EmailTemplate>(EMAIL_TEMPLATES, []);
  const [settings, setSettings] = useState<EmailSettingsResponse | null>(null);
  useEffect(() => {
    if (live) loadEmailSettings().then(setSettings).catch(() => undefined);
  }, [live]);

  const [viewSubTab, setViewSubTab] = useState<'editor' | 'logs' | 'settings'>('editor');
  const [selectedId, setSelectedId] = useState('');
  const selected = templates.find((t) => t.id === selectedId) || templates[0];
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditSubject(selected.subject);
    setEditBody(selected.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.updatedAt]);
  const dirty = !!selected && (editName !== selected.name || editSubject !== selected.subject || editBody !== selected.body);
  const locked = !!selected?.isLocked;

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOrderId, setPreviewOrderId] = useState('');
  const previewOrder = orders.find((o) => o.id === previewOrderId);
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [preview, setPreview] = useState<{ subject: string; html: string }>({ subject: '', html: '' });
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const showToast = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ tone, text });
    setTimeout(() => setToast(null), 4000);
  };

  // ------------------------------------------------------------ history
  const [sendLogs, setSendLogs] = useState<EmailSendLog[]>([]);
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [inspectedLog, setInspectedLog] = useState<EmailSendLog | null>(null);
  const loadSendLogs = useCallback(() => {
    if (!live) return;
    api
      .get<Paginated<Record<string, unknown>>>('/staff/email-logs/?pageSize=200')
      .then((res) => setSendLogs(res.results.map(emailLogFromServer)))
      .catch(() => undefined);
  }, [live]);
  useEffect(loadSendLogs, [loadSendLogs]);

  // ------------------------------------------------------------ preview (server frame, debounced)
  const variables = useMemo(() => {
    const fromOrder = previewOrder
      ? withPlaceholders(extractOrderEmailVariables(previewOrder))
      : withPlaceholders(Object.fromEntries(Object.keys(EMAIL_VARIABLE_LABELS).map((k) => [k, ''])));
    const own = Object.fromEntries(
      (selected?.variables || []).map((v) => [
        v,
        v in EMAIL_PREVIEW_SWITCHES ? EMAIL_PREVIEW_SWITCHES[v] : `[${EMAIL_VARIABLE_LABELS[v] || EMAIL_TEMPLATE_VARIABLE_LABELS[v] || v}]`
      ])
    );
    return { ...own, ...fromOrder };
  }, [previewOrder, selected?.variables]);

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      previewEmail({ subject: editSubject, html: editBody, brand: selected.brand, variables })
        .then(setPreview)
        .catch(() => setPreview({ subject: editSubject, html: editBody }));
    }, 450);
    return () => clearTimeout(timer);
  }, [editSubject, editBody, selected?.brand, variables, selected]);

  // ------------------------------------------------------------ actions
  const save = () => {
    if (!selected) return;
    setTemplates(
      templates.map((t) =>
        t.id === selected.id ? { ...t, name: editName, subject: editSubject, body: editBody, updatedAt: new Date().toLocaleString('vi-VN') } : t
      )
    );
    showToast('Đã lưu mẫu email.');
  };

  const addTemplate = () => {
    const stamp = Date.now();
    const created: EmailTemplate = {
      id: `tmpl-${stamp}`,
      code: `custom_${stamp}`,
      name: 'Mẫu email mới',
      category: 'admission',
      subject: 'Tiêu đề email | {{site_name}}',
      description: 'Gửi thủ công từ hồ sơ học viên (CRM).',
      variables: ['customer_name', 'course_title'],
      updatedAt: new Date().toLocaleString('vi-VN'),
      body: NEW_TEMPLATE_BODY,
      brand: 'twings'
    };
    setTemplates([created, ...templates]);
    setSelectedId(created.id);
    showToast('Đã thêm mẫu mới theo khung chuẩn.');
  };

  const duplicate = (t: EmailTemplate) => {
    const copy: EmailTemplate = {
      ...t,
      id: `tmpl-${Date.now()}`,
      code: `${t.code}_copy_${Date.now().toString(36)}`,
      name: `${t.name} (bản sao)`,
      description: 'Gửi thủ công từ hồ sơ học viên (CRM).',
      isStandard: false,
      isLocked: false,
      isDefault: false,
      updatedAt: new Date().toLocaleString('vi-VN')
    };
    setTemplates([copy, ...templates]);
    setSelectedId(copy.id);
    showToast(`Đã nhân bản “${t.name}”.`);
  };

  const remove = (t: EmailTemplate) => {
    if (!window.confirm(`Xóa mẫu email “${t.name}”?`)) return;
    setTemplates(templates.filter((x) => x.id !== t.id));
    setSelectedId('');
    showToast(`Đã xóa “${t.name}”.`);
  };

  const restore = async () => {
    if (!selected || !window.confirm(`Khôi phục “${selected.name}” về nội dung chuẩn của hệ thống? Nội dung đang có sẽ bị thay thế.`)) return;
    try {
      await api.post(`/staff/email-templates/${selected.id}/restore/`, {});
      await reload();
      showToast('Đã khôi phục nội dung chuẩn.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không khôi phục được', 'error');
    }
  };

  const restoreMissing = async () => {
    try {
      const res = await api.post<{ created: string[] }>('/staff/email-templates/restore-missing/', {});
      await reload();
      showToast(res.created.length ? `Đã tạo lại ${res.created.length} mẫu chuẩn còn thiếu.` : 'Đủ tất cả mẫu chuẩn.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thực hiện được', 'error');
    }
  };

  const sendTest = async () => {
    if (!selected) return;
    if (!testEmailTo.trim()) {
      showToast('Nhập địa chỉ email nhận thư thử.', 'error');
      return;
    }
    setIsSending(true);
    const result = await testSendEmailWithBackend({
      to: testEmailTo.trim(),
      code: selected.code,
      subject: editSubject,
      body: editBody,
      brand: selected.brand,
      variables
    });
    setIsSending(false);
    loadSendLogs();
    if (!result.success) {
      showToast(`Không gửi được: ${result.error || result.status}`, 'error');
      return;
    }
    showToast(
      result.status === 'simulated'
        ? 'Chế độ mô phỏng: chưa có khóa API Resend nên thư không được gửi đi.'
        : `Đã gửi thư thử tới ${testEmailTo}.`
    );
  };

  const insertVariable = (name: string) => {
    setEditBody((prev) => `${prev}{{${name}}}`);
    showToast(`Đã chèn {{${name}}} vào cuối nội dung.`);
  };

  // ------------------------------------------------------------ lists
  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (activeCategory === 'all' || t.category === activeCategory) &&
      (t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.code.includes(q))
    );
  });
  const filteredLogs = sendLogs.filter((log) => {
    const q = logSearch.toLowerCase();
    return (
      (logStatusFilter === 'all' || log.status === logStatusFilter) &&
      (log.recipientName.toLowerCase().includes(q) ||
        log.recipientEmail.toLowerCase().includes(q) ||
        (log.resendMessageId || '').toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q))
    );
  });
  const variableChips = [
    ...(selected?.variables || []).map((v) => ({ name: v, label: EMAIL_VARIABLE_LABELS[v] || EMAIL_TEMPLATE_VARIABLE_LABELS[v] || 'Biến của mẫu này' })),
    ...(settings?.globalVariables || [])
  ];

  const tabButton = (id: typeof viewSubTab, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setViewSubTab(id)}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
        viewSubTab === id ? 'bg-[#0073C1] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0073C1]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email hệ thống</h2>
            <p className="text-xs text-slate-500">
              Mẫu thư, nhật ký gửi và cấu hình gửi qua Resend. Mọi email dùng chung một khung: logo, chữ ký và hotline theo Cài đặt SEO website.
            </p>
          </div>
        </div>
        {settings && (
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className={`px-2.5 py-1 rounded-lg border ${settings.live ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              {settings.live ? '● Resend: đang gửi thật' : '● Resend: mô phỏng (chưa có khóa API)'}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border ${settings.webhookConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              {settings.webhookConfigured ? '● Webhook: đã cấu hình' : '● Webhook: chưa cấu hình'}
            </span>
            {settings.effective.redirectTo && (
              <span className="px-2.5 py-1 rounded-lg border bg-red-50 text-red-700 border-red-200">● Đang chuyển hướng thử nghiệm</span>
            )}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-1.5">
        {tabButton('editor', <FileText className="w-4 h-4" />, `Mẫu email (${templates.length})`)}
        {tabButton('logs', <Clock className="w-4 h-4" />, `Nhật ký gửi (${sendLogs.length})`)}
        {tabButton('settings', <Settings className="w-4 h-4" />, 'Cấu hình gửi thư')}
      </div>

      {toast && (
        <div
          className={`text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between shadow-md ${
            toast.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.tone === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.text}
          </span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {viewSubTab === 'settings' && <CMSEmailSettingsPanel />}

      {/* ============================================================ templates */}
      {viewSubTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Thư viện mẫu</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={restoreMissing}
                  title="Tạo lại các mẫu chuẩn đã bị xóa"
                  className="p-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={addTemplate}
                  className="px-2.5 py-1.5 bg-[#0073C1] text-white rounded-lg hover:bg-[#005fa3] text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mẫu
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, tiêu đề, mã…"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {['all', ...EMAIL_CATEGORIES].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${activeCategory === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {c === 'all' ? 'Tất cả' : EMAIL_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`p-3 rounded-2xl border cursor-pointer group ${
                    t.id === selected?.id ? 'border-[#0073C1] bg-blue-50/60 ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-slate-900 leading-snug flex items-center gap-1">
                      {t.isLocked && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
                      {t.name}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicate(t);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                        title="Nhân bản"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {!t.isStandard && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(t);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{t.subject}</div>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold flex-wrap">
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">{EMAIL_CATEGORY_LABELS[t.category] || t.category}</span>
                    <span className={`px-1.5 py-0.5 rounded border ${isAutomatic(t) ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {isAutomatic(t) ? 'Tự động' : 'Gửi tay'}
                    </span>
                    {t.brand === 'corporate' && <span className="px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-100">TNTalent</span>}
                  </div>
                </div>
              ))}
              {!filteredTemplates.length && <p className="text-xs text-slate-500 text-center py-6">Không có mẫu nào.</p>}
            </div>
          </div>

          {selected ? (
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={locked}
                      className="font-bold text-base text-slate-900 border-b border-dashed border-slate-300 focus:border-[#0073C1] focus:outline-none w-full bg-transparent"
                    />
                    <div className="text-[11px] text-slate-500">
                      Mã: <span className="font-mono">{selected.code}</span> · {selected.description || 'Mẫu tự tạo'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.isStandard && (
                      <button
                        type="button"
                        onClick={restore}
                        className="px-3 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Khôi phục bản chuẩn
                      </button>
                    )}
                    {!locked && (
                      <button
                        type="button"
                        onClick={save}
                        disabled={!dirty}
                        className="px-4 py-2 bg-[#0073C1] hover:bg-[#005fa3] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Lưu thay đổi
                      </button>
                    )}
                  </div>
                </div>

                {locked && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Mẫu chứa mã đăng nhập / liên kết đặt lại mật khẩu: chỉ quản trị hệ thống thay đổi được (bảo mật).
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Tiêu đề email</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    disabled={locked}
                    className="w-full p-2.5 text-xs font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                  />
                </div>

                {!locked && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Biến có thể dùng (bấm để chèn)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {variableChips.map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => insertVariable(v.name)}
                          title={v.label}
                          className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 rounded-lg text-[11px] font-mono cursor-pointer"
                        >
                          {`{{${v.name}}}`}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Không cần viết chữ ký, logo hay chân thư: hệ thống tự thêm theo Cấu hình gửi thư. Không ghi cứng số hotline, dùng <code>{'{{hotline}}'}</code>.
                      Đoạn chỉ hiện khi biến có giá trị: <code>{'{{#if tên_biến}}…{{else}}…{{/if}}'}</code> (phần <code>{'{{else}}'}</code> không bắt buộc).
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nội dung (HTML)</label>
                  <textarea
                    rows={14}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    disabled={locked}
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded-2xl bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" /> Xem trước như người nhận thấy
                  </span>
                  <div className="flex items-center gap-3">
                    <select
                      value={previewOrderId}
                      onChange={(e) => setPreviewOrderId(e.target.value)}
                      className="p-1.5 border border-slate-300 rounded-xl bg-slate-50 text-xs max-w-[220px]"
                    >
                      <option value="">Dữ liệu mẫu [tên biến]</option>
                      {orders.slice(0, 200).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.customerName} ({o.orderCode})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                      {(['desktop', 'mobile'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDevicePreview(d)}
                          className={`p-1.5 rounded-lg cursor-pointer ${devicePreview === d ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'}`}
                          title={d === 'desktop' ? 'Máy tính' : 'Điện thoại (375px)'}
                        >
                          {d === 'desktop' ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-0.5">
                  <div>
                    <span className="text-slate-400 font-bold">Từ: </span>
                    <span className="font-mono">{settings?.effective[selected.brand === 'corporate' ? 'corporate' : 'twings'].sender || '…'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Tiêu đề: </span>
                    <span className="font-bold text-slate-900">{preview.subject}</span>
                  </div>
                </div>
                <div className="flex justify-center bg-slate-100 p-4 rounded-2xl border border-slate-200">
                  <div className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all ${devicePreview === 'mobile' ? 'w-[375px]' : 'w-full'}`}>
                    <SandboxedHtmlPreview html={preview.html} minHeight={620} />
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Gửi thử tới:</span>
                    <input
                      type="email"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      placeholder="email@twings.edu.vn"
                      className="p-2 text-xs border border-slate-300 rounded-xl bg-white w-full sm:w-64 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={isSending}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
                    {isSending ? 'Đang gửi…' : 'Gửi thư thử (nội dung đang soạn)'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 bg-white p-10 rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
              Chưa có mẫu email. Bấm <RotateCcw className="w-3.5 h-3.5 inline" /> để tạo lại các mẫu chuẩn.
            </div>
          )}
        </div>
      )}

      {/* ============================================================ history */}
      {viewSubTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Nhật ký gửi email</h3>
              <p className="text-xs text-slate-500">
                Trạng thái (đã tới hộp thư, đã mở, đã bấm liên kết, bị trả về) cập nhật tự động qua webhook Resend.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                loadSendLogs();
                showToast('Đã làm mới nhật ký.');
              }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Tìm theo người nhận, email, tiêu đề, mã thư…"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              {['all', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'simulated'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setLogStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer ${logStatusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {s === 'all' ? 'Tất cả' : EMAIL_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Người nhận</th>
                  <th className="p-3">Mẫu</th>
                  <th className="p-3">Tiêu đề</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{log.recipientName || '—'}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{log.recipientEmail}</div>
                    </td>
                    <td className="p-3 text-slate-700">{log.templateName}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{log.sentAt}</td>
                    <td className="p-3 text-center">
                      <span
                        title={log.errorMessage || log.bounceReason || ''}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${STATUS_STYLE[log.status] || STATUS_STYLE.sent}`}
                      >
                        {log.status === 'clicked' && <MousePointer className="w-3 h-3" />}
                        {log.status === 'opened' && <Eye className="w-3 h-3" />}
                        {EMAIL_STATUS_LABELS[log.status] || log.status}
                        {log.status === 'opened' && log.openCount ? ` (${log.openCount})` : ''}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectedLog(log)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Xem thư
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredLogs.length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Chưa có email nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inspectedLog && <CMSEmailDetailModal log={inspectedLog} onClose={() => setInspectedLog(null)} />}
    </div>
  );
};
