import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2, Wallet } from 'lucide-react';
import { commerceApi, formatVND, OrderBilling } from '../../lib/commerce';
import { useStaffCan } from '../../lib/lms';
import type { ManualPayment, ManualPaymentMethod } from '../../admin/data';

interface Props {
  orderId: string;
  /** Record money received by hand (the server checks the amount; throws its reason when refused). */
  onConfirmReceived: (payment: ManualPayment) => Promise<unknown>;
}

const METHODS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản (chưa tự khớp)' },
  { value: 'card', label: 'Quẹt thẻ / POS' },
  { value: 'other', label: 'Khác' }
];

const digits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const vnNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

/**
 * "Thanh toán & VietQR" tab of the lead workspace: the payment instructions the learner also sees
 * (bank account, amount due now, memo = order code, QR), all from the server (settings + order), so a
 * transfer always lands on TWings' account and is matched automatically by the bank webhook.
 */
export const LeadPaymentPanel: React.FC<Props> = ({ orderId, onConfirmReceived }) => {
  const canRecord = useStaffCan('crm.record_payment');
  const canConfirm = useStaffCan('finance.confirm_manual');
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<ManualPaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [billing, setBilling] = useState<OrderBilling | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    commerceApi
      .billing(orderId)
      .then((b) => {
        setBilling(b);
        // Default: what is due now (the next installment); any amount up to the balance is allowed.
        const due = Math.min(Math.max(b.amountDueNow, 0), b.balance) || b.balance;
        setAmountText(due ? vnNumber(due) : '');
      })
      .catch((e: Error) => setError(e.message));
  }, [orderId]);

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!billing) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const pay = billing.payment;
  const amount = digits(amountText);
  const balance = Math.max(billing.balance ?? 0, 0);
  const open = billing.status === 'pending' || billing.status === 'paid';
  const amountError = !amount ? 'Nhập số tiền đã nhận.' : amount > balance ? `Tối đa ${formatVND(balance)} (số còn phải đóng).` : '';
  const record = async () => {
    if (amountError || recording) return;
    const part = amount < balance ? ` (đóng một phần, còn lại ${formatVND(balance - amount)})` : ' (đóng đủ)';
    if (!window.confirm(`Ghi nhận đã nhận ${formatVND(amount)}${part} cho đơn ${billing.orderCode}?\nHọc viên sẽ nhận email biên nhận.`)) return;
    setRecording(true);
    setRecordError('');
    try {
      await onConfirmReceived({ amount, method, note: note.trim() });
      setNote('');
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : 'Không ghi nhận được khoản thu.');
    } finally {
      setRecording(false);
    }
  };
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
        <div className="flex justify-between"><span className="text-slate-500">Còn phải đóng</span><span className="font-mono font-bold text-amber-700">{formatVND(balance)}</span></div>
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

      {(canRecord || canConfirm) && open && balance > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="font-bold text-amber-900 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Ghi nhận học phí đã nhận (thủ công)</div>
          <p className="text-amber-900">
            Dùng khi học viên đóng tiền mặt, quẹt thẻ, hoặc chuyển khoản nhưng hệ thống không tự ghi nhận (sai nội dung). Được ghi một
            phần (ví dụ đặt cọc), tối đa {formatVND(balance)}. Khoản thu ghi tên người nhập, vào nhật ký kiểm toán và học viên nhận email biên nhận.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Số tiền đã nhận (đ)</span>
              <input
                inputMode="numeric"
                value={amountText}
                onChange={(e) => {
                  const n = digits(e.target.value);
                  setAmountText(n ? vnNumber(n) : '');
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold"
              />
            </label>
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Hình thức</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)} className="w-full p-2.5 border border-slate-300 rounded-xl bg-white">
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Ghi chú / số phiếu thu</span>
              <input value={note} maxLength={250} onChange={(e) => setNote(e.target.value)} placeholder="VD: phiếu thu PT-0123, cọc giữ chỗ" className="w-full p-2.5 border border-slate-300 rounded-xl bg-white" />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set([Math.min(billing.amountDueNow, balance), balance].filter((v) => v > 0))).map((v) => (
              <button key={v} type="button" onClick={() => setAmountText(vnNumber(v))} className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 cursor-pointer">
                {v === balance ? 'Đóng đủ' : 'Kỳ đến hạn'}: {formatVND(v)}
              </button>
            ))}
          </div>
          {(recordError || (amountText && amountError)) && <p className="text-red-600 font-bold">{recordError || amountError}</p>}
          <button
            type="button"
            disabled={!!amountError || recording}
            onClick={record}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {recording && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Ghi nhận đã nhận {amount ? formatVND(amount) : ''}
            {amount > 0 && amount < balance ? ' (một phần)' : ''}
          </button>
        </div>
      )}
    </div>
  );
};
