import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { commerceApi, formatVND, OrderBilling } from '../../lib/commerce';
import { useStaffCan } from '../../lib/lms';

interface Props {
  orderId: string;
  /** Record the outstanding amount as received (finance permission; the server records the payment). */
  onConfirmReceived: (amount: number) => void;
}

/**
 * "Thanh toán & VietQR" tab of the lead workspace: the payment instructions the learner also sees
 * (bank account, amount due now, memo = order code, QR), all from the server (settings + order), so a
 * transfer always lands on TWings' account and is matched automatically by the bank webhook.
 */
export const LeadPaymentPanel: React.FC<Props> = ({ orderId, onConfirmReceived }) => {
  const canConfirm = useStaffCan('finance.confirm_manual');
  const [billing, setBilling] = useState<OrderBilling | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    commerceApi.billing(orderId).then(setBilling).catch((e: Error) => setError(e.message));
  }, [orderId]);

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!billing) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const outstanding = Math.max(billing.amountDueNow, 0);
  const pay = billing.payment;
  const row = (label: string, value: string, key: string) => (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5 font-bold text-slate-900">
        {value}
        <button type="button" onClick={() => copy(value, key)} title="Sao chép" className="p-1 rounded hover:bg-slate-100 cursor-pointer">
          {copied === key ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </span>
    </div>
  );

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Học phí</span><span className="font-mono font-bold">{formatVND(billing.amount)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Đã đóng</span><span className="font-mono font-bold text-emerald-700">{formatVND(billing.totalPaid)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Trạng thái</span><span className="font-bold">{billing.statusLabel}</span></div>
      </div>

      {pay ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5 items-start">
          <img src={pay.qrImageUrl} alt={`VietQR ${pay.orderCode}`} className="w-[200px] h-[200px] object-contain border border-slate-200 rounded-xl" />
          <div>
            <div className="font-bold text-slate-900 mb-2">Hướng dẫn chuyển khoản (học viên thấy giống hệt)</div>
            {row('Ngân hàng', pay.bankName, 'bank')}
            {row('Số tài khoản', pay.accountNumber, 'account')}
            {row('Chủ tài khoản', pay.accountName, 'name')}
            {row('Số tiền cần chuyển', String(pay.amount), 'amount')}
            {row('Nội dung chuyển khoản', pay.transferContent, 'memo')}
            <p className="text-slate-500 mt-2">
              Chuyển khoản đúng nội dung thì hệ thống tự ghi nhận qua webhook ngân hàng, không cần thao tác.
            </p>
          </div>
        </div>
      ) : (
        <p className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
          {billing.status === 'pending' ? 'Chưa cấu hình tài khoản nhận VietQR trên máy chủ.' : 'Đơn không còn khoản cần thu.'}
        </p>
      )}

      {canConfirm && outstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="font-bold text-amber-900">Xác nhận thủ công (Kế toán)</div>
          <p className="text-amber-900">
            Chỉ dùng khi tiền đã về tài khoản nhưng không được ghi nhận tự động (sai nội dung, nộp tiền mặt…), sau khi đối
            soát sao kê. Hệ thống ghi một khoản thu {formatVND(outstanding)} kèm nhật ký kiểm toán.
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Xác nhận đã nhận ${formatVND(outstanding)} cho đơn ${billing.orderCode}?`)) onConfirmReceived(outstanding);
            }}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
          >
            Xác nhận đã nhận {formatVND(outstanding)}
          </button>
        </div>
      )}
    </div>
  );
};
