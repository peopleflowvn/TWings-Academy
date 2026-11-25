import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, Wallet, X } from 'lucide-react';
import { api } from '../../lib/api';
import { commerceApi, formatVND, OrderBilling } from '../../lib/commerce';
import { useIsSuperAdmin, useStaffCan } from '../../lib/lms';
import { ONBOARD, PAID, PART_PAID } from '../../lib/stages';
import type { ManualPayment, ManualPaymentMethod } from '../../admin/data';

/** The stages that follow the money: clicking one first asks for the tuition received. */
export const PAY_FIRST_STAGES: string[] = [PAID, PART_PAID, ONBOARD];

interface Props {
  orderId: string;
  /** Record money received by hand (the server checks the amount; throws its reason when refused). */
  onConfirmReceived: (payment: ManualPayment) => Promise<unknown>;
  /** The stage the user clicked: the tuition must be recorded first (a warning, the amount box focused). */
  targetStage?: string | null;
  targetName?: string;
  onDismissTarget?: () => void;
  /** Super admin: the tuition was recorded and the registration taken straight to the target stage. */
  onFastTracked?: () => void;
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
export const LeadPaymentPanel: React.FC<Props> = ({ orderId, onConfirmReceived, targetStage, targetName = '', onDismissTarget, onFastTracked }) => {
  const canRecord = useStaffCan('crm.record_payment');
  const canConfirm = useStaffCan('finance.confirm_manual');
  // Super admin skips the stages in between; the amount (typed twice) and a reason stay the checkpoint.
  const fast = useIsSuperAdmin() && !!targetStage && PAY_FIRST_STAGES.includes(targetStage);
  const boxRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [confirmText, setConfirmText] = useState('');
  const [tuitionText, setTuitionText] = useState('');
  const tuitionRef = useRef<HTMLInputElement>(null);
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
        const due = targetStage === PAID ? b.balance : Math.min(Math.max(b.amountDueNow, 0), b.balance) || b.balance;
        setAmountText(due ? vnNumber(due) : '');
      })
      .catch((e: Error) => setError(e.message));
  }, [orderId, targetStage]);

  // Taken here by a stage click: straight to the amount box.
  useEffect(() => {
    if (!targetStage || !billing) return;
    boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = tuitionRef.current ?? amountRef.current; // no price yet: the tuition first
    input?.focus();
    input?.select();
  }, [targetStage, billing]);

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
  // A registration without a price (course without one, imported lead): the tuition is entered here first.
  const noPrice = !billing.receivable && !billing.amount && !billing.totalPaid;
  const tuition = digits(tuitionText);
  const balance = noPrice ? tuition : Math.max(billing.balance ?? 0, 0);
  // The super admin's fast track also reopens a cancelled registration.
  const open = billing.status === 'pending' || billing.status === 'paid' || (fast && billing.status === 'cancelled');
  const first = billing.installmentCount > 1 ? billing.installments[0] : null;
  // What must still be paid to study: the first installment, or (no installments) the whole balance.
  const opening = billing.learningAccess ? 0 : first ? Math.max(first.amount - billing.totalPaid, 0) : balance;
  const short = `${formatVND(opening)}${first ? ' (đợt 1)' : ' (đơn không trả góp: phải đóng đủ)'}`;
  // How far this amount gets toward the clicked stage.
  const stageGap =
    !targetStage || !amount || amount > balance
      ? ''
      : targetStage === PAID && amount !== balance
        ? `"${targetName}" là đóng đủ: số tiền phải đúng ${formatVND(balance)}.`
        : targetStage === PART_PAID && amount >= balance
          ? 'Số tiền bằng số còn phải đóng: giai đoạn sẽ là "Đã đóng phí".'
          : amount < opening
            ? `Chưa đủ để vào học: tối thiểu ${short}.`
            : '';
  const amountError = noPrice && !tuition
    ? 'Nhập học phí phải thu (đăng ký chưa có học phí).'
    : !amount
    ? 'Nhập số tiền đã nhận.'
    : amount > balance
      ? `Tối đa ${formatVND(balance)} (số còn phải đóng).`
      : fast && stageGap
        ? stageGap
        : fast && digits(confirmText) !== amount
          ? 'Nhập lại số tiền cho khớp.'
          : fast && !note.trim()
            ? 'Ghi lý do / số phiếu thu (bắt buộc khi chuyển nhanh).'
            : '';
  const fastTrack = async () => {
    if (amountError || recording || !targetStage) return;
    const priced = noPrice ? `Học phí phải thu: ${formatVND(tuition)}.\n` : '';
    if (!window.confirm(`${priced}Ghi nhận ${formatVND(amount)} học phí và chuyển thẳng sang "${targetName}"?\nHọc viên sẽ nhận email biên nhận.`)) return;
    setRecording(true);
    setRecordError('');
    try {
      await api.post(`/staff/orders/${orderId}/fast-track/`, {
        stage: targetStage,
        amount,
        amountConfirm: digits(confirmText),
        tuition: noPrice ? tuition : null,
        method,
        note: note.trim()
      });
      onFastTracked?.();
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : 'Không chuyển được.');
    } finally {
      setRecording(false);
    }
  };
  const record = async () => {
    if (fast) return fastTrack();
    if (amountError || recording) return;
    const part = amount < balance ? ` (đóng một phần, còn lại ${formatVND(balance - amount)})` : ' (đóng đủ)';
    const priced = noPrice ? `Học phí phải thu: ${formatVND(tuition)}.\n` : '';
    if (!window.confirm(`${priced}Ghi nhận đã nhận ${formatVND(amount)}${part} cho đơn ${billing.orderCode}?\nHọc viên sẽ nhận email biên nhận.`)) return;
    setRecording(true);
    setRecordError('');
    try {
      await onConfirmReceived({ amount, method, note: note.trim(), tuition: noPrice ? tuition : null });
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

      {targetStage && !((canRecord || canConfirm || fast) && open && (balance > 0 || noPrice)) && (
        <div ref={boxRef} className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            Chưa chuyển được sang <b>"{targetName}"</b>: phải ghi nhận học phí trước.{' '}
            {!open
              ? 'Đơn đã hủy / hoàn tiền: không ghi nhận thêm học phí.'
              : noPrice
                ? 'Đăng ký chưa có học phí, và bạn không có quyền ghi nhận: nhờ kế toán hoặc tư vấn viên phụ trách nhập học phí và khoản đã thu.'
                : balance <= 0
                  ? 'Đơn đã đóng đủ học phí.'
                  : open
                ? 'Bạn không có quyền ghi nhận học phí: nhờ kế toán hoặc tư vấn viên phụ trách ghi nhận khoản đã thu.'
                : 'Đơn đã hủy / hoàn tiền: không ghi nhận thêm học phí.'}
          </div>
          {onDismissTarget && (
            <button type="button" onClick={onDismissTarget} className="p-0.5 cursor-pointer" aria-label="Bỏ qua"><X className="w-4 h-4" /></button>
          )}
        </div>
      )}

      {(canRecord || canConfirm || fast) && open && (balance > 0 || noPrice) && (
        <div ref={boxRef} className={`bg-amber-50 rounded-2xl p-4 space-y-3 ${targetStage ? 'border-2 border-red-400 ring-4 ring-red-100' : 'border border-amber-200'}`}>
          {targetStage && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="font-bold">Phải ghi nhận học phí trước khi chuyển sang "{targetName}".</div>
                {fast ? (
                  <div>
                    Quyền Quản trị tối cao được bỏ qua các bước trung gian, nhưng học phí là chốt chặn: nhập số tiền đã nhận <b>2 lần</b> và
                    lý do / số phiếu thu. Hệ thống ghi khoản thu (nhật ký kiểm toán, email biên nhận) rồi chuyển thẳng sang "{targetName}" chỉ khi
                    số tiền đúng với giai đoạn.
                  </div>
                ) : (
                  <div>
                    Giai đoạn tự chuyển khi khoản thu đủ điều kiện: đóng đủ → "Đã đóng phí"; trả góp đủ đợt 1 → "Đã đóng 1 phần".
                    {targetStage === ONBOARD && ' Sau đó mới chuyển được "Onboard".'} Cần tối thiểu {short} để vào học.
                  </div>
                )}
              </div>
              {onDismissTarget && (
                <button type="button" onClick={onDismissTarget} className="p-0.5 cursor-pointer" aria-label="Bỏ qua"><X className="w-4 h-4" /></button>
              )}
            </div>
          )}
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <Wallet className="w-4 h-4" /> {fast ? `Ghi nhận học phí & chuyển thẳng sang "${targetName}"` : 'Ghi nhận học phí đã nhận (thủ công)'}
          </div>
          <p className="text-amber-900">
            Dùng khi học viên đóng tiền mặt, quẹt thẻ, hoặc chuyển khoản nhưng hệ thống không tự ghi nhận (sai nội dung). Được ghi một
            phần (ví dụ đặt cọc), tối đa {formatVND(balance)}. Khoản thu ghi tên người nhập, vào nhật ký kiểm toán và học viên nhận email biên nhận.
          </p>
          {noPrice && (
            <label className="block bg-white border-2 border-amber-300 rounded-xl p-3">
              <span className="font-bold text-slate-800 block mb-1">Học phí phải thu (đ) – đăng ký này chưa có học phí</span>
              <input
                ref={tuitionRef}
                inputMode="numeric"
                value={tuitionText}
                onChange={(e) => {
                  const n = digits(e.target.value);
                  setTuitionText(n ? vnNumber(n) : '');
                  if (targetStage === PAID || !amountText) setAmountText(n ? vnNumber(n) : '');
                }}
                placeholder="VD: 8.000.000"
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold"
              />
              <span className="text-slate-500 block mt-1">Lưu vào hồ sơ cùng khoản thu (nhật ký kiểm toán). Đã có học phí thì chỉ kế toán sửa trong hồ sơ.</span>
            </label>
          )}
          <div className={`grid grid-cols-1 gap-2 ${fast ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Số tiền đã nhận (đ)</span>
              <input
                ref={amountRef}
                inputMode="numeric"
                value={amountText}
                onChange={(e) => {
                  const n = digits(e.target.value);
                  setAmountText(n ? vnNumber(n) : '');
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold"
              />
            </label>
            {fast && (
              <label className="block">
                <span className="font-bold text-slate-700 block mb-1">Nhập lại số tiền</span>
                <input
                  inputMode="numeric"
                  value={confirmText}
                  onPaste={(e) => e.preventDefault()}
                  onChange={(e) => {
                    const n = digits(e.target.value);
                    setConfirmText(n ? vnNumber(n) : '');
                  }}
                  className={`w-full p-2.5 border rounded-xl bg-white font-mono font-bold ${confirmText && digits(confirmText) !== amount ? 'border-red-400' : 'border-slate-300'}`}
                />
              </label>
            )}
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">Hình thức</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)} className="w-full p-2.5 border border-slate-300 rounded-xl bg-white">
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold text-slate-700 block mb-1">{fast ? 'Lý do / số phiếu thu (bắt buộc)' : 'Ghi chú / số phiếu thu'}</span>
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
          {!fast && !amountError && stageGap && (
            <p className="text-amber-800 font-bold">Lưu ý: {stageGap} Vẫn ghi nhận được, nhưng giai đoạn chưa chuyển sang "{targetName}".</p>
          )}
          <button
            type="button"
            disabled={!!amountError || recording}
            onClick={record}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {recording && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {fast ? `Ghi nhận ${amount ? formatVND(amount) : ''} & chuyển sang "${targetName}"` : `Ghi nhận đã nhận ${amount ? formatVND(amount) : ''}`}
            {!fast && amount > 0 && amount < balance ? ' (một phần)' : ''}
          </button>
        </div>
      )}
    </div>
  );
};
