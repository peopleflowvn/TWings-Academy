import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, Edit, LayoutGrid, Search, Table as TableIcon, X } from 'lucide-react';
import { AdmissionCampaign, CRMStatus, Order } from '../../types';
import { matchOrderToPosition } from '../../utils/talentCampaigns';
import { navigate } from '../../admin/router';

/** Leads of every campaign ('all'), of none ('none'), or of one campaign (its id). */
export type PipelineScope = 'all' | 'none' | string;

interface LeadPipelineViewProps {
  scope: PipelineScope;
  campaigns: AdmissionCampaign[];
  orders: Order[];
  onChangeScope: (scope: PipelineScope) => void;
  onBack: () => void;
  onUpdateOrderCRM?: (updatedOrder: Order) => void;
  onOpenLeadDetail: (order: Order) => void;
  onOpenEditCampaign: () => void;
}

// The CRM stages of an order (Order.crmStatus). "Đã đóng phí" reflects a recorded payment: it is never
// set by moving a card (payments are recorded in the order detail, with the finance permission).
const STAGES: { id: CRMStatus; label: string; dot: string }[] = [
  { id: '1. Mới', label: 'Mới', dot: 'bg-blue-500' },
  { id: '2. Đã tiếp cận', label: 'Đã tiếp cận', dot: 'bg-indigo-500' },
  { id: '3. Đang tư vấn', label: 'Đang tư vấn', dot: 'bg-amber-500' },
  { id: '4. Hẹn gặp', label: 'Hẹn gặp', dot: 'bg-orange-500' },
  { id: '5. Đã đóng phí', label: 'Đã đóng phí', dot: 'bg-emerald-500' },
  { id: '6. Chăm sóc lại', label: 'Chăm sóc lại', dot: 'bg-slate-400' },
  { id: '7. Đã hủy', label: 'Đã hủy', dot: 'bg-red-400' }
];
const PAID_STAGE: CRMStatus = '5. Đã đóng phí';
const INTEREST = ['Rất cao', 'Cao', 'Trung bình', 'Thấp', 'Đang phân vân'];

const vnd = (n?: number) => `${new Intl.NumberFormat('vi-VN').format(n || 0)} ₫`;
const stageOf = (o: Order): CRMStatus => o.crmStatus || '1. Mới';
const campaignIdOf = (o: Order) => (o as Order & { campaign?: string | null }).campaign || null;

/** An order belongs to a campaign through its campaign link, or the campaign code entered by staff. */
export function inCampaign(o: Order, c: AdmissionCampaign): boolean {
  return campaignIdOf(o) === c.id || (!!c.code && (o.campaignCode || '').toLowerCase() === c.code.toLowerCase());
}

