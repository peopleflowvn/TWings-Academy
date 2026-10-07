import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api, Paginated } from '../../lib/api';
import { CollectionOptions, isoToViDate, useServerCollection, viDateToIso } from '../../lib/serverCollection';

const vnd = (n: number | null | undefined) => (n || n === 0 ? `${Number(n).toLocaleString('vi-VN')}đ` : '–');

// ---------------------------------------------------------------- bank transactions (read-only)
interface BankTransaction {
  id: string;
  gateway: string;
  accountNumber: string;
  transferType: string;
  amount: number;
  content: string;
  referenceCode: string;
  transactionDate: string;
  orderCode: string;
  matchStatus: 'matched' | 'unmatched' | 'ignored';
  matchNote: string;
}

const MATCH_STYLE = {
  matched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unmatched: 'bg-red-50 text-red-700 border-red-200',
  ignored: 'bg-slate-50 text-slate-500 border-slate-200'
};
const MATCH_LABEL = { matched: 'Đã khớp', unmatched: 'Chưa khớp', ignored: 'Bỏ qua' };

/** Incoming transfers reported by the bank webhook and how they were matched to orders. */
export const TransactionsPage: React.FC = () => {
  const [rows, setRows] = useState<BankTransaction[] | null>(null);
  const [filter, setFilter] = useState<'' | 'unmatched' | 'matched' | 'ignored'>(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    return s && ['unmatched', 'matched', 'ignored'].includes(s) ? (s as any) : '';
  });
  const [error, setError] = useState('');

  const handleFilterChange = (k: '' | 'unmatched' | 'matched' | 'ignored') => {
    setFilter(k);
    const params = new URLSearchParams(window.location.search);
    if (k) params.set('status', k);
    else params.delete('status');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  useEffect(() => {
    const sync = () => {
      const s = new URLSearchParams(window.location.search).get('status');
      setFilter(s && ['unmatched', 'matched', 'ignored'].includes(s) ? (s as any) : '');
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const load = () => {
    setError('');
    api
      .get<Paginated<BankTransaction>>(`/staff/transactions/?pageSize=200${filter ? `&match_status=${filter}` : ''}`)
      .then((res) => setRows(res.results))
      .catch((e: Error) => setError(e.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900">Giao dịch ngân hàng & đối soát</h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Giao dịch tiền vào do ngân hàng báo về (webhook). Hệ thống tự khớp theo mã đơn trong nội dung chuyển khoản; giao
            dịch “Chưa khớp” cần Kế toán xác nhận thủ công trên đơn hàng.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          {(['', 'unmatched', 'matched', 'ignored'] as const).map((k) => (
            <button key={k || 'all'} type="button" onClick={() => handleFilterChange(k)}
              className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer ${filter === k ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {k ? MATCH_LABEL[k] : 'Tất cả'}
            </button>
          ))}
          <button type="button" onClick={load} className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Nội dung chuyển khoản</th>
              <th className="p-3 text-right">Số tiền</th>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="p-3 font-mono whitespace-nowrap">{r.transactionDate}</td>
                <td className="p-3">
                  <div className="text-slate-900">{r.content}</div>
                  <div className="text-[10px] text-slate-400">{r.gateway} · {r.referenceCode}</div>
                </td>
                <td className={`p-3 text-right font-mono font-bold ${r.transferType === 'in' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {r.transferType === 'in' ? '+' : '−'}{vnd(r.amount)}
                </td>
                <td className="p-3 font-mono">{r.orderCode || '–'}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full border font-bold ${MATCH_STYLE[r.matchStatus]}`}>{MATCH_LABEL[r.matchStatus]}</span>
                  {r.matchNote && <div className="text-[10px] text-slate-500 mt-1">{r.matchNote}</div>}
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Chưa có giao dịch.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- coupons & scholarships
interface Coupon {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  validUntil: string;
  maxUsage: number | null;
  usageCount: number;
  isActive: boolean;
}

const COUPONS: CollectionOptions<Coupon> = {
  endpoint: '/staff/coupons/',
  debounceMs: 1000,
  fromServer: (d) => ({
    id: d.id,
    code: d.code,
    description: d.description || '',
    discountPercent: d.discountPercent,
    maxDiscountAmount: d.maxDiscountAmount,
    minOrderAmount: d.minOrderAmount || 0,
    validUntil: isoToViDate(d.validUntil),
    maxUsage: d.maxUsage,
    usageCount: d.usageCount || 0,
    isActive: d.isActive
  }),
  toServer: (c) => ({
    code: c.code.trim().toUpperCase(),
    description: c.description,
    discountPercent: Math.min(100, Math.max(0, Number(c.discountPercent) || 0)),
    maxDiscountAmount: c.maxDiscountAmount || null,
    minOrderAmount: c.minOrderAmount || 0,
    validUntil: viDateToIso(c.validUntil),
    maxUsage: c.maxUsage || null,
    isActive: c.isActive
  })
};

/** Discount codes / scholarships applied at checkout (validated and priced on the server). */
export const CouponsPage: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const { items, update } = useServerCollection<Coupon>(COUPONS, []);
  const set = (id: string, patch: Partial<Coupon>) => update(items.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const input = 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs disabled:bg-slate-50';

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900">Mã giảm giá & học bổng</h1>
          <p className="text-xs text-slate-500">
            Học viên nhập mã khi thanh toán; số tiền giảm luôn do máy chủ tính. Thay đổi được lưu tự động.
          </p>
        </div>
        {canEdit && (
          <button type="button"
            onClick={() => update([{ id: `new-${Date.now()}`, code: `MA${Date.now() % 10000}`, description: '', discountPercent: 10, maxDiscountAmount: null, minOrderAmount: 0, validUntil: '', maxUsage: null, usageCount: 0, isActive: false }, ...items])}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0073C1] text-white flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Thêm mã
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-3">Mã</th><th className="p-3">Mô tả</th><th className="p-3">Giảm %</th>
              <th className="p-3">Giảm tối đa (đ)</th><th className="p-3">Hạn (dd/mm/yyyy)</th>
              <th className="p-3">Đã dùng / tối đa</th><th className="p-3">Bật</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-2 w-32"><input className={`${input} font-mono font-bold`} disabled={!canEdit} value={c.code} onChange={(e) => set(c.id, { code: e.target.value })} /></td>
                <td className="p-2"><input className={input} disabled={!canEdit} value={c.description} onChange={(e) => set(c.id, { description: e.target.value })} /></td>
                <td className="p-2 w-20"><input className={input} disabled={!canEdit} type="number" min={0} max={100} value={c.discountPercent} onChange={(e) => set(c.id, { discountPercent: Number(e.target.value) })} /></td>
                <td className="p-2 w-32"><input className={input} disabled={!canEdit} type="number" min={0} value={c.maxDiscountAmount ?? ''} onChange={(e) => set(c.id, { maxDiscountAmount: e.target.value ? Number(e.target.value) : null })} /></td>
                <td className="p-2 w-32"><input className={input} disabled={!canEdit} placeholder="31/12/2026" value={c.validUntil} onChange={(e) => set(c.id, { validUntil: e.target.value })} /></td>
                <td className="p-2 w-36 flex items-center gap-1">
                  <span className="font-mono">{c.usageCount} /</span>
                  <input className={input} disabled={!canEdit} type="number" min={0} placeholder="∞" value={c.maxUsage ?? ''} onChange={(e) => set(c.id, { maxUsage: e.target.value ? Number(e.target.value) : null })} />
                </td>
                <td className="p-2"><input type="checkbox" disabled={!canEdit} checked={c.isActive} onChange={(e) => set(c.id, { isActive: e.target.checked })} /></td>
                <td className="p-2">
                  {canEdit && (
                    <button type="button" className="text-red-500 hover:text-red-700 cursor-pointer" title="Xóa mã"
                      onClick={() => window.confirm(`Xóa mã ${c.code}?`) && update(items.filter((x) => x.id !== c.id))}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">Chưa có mã giảm giá.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
