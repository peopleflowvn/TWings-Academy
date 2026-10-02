import React, { useState } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  Clock,
  Eye,
  MousePointer,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  User,
  ExternalLink,
  Code
} from 'lucide-react';
import { EmailSendLog } from '../../types';

interface CMSEmailDetailModalProps {
  log: EmailSendLog | null;
  onClose: () => void;
}

export const CMSEmailDetailModal: React.FC<CMSEmailDetailModalProps> = ({
  log,
  onClose
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'html' | 'events'>('preview');

  if (!log) return null;

  const handleCopyId = () => {
    if (!log.resendMessageId) return;
    navigator.clipboard.writeText(log.resendMessageId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Determine active steps in lifecycle
  const isSent = true;
  const isDelivered = log.status === 'delivered' || log.status === 'opened' || log.status === 'clicked';
  const isOpened = log.status === 'opened' || log.status === 'clicked' || (log.openCount || 0) > 0;
  const isClicked = log.status === 'clicked' || (log.clickCount || 0) > 0;
  const isBounced = log.status === 'bounced';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Chi Tiết Trạng Thái Phát Thư Resend</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  log.status === 'clicked'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : log.status === 'opened'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                    : log.status === 'delivered'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : log.status === 'bounced'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {log.status === 'clicked'
                    ? 'Đã click link'
                    : log.status === 'opened'
                    ? `Đã mở thư (${log.openCount || 1} lần)`
                    : log.status === 'delivered'
                    ? 'Đã gửi tới hộp thư'
                    : log.status === 'bounced'
                    ? 'Thư bị dội (Bounce)'
                    : 'Đã phát'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Mã định danh Resend: <strong className="font-mono text-indigo-300">{log.resendMessageId}</strong>
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

        {/* Lifecycle Stepper Bar */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Step 1: Sent */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              isSent ? 'bg-white border-blue-500 text-blue-900 shadow-2xs font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className={`w-4 h-4 ${isSent ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>1. Đã Phát Đi (Sent)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-normal block">{log.sentAt}</span>
            </div>

            {/* Step 2: Delivered */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              isDelivered ? 'bg-white border-emerald-500 text-emerald-900 shadow-2xs font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className={`w-4 h-4 ${isDelivered ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>2. Tiếp Nhận (Delivered)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-normal block">{log.deliveredAt || log.sentAt}</span>
            </div>

            {/* Step 3: Opened */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              isOpened ? 'bg-white border-purple-500 text-purple-900 shadow-2xs font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Eye className={`w-4 h-4 ${isOpened ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>3. Đã Mở ({log.openCount || (isOpened ? 1 : 0)})</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-normal block">{log.openedAt || (isOpened ? 'Đã xem' : 'Chờ mở')}</span>
            </div>

            {/* Step 4: Clicked */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              isClicked ? 'bg-white border-amber-500 text-amber-900 shadow-2xs font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <MousePointer className={`w-4 h-4 ${isClicked ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>4. Đã Bấm Link</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-normal block">{log.clickedAt || (isClicked ? 'Đã tương tác' : 'Chưa bấm')}</span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block font-bold text-[11px]">Học viên nhận thư:</span>
                <span className="font-bold text-slate-900 text-sm">{log.recipientName}</span>
                <span className="text-slate-500 font-mono block mt-0.5">{log.recipientEmail}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-bold text-[11px]">Mẫu thư (Template):</span>
                <span className="font-bold text-[#0073C1] text-sm">{log.templateName}</span>
                <span className="text-slate-500 block mt-0.5 truncate" title={log.subject}>Tiêu đề: {log.subject}</span>
              </div>
            </div>

            {log.lastClickedUrl && (
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                <span className="font-bold text-slate-700">Liên kết đã click:</span>
                <a href={log.lastClickedUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono">
                  {log.lastClickedUrl}
                </a>
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem Trước Email Thực Tế</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('events')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'events' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Nhật Ký Sự Kiện Webhook ({log.webhookEvents?.length || 0})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyId}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-mono cursor-pointer"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Đã sao chép Msg ID' : 'Chép Msg ID'}</span>
            </button>
          </div>

          {/* Rendered Preview View */}
          {viewMode === 'preview' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 p-4 max-h-[420px] overflow-y-auto">
              {log.renderedHtml ? (
                <div
                  className="bg-white rounded-xl shadow-xs overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: log.renderedHtml }}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-white rounded-xl">
                  Bản xem trước HTML đã lưu trong bộ đệm hệ thống.
                </div>
              )}
            </div>
          )}

          {/* Webhook Events Timeline View */}
          {viewMode === 'events' && (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {(log.webhookEvents || []).map((evt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 font-mono text-[11px] block">{evt.type}</span>
                    <span className="text-slate-600">{evt.details || 'Đã ghi nhận sự kiện'}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">{evt.timestamp}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            Resend Status: <strong>{log.status.toUpperCase()}</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
