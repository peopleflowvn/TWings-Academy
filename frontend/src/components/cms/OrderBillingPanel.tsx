import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useStaffCan } from '../../lib/lms';
import { api } from '../../lib/api';
import { commerceApi, formatDate, formatVND, installmentPreview, OrderBilling } from '../../lib/commerce';

interface Row { amount: string; dueDate: string }
const digits = (v: string) => Number(v.replace(/\D/g, '')) || 0;
const vn = (n: number) => (n ? new Intl.NumberFormat('vi-VN').format(n) : '');
const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Re-plan a registration's installments for its situation: how many, how much each, when. The total
 * stays what is receivable; money already received counts from the first installment on.
 */
const ScheduleEditor: React.FC<{ data: OrderBilling; orderId: string; onSaved: (b: OrderBilling) => void; onCancel: () => void }> = ({
  data, orderId, onSaved, onCancel
}) => {
  const receivable = data.receivable || data.amount;
  const [rows, setRows] = useState<Row[]>(() =>
    data.installments.length > 1
      ? data.installments.map((i) => ({ amount: vn(i.amount), dueDate: i.dueDate.slice(0, 10) }))
      : [{ amount: vn(receivable), dueDate: isoDay() }]
  );
  const [count, setCount] = useState(Math.max(data.installments.length, 2));
  const [gap, setGap] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = rows.reduce((sum, r) => sum + digits(r.amount), 0);
  let running = 0;
  const covered = rows.map((r) => {
    running += digits(r.amount);
    return data.totalPaid >= running && running > 0;
  });
  const problem =
    rows.some((r) => !digits(r.amount)) ? 'Mỗi kỳ cần số tiền.'
      : rows.some((r) => !r.dueDate) ? 'Mỗi kỳ cần hạn đóng.'
        : rows.some((r, i) => i > 0 && r.dueDate < rows[i - 1].dueDate) ? 'Hạn đóng các kỳ phải theo thứ tự thời gian.'
          : total !== receivable ? `Tổng các kỳ ${formatVND(total)} – cần đúng ${formatVND(receivable)} (${total > receivable ? 'thừa' : 'thiếu'} ${formatVND(Math.abs(total - receivable))}).`
            : data.learningAccess && (rows.length === 1 || digits(rows[0].amount) > data.totalPaid)
              ? `Học viên đã vào học: giữ trả góp, kỳ 1 không lớn hơn số đã đóng (${formatVND(data.totalPaid)}).`
              : '';

  const split = () => {
    const parts = installmentPreview(receivable, count);
    setRows(parts.map((amount, i) => ({ amount: vn(amount), dueDate: isoDay(gap * i) })));
  };
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  // The last installment takes whatever is left, so the total matches in one click.
  const balanceLast = () => {
    const others = rows.slice(0, -1).reduce((sum, r) => sum + digits(r.amount), 0);
    set(rows.length - 1, { amount: vn(Math.max(receivable - others, 0)) });
  };

  const save = async () => {
    if (problem || busy) return;
    const plan = rows.map((r, i) => `Kỳ ${i + 1}: ${formatVND(digits(r.amount))} – hạn ${formatDate(r.dueDate)}`).join('\n');
    if (!window.confirm(`Lưu lịch ${rows.length === 1 ? 'đóng một lần' : `trả góp ${rows.length} kỳ`}?\n\n${plan}\n\nNhắc đóng học phí sẽ theo lịch mới.`)) return;
    setBusy(true);
    setError('');
    try {
      onSaved(await api.put<OrderBilling>(`/staff/orders/${orderId}/installments/`, {
        installments: rows.map((r) => ({ amount: digits(r.amount), dueDate: r.dueDate }))
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được lịch trả góp.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-3 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <span className="font-bold text-slate-800">Chia đều nhanh:</span>
        <label>Số kỳ <input type="number" min={1} max={12} value={count} onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 12))}
          className="w-16 p-1.5 border border-slate-300 rounded-lg bg-white" /></label>
        <label>cách nhau <input type="number" min={1} max={180} value={gap} onChange={(e) => setGap(Math.max(Number(e.target.value) || 1, 1))}
          className="w-16 p-1.5 border border-slate-300 rounded-lg bg-white" /> ngày</label>
        <button type="button" onClick={split} className="px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white font-bold text-[#0073C1] cursor-pointer">Chia</button>
        <span className="text-slate-500">rồi chỉnh từng kỳ bên dưới.</span>
      </div>
      <table className="w-full">
        <thead><tr className="text-left text-slate-500"><th className="py-1 w-10">Kỳ</th><th>Số tiền (đ)</th><th>Hạn đóng</th><th /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-blue-100">
              <td className="py-1.5 font-bold">{i + 1}</td>
              <td className="pr-2">
                <input inputMode="numeric" value={r.amount} onChange={(e) => set(i, { amount: vn(digits(e.target.value)) })}
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold" />
              </td>
              <td className="pr-2">
                <input type="date" value={r.dueDate} onChange={(e) => set(i, { dueDate: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded-lg bg-white" />
              </td>
              <td className="text-right whitespace-nowrap">
                {covered[i] && <span className="text-emerald-700 font-bold mr-1">Đã đủ tiền</span>}
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} title="Xóa kỳ" className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2">
        {rows.length < 12 && (
          <button type="button" onClick={() => setRows([...rows, { amount: '', dueDate: rows[rows.length - 1]?.dueDate || isoDay() }])}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Thêm kỳ</button>
        )}
        {rows.length > 1 && total !== receivable && (
          <button type="button" onClick={balanceLast} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold cursor-pointer">Dồn phần còn lại vào kỳ cuối</button>
        )}
        <span className={`ml-auto font-bold ${total === receivable ? 'text-emerald-700' : 'text-amber-700'}`}>
          Tổng {formatVND(total)} / phải thu {formatVND(receivable)}
        </span>
      </div>
      <p className="text-[11px] text-slate-500">
        Số đã thu ({formatVND(data.totalPaid)}) tính lần lượt từ kỳ 1. Học viên vào học khi đóng đủ kỳ 1 (hoặc đủ học phí nếu đóng một lần). Đổi tổng học phí là việc của kế toán (sửa đơn).
      </p>
      {(problem || error) && <p className="text-red-600 font-bold">{error || problem}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold cursor-pointer">Thôi</button>
        <button type="button" disabled={!!problem || busy} onClick={save} className="px-3 py-1.5 rounded-lg bg-[#0073C1] text-white font-bold cursor-pointer disabled:opacity-50">
          {busy ? 'Đang lưu…' : 'Lưu lịch'}
        </button>
      </div>
    </div>
  );
};

/** "Học phí & hoàn tiền" tab of the order workspace: installments, payments, refunds, program components. */
export const OrderBillingPanel: React.FC<{ orderId: string; onScheduleChanged?: () => void }> = ({ orderId, onScheduleChanged }) => {
  const canRefund = useStaffCan('finance.refund');
  const canRecord = useStaffCan('crm.record_payment');
  const canConfirm = useStaffCan('finance.confirm_manual');
  const canPlan = canRecord || canConfirm;
  const [planning, setPlanning] = useState(false);
  const [data, setData] = useState<OrderBilling | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: 0, reason: '', reference: '', revokeAccess: true });

  const load = useCallback(() => {
    setError('');
    commerceApi
      .billing(orderId)
      .then((b) => {
        setData(b);
        setForm((f) => ({ ...f, amount: b.refundable }));
      })
      .catch((e: Error) => setError(e.message));
  }, [orderId]);
  useEffect(load, [load]);

  const refund = async () => {
    if (!data) return;
    const full = form.amount >= data.refundable;
    const ends = full || form.revokeAccess;
    if (!window.confirm(`Ghi nhận hoàn ${formatVND(form.amount)}?${ends ? ' Đơn sẽ chuyển "Đã hoàn tiền", học viên bị hủy ghi danh LMS và chứng chỉ (nếu có) bị thu hồi.' : ''}`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await commerceApi.refund(orderId, form);
      setData(next);
      setForm({ amount: next.refundable, reason: '', reference: '', revokeAccess: true });
      setNotice('Đã ghi nhận hoàn tiền.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hoàn tiền thất bại');
    } finally {
      setBusy(false);
    }
  };

  const card = 'bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3';
  if (!data) {
    return <div className={card}>{error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500">Đang tải…</p>}</div>;
  }
  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Học phí</h3>
          <button type="button" onClick={load} className="p-1.5 rounded-lg border border-slate-200 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        {data.parentCode && (
          <p className="text-slate-600">Đơn thành phần của chương trình (đơn gốc <strong>{data.parentCode}</strong>): học phí và hoàn tiền xử lý trên đơn gốc.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div><div className="text-slate-500">Trạng thái</div><div className="font-bold">{data.status === 'pending' && data.learningAccess ? 'Đang trả góp' : data.statusLabel}</div></div>
          <div><div className="text-slate-500">Phải thu</div><div className="font-bold">{formatVND(data.amount)}</div></div>
          <div><div className="text-slate-500">Đã thu</div><div className="font-bold text-emerald-700">{formatVND(data.totalPaid)}</div></div>
          <div><div className="text-slate-500">Đã hoàn</div><div className="font-bold">{formatVND(data.refunded)}</div></div>
          <div><div className="text-slate-500">Cần thu ngay</div><div className="font-bold text-amber-700">{formatVND(data.amountDueNow)}</div></div>
        </div>
        <div className={data.learningAccess ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
          {data.learningAccess ? 'Học viên đang được học trên LMS.' : 'Chưa / không còn quyền học trên LMS.'}
        </div>

        {canPlan && !data.parentCode && data.status === 'pending' && !planning && (
          <button type="button" onClick={() => setPlanning(true)}
            className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[#0073C1] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-100">
            <CalendarClock className="w-3.5 h-3.5" /> {data.installments.length > 1 ? 'Sửa lịch trả góp (số kỳ, số tiền, hạn đóng)' : 'Chuyển sang trả góp / đổi hạn đóng'}
          </button>
        )}
        {planning && (
          <ScheduleEditor
            data={data}
            orderId={orderId}
            onCancel={() => setPlanning(false)}
            onSaved={(b) => {
              setData(b);
              setPlanning(false);
              setNotice('Đã lưu lịch trả góp mới.');
              onScheduleChanged?.();
            }}
          />
        )}

        {!planning && data.installments.length > 1 && (
          <table className="w-full">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Kỳ</th><th>Hạn</th><th className="text-right">Số tiền</th><th className="text-right">Tình trạng</th></tr></thead>
            <tbody>
              {data.installments.map((i) => (
                <tr key={i.sequence} className="border-t border-slate-100">
                  <td className="py-1.5">{i.sequence}</td>
                  <td>{formatDate(i.dueDate)}</td>
                  <td className="text-right font-mono">{formatVND(i.amount)}</td>
                  <td className={`text-right font-bold ${i.paidAt ? 'text-emerald-700' : i.overdue ? 'text-red-600' : 'text-slate-500'}`}>
                    {i.paidAt ? `Đã đóng ${formatDate(i.paidAt)}` : i.overdue ? 'Quá hạn' : 'Chưa đến hạn'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(data.components?.length ?? 0) > 0 && (
        <div className={card}>
          <h3 className="font-bold text-sm text-slate-900">Khóa học trong chương trình</h3>
          {data.components!.map((c) => (
            <div key={c.id} className="flex justify-between border-t border-slate-100 pt-2">
              <span>{c.courseTitle}{c.cohort ? ` – ${c.cohort}` : ''}</span>
              <span className="font-mono text-slate-500">{c.orderCode} · {c.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className={card}>
        <h3 className="font-bold text-sm text-slate-900">Lịch sử thu / hoàn</h3>
        {[...(data.payments || []).map((p) => ({ ...p, kind: 'in' as const })), ...(data.refunds || []).map((r) => ({ ...r, kind: 'out' as const }))]
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((row, i) => (
            <div key={i} className="flex justify-between gap-3 border-t border-slate-100 pt-2">
              <span className="text-slate-500 w-24 shrink-0">{formatDate(row.at)}</span>
              <span className="flex-1">
                {row.kind === 'in' ? `Thu – ${'source' in row ? row.source : ''}${'note' in row && row.note ? `: ${row.note}` : ''}` : `Hoàn – ${'reason' in row ? row.reason : ''}${'reference' in row && row.reference ? ` (${row.reference})` : ''}`}
              </span>
              <span className={`font-mono font-bold ${row.kind === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                {row.kind === 'in' ? '+' : '−'}{formatVND(row.amount)}
              </span>
            </div>
          ))}
        {!data.payments?.length && !data.refunds?.length && <p className="text-slate-500">Chưa có giao dịch.</p>}
      </div>

      {canRefund && !data.parentCode && data.refundable > 0 && (
        <div className={card}>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Ghi nhận hoàn tiền</h3>
          <p className="text-slate-500">Chuyển khoản trả học viên trước, sau đó ghi nhận tại đây. Tối đa {formatVND(data.refundable)}.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="number" min={1} max={data.refundable} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="p-2 border border-slate-300 rounded-xl font-mono" placeholder="Số tiền" />
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} maxLength={100}
              className="p-2 border border-slate-300 rounded-xl" placeholder="Mã giao dịch chuyển trả" />
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={300}
              className="p-2 border border-slate-300 rounded-xl" placeholder="Lý do *" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.revokeAccess || form.amount >= data.refundable}
              disabled={form.amount >= data.refundable}
              onChange={(e) => setForm({ ...form, revokeAccess: e.target.checked })} />
            Kết thúc ghi danh (hủy LMS, thu hồi chứng chỉ) – luôn áp dụng khi hoàn toàn bộ
          </label>
          <button type="button" disabled={busy || !form.reason.trim() || form.amount <= 0 || form.amount > data.refundable} onClick={refund}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold cursor-pointer disabled:opacity-50">
            Ghi nhận hoàn tiền
          </button>
        </div>
      )}

      {error && <div className="flex gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3"><AlertTriangle className="w-4 h-4" />{error}</div>}
      {notice && <div className="flex gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3"><CheckCircle2 className="w-4 h-4" />{notice}</div>}
    </div>
  );
};