export const LeadPipelineView: React.FC<LeadPipelineViewProps> = ({
  scope,
  campaigns,
  orders,
  onChangeScope,
  onBack,
  onUpdateOrderCRM,
  onOpenLeadDetail,
  onOpenEditCampaign
}) => {
  const campaign = campaigns.find((c) => c.id === scope) || null;
  const [layout, setLayout] = useState<'kanban' | 'table'>(() =>
    new URLSearchParams(window.location.search).get('layout') === 'table' ? 'table' : 'kanban'
  );
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [cohort, setCohort] = useState('all');
  const [stage, setStage] = useState('all');
  const [payment, setPayment] = useState('all');
  const [interest, setInterest] = useState('all');
  const [pic, setPic] = useState('all');
  const [position, setPosition] = useState('all');
  const [notice, setNotice] = useState('');

  const scoped = useMemo(() => {
    if (campaign) return orders.filter((o) => inCampaign(o, campaign));
    if (scope === 'none') return orders.filter((o) => !campaigns.some((c) => inCampaign(o, c)));
    return orders;
  }, [orders, campaigns, campaign, scope]);

  const options = useMemo(() => {
    const uniq = (values: (string | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'vi'));
    return {
      courses: uniq(scoped.map((o) => o.courseTitle)),
      cohorts: uniq(scoped.map((o) => o.batchCohort)),
      pics: uniq(scoped.map((o) => o.pic))
    };
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((o) => {
      if (q) {
        const haystack = [o.customerName, o.customerPhone, o.customerEmail, o.orderCode, o.citizenId, o.university, o.batchCohort]
          .map((v) => (v || '').toLowerCase())
          .join(' ');
        if (!haystack.includes(q)) return false;
      }
      if (course !== 'all' && o.courseTitle !== course) return false;
      if (cohort !== 'all' && (o.batchCohort || '') !== cohort) return false;
      if (stage !== 'all' && stageOf(o) !== stage) return false;
      if (payment === 'paid' && o.status !== 'paid') return false;
      if (payment === 'pending' && o.status === 'paid') return false;
      if (interest !== 'all' && (o.interestLevel || '') !== interest) return false;
      if (pic !== 'all' && (pic === '-' ? !!o.pic : o.pic !== pic)) return false;
      if (position !== 'all' && campaign && matchOrderToPosition(o, campaign.positions || [])?.id !== position) return false;
      return true;
    });
  }, [scoped, search, course, cohort, stage, payment, interest, pic, position, campaign]);

  const anyFilter = [course, cohort, stage, payment, interest, pic, position].some((v) => v !== 'all') || search.trim() !== '';
  const resetFilters = () => {
    setSearch('');
    [setCourse, setCohort, setStage, setPayment, setInterest, setPic, setPosition].forEach((set) => set('all'));
  };

  const switchLayout = (next: 'kanban' | 'table') => {
    setLayout(next);
    const params = new URLSearchParams(window.location.search);
    params.set('layout', next);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const moveStage = (o: Order, next: CRMStatus) => {
    setNotice('');
    if (next === stageOf(o)) return;
    if (next === PAID_STAGE && o.status !== 'paid') {
      setNotice(`"Đã đóng phí" chỉ có sau khi ghi nhận thanh toán. Mở hồ sơ ${o.customerName} để ghi nhận khoản thu (quyền Kế toán).`);
      onOpenLeadDetail(o);
      return;
    }
    if (onUpdateOrderCRM) onUpdateOrderCRM({ ...o, crmStatus: next });
  };

  const exportCsv = () => {
    const cell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Mã đơn', 'Họ tên', 'SĐT', 'Email', 'Khóa học', 'Lớp / đợt', 'Giai đoạn', 'Mức quan tâm', 'Học phí', 'Đã đóng', 'Thanh toán', 'PIC'];
    const rows = filtered.map((o) => [
      o.orderCode, o.customerName, o.customerPhone, o.customerEmail, o.courseTitle, o.batchCohort, stageOf(o),
      o.interestLevel, o.amount, o.totalPaidAmount, o.status === 'paid' ? 'Đã đóng phí' : 'Chưa đóng đủ', o.pic
    ]);
    const blob = new Blob(['﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-${campaign ? campaign.code : scope === 'none' ? 'chua-gan-chien-dich' : 'tat-ca'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const enrolled = scoped.filter((o) => o.status === 'paid').length;
  const select = 'px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white';
  const payBadge = (o: Order) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${o.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
      {o.status === 'paid' ? 'Đã đóng phí' : (o.totalPaidAmount || 0) > 0 ? 'Đóng một phần' : 'Chưa đóng'}
    </span>
  );
  const stageSelect = (o: Order) => (
    <select
      value={stageOf(o)}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => moveStage(o, e.target.value as CRMStatus)}
      className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1 bg-white max-w-[140px]"
      title="Chuyển giai đoạn"
    >
      {STAGES.map((s) => (
        <option key={s.id} value={s.id} disabled={s.id === PAID_STAGE && o.status !== 'paid'}>
          {s.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4 pb-16">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={onBack} title="Danh sách chiến dịch" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <select value={scope} onChange={(e) => onChangeScope(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-white max-w-[360px]">
              <option value="all">Tất cả lead</option>
              <option value="none">Lead chưa gắn chiến dịch</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => navigate('/reports')} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer" title="Phễu chuyển đổi trong Báo cáo">
              <BarChart3 className="w-3.5 h-3.5" /> Phễu & báo cáo
            </button>
            <button type="button" onClick={exportCsv} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Xuất CSV ({filtered.length})
            </button>
            {campaign && (
              <button type="button" onClick={onOpenEditCampaign} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
                <Edit className="w-3.5 h-3.5" /> Cài đặt chiến dịch
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 text-xs">
          <div>
            <div className="text-lg font-black text-slate-900">
              {campaign ? campaign.name : scope === 'none' ? 'Lead chưa gắn chiến dịch' : 'Tất cả lead'}
            </div>
            <div className="text-slate-500">
              {scoped.length} lead · {enrolled} đã đóng phí
              {campaign && campaign.targetHeadcount ? ` · chỉ tiêu ${campaign.targetHeadcount} (${Math.round((100 * enrolled) / campaign.targetHeadcount)}%)` : ''}
              {scope === 'none' && ' · gắn chiến dịch bằng mã chiến dịch trong hồ sơ lead hoặc link UTM'}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['kanban', 'table'] as const).map((l) => (
              <button key={l} type="button" onClick={() => switchLayout(l)} className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${layout === l ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>
                {l === 'kanban' ? <LayoutGrid className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
                {l === 'kanban' ? 'Kanban' : 'Bảng chi tiết'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên, SĐT, email, mã đơn, CCCD, trường, lớp…" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs" />
          </div>
          <select value={course} onChange={(e) => setCourse(e.target.value)} className={select}>
            <option value="all">Mọi khóa học</option>
            {options.courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={cohort} onChange={(e) => setCohort(e.target.value)} className={select}>
            <option value="all">Mọi lớp / đợt</option>
            {options.cohorts.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={select}>
            <option value="all">Mọi giai đoạn</option>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className={select}>
            <option value="all">Mọi trạng thái học phí</option>
            <option value="paid">Đã đóng phí</option>
            <option value="pending">Chưa đóng đủ</option>
          </select>
          <select value={interest} onChange={(e) => setInterest(e.target.value)} className={select}>
            <option value="all">Mọi mức quan tâm</option>
            {INTEREST.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={pic} onChange={(e) => setPic(e.target.value)} className={select}>
            <option value="all">Mọi PIC</option>
            <option value="-">Chưa phân công</option>
            {options.pics.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {campaign && (campaign.positions || []).length > 0 && (
            <select value={position} onChange={(e) => setPosition(e.target.value)} className={select}>
              <option value="all">Mọi vị trí</option>
              {campaign.positions.map((p) => <option key={p.id} value={p.id}>{p.shortName}</option>)}
            </select>
          )}
          {anyFilter && (
            <button type="button" onClick={resetFilters} className="px-2.5 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 flex items-center gap-1 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Bỏ lọc
            </button>
          )}
        </div>
        {orders.length >= 200 && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            Đang hiển thị 200 đơn mới nhất. Số liệu chỉ tiêu đầy đủ ở Lớp & đợt khai giảng và Báo cáo.
          </p>
        )}
        {notice && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{notice}</p>}
      </div>

      {layout === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-3 min-w-[1400px]">
            {STAGES.map((s) => {
              const deals = filtered.filter((o) => stageOf(o) === s.id);
              return (
                <div key={s.id} className="w-[200px] shrink-0 bg-slate-100/80 rounded-2xl p-2.5 border border-slate-200 space-y-2 max-h-[78vh] flex flex-col">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-white px-1.5 rounded-full border border-slate-200">{deals.length}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 px-1">{vnd(deals.reduce((sum, d) => sum + (d.amount || 0), 0))}</div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                    {deals.length === 0 && <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-xl">Trống</div>}
                    {deals.map((o) => (
                      <div key={o.id} onClick={() => onOpenLeadDetail(o)} className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer space-y-1.5">
                        <div className="text-xs font-bold text-slate-900 leading-snug">{o.customerName}</div>
                        <div className="text-[10px] text-slate-500 truncate" title={o.courseTitle}>{o.courseTitle}</div>
                        {o.batchCohort && <div className="text-[10px] text-slate-500 truncate">Lớp: {o.batchCohort}</div>}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-slate-700">{vnd(o.amount)}</span>
                          {payBadge(o)}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
                          <span className="truncate">{o.pic || 'Chưa có PIC'}</span>
                          {o.interestLevel && <span className="shrink-0">{o.interestLevel}</span>}
                        </div>
                        {stageSelect(o)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {layout === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500 bg-slate-50">
              <tr>
                <th className="px-3 py-2">Mã & ứng viên</th>
                <th className="px-3 py-2">Liên hệ</th>
                <th className="px-3 py-2">Khóa học</th>
                <th className="px-3 py-2">Lớp / đợt</th>
                <th className="px-3 py-2">Giai đoạn</th>
                <th className="px-3 py-2">Quan tâm</th>
                <th className="px-3 py-2 text-right">Học phí</th>
                <th className="px-3 py-2">Thanh toán</th>
                <th className="px-3 py-2">PIC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => onOpenLeadDetail(o)} className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer align-top">
                  <td className="px-3 py-2">
                    <div className="font-bold text-slate-900">{o.customerName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{o.orderCode}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <div>{o.customerPhone}</div>
                    <div className="text-[10px]">{o.customerEmail}</div>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">{o.courseTitle}</td>
                  <td className="px-3 py-2">{o.batchCohort || <span className="text-slate-300">–</span>}</td>
                  <td className="px-3 py-2">{stageSelect(o)}</td>
                  <td className="px-3 py-2">{o.interestLevel || <span className="text-slate-300">–</span>}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {vnd(o.amount)}
                    {(o.totalPaidAmount || 0) > 0 && o.status !== 'paid' && <div className="text-[10px] text-slate-500">đã đóng {vnd(o.totalPaidAmount)}</div>}
                  </td>
                  <td className="px-3 py-2">{payBadge(o)}</td>
                  <td className="px-3 py-2">{o.pic || <span className="text-slate-400">Chưa có</span>}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-500">Không có lead phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
