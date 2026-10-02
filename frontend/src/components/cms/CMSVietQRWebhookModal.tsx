import React, { useState } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
  Building2,
  Terminal,
  Send,
  Sparkles,
  Check,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order } from '../../types';
import { sendEmailWithResend, extractOrderEmailVariables } from '../../utils/resendEmail';

interface CMSVietQRWebhookModalProps {
  orders: Order[];
  onClose: () => void;
  onConfirmPayment: (updatedOrder: Order) => void;
}

export const CMSVietQRWebhookModal: React.FC<CMSVietQRWebhookModalProps> = ({
  orders,
  onClose,
  onConfirmPayment,
}) => {
  const pendingOrders = orders.filter((o) => o.status !== 'paid');
  const [selectedOrder, setSelectedOrder] = useState<Order>(pendingOrders[0] || orders[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);
  const [reconciledResult, setReconciledResult] = useState<any>(null);

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const amount = selectedOrder.tuitionFee || selectedOrder.amount || 8490000;
  const transferDesc = `TW3 ${selectedOrder.orderCode} ${selectedOrder.customerName.replace(/[^a-zA-Z0-9 ]/g, '')}`.slice(0, 45).toUpperCase();

  const handleFireWebhook = async () => {
    setIsProcessing(true);
    setReconciledResult(null);
    setWebhookLogs([
      `[NAPAS 247 Gateway] Nhận tín hiệu biến động số dư tài khoản 03001010099999 (MSB)...`,
      `[Webhook Payload] Số tiền: ${formatVND(amount)} | Nội dung: "${transferDesc}"`
    ]);

    setTimeout(() => {
      setWebhookLogs((prev) => [
        ...prev,
        `[Đối Soát Tự Động] Khớp thành công mã đơn hàng: ${selectedOrder.orderCode}`,
        `[Đối Soát Tự Động] Kiểm tra chênh lệch số tiền: 0 ₫ (Khớp 100% học phí)`,
        `[CRM Engine] Tự động chuyển trạng thái đơn hàng sang "5. Đã đóng phí"...`
      ]);
    }, 700);

    setTimeout(async () => {
      const updated: Order = {
        ...selectedOrder,
        crmStatus: '5. Đã đóng phí',
        status: 'paid',
        paymentStatusDetail: 'Đã đóng phí',
        totalPaidAmount: amount,
        paidAt: new Date().toLocaleDateString('vi-VN'),
        timelineActivities: [
          {
            id: `act-wh-${Date.now()}`,
            type: 'payment',
            title: 'Tự động gạch nợ qua Webhook VietQR Realtime',
            content: `Hệ thống nhận tín hiệu thanh toán ${formatVND(amount)} từ Ngân hàng MSB. Cú pháp: "${transferDesc}". Tự động kích hoạt tài khoản LMS Coursera.`,
            actor: 'Webhook Napas 247 Listener',
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
          },
          ...(selectedOrder.timelineActivities || [])
        ]
      };

      // Auto-dispatch receipt email via Resend
      const variables = extractOrderEmailVariables(updated);
      await sendEmailWithResend({
        to: selectedOrder.customerEmail || 'hocvien.msb@gmail.com',
        subject: `[Biên Lai Điện Tử] Xác nhận thu học phí thành công cho học viên ${selectedOrder.customerName}`,
        html: `<p>Kính gửi Bạn <strong>${selectedOrder.customerName}</strong>, TWings Academy xác nhận đã nhận đủ số tiền học phí ${formatVND(amount)} qua VietQR tự động.</p>`,
        templateName: 'Biên Lai Điện Tử Xác Nhận Đóng Học Phí',
        recipientName: selectedOrder.customerName
      });

      onConfirmPayment(updated);
      setIsProcessing(false);
      setReconciledResult({
        matched: true,
        transactionId: `FT26${Date.now().toString().slice(-8)}`,
        orderCode: selectedOrder.orderCode,
        customerName: selectedOrder.customerName,
        amount
      });

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden max-w-2xl w-full max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Mô Phỏng Webhook VietQR (Auto Gạch Nợ Realtime)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                  SLA 1 Giây
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mô phỏng luồng nhận biến động số dư từ cổng ngân hàng MSB / NAPAS 247 và tự động gạch nợ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Target Lead Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              1. Chọn hồ sơ học viên thanh toán thử nghiệm:
            </label>
            <select
              value={selectedOrder.id}
              onChange={(e) => {
                const o = orders.find((x) => x.id === e.target.value);
                if (o) setSelectedOrder(o);
              }}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-xs"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.customerName} · {o.orderCode} · {formatVND(o.amount)} ({o.status === 'paid' ? 'Đã đóng' : 'Chờ thu'})
                </option>
              ))}
            </select>
          </div>

          {/* Webhook JSON Payload Preview */}
          <div className="space-y-1.5 bg-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                POST /api/webhooks/vietqr-listener
              </span>
              <span>Content-Type: application/json</span>
            </div>

            <pre className="text-emerald-400 overflow-x-auto py-1">
{JSON.stringify({
  gateway: "MSB_NAPAS_247",
  accountNumber: "03001010099999",
  amount: amount,
  content: transferDesc,
  transactionTime: new Date().toISOString(),
  bankReference: `FT26${Date.now().toString().slice(-8)}`
}, null, 2)}
            </pre>
          </div>

          {/* Real-time Execution Logs */}
          {webhookLogs.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs space-y-1 animate-fadeIn">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block pb-1 border-b border-slate-200">
                Nhật ký xử lý đối soát (Reconciliation Logs):
              </span>
              {webhookLogs.map((log, i) => (
                <div key={i} className="text-slate-700 leading-relaxed">{log}</div>
              ))}
            </div>
          )}

          {/* Reconciled Success Card */}
          {reconciledResult && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Gạch nợ tự động hoàn tất!</span>
              </div>
              <p className="text-xs leading-relaxed">
                Hồ sơ học viên <strong>{reconciledResult.customerName}</strong> ({reconciledResult.orderCode}) đã được cập nhật sang trạng thái <strong>5. Đã đóng phí</strong>. Email biên lai điện tử đã được tự động phát đi qua Resend API!
              </p>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer hover:bg-slate-50"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleFireWebhook}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} />
              <span>{isProcessing ? 'Đang đối soát 1s...' : 'Bắn Tín Hiệu Webhook Ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
