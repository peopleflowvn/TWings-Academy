import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Download, Edit, LayoutGrid, Loader2, Plus, Search, Table as TableIcon, X } from 'lucide-react';
import { AdmissionCampaign, CRMStatus, Course, Order } from '../../types';
import { api, API_ROOT, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { navigate } from '../../admin/router';

/** Leads of every campaign ('all'), of none ('none'), or of one campaign (its id). */
export type PipelineScope = 'all' | 'none' | string;

interface LeadPipelineViewProps {
  scope: PipelineScope;
  campaigns: AdmissionCampaign[];
  courses: Course[];
  /** Changes whenever a lead was saved elsewhere (lead workspace): the pipeline reloads. */
  refreshKey: number;
  onChangeScope: (scope: PipelineScope) => void;
  onBack: () => void;
  onOpenLeadDetail: (order: Order) => void;
  onOpenEditCampaign: () => void;
}

// The CRM stages of an order (Order.crmStatus). "Đã đóng phí" reflects a recorded payment: it is never
// set by moving a card (payments are recorded in the lead workspace, with the finance permission).
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
const SOURCES = ['Nhập tay', 'Hotline', 'Facebook', 'Zalo', 'TikTok', 'Giới thiệu', 'Hội thảo trường ĐH', 'Sự kiện'];
const KANBAN_LIMIT = 200;
const PAGE_SIZE = 50;

interface Summary {
  stages: { stage: CRMStatus; count: number; amount: number }[];
  total: number;
  paid: number;
}
interface Consultant { id: string; name: string }
interface CohortOption { id: string; name: string; course: string }

const vnd = (n?: number) => `${new Intl.NumberFormat('vi-VN').format(n || 0)} ₫`;
const stageOf = (o: Order): CRMStatus => o.crmStatus || '1. Mới';
const hhmm = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** First-response commitment of a new lead: late, due, or done. */
function responseState(o: Order): 'late' | 'due' | null {
  if (o.firstResponseAt || !o.responseDueAt || o.status !== 'pending' || stageOf(o) === '7. Đã hủy') return null;
  return new Date(o.responseDueAt).getTime() < Date.now() ? 'late' : 'due';
}

/** An order belongs to a campaign through its campaign link, or the campaign code entered by staff. */
export function inCampaign(o: Order, c: AdmissionCampaign): boolean {
  return o.campaign === c.id || (!!c.code && (o.campaignCode || '').toLowerCase() === c.code.toLowerCase());
}

export const LeadPipelineView: React.FC<LeadPipelineViewProps> = ({
  scope,
  campaigns,
  courses,
  refreshKey,
  onChangeScope,
  onBack,
  onOpenLeadDetail,
  onOpenEditCampaign
}) => {
  const canEdit = useStaffCan('crm.edit_status');
  const canExport = useStaffCan('crm.export_excel');
  const campaign = campaigns.find((c) => c.id === scope) || null;
  const [layout, setLayout] = useState<'kanban' | 'table'>(() =>
    new URLSearchParams(window.location.search).get('layout') === 'table' ? 'table' : 'kanban'
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [cohort, setCohort] = useState('');
  const [stage, setStage] = useState('');
  const [payment, setPayment] = useState('');
  const [interest, setInterest] = useState('');
  const [assignee, setAssignee] = useState(''); // '' | 'mine' | 'none' | <user id>
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState<CRMStatus | null>(null);
  const request = useRef(0); // only the latest request may update the screen

  useEffect(() => {
    api.get<Consultant[]>('/staff/consultants/').then(setConsultants).catch(() => setConsultants([]));
    api
      .get<Paginated<CohortOption>>('/staff/cohorts/?pageSize=200')
      .then((res) => setCohorts(res.results))
      .catch(() => setCohorts([]));
  }, []);

  // Search waits for the user to stop typing.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // The filters, as the API takes them (filtering and counting happen on the server, over every lead).
  const filters = useMemo(() => {
    const params = new URLSearchParams();
    if (scope !== 'all') params.set('scope', scope);
    if (query) params.set('search', query);
    if (course) params.set('course', course);
    if (cohort) params.set('cohort', cohort);
    if (stage) params.set('crm_status', stage);
    if (payment) params.set('paid', payment);
    if (interest) params.set('interest_level', interest);
    if (assignee === 'mine') params.set('mine', '1');
    else if (assignee === 'none') params.set('unassigned', '1');
    else if (assignee) params.set('assigned_to', assignee);
    if (overdue) params.set('overdue', '1');
    return params.toString();
  }, [scope, query, course, cohort, stage, payment, interest, assignee, overdue]);

  useEffect(() => setPage(1), [filters, layout]);

  const load = useCallback(async () => {
    const seq = ++request.current;
    setLoading(true);
    setError('');
    const size = layout === 'kanban' ? KANBAN_LIMIT : PAGE_SIZE;
    const qs = `${filters}${filters ? '&' : ''}ordering=-created_at&pageSize=${size}&page=${layout === 'kanban' ? 1 : page}`;
    try {
      const [list, sum] = await Promise.all([
        api.get<Paginated<Order>>(`/staff/orders/?${qs}`),
        api.get<Summary>(`/staff/orders/pipeline/?${filters}`)
      ]);
      if (seq !== request.current) return;
      setRows(list.results);
      setCount(list.count);
      setSummary(sum);
    } catch (err) {
      if (seq === request.current) setError(err instanceof Error ? err.message : 'Không tải được danh sách lead.');
    } finally {
      if (seq === request.current) setLoading(false);
    }
  }, [filters, layout, page]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const anyFilter = [course, cohort, stage, payment, interest, assignee].some((v) => v !== '') || overdue || search.trim() !== '';
  const resetFilters = () => {
    setSearch('');
    [setCourse, setCohort, setStage, setPayment, setInterest, setAssignee].forEach((set) => set(''));
    setOverdue(false);
  };

  const switchLayout = (next: 'kanban' | 'table') => {
    setLayout(next);
    const params = new URLSearchParams(window.location.search);
    params.set('layout', next);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const moveStage = async (o: Order, next: CRMStatus) => {
    setNotice('');
    if (next === stageOf(o)) return;
    if (next === PAID_STAGE && o.status !== 'paid') {
      setNotice(`"Đã đóng phí" chỉ có sau khi ghi nhận thanh toán. Mở hồ sơ ${o.customerName} để xem hướng dẫn thanh toán.`);
      onOpenLeadDetail(o);
      return;
    }
    setRows((list) => list.map((r) => (r.id === o.id ? { ...r, crmStatus: next } : r)));
    try {
      await api.patch(`/staff/orders/${o.id}/`, { crmStatus: next });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không đổi được giai đoạn.');
    }
    load();
  };

  const exportUrl = `${API_ROOT}/staff/orders/export/?${filters}`;
  const stageCount = (id: CRMStatus) => summary?.stages.find((s) => s.stage === id) || { count: 0, amount: 0 };
  const courseCohorts = cohorts.filter((c) => !course || c.course === course);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const select = 'px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white';

  const payBadge = (o: Order) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${o.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
      {o.status === 'paid' ? 'Đã đóng phí' : (o.totalPaidAmount || 0) > 0 ? 'Đóng một phần' : 'Chưa đóng'}
    </span>
  );
  const slaBadge = (o: Order) => {
    const state = responseState(o);
    if (!state || !o.responseDueAt) return null;
    return state === 'late' ? (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1" title="Chưa liên hệ lần đầu, đã quá hạn phản hồi">
        <AlertTriangle className="w-3 h-3" /> Quá hạn {hhmm(o.responseDueAt)}
      </span>
    ) : (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Hạn liên hệ lần đầu">
        Liên hệ trước {hhmm(o.responseDueAt)}
      </span>
    );
  };
  const stageSelect = (o: Order) => (
    <select
      value={stageOf(o)}
      disabled={!canEdit}
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
            {canEdit && (
              <button type="button" onClick={() => setCreating(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0073C1] hover:bg-[#005fa3] text-white flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Thêm lead
              </button>
            )}
            <button type="button" onClick={() => navigate('/reports')} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer" title="Phễu chuyển đổi trong Báo cáo">
              <BarChart3 className="w-3.5 h-3.5" /> Phễu & báo cáo
            </button>
            {canExport && (
              <a href={exportUrl} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Xuất CSV ({summary?.total ?? 0})
              </a>
            )}
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
              {summary?.total ?? 0} lead · {summary?.paid ?? 0} đã đóng phí
              {campaign && campaign.targetHeadcount
                ? ` · ${campaign.totalEnrolled || 0}/${campaign.targetHeadcount} chỉ tiêu (${Math.round((100 * (campaign.totalEnrolled || 0)) / campaign.targetHeadcount)}%)`
                : ''}
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên, SĐT, email, mã đơn, trường, lớp…" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs" />
          </div>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={select}>
            <option value="">Mọi tư vấn viên</option>
            <option value="mine">Lead của tôi</option>
            <option value="none">Chưa phân công</option>
            {consultants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={course} onChange={(e) => { setCourse(e.target.value); setCohort(''); }} className={select}>
            <option value="">Mọi khóa học</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={cohort} onChange={(e) => setCohort(e.target.value)} className={select}>
            <option value="">Mọi lớp / đợt</option>
            {courseCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={select}>
            <option value="">Mọi giai đoạn</option>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className={select}>
            <option value="">Mọi trạng thái học phí</option>
            <option value="paid">Đã đóng phí</option>
            <option value="unpaid">Chưa đóng đủ</option>
          </select>
          <select value={interest} onChange={(e) => setInterest(e.target.value)} className={select}>
            <option value="">Mọi mức quan tâm</option>
            {INTEREST.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <label className={`${select} flex items-center gap-1.5 cursor-pointer ${overdue ? 'border-red-300 text-red-700' : ''}`}>
            <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Quá hạn phản hồi
          </label>
          {anyFilter && (
            <button type="button" onClick={resetFilters} className="px-2.5 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 flex items-center gap-1 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Bỏ lọc
            </button>
          )}
        </div>
        {layout === 'kanban' && count > rows.length && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            Kanban hiển thị {rows.length} lead mới nhất trong {count} lead phù hợp (số trên mỗi cột là số đầy đủ). Thu hẹp bộ lọc hoặc dùng Bảng chi tiết để xem tất cả.
          </p>
        )}
        {notice && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{notice}</p>}
        {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>}
      </div>

      {loading && rows.length === 0 && (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      )}

      {layout === 'kanban' && (
        <div className={`overflow-x-auto pb-4 ${loading ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-3 min-w-[1400px]">
            {STAGES.map((s) => {
              const deals = rows.filter((o) => stageOf(o) === s.id);
              const total = stageCount(s.id);
              return (
                <div
                  key={s.id}
                  onDragOver={(e) => {
                    if (!canEdit) return;
                    e.preventDefault();
                    setDragOver(s.id);
                  }}
                  onDragLeave={() => setDragOver((cur) => (cur === s.id ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const lead = rows.find((r) => r.id === e.dataTransfer.getData('text/plain'));
                    if (lead) moveStage(lead, s.id);
                  }}
                  className={`w-[200px] shrink-0 rounded-2xl p-2.5 border space-y-2 max-h-[78vh] flex flex-col ${dragOver === s.id ? 'bg-blue-50 border-blue-300' : 'bg-slate-100/80 border-slate-200'}`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-white px-1.5 rounded-full border border-slate-200" title="Số lead của giai đoạn (tất cả lead phù hợp)">
                      {total.count}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 px-1">
                    {vnd(total.amount)}
                    {deals.length < total.count && <span className="ml-1 font-sans">· hiện {deals.length}</span>}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                    {deals.length === 0 && <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-xl">Trống</div>}
                    {deals.map((o) => (
                      <div
                        key={o.id}
                        draggable={canEdit}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', o.id)}
                        onClick={() => onOpenLeadDetail(o)}
                        className={`p-2.5 bg-white rounded-xl border hover:border-blue-400 cursor-pointer space-y-1.5 ${responseState(o) === 'late' ? 'border-red-300' : 'border-slate-200'}`}>
                        <div className="text-xs font-bold text-slate-900 leading-snug">{o.customerName}</div>
                        <div className="text-[10px] text-slate-500 truncate" title={o.courseTitle}>{o.courseTitle}</div>
                        {o.batchCohort && <div className="text-[10px] text-slate-500 truncate">Lớp: {o.batchCohort}</div>}
                        {slaBadge(o)}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-slate-700">{vnd(o.amount)}</span>
                          {payBadge(o)}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
                          <span className="truncate">{o.pic || 'Chưa phân công'}</span>
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
        <div className={`bg-white rounded-2xl border border-slate-200 overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
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
                <th className="px-3 py-2">Tư vấn viên</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} onClick={() => onOpenLeadDetail(o)} className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer align-top">
                  <td className="px-3 py-2">
                    <div className="font-bold text-slate-900">{o.customerName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{o.orderCode}</div>
                    {slaBadge(o)}
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
                  <td className="px-3 py-2">{o.pic || <span className="text-slate-400">Chưa phân công</span>}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-500">Không có lead phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 text-xs text-slate-600">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} / {count} lead
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer" title="Trang trước">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2">Trang {page}/{pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer" title="Trang sau">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {creating && (
        <NewLeadDialog
          courses={courses}
          campaign={campaign}
          onClose={() => setCreating(false)}
          onCreated={(order) => {
            setCreating(false);
            load();
            onOpenLeadDetail(order);
          }}
        />
      )}
    </div>
  );
};

/** A lead from a phone call, a walk-in or an event: priced, deduplicated and assigned by the server. */
const NewLeadDialog: React.FC<{
  courses: Course[];
  campaign: AdmissionCampaign | null;
  onClose: () => void;
  onCreated: (order: Order) => void;
}> = ({ courses, campaign, onClose, onCreated }) => {
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', courseId: '', source: 'Nhập tay', consultNeed: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || (!form.customerPhone.trim() && !form.customerEmail.trim())) {
      setError('Cần họ tên và số điện thoại hoặc email.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await api.post<Order>('/staff/orders/', {
        ...form,
        courseId: form.courseId || null,
        campaign: campaign?.id || null
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được lead.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full p-2.5 border border-slate-200 rounded-xl text-xs';
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-5 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Thêm lead {campaign ? `· ${campaign.code}` : ''}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer" title="Đóng"><X className="w-4 h-4" /></button>
        </div>
        <label className="block">
          <span className="font-bold text-slate-700 block mb-1">Họ và tên *</span>
          <input autoFocus value={form.customerName} onChange={set('customerName')} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-bold text-slate-700 block mb-1">Số điện thoại</span>
            <input value={form.customerPhone} onChange={set('customerPhone')} className={`${input} font-mono`} />
          </label>
          <label className="block">
            <span className="font-bold text-slate-700 block mb-1">Email</span>
            <input type="email" value={form.customerEmail} onChange={set('customerEmail')} className={input} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-bold text-slate-700 block mb-1">Khóa học quan tâm</span>
            <select value={form.courseId} onChange={set('courseId')} className={input}>
              <option value="">Chưa rõ</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="font-bold text-slate-700 block mb-1">Nguồn</span>
            <select value={form.source} onChange={set('source')} className={input}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="font-bold text-slate-700 block mb-1">Nhu cầu tư vấn</span>
          <textarea rows={2} value={form.consultNeed} onChange={set('consultNeed')} className={input} />
        </label>
        <p className="text-slate-500">Học phí lấy theo khóa học / đợt đang mở. Lead được giao tư vấn viên và hạn phản hồi như lead từ website; trùng SĐT/email sẽ được đánh dấu.</p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 font-bold cursor-pointer">Hủy</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-xl bg-[#0073C1] text-white font-bold cursor-pointer disabled:opacity-60">
            {saving ? 'Đang tạo…' : 'Tạo lead'}
          </button>
        </div>
      </form>
    </div>
  );
};
