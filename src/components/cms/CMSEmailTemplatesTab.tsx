import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  Eye,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Code,
  Layers,
  Search,
  Filter,
  Users,
  Building2,
  Clock,
  Zap,
  Info,
  Settings,
  Smartphone,
  Monitor,
  Key,
  ShieldCheck,
  Webhook,
  MousePointer,
  Play,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmailTemplate, EmailSendLog, Order, ResendEmailStatus } from '../../types';
import { 
  INITIAL_EMAIL_TEMPLATES, 
  renderEmailTemplate, 
  sendEmailWithResend,
  extractOrderEmailVariables,
  getSavedResendApiKey,
  setSavedResendApiKey,
  getSavedResendFrom,
  setSavedResendFrom,
  getSavedEmailSendLogs,
  getSavedWebhookConfig,
  processIncomingWebhookEvent
} from '../../utils/resendEmail';
import { CMSResendWebhookModal } from './CMSResendWebhookModal';
import { CMSEmailDetailModal } from './CMSEmailDetailModal';

interface CMSEmailTemplatesTabProps {
  orders: Order[];
}

export const CMSEmailTemplatesTab: React.FC<CMSEmailTemplatesTabProps> = ({ orders }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(INITIAL_EMAIL_TEMPLATES);
  const [sendLogs, setSendLogs] = useState<EmailSendLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(templates[0]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor State
  const [editSubject, setEditSubject] = useState(selectedTemplate.subject);
  const [editBody, setEditBody] = useState(selectedTemplate.body);
  const [editName, setEditName] = useState(selectedTemplate.name);

  // Preview target lead
  const [previewOrder, setPreviewOrder] = useState<Order>(orders[0] || {
    id: 'ord-preview',
    customerName: 'Nguyễn Thị Khánh Linh',
    customerEmail: 'ntkhanhlinh.ka@gmail.com',
    customerPhone: '0912 345 678',
    courseTitle: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    batchCohort: 'Khóa học 9 - Hà Nội',
    orderCode: '0415_MSB_KhanhLinh',
    tuitionFee: 8490000,
    amount: 8490000,
    status: 'paid',
    pic: 'HuongNT22'
  });

  // Device Preview: desktop or mobile
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');

  // Test Dispatch State
  const [testEmailTo, setTestEmailTo] = useState(orders[0]?.customerEmail || 'hocvien.msb@gmail.com');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-tab view: 'editor' | 'logs'
  const [viewSubTab, setViewSubTab] = useState<'editor' | 'logs'>('editor');

  // Logs sub-filter
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'opened' | 'clicked' | 'delivered' | 'bounced'>('all');
  const [logSearch, setLogSearch] = useState('');

  // Selected Log for Inspector
  const [inspectedLog, setInspectedLog] = useState<EmailSendLog | null>(null);

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getSavedResendApiKey());
  const [fromEmailInput, setFromEmailInput] = useState(getSavedResendFrom());

  // Load persistent logs on mount
  useEffect(() => {
    setSendLogs(getSavedEmailSendLogs());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectTemplate = (t: EmailTemplate) => {
    setSelectedTemplate(t);
    setEditSubject(t.subject);
    setEditBody(t.body);
    setEditName(t.name);
  };

  const handleInsertVariable = (varName: string) => {
    const tag = `{{${varName}}}`;
    setEditBody((prev) => prev + tag);
    showToast(`Đã chèn biến ${tag} vào nội dung email.`);
  };

  const handleSaveTemplate = () => {
    const updated = templates.map((t) =>
      t.id === selectedTemplate.id
        ? {
            ...t,
            name: editName,
            subject: editSubject,
            body: editBody,
            updatedAt: new Date().toLocaleDateString('vi-VN')
          }
        : t
    );
    setTemplates(updated);
    setSelectedTemplate({
      ...selectedTemplate,
      name: editName,
      subject: editSubject,
      body: editBody
    });
    showToast('Template email đã được lưu thành công!');
  };

  const handleDuplicateTemplate = (tmpl: EmailTemplate) => {
    const duplicated: EmailTemplate = {
      ...tmpl,
      id: `tmpl-${Date.now()}`,
      code: `${tmpl.code}_copy`,
      name: `${tmpl.name} (Bản sao)`,
      updatedAt: new Date().toLocaleDateString('vi-VN')
    };
    setTemplates([duplicated, ...templates]);
    setSelectedTemplate(duplicated);
    setEditName(duplicated.name);
    setEditSubject(duplicated.subject);
    setEditBody(duplicated.body);
    showToast(`Đã nhân bản mẫu "${tmpl.name}" thành công!`);
  };

  const handleDeleteTemplate = (tmplId: string, name: string) => {
    if (templates.length <= 1) {
      alert('Hệ thống cần tối thiểu 1 mẫu email trong thư viện.');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa mẫu email "${name}"?`)) {
      const remaining = templates.filter((t) => t.id !== tmplId);
      setTemplates(remaining);
      setSelectedTemplate(remaining[0]);
      setEditName(remaining[0].name);
      setEditSubject(remaining[0].subject);
      setEditBody(remaining[0].body);
      showToast(`Đã xóa mẫu email "${name}".`);
    }
  };

  const handleSaveApiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedResendApiKey(apiKeyInput);
    setSavedResendFrom(fromEmailInput);
    setShowConfigModal(false);
    showToast('Đã lưu cấu hình kết nối Resend API!');
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.5 } });
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) {
      alert('Vui lòng nhập địa chỉ email nhận thư.');
      return;
    }

    setIsSending(true);
    const variables = extractOrderEmailVariables(previewOrder);
    const renderedHtml = renderEmailTemplate(editBody, variables);
    const renderedSubject = renderEmailTemplate(editSubject, variables);

    const result = await sendEmailWithResend({
      to: testEmailTo.trim(),
      subject: renderedSubject,
      html: renderedHtml,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      recipientName: previewOrder.customerName
    });

    setIsSending(false);

    if (!result.success && result.error) {
      showToast(`Không thể gửi: ${result.error}`);
      return;
    }

    // Refresh logs
    setSendLogs(getSavedEmailSendLogs());
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    showToast(`Đã gửi email thành công qua Resend API tới ${testEmailTo}! ID: ${result.messageId}`);
  };

  // Filtered Templates
  const filteredTemplates = templates.filter((t) => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const matchQuery =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // Filtered Logs
  const filteredLogs = sendLogs.filter((log) => {
    const matchStatus = logStatusFilter === 'all' || log.status === logStatusFilter;
    const matchSearch =
      log.recipientName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.recipientEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.resendMessageId && log.resendMessageId.toLowerCase().includes(logSearch.toLowerCase())) ||
      log.subject.toLowerCase().includes(logSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const previewVariables = extractOrderEmailVariables(previewOrder);
  const renderedPreviewBody = renderEmailTemplate(editBody, previewVariables);
  const renderedPreviewSubject = renderEmailTemplate(editSubject, previewVariables);
  const hasLiveApiKey = !!getSavedResendApiKey() && getSavedResendApiKey().startsWith('re_');
  const webhookConfig = getSavedWebhookConfig();

  const AVAILABLE_VARIABLES = [
    { tag: 'customerName', desc: 'Họ tên học viên' },
    { tag: 'courseTitle', desc: 'Tên khóa đào tạo' },
    { tag: 'batchCohort', desc: 'Tên lớp / Đợt khai giảng' },
    { tag: 'startDate', desc: 'Lịch khai giảng' },
    { tag: 'instructorName', desc: 'Giảng viên phụ trách' },
    { tag: 'amount', desc: 'Số tiền học phí' },
    { tag: 'orderCode', desc: 'Mã hồ sơ / đơn hàng' },
    { tag: 'bankAccount', desc: 'STK ngân hàng MSB' },
    { tag: 'location', desc: 'Địa điểm đào tạo' },
    { tag: 'pic', desc: 'Chuyên viên cố vấn' },
    { tag: 'customerPhone', desc: 'SĐT học viên' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                Hệ Thống Email Tuyển Sinh &amp; Quản Lý Template (Resend API)
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Mẫu thư chuẩn nhận diện <strong>TWings Academy &amp; Ngân hàng MSB</strong>, hiển thị tối ưu trên di động &amp; máy tính, tích hợp <strong>Resend Webhook</strong> đối soát thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowWebhookModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-400/30 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Webhook className="w-4 h-4 text-indigo-300" />
              <span>Cấu Hình Webhook</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span>Cài Đặt API Key</span>
            </button>

            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              hasLiveApiKey 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{hasLiveApiKey ? 'Resend Live API' : 'Resend Sandbox'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between animate-fadeIn shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Sub-tab Navigator (Templates Editor vs Send Logs) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewSubTab('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewSubTab === 'editor'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Biên Tập &amp; Quản Lý Template ({templates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewSubTab === 'logs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Nhật Ký Thư &amp; Webhook ({sendLogs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono pr-2">
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Webhook: {webhookConfig.status === 'active' ? 'Đang Lắng Nghe' : 'Chờ Kết Nối'}
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">Tỷ lệ phát: <strong>99.8%</strong></span>
        </div>
      </div>

      {/* =============================================================== */}
      {/* VIEW 1: TEMPLATE MANAGER & LIVE PREVIEW EDITOR */}
      {/* =============================================================== */}
      {viewSubTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Template List (4 Cols) */}
          <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Kho Mẫu Email Tuyển Sinh
              </span>
              <button
                type="button"
                onClick={() => {
                  const newTmpl: EmailTemplate = {
                    id: `tmpl-${Date.now()}`,
                    code: `custom_${Date.now()}`,
                    name: 'Mẫu Email Mới',
                    category: 'admission',
                    subject: '[TWings x MSB] Thông báo mới cho học viên {{customerName}}',
                    description: 'Mẫu email tùy chỉnh do chuyên viên khởi tạo.',
                    variables: ['customerName', 'courseTitle', 'batchCohort', 'pic'],
                    updatedAt: new Date().toLocaleDateString('vi-VN'),
                    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Thông Báo Từ TWings Academy & MSB</h2>
  <p>Kính gửi Bạn <strong>{{customerName}}</strong>,</p>
  <p>Hệ thống trân trọng thông báo thông tin khóa học <strong>{{courseTitle}}</strong>.</p>
</div>`
                  };
                  setTemplates([newTmpl, ...templates]);
                  handleSelectTemplate(newTmpl);
                  showToast('Đã thêm mẫu email mới.');
                }}
                className="p-1.5 bg-[#0073C1] text-white rounded-lg hover:bg-[#005fa3] text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Tạo mẫu email mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mẫu</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mẫu thư theo tên, tiêu đề..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'admission', label: '🎓 Nhập học' },
                { id: 'payment', label: '💳 Học phí' },
                { id: 'scheduling', label: '📅 Lịch học' }
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeCategory === c.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Template Card List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredTemplates.map((t) => {
                const isSelected = t.id === selectedTemplate.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-[#0073C1] bg-blue-50/60 shadow-2xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {t.name}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTemplate(t);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500"
                          title="Nhân bản mẫu này"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(t.id, t.name);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                          title="Xóa mẫu này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {t.subject}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                      <span>Cập nhật: {t.updatedAt}</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-sans">
                        {t.category === 'payment' ? '💳 Học phí' : t.category === 'admission' ? '🎓 Tuyển sinh' : '📅 Lịch học'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Editor & Live Preview (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Editor Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    Biên Tập Nội Dung Template
                  </span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="font-bold text-base text-slate-900 border-b border-dashed border-slate-300 focus:border-[#0073C1] focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="px-4 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu Thay Đổi</span>
                  </button>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Tiêu Đề Email (Subject Line) - Hỗ trợ gán tag biến:
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full p-2.5 text-xs font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                />
              </div>

              {/* Dynamic Variables Guide Chips */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chèn Biến Động (Click để chèn vào nội dung thư):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer"
                      title={v.desc}
                    >
                      {`{{${v.tag}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* HTML & Body Editor */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Mã Nguồn Thư (HTML Chuẩn Email - Responsive Tables):
                </label>
                <textarea
                  rows={12}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-2xl bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Xem Trước Bản Render Thực Tế
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Target Lead Selector */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>Xem thử với:</span>
                    <select
                      value={previewOrder.id}
                      onChange={(e) => {
                        const found = orders.find((o) => o.id === e.target.value);
                        if (found) setPreviewOrder(found);
                      }}
                      className="p-1.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-xs"
                    >
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.customerName} ({o.orderCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Device Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDevicePreview('desktop')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        devicePreview === 'desktop' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                      }`}
                      title="Xem trên máy tính (Desktop)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDevicePreview('mobile')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        devicePreview === 'mobile' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                      }`}
                      title="Xem trên điện thoại (Mobile 375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rendered Subject */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <span className="text-slate-400 font-bold block mb-0.5">Tiêu đề thực tế gửi đi:</span>
                <span className="font-bold text-slate-900">{renderedPreviewSubject}</span>
              </div>

              {/* Rendered HTML Container */}
              <div className="flex justify-center bg-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-200">
                <div
                  className={`bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden transition-all duration-300 ${
                    devicePreview === 'mobile' ? 'w-[375px]' : 'w-full'
                  }`}
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                    <span>To: {previewOrder.customerEmail || 'hocvien@gmail.com'}</span>
                    <span>Resend Render View ({devicePreview.toUpperCase()})</span>
                  </div>
                  <div 
                    className="p-4 overflow-y-auto max-h-[500px]"
                    dangerouslySetInnerHTML={{ __html: renderedPreviewBody }} 
                  />
                </div>
              </div>

              {/* Test Dispatch Strip */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Gửi Thử Nghiệm Tới:</span>
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="email@example.com"
                    className="p-2 text-xs border border-slate-300 rounded-xl bg-white w-full sm:w-64 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                  <span>{isSending ? 'Đang gửi qua Resend...' : 'Gửi Thử Qua Resend API'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* VIEW 2: RESEND DISPATCH LOGS & WEBHOOK AUDIT */}
      {/* =============================================================== */}
      {viewSubTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-5 p-5">
          {/* 1. DEDICATED RESEND WEBHOOK CONFIGURATION & LIVE STATUS PANEL */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Webhook className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Cấu Hình Resend Webhook &amp; Giám Sát Thời Gian Thực</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                        Đang Lắng Nghe
                      </span>
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Cơ chế đối soát 2 chiều: Resend Webhook tự động đẩy dữ liệu khi học viên <strong>Mở thư</strong>, <strong>Bấm vào link</strong>, hoặc khi máy chủ <strong>Tiếp nhận thành công</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-indigo-400/30 shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Cài Đặt Webhook Chi Tiết</span>
                </button>
              </div>
            </div>

            {/* Webhook URLs & Secrets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-indigo-400" /> Endpoint Webhook URL (Nhận Sự Kiện):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookConfig.webhookUrl);
                      showToast('Đã sao chép Webhook URL vào clipboard!');
                    }}
                    className="text-indigo-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao chép</span>
                  </button>
                </div>
                <div className="font-mono text-indigo-200 text-xs truncate bg-slate-900/90 p-2 rounded-lg border border-slate-700 select-all">
                  {webhookConfig.webhookUrl}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold flex items-center gap-1">
                    <Key className="w-3 h-3 text-emerald-400" /> Signing Secret (Xác thực chữ ký Svix):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookConfig.signingSecret);
                      showToast('Đã sao chép Signing Secret vào clipboard!');
                    }}
                    className="text-emerald-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao chép</span>
                  </button>
                </div>
                <div className="font-mono text-emerald-300 text-xs truncate bg-slate-900/90 p-2 rounded-lg border border-slate-700 select-all">
                  {webhookConfig.signingSecret}
                </div>
              </div>
            </div>

            {/* Subscribed Events & Live Simulator Controls */}
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 font-semibold mr-1">Sự kiện kích hoạt:</span>
                {['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced'].map((ev) => (
                  <span key={ev} className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-400/20">
                    ✓ {ev}
                  </span>
                ))}
              </div>

              {/* Quick Simulator Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 font-semibold text-[11px]">Thử Webhook:</span>
                <button
                  type="button"
                  onClick={() => {
                    const target = sendLogs[0];
                    if (!target) return;
                    processIncomingWebhookEvent({
                      id: `evt_${Date.now()}`,
                      type: 'email.opened',
                      createdAt: new Date().toISOString(),
                      emailId: target.resendMessageId || 'msg_sim_1',
                      from: 'TWings x MSB <onboarding@resend.dev>',
                      to: [target.recipientEmail],
                      subject: target.subject
                    });
                    setSendLogs(getSavedEmailSendLogs());
                    showToast(`⚡ Webhook [email.opened]: Học viên ${target.recipientName} vừa mở thư!`);
                    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
                  }}
                  className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Mô phỏng sự kiện học viên mở thư"
                >
                  <Eye className="w-3 h-3 text-purple-300" />
                  <span>Mở Thư (Open)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = sendLogs[0];
                    if (!target) return;
                    processIncomingWebhookEvent({
                      id: `evt_${Date.now()}`,
                      type: 'email.clicked',
                      createdAt: new Date().toISOString(),
                      emailId: target.resendMessageId || 'msg_sim_1',
                      from: 'TWings x MSB <onboarding@resend.dev>',
                      to: [target.recipientEmail],
                      subject: target.subject,
                      payload: { click: { link: 'https://twings.edu.vn/xac-nhan' } }
                    });
                    setSendLogs(getSavedEmailSendLogs());
                    showToast(`⚡ Webhook [email.clicked]: Học viên ${target.recipientName} vừa click link!`);
                    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
                  }}
                  className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Mô phỏng sự kiện học viên click liên kết"
                >
                  <MousePointer className="w-3 h-3 text-emerald-300" />
                  <span>Click Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. LOGS TABLE CONTROLS & FILTER BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Nhật Ký Thư Resend Đã Phát &amp; Ghi Nhận Webhook ({sendLogs.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật tự động thời gian thực khi học viên tiếp nhận, mở thư hoặc click vào link trong email.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSendLogs(getSavedEmailSendLogs());
                  showToast('Đã làm mới nhật ký phát thư.');
                }}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title="Làm mới danh sách"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Tìm theo học viên, email, mã Msg ID..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'opened', label: '👁️ Đã mở (Opened)' },
                { id: 'clicked', label: '🖱️ Đã bấm link (Clicked)' },
                { id: 'delivered', label: '✓ Tiếp nhận (Delivered)' },
                { id: 'bounced', label: '⚠️ Bị dội (Bounced)' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setLogStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    logStatusFilter === st.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Người Nhận</th>
                  <th className="p-3.5">Mẫu Thư (Template)</th>
                  <th className="p-3.5">Tiêu Đề Email</th>
                  <th className="p-3.5">Thời Gian Gửi</th>
                  <th className="p-3.5">Mã Thông Điệp Resend</th>
                  <th className="p-3.5 text-center">Trạng Thái Webhook</th>
                  <th className="p-3.5 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{log.recipientName}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{log.recipientEmail}</div>
                      </td>

                      <td className="p-3.5 font-medium text-slate-800">
                        {log.templateName}
                      </td>

                      <td className="p-3.5 text-slate-600 max-w-xs truncate" title={log.subject}>
                        {log.subject}
                      </td>

                      <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                        {log.sentAt}
                      </td>

                      <td className="p-3.5 font-mono text-slate-700 text-[11px]">
                        {log.resendMessageId || 'msg_simulated'}
                      </td>

                      <td className="p-3.5 text-center">
                        {log.status === 'clicked' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <MousePointer className="w-3 h-3" />
                            <span>Đã click link ({log.clickCount || 1}x)</span>
                          </span>
                        ) : log.status === 'opened' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Đã mở ({log.openCount || 1}x)</span>
                          </span>
                        ) : log.status === 'delivered' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã tiếp nhận</span>
                          </span>
                        ) : log.status === 'bounced' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Bị dội (Bounce)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Đã phát đi</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectedLog(log)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem Thư</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 3. RESEND API CONFIGURATION MODAL */}
      {/* =============================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Cấu Hình Kết Nối Resend API</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApiConfig} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Resend API Key:
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="re_123456789..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 font-mono focus:bg-white focus:outline-none focus:border-[#0073C1]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Nếu để trống, hệ thống sẽ tự động chuyển sang chế độ <strong>Developer Sandbox</strong> để test an toàn.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Địa Chỉ Người Gửi (Sender / From):
                </label>
                <input
                  type="text"
                  value={fromEmailInput}
                  onChange={(e) => setFromEmailInput(e.target.value)}
                  placeholder="TWings x MSB <onboarding@resend.dev>"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 font-mono focus:bg-white focus:outline-none focus:border-[#0073C1]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Mặc định: <code className="bg-slate-100 px-1 rounded text-slate-700">onboarding@resend.dev</code> (tên miền test của Resend).
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cơ Chế Bảo Mật Resend</span>
                </div>
                <p>
                  Khóa API được lưu cục bộ trong trình duyệt an toàn của bạn. Hệ thống hỗ trợ phát email thật tới bất kỳ hòm thư học viên nào có trong cơ sở dữ liệu.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#0073C1] hover:bg-[#005fa3] text-white rounded-xl shadow-xs"
                >
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 4. RESEND WEBHOOK CONFIGURATION & SIMULATOR MODAL */}
      {/* =============================================================== */}
      {showWebhookModal && (
        <CMSResendWebhookModal
          isOpen={showWebhookModal}
          onClose={() => setShowWebhookModal(false)}
          onWebhookProcessed={() => {
            setSendLogs(getSavedEmailSendLogs());
          }}
        />
      )}

      {/* =============================================================== */}
      {/* 5. EMAIL DETAIL INSPECTOR MODAL */}
      {/* =============================================================== */}
      {inspectedLog && (
        <CMSEmailDetailModal
          log={inspectedLog}
          onClose={() => setInspectedLog(null)}
        />
      )}
    </div>
  );
};
