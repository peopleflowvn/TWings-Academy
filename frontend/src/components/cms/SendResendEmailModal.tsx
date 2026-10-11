import React, { useState, useEffect } from 'react';
import { useServerCollection } from '../../lib/serverCollection';
import { EMAIL_TEMPLATES } from '../../lib/cmsCollections';
import {
  X,
  Send,
  Mail,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  CreditCard,
  Building2,
  User,
  Eye,
  Code,
  Key,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Clock,
  Layers
} from 'lucide-react';
import { Order, EmailTemplate, EmailSendLog } from '../../types';
import {
  INITIAL_EMAIL_TEMPLATES,
  extractOrderEmailVariables,
  missingEmailVariables,
  EMAIL_VARIABLE_LABELS,
  EmailContext,
  renderEmailTemplate,
  sendEmailWithResend,
  isLiveEmailEnabled,
  SENDER_DISPLAY
} from '../../utils/resendEmail';
import { SandboxedHtmlPreview } from './SandboxedHtmlPreview';
import { api } from '../../lib/api';

interface SendResendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  /** The server recorded the e-mail (and, for a lead, its history entry): reload the lead. */
  onEmailSent?: () => void;
}

export const SendResendEmailModal: React.FC<SendResendEmailModalProps> = ({
  isOpen,
  onClose,
  order,
  onEmailSent
}) => {
  // Determine smart default template based on order status
  const defaultTemplateId = order.status === 'paid' 
    ? 'tmpl-receipt' 
    : order.status === 'pending' || !order.status
    ? 'tmpl-invoice'
    : 'tmpl-welcome';

  // Live: templates edited in the CMS (server); demo: bundled samples.
  const { items: serverTemplates } = useServerCollection<EmailTemplate>(EMAIL_TEMPLATES, INITIAL_EMAIL_TEMPLATES);
  // Live: only the templates stored on the server (the bundled samples are for the demo mode).
  const templateList = serverTemplates.length || isLiveEmailEnabled() ? serverTemplates : INITIAL_EMAIL_TEMPLATES;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplateId);
  const [recipientEmail, setRecipientEmail] = useState<string>(order.customerEmail || '');
  const [subject, setSubject] = useState<string>('');
  const [htmlBody, setHtmlBody] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'preview' | 'html'>('preview');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    messageId: string;
    delivered: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment instructions and the intake of this registration: the e-mail uses real values only.
  const [context, setContext] = useState<EmailContext | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    Promise.all([
      api.get<EmailContext['billing']>(`/staff/orders/${order.id}/billing/`).catch(() => null),
      order.cohortId ? api.get<EmailContext['cohort']>(`/staff/cohorts/${order.cohortId}/`).catch(() => null) : Promise.resolve(null)
    ]).then(([billing, cohort]) => live && setContext({ billing, cohort }));
    return () => {
      live = false;
    };
  }, [isOpen, order.id, order.cohortId]);

  const [missing, setMissing] = useState<string[]>([]);
  // Sync variables and render when template, order or context changes
  useEffect(() => {
    const tmpl = templateList.find((t) => t.id === selectedTemplateId) || templateList[0];
    if (!context || !tmpl) return;
    const variables = extractOrderEmailVariables(order, context);
    setMissing(missingEmailVariables([tmpl.subject, tmpl.body], variables));
    setSubject(renderEmailTemplate(tmpl.subject, variables));
    setHtmlBody(renderEmailTemplate(tmpl.body, variables));
    setRecipientEmail(order.customerEmail || '');
    setSendResult(null);
    setErrorMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, order, context, templateList.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTemplate = templateList.find((t) => t.id === selectedTemplateId) || templateList[0];
  if (!currentTemplate) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-5 max-w-md text-sm space-y-3" onClick={(e) => e.stopPropagation()}>
          <p>Chưa có mẫu email nào trên máy chủ. Tạo mẫu ở <strong>Mẫu email & lịch sử gửi</strong> rồi gửi lại.</p>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 font-bold cursor-pointer">Đóng</button>
        </div>
      </div>
    );
  }
  const hasLiveApiKey = isLiveEmailEnabled();
  const senderFrom = SENDER_DISPLAY;

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ của học viên.');
      return;
    }

    if (
      missing.length &&
      !window.confirm(`Thư còn thiếu: ${missing.map((m) => EMAIL_VARIABLE_LABELS[m] || m).join(', ')}. Vẫn gửi?`)
    )
      return;
    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await sendEmailWithResend({
        to: recipientEmail.trim(),
        subject: subject,
        html: htmlBody,
        templateId: currentTemplate.id,
        templateName: currentTemplate.name,
        recipientName: order.customerName,
        templateCode: currentTemplate.code,
        orderId: order.id
      });

      if (!result.success && result.error) {
        setErrorMessage(result.error);
        setIsSending(false);
        return;
      }

      // "simulated": the server has no Resend key, nothing reached the learner.
      setSendResult({ success: true, messageId: result.messageId, delivered: result.status !== 'simulated' });
      if (onEmailSent) onEmailSent();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi phát thư qua Resend.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Gửi email cho học viên</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                  hasLiveApiKey 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                    : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                }`}>
                  {hasLiveApiKey ? 'Gửi qua máy chủ TWings' : 'Chế độ demo (không gửi thật)'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Chọn mẫu, kiểm tra nội dung rồi gửi tới <strong>{order.customerName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Success Banner */}
          {sendResult?.success && sendResult.delivered && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between gap-3 text-emerald-900 animate-fadeIn">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Đã gửi email</h4>
                  <p className="text-xs text-emerald-700">
                    Gửi tới <strong>{recipientEmail}</strong>, đã ghi vào lịch sử hồ sơ. Trạng thái giao thư (đã nhận, bị trả về…) cập nhật theo webhook trong Mẫu email & lịch sử gửi.
                  </p>
                  {sendResult.messageId && (
                    <div className="text-[11px] font-mono text-emerald-800 bg-white/60 px-2 py-1 rounded-md border border-emerald-200 inline-block mt-1">
                      Mã thư: <strong>{sendResult.messageId}</strong>
                    </div>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setSendResult(null)} className="text-emerald-500 hover:text-emerald-800 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {sendResult?.success && !sendResult.delivered && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Email chưa được gửi thật:</strong> máy chủ chưa cấu hình khóa Resend (RESEND_API_KEY). Thư được lưu ở chế độ mô phỏng; học viên không nhận được.
              </span>
            </div>
          )}

          {missing.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Mẫu thư dùng dữ liệu chưa có cho đăng ký này:</strong>{' '}
                {missing.map((m) => EMAIL_VARIABLE_LABELS[m] || m).join(', ')}. Các chỗ đó sẽ để trống; bổ sung (xếp lớp, cấu hình tài khoản nhận tiền…) hoặc sửa nội dung trước khi gửi.
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-900 text-xs">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div className="flex-1">
                <strong>Không thể gửi thư:</strong> {errorMessage}
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Candidate Context Pill */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                {order.customerName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-slate-900">{order.customerName}</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="font-mono text-slate-600">{order.orderCode}</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-600">{order.courseTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
                {order.batchCohort || 'Chưa xếp lớp'}
              </span>
              <span className={`px-2.5 py-1 rounded-xl font-bold ${
                order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {order.status === 'paid' ? 'Đã đóng phí' : order.status === 'pending' ? 'Chưa đóng đủ' : order.status === 'refunded' ? 'Đã hoàn tiền' : 'Đã hủy'}
              </span>
            </div>
          </div>

          {/* Template Selection Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Chọn Mẫu Email Muốn Gửi ({templateList.length} mẫu)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {templateList.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0073C1] bg-blue-50/50 shadow-2xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 line-clamp-1">
                      {tmpl.name}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                      {tmpl.category === 'payment' ? '💳 Học phí' : tmpl.category === 'admission' ? '🎓 Nhập học' : '📅 Lịch học'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Form Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Địa Chỉ Người Gửi (From):
                </label>
                <input
                  type="text"
                  value={senderFrom}
                  disabled
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Học Viên Nhận Thư (To) *:
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="hocvien@gmail.com"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-mono focus:outline-none focus:border-[#0073C1]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tiêu Đề Email (Subject) *:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:outline-none focus:border-[#0073C1]"
              />
            </div>
          </div>

          {/* Live Preview / Source Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Nội Dung Thư Đã Điền Tự Động (Live Rendered)
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    previewTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem Trước</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('html')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    previewTab === 'html' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Mã Nguồn HTML</span>
                </button>
              </div>
            </div>

            {previewTab === 'preview' ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-4 max-h-72 overflow-y-auto shadow-inner">
                <SandboxedHtmlPreview html={htmlBody} className="rounded-xl shadow-xs" minHeight={260} />
              </div>
            ) : (
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={10}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-2xl bg-slate-900 text-slate-200 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Thư đã gửi được ghi vào nhật ký của hồ sơ</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex-1 sm:flex-none text-center"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !context}
              className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-1 sm:flex-none active:scale-95"
            >
              <Send className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
              <span>{isSending ? 'Đang gửi…' : 'Gửi email'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
