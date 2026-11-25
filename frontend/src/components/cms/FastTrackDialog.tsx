import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, X } from 'lucide-react';
import { api } from '../../lib/api';
import { commerceApi, formatVND, OrderBilling } from '../../lib/commerce';
import { ONBOARD, PAID, PART_PAID } from '../../lib/stages';
import type { ManualPaymentMethod } from '../../admin/data';

/** The stages the super admin may jump to at once; the tuition received is the checkpoint. */
export const FAST_TRACK_STAGES: string[] = [PAID, PART_PAID, ONBOARD];

const METHODS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản (chưa tự khớp)' },
  { value: 'card', label: 'Quẹt thẻ / POS' },
  { value: 'other', label: 'Khác' }
];

const digits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const vnNumber = (n: number) => (n ? new Intl.NumberFormat('vi-VN').format(n) : '');

interface Props {
  orderId: string;
  stage: string;
  stageName: (code: string) => string;
  currentStageName: string;
  onClose: () => void;
  /** The server took the registration to the stage (payment recorded). */
  onDone: () => void;
}

/**
 * Super admin: several stages at once (to "Đã đóng phí", "Đã đóng 1 phần" or "Onboard"). Nothing else is asked
 * but the money: the tuition received, typed twice, recorded as a payment that must fit the stage.
 */
export const FastTrackDialog: React.FC<Props> = ({ orderId, stage, stageName, currentStageName, onClose, onDone }) => {
  const [billing, setBilling] = useState<OrderBilling | null>(null);
  const [amountText, setAmountText] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [method, setMethod] = useState<ManualPaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    commerceApi.billing(orderId).then(setBilling).catch((e: Error) => setError(e.message));
  }, [orderId]);

  const balance = Math.max(billing?.balance ?? 0, 0);
  const first = billing && billing.installmentCount > 1 ? billing.installments[0] : null;
  const opening = billing?.learningAccess ? 0 : first ? Math.max(first.amount - billing!.totalPaid, 0) : balance;
  const amount = digits(amountText);
  const confirmAmount = digits(confirmText);

  const problem = (() => {
    if (!billing) return '';
    if (balance <= 0) return 'Đơn đã đóng đủ học phí: chuyển giai đoạn bình thường.';
    if (!amount) return 'Nhập số tiền học phí đã nhận.';
    if (amount > balance) return `Tối đa ${formatVND(balance)} (số còn phải đóng).`;
    if (stage === PAID && amount !== balance) return `"Đã đóng phí" là đóng đủ: số tiền phải đúng ${formatVND(balance)}.`;
    if (stage === PART_PAID && amount >= balance) return 'Số tiền bằng số còn phải đóng: chọn "Đã đóng phí".';
    if (amount < opening) return `Chưa đủ để vào học: tối thiểu ${formatVND(opening)}${first ? ' (đợt 1)' : ' (đơn không trả góp: đóng đủ)'}.`;
    if (confirmAmount !== amount) return 'Nhập lại số tiền cho khớp.';
    if (!note.trim()) return 'Ghi lý do / số phiếu thu.';
    return '';
  })();

  const submit = async () => {
    if (problem || busy) return;
    if (!window.confirm(`Chuyển thẳng ${currentStageName} → ${stageName(stage)} và ghi nhận ${formatVND(amount)} học phí?\nHọc viên sẽ nhận email biên nhận.`)) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/staff/orders/${orderId}/fast-track/`, { stage, amount, amountConfirm: confirmAmount, method, note: note.trim() });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không chuyển được.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full p-2.5 border border-slate-300 rounded-xl bg-white';
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 text-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" /> Chuyển nhanh: {currentStageName} → {stageName(stage)}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-600">
          Quyền Quản trị tối cao: bỏ qua các bước trung gian. Chốt chặn duy nhất là học phí: nhập số tiền đã nhận hai lần, hệ thống ghi khoản thu
          (vào nhật ký kiểm toán, gửi biên nhận) và chỉ chuyển khi số tiền đúng với giai đoạn.
        </p>
        {!billing ? (
          error ? <p className="text-red-600 font-bold">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-3">
              <div><div className="text-slate-500 text-xs">Phải thu</div><div className="font-mono font-bold">{formatVND(billing.receivable || billing.amount)}</div></div>
              <div><div className="text-slate-500 text-xs">Đã đóng</div><div className="font-mono font-bold text-emerald-700">{formatVND(billing.totalPaid)}</div></div>
              <div><div className="text-slate-500 text-xs">Còn phải đóng</div><div className="font-mono font-bold text-amber-700">{formatVND(balance)}</div></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="font-bold text-slate-700 block mb-1">Số tiền đã nhận (đ)</span>
                <input inputMode="numeric" autoFocus value={amountText} onChange={(e) => setAmountText(vnNumber(digits(e.target.value)))} className={`${input} font-mono font-bold`} />
              </label>
              <label className="block">
                <span className="font-bold text-slate-700 block mb-1">Nhập lại số tiền</span>
                <input
                  inputMode="numeric"
                  value={confirmText}
                  onPaste={(e) => e.preventDefault()}
                  onChange={(e) => setConfirmText(vnNumber(digits(e.target.value)))}
                  className={`${input} font-mono font-bold ${confirmText && confirmAmount !== amount ? 'border-red-400' : ''}`}
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-700 block mb-1">Hình thức</span>
                <select value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)} className={input}>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-bold text-slate-700 block mb-1">Lý do / số phiếu thu (bắt buộc)</span>
                <input value={note} maxLength={250} onChange={(e) => setNote(e.target.value)} placeholder="VD: PT-0123, đóng tại văn phòng" className={input} />
              </label>
            </div>
            {stage === PAID && balance > 0 && (
              <button type="button" onClick={() => setAmountText(vnNumber(balance))} className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 cursor-pointer">
                Đóng đủ: {formatVND(balance)}
              </button>
            )}
            {(error || ((amountText || confirmText) && problem)) && <p className="text-red-600 font-bold">{error || problem}</p>}
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 cursor-pointer">
            Thôi
          </button>
          <button
            type="button"
            disabled={!billing || !!problem || busy}
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Ghi nhận {amount ? formatVND(amount) : ''} và chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
