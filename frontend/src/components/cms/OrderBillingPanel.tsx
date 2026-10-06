import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, RotateCcw } from 'lucide-react';
import { useStaffCan } from '../../lib/lms';
import { commerceApi, formatDate, formatVND, OrderBilling } from '../../lib/commerce';

/** "Học phí & hoàn tiền" tab of the order workspace: installments, payments, refunds, program components. */
export const OrderBillingPanel: React.FC<{ orderId: string }> = ({ orderId }) => {
  const canRefund = useStaffCan('finance.refund');
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

        {data.installments.length > 1 && (
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
