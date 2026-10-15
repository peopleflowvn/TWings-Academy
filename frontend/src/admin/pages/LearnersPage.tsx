/**
 * Học viên (/app/sales/learners): one record per person, whatever courses they register for.
 *   (no id)  the list: search, "my learners", registrations and paid per learner
 *   ?id=<id> one learner: personal details (edited here, copied to every registration), the courses
 *            registered (stage, payment, learning), the history of every registration, appointments
 *            and jobs; register for another course; merge two records of the same person.
 * Each registration opens in the lead workspace (/app/sales/crm?orderId=…).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, GitMerge, Loader2, Mail, Phone, Plus, Save, Search } from 'lucide-react';
import { api, ApiError, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { navigate, useAppSearch } from '../router';
import { Course } from '../../types';
import { CatalogOptions, catalogItems, itemFields, ProgramOption } from '../catalog';
import { usePrograms } from '../data';
import { viDateToIso } from '../../lib/serverCollection';

interface LearnerRow {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  university: string;
  ownerName: string;
  registrations: number;
  paidRegistrations: number;
  lastRegistrationAt: string | null;
}

interface Registration {
  id: string;
  orderCode: string;
  courseTitle: string;
  batchCohort: string;
  campaignCode: string;
  crmStatus: string;
  status: string;
  amount: number;
  totalPaidAmount: number;
  learningAccess: boolean;
  pic: string;
  source: string;
  trainingStatus: string;
  lmsStatus: string;
  progress: number | null;
  createdAt: string;
}

interface LearnerDetail extends Omit<LearnerRow, 'registrations'> {
  owner: string | null;
  birthDate: string | null;
  gender: string;
  area: string;
  citizenId: string;
  issuedPlace: string;
  permanentAddress: string;
  currentResidence: string;
  educationLevel: string;
  major: string;
  graduationYear: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactRelation: string;
  cvLink: string;
  note: string;
  createdAt: string;
  registrations: Registration[];
  history: { id: string; type: string; title: string; content: string; actor: string; timestamp: string; orderId: string; orderCode: string; courseTitle: string }[];
  appointments: { id: string; orderId: string; startsAt: string; channel: string; status: string; staffName: string; note: string }[];
  placements: { id: string; orderId: string; employer: string; jobTitle: string; stage: string; startDate: string | null }[];
}

const vnd = (n?: number) => `${new Intl.NumberFormat('vi-VN').format(n || 0)} ₫`;
// The API sends dates as dd/mm/yyyy and some values (placements) as ISO.
const day = (value?: string | null) => {
  if (!value) return '–';
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
};
const openRegistration = (orderId: string) => navigate(`/sales/crm?view=kanban&campaignId=all&orderId=${encodeURIComponent(orderId)}`);
const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Thao tác thất bại.');

export const LearnersPage: React.FC<{ courses: Course[] }> = ({ courses }) => {
  const search = useAppSearch();
  const id = search.get('id');
  return id ? <LearnerProfile key={id} id={id} courses={courses} /> : <LearnerList />;
};

// ---------------------------------------------------------------- list
const PAGE_SIZE = 50;

const LearnerList: React.FC = () => {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LearnerRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => setPage(1), [query, mine]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (query) params.set('search', query);
    if (mine) params.set('mine', '1');
    api
      .get<Paginated<LearnerRow>>(`/staff/learners/?${params}`)
      .then((res) => {
        if (!live) return;
        setRows(res.results);
        setCount(res.count);
        setError('');
      })
      .catch((e) => live && setError(errorText(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [query, mine, page]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <h2 className="font-bold text-slate-900">Học viên</h2>
          <p className="text-xs text-slate-500">
            Mỗi người một hồ sơ, dù đăng ký bao nhiêu khóa. Thông tin cá nhân sửa ở hồ sơ học viên và được áp dụng cho mọi đăng ký của người đó.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tên, SĐT, email, mã học viên, trường…" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl" />
          </div>
          <label className="px-3 py-2 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Học viên tôi phụ trách
          </label>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className={`bg-white rounded-2xl border border-slate-200 overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Học viên</th>
              <th className="px-3 py-2">Liên hệ</th>
              <th className="px-3 py-2">Trường</th>
              <th className="px-3 py-2 text-center">Khóa đã đăng ký</th>
              <th className="px-3 py-2 text-center">Đã đóng phí</th>
              <th className="px-3 py-2">Tư vấn viên phụ trách</th>
              <th className="px-3 py-2">Đăng ký gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => navigate(`/sales/learners?id=${r.id}`)} className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-3 py-2">
                  <div className="font-bold text-slate-900">{r.fullName}</div>
                  <div className="font-mono text-[10px] text-slate-400">{r.code}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <div>{r.phone}</div>
                  <div className="text-[10px]">{r.email}</div>
                </td>
                <td className="px-3 py-2">{r.university || <span className="text-slate-300">–</span>}</td>
                <td className="px-3 py-2 text-center font-bold">{r.registrations}</td>
                <td className="px-3 py-2 text-center">{r.paidRegistrations}</td>
                <td className="px-3 py-2">{r.ownerName || <span className="text-slate-400">Chưa có</span>}</td>
                <td className="px-3 py-2">{day(r.lastRegistrationAt)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Không có học viên phù hợp.</td></tr>
            )}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-xs text-slate-600">
            <span>{count} học viên</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer" title="Trang trước"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <span className="px-2">Trang {page}/{pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer" title="Trang sau"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- one learner
const PERSONAL: { key: keyof LearnerDetail; label: string; type?: 'date' | 'select'; options?: string[]; wide?: boolean }[] = [
  { key: 'fullName', label: 'Họ và tên *' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'email', label: 'Email' },
  { key: 'birthDate', label: 'Ngày sinh', type: 'date' },
  { key: 'gender', label: 'Giới tính', type: 'select', options: ['', 'Nam', 'Nữ', 'Khác'] },
  { key: 'area', label: 'Khu vực' },
  { key: 'citizenId', label: 'Số CCCD' },
  { key: 'issuedPlace', label: 'Nơi cấp CCCD' },
  { key: 'currentResidence', label: 'Nơi ở hiện tại', wide: true },
  { key: 'permanentAddress', label: 'Địa chỉ thường trú', wide: true }
];
const EDUCATION: typeof PERSONAL = [
  { key: 'educationLevel', label: 'Trình độ', type: 'select', options: ['', 'THPT', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Khác'] },
  { key: 'university', label: 'Trường' },
  { key: 'major', label: 'Ngành học' },
  { key: 'graduationYear', label: 'Năm tốt nghiệp' },
  { key: 'contactPersonName', label: 'Người liên hệ khi cần' },
  { key: 'contactPersonPhone', label: 'SĐT người liên hệ' },
  { key: 'contactRelation', label: 'Quan hệ' }
];
const EDITABLE = [...PERSONAL, ...EDUCATION].map((f) => f.key as string).concat('note');

const LearnerProfile: React.FC<{ id: string; courses: Course[] }> = ({ id, courses }) => {
  const canEdit = useStaffCan('crm.edit_status');
  const canAssign = useStaffCan('crm.assign_pic');
  const [learner, setLearner] = useState<LearnerDetail | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'courses' | 'details' | 'history' | 'meetings'>('courses');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consultants, setConsultants] = useState<{ id: string; name: string }[]>([]);
  const [registering, setRegistering] = useState(false);
  const [merging, setMerging] = useState(false);
  const programs = usePrograms();

  const load = useCallback(async () => {
    try {
      const data = await api.get<LearnerDetail>(`/staff/learners/${id}/`);
      setLearner(data);
      setForm(Object.fromEntries(EDITABLE.map((k) => [k, ((data as unknown as Record<string, unknown>)[k] as string) || ''])));
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);

  useEffect(() => {
    load();
    api.get<{ id: string; name: string }[]>('/staff/consultants/').then(setConsultants).catch(() => setConsultants([]));
  }, [load]);

  const dirty = useMemo(() => {
    if (!learner) return {};
    const current = learner as unknown as Record<string, unknown>;
    return Object.fromEntries(EDITABLE.filter((k) => (form[k] || '') !== ((current[k] as string) || '')).map((k) => [k, form[k] || (k === 'birthDate' ? null : '')]));
  }, [form, learner]);

  const save = async () => {
    if (!Object.keys(dirty).length) return;
    if (!form.fullName?.trim()) {
      setError('Cần họ tên.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/staff/learners/${id}/`, dirty);
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const changeOwner = async (ownerId: string) => {
    try {
      await api.patch(`/staff/learners/${id}/`, { ownerId: ownerId || null });
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!learner) {
    return error ? <p className="text-sm text-red-600">{error}</p> : <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }
  const regs = learner.registrations;
  const paid = regs.filter((r) => r.status === 'paid').length;
  const field = (f: (typeof PERSONAL)[number]) => (
    <label key={f.key as string} className={`block ${f.wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-bold text-slate-700 block mb-1">{f.label}</span>
      {f.type === 'select' ? (
        <select disabled={!canEdit} value={form[f.key as string] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
          {(f.options || []).map((o) => <option key={o} value={o}>{o || 'Chưa rõ'}</option>)}
        </select>
      ) : (
        <input disabled={!canEdit} type={f.type === 'date' ? 'date' : 'text'} value={(f.type === 'date' ? viDateToIso(form[f.key as string]) : form[f.key as string]) || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl" />
      )}
    </label>
  );

  return (
    <div className="space-y-4 pb-12 text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button type="button" onClick={() => navigate('/sales/learners')} title="Danh sách học viên" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900">{learner.fullName}</h2>
              <div className="flex flex-wrap items-center gap-3 text-slate-600 mt-0.5">
                <span className="font-mono text-slate-400">{learner.code}</span>
                {learner.phone && <a href={`tel:${learner.phone}`} className="flex items-center gap-1 hover:text-[#0073C1]"><Phone className="w-3.5 h-3.5" /> {learner.phone}</a>}
                {learner.phone && <a href={`https://zalo.me/${learner.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-[#0073C1]">Zalo</a>}
                {learner.email && <a href={`mailto:${learner.email}`} className="flex items-center gap-1 hover:text-[#0073C1]"><Mail className="w-3.5 h-3.5" /> {learner.email}</a>}
              </div>
              <div className="text-slate-500 mt-1">
                {regs.length} khóa đã đăng ký · {paid} đã đóng phí · hồ sơ tạo {day(learner.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-slate-600">
              Tư vấn viên phụ trách
              <select disabled={!canAssign} value={learner.owner || ''} onChange={(e) => changeOwner(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-bold">
                <option value="">Chưa có</option>
                {learner.owner && !consultants.some((c) => c.id === learner.owner) && <option value={learner.owner}>{learner.ownerName || 'Nhân viên khác'}</option>}
                {consultants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {canEdit && (
              <button type="button" onClick={() => setRegistering(true)} className="px-3 py-1.5 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Đăng ký thêm khóa
              </button>
            )}
            {canAssign && (
              <button type="button" onClick={() => setMerging(true)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold flex items-center gap-1.5 cursor-pointer" title="Cùng một người có hai hồ sơ">
                <GitMerge className="w-3.5 h-3.5" /> Gộp hồ sơ trùng
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            ['courses', `Khóa đã đăng ký (${regs.length})`],
            ['details', 'Thông tin cá nhân'],
            ['history', `Nhật ký (${learner.history.length})`],
            ['meetings', 'Lịch hẹn & việc làm']
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${tab === key ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'courses' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Khóa học</th>
                <th className="px-3 py-2">Lớp / đợt</th>
                <th className="px-3 py-2">Giai đoạn</th>
                <th className="px-3 py-2 text-right">Học phí</th>
                <th className="px-3 py-2">Học tập</th>
                <th className="px-3 py-2">Tư vấn viên</th>
                <th className="px-3 py-2">Ngày đăng ký</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-bold text-slate-900">{r.courseTitle || 'Chưa chọn khóa'}</div>
                    <div className="font-mono text-[10px] text-slate-400">{r.orderCode}{r.campaignCode ? ` · ${r.campaignCode}` : ''}</div>
                  </td>
                  <td className="px-3 py-2">{r.batchCohort || <span className="text-slate-300">Chưa xếp lớp</span>}</td>
                  <td className="px-3 py-2">{r.crmStatus}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {vnd(r.amount)}
                    <div className={`text-[10px] font-sans ${r.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {r.status === 'paid' ? 'Đã đóng đủ' : r.status === 'refunded' ? 'Đã hoàn tiền' : r.status === 'cancelled' ? 'Đã hủy' : `Đã đóng ${vnd(r.totalPaidAmount)}`}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {r.lmsStatus || r.trainingStatus || (r.learningAccess ? 'Được vào học' : <span className="text-slate-300">–</span>)}
                    {r.progress !== null && r.progress !== undefined && <div className="text-[10px] text-slate-500">Tiến độ {r.progress}%</div>}
                  </td>
                  <td className="px-3 py-2">{r.pic || <span className="text-slate-400">Chưa có</span>}</td>
                  <td className="px-3 py-2">{day(r.createdAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => openRegistration(r.id)} className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold flex items-center gap-1 cursor-pointer">
                      Mở <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {regs.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Chưa có đăng ký nào.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'details' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <p className="text-slate-500">Thay đổi ở đây được áp dụng cho mọi khóa học viên đã đăng ký (tài khoản học viên, danh sách lớp, Moodle dùng cùng thông tin).</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{PERSONAL.map(field)}</div>
          <h3 className="font-bold text-slate-900 pt-2 border-t border-slate-100">Học vấn & người liên hệ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{EDUCATION.map(field)}</div>
          <label className="block">
            <span className="font-bold text-slate-700 block mb-1">Ghi chú về học viên</span>
            <textarea disabled={!canEdit} rows={3} value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl" />
          </label>
          {learner.cvLink && <p>CV: có (tải trong hồ sơ đăng ký, tab Liên hệ & lịch hẹn).</p>}
          {canEdit && (
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-emerald-700 font-bold">Đã lưu</span>}
              <button type="button" disabled={saving || !Object.keys(dirty).length} onClick={save} className="px-4 py-2 rounded-xl bg-[#0073C1] text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Đang lưu…' : 'Lưu thông tin'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          {learner.history.length === 0 && <p className="text-slate-500">Chưa có hoạt động.</p>}
          {learner.history.map((h) => (
            <div key={h.id} className="border-b border-slate-100 last:border-0 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-900">{h.title}</span>
                <span className="text-slate-400">{new Date(h.timestamp).toLocaleString('vi-VN')}</span>
              </div>
              {h.content && <p className="text-slate-600 whitespace-pre-line">{h.content}</p>}
              <div className="text-[10px] text-slate-400">
                {h.actor || 'Hệ thống'} ·{' '}
                <button type="button" onClick={() => openRegistration(h.orderId)} className="hover:text-[#0073C1] cursor-pointer">
                  {h.courseTitle || h.orderCode}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="font-bold text-slate-900">Lịch hẹn tư vấn</h3>
            {learner.appointments.length === 0 && <p className="text-slate-500">Chưa có lịch hẹn.</p>}
            {learner.appointments.map((a) => (
              <div key={a.id} className="border-t border-slate-100 pt-2">
                <strong>{new Date(a.startsAt).toLocaleString('vi-VN')}</strong> · {a.channel} · {a.status}
                <div className="text-slate-500">{[a.staffName, a.note].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="font-bold text-slate-900">Giới thiệu việc làm</h3>
            {learner.placements.length === 0 && <p className="text-slate-500">Chưa có.</p>}
            {learner.placements.map((p) => (
              <div key={p.id} className="border-t border-slate-100 pt-2">
                <strong>{p.employer}</strong>{p.jobTitle ? ` · ${p.jobTitle}` : ''} · {p.stage}
                {p.startDate && <div className="text-slate-500">Bắt đầu {day(p.startDate)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {registering && <RegisterDialog learner={learner} courses={courses} programs={programs} onClose={() => setRegistering(false)} />}
      {merging && (
        <MergeDialog
          learner={learner}
          onClose={() => setMerging(false)}
          onMerged={() => {
            setMerging(false);
            load();
          }}
        />
      )}
    </div>
  );
};

/** A new registration of this learner: priced, assigned and checked for duplicates by the server. */
const RegisterDialog: React.FC<{ learner: LearnerDetail; courses: Course[]; programs: ProgramOption[]; onClose: () => void }> = ({
  learner,
  courses,
  programs,
  onClose
}) => {
  const [courseId, setCourseId] = useState('');
  const [source, setSource] = useState('Nhập tay');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const registered = new Set(learner.registrations.filter((r) => r.status !== 'cancelled' && r.status !== 'refunded').map((r) => r.courseTitle));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      setError('Chọn khóa học.');
      return;
    }
    setSaving(true);
    try {
      const order = await api.post<{ id: string }>('/staff/orders/', {
        learnerId: learner.id,
        customerName: learner.fullName,
        customerPhone: learner.phone,
        customerEmail: learner.email,
        ...itemFields(courseId),
        source,
        consultNeed: note
      });
      openRegistration(order.id);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-5 space-y-3 text-xs">
        <h3 className="font-bold text-sm text-slate-900">Đăng ký thêm khóa cho {learner.fullName}</h3>
        <label className="block">
          <span className="font-bold text-slate-700 block mb-1">Khóa học / chương trình *</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl">
            <option value="">Chọn…</option>
            <CatalogOptions
              items={catalogItems(courses, programs, 'sellable').map((i) => (registered.has(i.title) ? { ...i, note: 'đang có đăng ký' } : i))}
            />
          </select>
        </label>
        <label className="block">
          <span className="font-bold text-slate-700 block mb-1">Nguồn</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl">
            {['Nhập tay', 'Học viên cũ quay lại', 'Hotline', 'Giới thiệu', 'Sự kiện'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="font-bold text-slate-700 block mb-1">Nhu cầu tư vấn</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" />
        </label>
        <p className="text-slate-500">Học phí theo khóa / đợt đang mở; thông tin cá nhân lấy từ hồ sơ học viên, không cần nhập lại.</p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 font-bold cursor-pointer">Hủy</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-xl bg-[#0073C1] text-white font-bold disabled:opacity-60 cursor-pointer">{saving ? 'Đang tạo…' : 'Tạo đăng ký'}</button>
        </div>
      </form>
    </div>
  );
};

/** Two records of the same person: the other one's registrations and history join this learner. */
const MergeDialog: React.FC<{ learner: LearnerDetail; onClose: () => void; onMerged: () => void }> = ({ learner, onClose, onMerged }) => {
  const [text, setText] = useState(learner.phone || learner.email || learner.fullName);
  const [rows, setRows] = useState<LearnerRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!text.trim()) return setRows([]);
      api
        .get<Paginated<LearnerRow>>(`/staff/learners/?search=${encodeURIComponent(text.trim())}&pageSize=20`)
        .then((res) => setRows(res.results.filter((r) => r.id !== learner.id)))
        .catch((e) => setError(errorText(e)));
    }, 300);
    return () => clearTimeout(t);
  }, [text, learner.id]);

  const merge = async (other: LearnerRow) => {
    if (!window.confirm(`Gộp ${other.fullName} (${other.code}, ${other.registrations} khóa) vào ${learner.fullName} (${learner.code})? Hồ sơ ${other.code} sẽ bị xóa, các đăng ký chuyển sang ${learner.code}.`)) return;
    setBusy(true);
    try {
      await api.post(`/staff/learners/${learner.id}/merge/`, { other: other.id });
      onMerged();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-5 space-y-3 text-xs">
        <h3 className="font-bold text-sm text-slate-900">Gộp hồ sơ trùng vào {learner.fullName} ({learner.code})</h3>
        <p className="text-slate-500">Dùng khi cùng một người có hai hồ sơ (ví dụ đăng ký bằng hai email). Thông tin còn trống được lấy từ hồ sơ kia.</p>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tìm theo tên, SĐT, email, mã học viên…" className="w-full p-2.5 border border-slate-200 rounded-xl" />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {rows.map((r) => (
            <button key={r.id} type="button" disabled={busy} onClick={() => merge(r)} className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-blue-400 cursor-pointer">
              <span className="font-bold">{r.fullName}</span> <span className="font-mono text-slate-400">{r.code}</span>
              <div className="text-slate-500">{[r.phone, r.email, `${r.registrations} khóa`].filter(Boolean).join(' · ')}</div>
            </button>
          ))}
          {rows.length === 0 && <p className="text-slate-500">Không có hồ sơ khác phù hợp.</p>}
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200 font-bold cursor-pointer">Đóng</button>
        </div>
      </div>
    </div>
  );
};
