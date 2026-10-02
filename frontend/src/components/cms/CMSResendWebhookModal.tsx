import React, { useState } from 'react';
import {
  X,
  Webhook,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Play,
  Activity,
  ShieldCheck,
  Key,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Clock,
  Eye,
  MousePointer,
  RefreshCw,
  Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ResendWebhookConfig, ResendWebhookEvent, EmailSendLog } from '../../types';
import {
  getSavedWebhookConfig,
  getSavedWebhookEvents,
  processIncomingWebhookEvent,
  getSavedEmailSendLogs
} from '../../utils/resendEmail';

interface CMSResendWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWebhookProcessed?: () => void;
}

export const CMSResendWebhookModal: React.FC<CMSResendWebhookModalProps> = ({
  isOpen,
  onClose,
  onWebhookProcessed
}) => {
  const [config] = useState<ResendWebhookConfig>(getSavedWebhookConfig());
  const [eventsList, setEventsList] = useState<ResendWebhookEvent[]>(getSavedWebhookEvents());
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Simulation controls
  const [activeTab, setActiveTab] = useState<'config' | 'simulator' | 'events'>('config');
  const [selectedEmailId, setSelectedEmailId] = useState<string>('');
  const [simulatedEventType, setSimulatedEventType] = useState<'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced'>('email.opened');

  if (!isOpen) return null;

  const sendLogs = getSavedEmailSendLogs();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(config.webhookUrl);
    setCopiedUrl(true);
    showToast('Đã sao chép Webhook URL vào clipboard!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleTriggerSimulatedWebhook = () => {
    const targetLog = sendLogs.find((l) => l.resendMessageId === selectedEmailId) || sendLogs[0];
    if (!targetLog) {
      alert('Chưa có email nào trong hệ thống để mô phỏng webhook.');
      return;
    }

    const eventPayload: ResendWebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: simulatedEventType,
      createdAt: new Date().toISOString(),
      emailId: targetLog.resendMessageId || `msg_${Date.now()}`,
      from: 'TWings x MSB <onboarding@resend.dev>',
      to: [targetLog.recipientEmail],
      subject: targetLog.subject,
      payload: {
        click: simulatedEventType === 'email.clicked' ? { link: 'https://twings.edu.vn/lms/confirm' } : undefined,
        bounce: simulatedEventType === 'email.bounced' ? { message: '550 5.1.1 User Unknown' } : undefined
      }
    };

    processIncomingWebhookEvent(eventPayload);
    setEventsList(getSavedWebhookEvents());

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    showToast(`Đã nhận sự kiện Webhook "${simulatedEventType}" cho email của ${targetLog.recipientName}!`);

    if (onWebhookProcessed) {
      onWebhookProcessed();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Cấu Hình & Đối Soát Resend Webhook</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ● Webhook Active
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Lắng nghe sự kiện phát thư theo thời gian thực: Đã giao (Delivered), Đã mở (Opened), Click link &amp; Bounced
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

        {/* Toast */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMsg}</span>
            </div>
          </div>
        )}

        {/* Tab Navigator */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-[#0073C1] text-[#0073C1] bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Điểm Cuối Webhook (Endpoint)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'border-[#0073C1] text-[#0073C1] bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>2. Mô Phỏng Sự Kiện (Live Simulator)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-[#0073C1] text-[#0073C1] bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>3. Luồng Sự Kiện Nhận Được ({eventsList.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: ENDPOINT CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Webhook URL Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Webhook Destination URL (Dán vào Resend Dashboard):
                  </label>
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng nhận HTTP POST
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config.webhookUrl}
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Đã Chép' : 'Sao Chép'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Resend sẽ gửi các gói tin JSON chứa trạng thái phát thư trực tiếp đến URL này.
                </p>
              </div>

              {/* Signing Secret Box: the secret is never exposed to the browser */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Webhook Signing Secret (<code className="text-indigo-600">whsec_...</code>):
                </label>
                <p className="text-[11px] text-slate-600">
                  Secret chỉ được lưu trên máy chủ dưới biến môi trường <code className="bg-white px-1 rounded border">RESEND_WEBHOOK_SECRET</code>,
                  không bao giờ hiển thị hay lưu trên trình duyệt. Máy chủ xác thực chữ ký HMAC-SHA256 trong header{' '}
                  <code className="bg-white px-1 rounded border">svix-signature</code> và từ chối mọi yêu cầu sai chữ ký hoặc quá 5 phút.
                </p>
              </div>

              {/* Monitored Events Matrix */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Các Sự Kiện Được Lắng Nghe &amp; Cập Nhật Tự Động:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-mono">email.sent</strong>
                      <span className="text-slate-500 text-[11px]">Đã chuyển tiếp tới Resend MTA</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-mono">email.delivered</strong>
                      <span className="text-slate-500 text-[11px]">Hộp thư người nhận đã tiếp nhận</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-mono">email.opened</strong>
                      <span className="text-slate-500 text-[11px]">Học viên mở thư &bull; Đếm lượt xem</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-mono">email.clicked</strong>
                      <span className="text-slate-500 text-[11px]">Học viên click vào liên kết</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  </div>
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 text-xs space-y-2 text-indigo-950">
                <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Hướng dẫn thiết lập 2 bước trên Resend Dashboard:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                  <li>Đăng nhập <a href="https://resend.com/webhooks" target="_blank" rel="noreferrer" className="text-[#0073C1] underline font-bold">resend.com/webhooks</a> &rarr; Chọn <strong>"Add Webhook"</strong>.</li>
                  <li>Dán URL ở trên vào trường <strong>Endpoint URL</strong>, chọn tất cả sự kiện (Sent, Delivered, Opened, Clicked, Bounced) và bấm <strong>Create</strong>.</li>
                  <li>Copy chuỗi <code>whsec_...</code> vào ô Signing Secret ở trên để hoàn tất.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Mô Phỏng Trực Tiếp Gói Tin Webhook Của Resend</span>
                </div>
                <p>
                  Công cụ này giúp bạn kiểm thử phản ứng của hệ thống khi Resend gửi webhook về mà không cần chờ người nhận thực sự mở email.
                </p>
              </div>

              <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                {/* Select Target Sent Email */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chọn Email Đã Gửi Để Kích Hoạt Sự Kiện:
                  </label>
                  <select
                    value={selectedEmailId || sendLogs[0]?.resendMessageId}
                    onChange={(e) => setSelectedEmailId(e.target.value)}
                    className="w-full p-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    {sendLogs.map((log) => (
                      <option key={log.id} value={log.resendMessageId}>
                        {log.recipientName} ({log.recipientEmail}) - [{log.status.toUpperCase()}] - {log.templateName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Type Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chọn Loại Sự Kiện Webhook Giả Lập:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { type: 'email.delivered', label: '1. Delivered', icon: CheckCircle2, color: 'text-blue-600' },
                      { type: 'email.opened', label: '2. Opened (Mở thư)', icon: Eye, color: 'text-purple-600' },
                      { type: 'email.clicked', label: '3. Clicked (Bấm link)', icon: MousePointer, color: 'text-emerald-600' },
                      { type: 'email.bounced', label: '4. Bounced (Dội)', icon: AlertCircle, color: 'text-rose-600' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setSimulatedEventType(item.type as any)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 ${
                          simulatedEventType === item.type
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTriggerSimulatedWebhook}
                    className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Kích Hoạt Nhận Webhook Ngay Lập Tức &rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVENTS STREAM */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Lịch Sử Nhận Gói Tin Resend Webhook:</span>
                <span className="text-slate-400 font-mono">Tự động đồng bộ</span>
              </div>

              {eventsList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  Chưa có gói tin webhook nào. Bạn có thể chuyển sang tab "Mô Phỏng Sự Kiện" để kích hoạt thử!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {eventsList.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          evt.type === 'email.delivered'
                            ? 'bg-blue-100 text-blue-800'
                            : evt.type === 'email.opened'
                            ? 'bg-purple-100 text-purple-800'
                            : evt.type === 'email.clicked'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {evt.type}
                        </span>

                        <span className="text-slate-400 text-[11px] font-sans">
                          {new Date(evt.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="text-slate-700 text-[11px]">
                        <strong>To:</strong> {evt.to.join(', ')} &bull; <strong>Msg ID:</strong> {evt.emailId}
                      </div>

                      <div className="text-[10px] text-slate-500 truncate font-sans">
                        Tiêu đề: {evt.subject}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            Trạng thái máy chủ: <strong>HTTP 200 OK</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
};
