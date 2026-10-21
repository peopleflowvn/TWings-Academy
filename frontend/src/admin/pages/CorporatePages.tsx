/**
 * Đào tạo doanh nghiệp (B2B, /app/corporate/…): classes a client company sends its staff to, under a
 * service contract. No order, no tuition: a listed learner gets Moodle access at once.
 *   /corporate/classes        classes; ?id=<id> the class workspace (details, learners, sessions);
 *                             ?new=1&client=&course=&planLine= opens "new class" prefilled (from a plan line)
 *   /corporate/clients        clients; ?id=<id> one client (details, legal entities / units, contracts + rates)
 *   /corporate/plans          training plans; ?id=<id> one plan (lines, approve, new version)
 * Every list is limited by the API to the clients the user may see.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, CalendarDays, CheckCircle2, CopyPlus, FileSpreadsheet, Loader2, Mail, Plus, Save, UserMinus, X } from 'lucide-react';
import { api, apiFetch, ApiError, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { viDateToIso } from '../../lib/serverCollection';
import { navigate, useAppSearch } from '../router';
import { SessionsEditor } from './IntakesPage';

// ---------------------------------------------------------------- types
interface Client {
  id: string;
  name: string;
  code: string;
  taxCode: string;
  emailDomains: string[];
  defaultCc: string[];
  isActive: boolean;
  note: string;
  classesCount: number;
  activeContracts: number;
}

interface Unit {
  id: string;
  client: string;
  parent: string | null;
  kind: 'legal_entity' | 'department';
  name: string;
  code: string;
}

interface Rate {
  kind: string;
  course: string | null;
  courseTitle?: string;
  description: string;
  unitPrice: number;
  vatRate: number | null;
  validFrom: string | null;
  validTo: string | null;
}

interface Contract {
  id: string;
  client: string;
  clientCode: string;
  number: string;
  title: string;
  amends: string | null;
  status: string;
  signedOn: string | null;
  validFrom: string | null;
  validTo: string | null;
  value: number | null;
  vatRate: number | null;
  note: string;
  rates: Rate[];
}

interface PlanLine {
  id?: string;
  course: string | null;
  courseTitle?: string;
  title: string;
  unit: string | null;
  unitName?: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedClasses: number;
  plannedLearners: number | null;
  budget: number | null;
  note: string;
  classesCount?: number;
}

interface Plan {
  id: string;
  client: string;
  clientCode: string;
  contract: string | null;
  name: string;
  period: string;
  version: number;
  previous: string | null;
  status: 'draft' | 'approved' | 'superseded';
  approvedByName: string;
  approvedAt: string | null;
  note: string;
  lines: PlanLine[];
}

interface CorpClass {
  id: string;
  client: string;
  clientCode: string;
  cohort: string;
  course: string;
  courseTitle: string;
  name: string;
  startDate: string | null;
  location: string;
  capacity: number;
  leadInstructor: string | null;
  leadInstructorName: string;
  scheduleText: string;
  contract: string | null;
  contractNumber: string;
  planLine: string | null;
  status: string;
  issueCertificate: boolean;
  note: string;
  learners: number;
  sessions: number;
}

interface Listing {
  id: string;
  status: string;
  transferredFrom: string | null;
  invitedAt: string | null;
  note: string;
  fullName: string;
  email: string;
  phone: string;
  learnerCode: string;
  employeeCode: string;
  jobTitle: string;
  unitName: string;
  managerName: string;
  managerEmail: string;
  lmsStatus: string;
  attendanceRate: number | null;
  progress: number | null;
}

type CourseOption = { id: string; title: string };

// ---------------------------------------------------------------- shared
const input = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
const card = 'bg-white rounded-2xl border border-slate-200 p-5';
const primary = 'px-3 py-2 rounded-xl bg-[#0073C1] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50';
const secondary = 'px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50';
const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Thao tác thất bại.');
const vnd = (n?: number | null) => (n == null ? '–' : `${new Intl.NumberFormat('vi-VN').format(n)} ₫`);
const day = (value?: string | null) => value || '–'; // the API already sends dd/mm/yyyy
const csv = (list: string[]) => list.join(', ');
const splitCsv = (text: string) => text.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
const numberOrNull = (text: string) => (text.trim() === '' ? null : Number(text));

const CLASS_STATUS: Record<string, [string, string]> = {
  planned: ['Lên kế hoạch', 'bg-blue-50 text-blue-700 border-blue-200'],
  running: ['Đang học', 'bg-purple-50 text-purple-700 border-purple-200'],
  finished: ['Đã học xong', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  closed: ['Đã chốt hồ sơ', 'bg-slate-100 text-slate-700 border-slate-300'],
  cancelled: ['Đã hủy', 'bg-red-50 text-red-700 border-red-200']
};
const LISTING_STATUS: Record<string, string> = {
  enrolled: 'Đang học',
  completed: 'Hoàn thành',
  not_passed: 'Không đạt',
  transferred: 'Đã chuyển lớp',
  cancelled: 'Đã hủy'
};
const CONTRACT_STATUS: Record<string, string> = { draft: 'Đang soạn', active: 'Đang hiệu lực', ended: 'Đã kết thúc', cancelled: 'Đã hủy' };
const PLAN_STATUS: Record<string, string> = { draft: 'Đang soạn', approved: 'Đã duyệt', superseded: 'Đã thay thế' };
const RATE_KINDS: [string, string][] = [
  ['per_class', 'Theo lớp'],
  ['per_learner', 'Theo học viên'],
  ['per_session', 'Theo buổi'],
  ['per_hour', 'Theo giờ'],
  ['lump_sum', 'Trọn gói']
];

const Badge: React.FC<{ status: string }> = ({ status }) => {
  const [label, tone] = CLASS_STATUS[status] || [status, 'bg-slate-50 text-slate-600 border-slate-200'];
  return <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${tone}`}>{label}</span>;
};

const Modal: React.FC<{ title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ title, onClose, wide, children }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
    <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} my-6 p-6 space-y-3 text-xs`}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{title}</h3>
        <button type="button" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

const BackLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <button type="button" onClick={() => navigate(to)} className="text-xs font-bold text-[#0073C1] flex items-center gap-1 cursor-pointer">
    <ArrowLeft className="w-4 h-4" /> {label}
  </button>
);

function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const reload = useCallback(() => {
    api
      .get<Paginated<Client>>('/staff/corporate/clients/?pageSize=200')
      .then((res) => setClients(res.results))
      .catch(() => setClients([]));
  }, []);
  useEffect(reload, [reload]);
  return { clients, reload };
}

function useUnits(clientId: string) {
  const [units, setUnits] = useState<Unit[]>([]);
  const reload = useCallback(() => {
    if (!clientId) return setUnits([]);
    api.get<Unit[]>(`/staff/corporate/units/?client=${clientId}`).then(setUnits).catch(() => setUnits([]));
  }, [clientId]);
  useEffect(reload, [reload]);
  return { units, reload };
}

function useContracts(clientId: string) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const reload = useCallback(() => {
    if (!clientId) return setContracts([]);
    api
      .get<Paginated<Contract>>(`/staff/corporate/contracts/?client=${clientId}&pageSize=200`)
      .then((res) => setContracts(res.results))
      .catch(() => setContracts([]));
  }, [clientId]);
  useEffect(reload, [reload]);
  return { contracts, reload };
}

// ================================================================ Excel import
interface ImportRow {
  row: number;
  values: Record<string, string | number | null>;
  action: 'add' | 'update' | 'unchanged' | 'error';
  errors: string[];
  notes: string[];
}

interface ImportBatch {
  id: string;
  kind: 'roster' | 'plan';
  fileName: string;
  status: 'previewed' | 'imported' | 'cancelled';
  columns: Record<string, string>;
  rows: ImportRow[];
  summary: { add: number; update: number; unchanged: number; error: number; applied?: number };
}

const IMPORT_ACTION: Record<ImportRow['action'], [string, string]> = {
  add: ['Thêm', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  update: ['Cập nhật', 'bg-blue-50 text-blue-700 border-blue-200'],
  unchanged: ['Không đổi', 'bg-slate-50 text-slate-500 border-slate-200'],
  error: ['Lỗi', 'bg-red-50 text-red-700 border-red-200']
};
const IMPORT_COLUMNS: Record<ImportBatch['kind'], [string, string][]> = {
  roster: [['fullName', 'Họ tên'], ['email', 'Email'], ['employeeCode', 'Mã NV'], ['unit', 'Đơn vị'], ['managerEmail', 'CBQL']],
  plan: [['title', 'Nội dung'], ['unit', 'Đơn vị'], ['plannedStart', 'Từ'], ['plannedEnd', 'Đến'], ['plannedClasses', 'Số lớp'], ['plannedLearners', 'HV'], ['budget', 'Ngân sách']]
};
const IMPORT_HINT: Record<ImportBatch['kind'], string> = {
  roster: 'Họ tên, Email, Điện thoại, Mã NV / CBNV, Chức danh, Đơn vị / Phòng ban, Họ tên CBQL, Email CBQL',
  plan: 'Nội dung / Tên khóa, Đơn vị, Từ ngày, Đến ngày, Số lớp, Số học viên, Ngân sách, Ghi chú'
};

/** Upload a client's Excel file, see what each row will do, then confirm (nothing is written before). */
const ImportDialog: React.FC<{ kind: ImportBatch['kind']; target: { corporateClass?: string; plan?: string }; onClose: () => void; onDone: () => void }> = ({ kind, target, onClose, onDone }) => {
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('kind', kind);
    if (target.corporateClass) form.append('corporateClass', target.corporateClass);
    if (target.plan) form.append('plan', target.plan);
    form.append('file', file);
    setBusy(true);
    setError('');
    try {
      setBatch(await apiFetch<ImportBatch>('/staff/corporate/imports/', { method: 'POST', body: form }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!batch) return;
    setBusy(true);
    setError('');
    try {
      setBatch(await api.post<ImportBatch>(`/staff/corporate/imports/${batch.id}/confirm/`));
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (batch?.status === 'previewed') api.post(`/staff/corporate/imports/${batch.id}/cancel/`).catch(() => undefined);
    onClose();
  };
  const toApply = batch ? batch.summary.add + batch.summary.update : 0;

  return (
    <Modal title={kind === 'roster' ? 'Nhập danh sách học viên từ Excel' : 'Nhập kế hoạch từ Excel'} onClose={close} wide>
      {!batch ? (
        <div className="space-y-3">
          <p className="text-slate-600">
            File .xlsx của khách hàng, tối đa 5 MB. Cột được nhận theo tiêu đề ({IMPORT_HINT[kind]}); dòng tiêu đề có thể nằm dưới vài
            dòng tiêu đề văn bản. Hệ thống kiểm tra và cho xem trước, chưa ghi gì cho tới khi bạn xác nhận.
          </p>
          <input type="file" accept=".xlsx" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          {busy && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-700">
            <strong>{batch.fileName}</strong> · {batch.rows.length} dòng: {batch.summary.add} thêm, {batch.summary.update} cập nhật,{' '}
            {batch.summary.unchanged} không đổi, <span className={batch.summary.error ? 'text-red-600 font-bold' : ''}>{batch.summary.error} lỗi</span>
            {batch.status === 'imported' && <span className="text-emerald-700 font-bold"> · Đã nhập {batch.summary.applied ?? 0} dòng</span>}
          </p>
          <p className="text-slate-500">Cột đã nhận: {Object.values(batch.columns).join(' · ')}</p>
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 text-left sticky top-0">
                <tr>
                  <th className="p-2">Dòng</th>
                  {IMPORT_COLUMNS[kind].map(([, label]) => <th key={label} className="p-2">{label}</th>)}
                  <th className="p-2">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batch.rows.map((r) => {
                  const [label, tone] = IMPORT_ACTION[r.action];
                  return (
                    <tr key={r.row}>
                      <td className="p-2 text-slate-500">{r.row}</td>
                      {IMPORT_COLUMNS[kind].map(([key]) => <td key={key} className="p-2">{r.values[key] ?? ''}</td>)}
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${tone}`}>{label}</span>
                        {r.errors.map((t) => <div key={t} className="text-red-600">{t}</div>)}
                        {r.notes.map((t) => <div key={t} className="text-slate-500">{t}</div>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {batch.status === 'previewed' && (
            <div className="flex justify-end gap-2">
              <button type="button" className={secondary} disabled={busy} onClick={close}>Hủy</button>
              <button type="button" className={primary} disabled={busy || toApply === 0} onClick={confirm}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Nhập {toApply} dòng
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </Modal>
  );
};

// ================================================================ classes
export const CorporateClassesPage: React.FC<{ courses: CourseOption[] }> = ({ courses }) => {
  const search = useAppSearch();
  const id = search.get('id');
  return id ? <ClassWorkspace key={id} id={id} courses={courses} /> : <ClassList courses={courses} />;
};

const ClassList: React.FC<{ courses: CourseOption[] }> = ({ courses }) => {
  const search = useAppSearch();
  const canEdit = useStaffCan('corporate.classes');
  const { clients } = useClients();
  const [client, setClient] = useState(search.get('client') || '');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<CorpClass[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(search.get('new') === '1');

  const load = useCallback(() => {
    const params = new URLSearchParams({ pageSize: '200' });
    if (client) params.set('client', client);
    if (status) params.set('status', status);
    api
      .get<Paginated<CorpClass>>(`/staff/corporate/classes/?${params}`)
      .then((res) => {
        setRows(res.results);
        setError('');
      })
      .catch((e) => setError(errorText(e)));
  }, [client, status]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">Lớp doanh nghiệp</h2>
            <p className="text-xs text-slate-500">
              Lớp riêng của từng khách hàng: không hiện trên website, học viên do doanh nghiệp cử đi học, không qua đơn học phí.
              Học viên trong danh sách được mở khóa học trên Moodle ngay.
            </p>
          </div>
          {canEdit && (
            <button type="button" className={primary} onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Tạo lớp
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={`${input} max-w-xs`} value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">Mọi khách hàng</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
          </select>
          <select className={`${input} max-w-xs`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(CLASS_STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        {!rows ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 m-5" />
        ) : rows.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có lớp nào.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3">Lớp</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Khai giảng</th>
                <th className="p-3 text-right">Học viên / sĩ số</th>
                <th className="p-3 text-right">Buổi</th>
                <th className="p-3">Hợp đồng</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/corporate/classes?id=${r.id}`)}>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{r.name}</div>
                    <div className="text-slate-500">{r.courseTitle}</div>
                  </td>
                  <td className="p-3 font-bold">{r.clientCode}</td>
                  <td className="p-3">{day(r.startDate)}</td>
                  <td className="p-3 text-right">{r.learners} / {r.capacity}</td>
                  <td className="p-3 text-right">{r.sessions}</td>
                  <td className="p-3">{r.contractNumber || '–'}</td>
                  <td className="p-3"><Badge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {creating && (
        <ClassEditor
          clients={clients}
          courses={courses}
          initial={{ client: search.get('client') || client, course: search.get('course') || '', planLine: search.get('planLine') }}
          onClose={() => {
            setCreating(false);
            if (search.get('new')) navigate('/corporate/classes', { replace: true });
          }}
          onSaved={(saved) => navigate(`/corporate/classes?id=${saved.id}`)}
        />
      )}
    </div>
  );
};

const ClassEditor: React.FC<{
  clients: Client[];
  courses: CourseOption[];
  existing?: CorpClass;
  initial?: { client: string; course: string; planLine: string | null };
  onClose: () => void;
  onSaved: (saved: CorpClass) => void;
}> = ({ clients, courses, existing, initial, onClose, onSaved }) => {
  const [d, setD] = useState({
    client: existing?.client || initial?.client || '',
    courseId: existing?.course || initial?.course || '',
    name: existing?.name || '',
    startDate: viDateToIso(existing?.startDate) || '',
    capacity: String(existing?.capacity ?? 30),
    location: existing?.location || '',
    contract: existing?.contract || '',
    status: existing?.status || 'planned',
    issueCertificate: existing?.issueCertificate ?? false,
    note: existing?.note || ''
  });
  const { contracts } = useContracts(d.client);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof d>) => setD((cur) => ({ ...cur, ...patch }));

  const save = async () => {
    setBusy(true);
    setError('');
    const body: Record<string, unknown> = {
      name: d.name.trim(),
      startDate: d.startDate || null,
      capacity: Number(d.capacity) || 1,
      location: d.location,
      contract: d.contract || null,
      status: d.status,
      issueCertificate: d.issueCertificate,
      note: d.note
    };
    try {
      const saved = existing
        ? await api.patch<CorpClass>(`/staff/corporate/classes/${existing.id}/`, body)
        : await api.post<CorpClass>('/staff/corporate/classes/', { ...body, client: d.client, courseId: d.courseId, planLine: initial?.planLine || null });
      onClose(); // first: closing a prefilled "new class" resets the URL, then onSaved may open the class
      onSaved(saved);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={existing ? `Sửa lớp – ${existing.name}` : 'Tạo lớp doanh nghiệp'} onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label>Khách hàng
          <select className={input} value={d.client} disabled={Boolean(existing)} onChange={(e) => set({ client: e.target.value, contract: '' })}>
            <option value="">– Chọn –</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
          </select>
        </label>
        <label>Khóa học (nội dung, khóa Moodle mẫu)
          <select className={input} value={d.courseId} disabled={Boolean(existing)} onChange={(e) => set({ courseId: e.target.value })}>
            <option value="">– Chọn –</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label className="md:col-span-2">Tên lớp
          <input className={input} value={d.name} placeholder="VD: MSB – Kỹ năng bán hàng – Lớp 1" onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label>Ngày khai giảng<input type="date" className={input} value={d.startDate} onChange={(e) => set({ startDate: e.target.value })} /></label>
        <label>Sĩ số tối đa<input type="number" min={1} className={input} value={d.capacity} onChange={(e) => set({ capacity: e.target.value })} /></label>
        <label className="md:col-span-2">Địa điểm<input className={input} value={d.location} onChange={(e) => set({ location: e.target.value })} /></label>
        <label>Hợp đồng
          <select className={input} value={d.contract} onChange={(e) => set({ contract: e.target.value })}>
            <option value="">– Chưa gắn –</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.number}{c.title ? ` – ${c.title}` : ''}</option>)}
          </select>
        </label>
        <label>Trạng thái
          <select className={input} value={d.status} onChange={(e) => set({ status: e.target.value })}>
            {Object.entries(CLASS_STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <label className="md:col-span-2 flex items-center gap-2">
          <input type="checkbox" checked={d.issueCertificate} onChange={(e) => set({ issueCertificate: e.target.checked })} />
          Cấp chứng chỉ TWings (TWC-…) khi học viên hoàn thành (theo hợp đồng)
        </label>
        <label className="md:col-span-2">Ghi chú<textarea rows={2} className={input} value={d.note} onChange={(e) => set({ note: e.target.value })} /></label>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button type="button" className={primary} disabled={busy || !d.client || !d.courseId || !d.name.trim()} onClick={save}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
        </button>
      </div>
    </Modal>
  );
};

interface InvitationRow {
  enrollment: string;
  name: string;
  to: string;
  cc: string[];
  rejected: string[];
  invitedAt: string | null;
}

/** Class invitation: schedule + .ics, one e-mail per learner, CC the line manager; preview before sending. */
const InvitationDialog: React.FC<{ cls: CorpClass; onClose: () => void; onSent: () => void }> = ({ cls, onClose, onSent }) => {
  const [all, setAll] = useState(false);
  const [rows, setRows] = useState<InvitationRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setRows(null);
    api
      .get<InvitationRow[]>(`/staff/corporate/classes/${cls.id}/invitations/${all ? '?all=1' : ''}`)
      .then(setRows)
      .catch((e) => setError(errorText(e)));
  }, [cls.id, all]);
  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ sent: number; failed: number }>(`/staff/corporate/classes/${cls.id}/invitations/`, { all });
      setResult(`Đã gửi ${res.sent} thư${res.failed ? `, ${res.failed} thư lỗi (xem Mẫu email & lịch sử gửi)` : ''}.`);
      onSent();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Thư mời học – ${cls.name}`} onClose={onClose} wide>
      <p className="text-slate-600">
        Mỗi học viên một email riêng (không lộ danh sách lớp), kèm lịch học dạng tệp .ics và hướng dẫn vào học. CC: cán bộ quản lý hiện tại và
        CC mặc định của khách hàng; địa chỉ ngoài tên miền của khách hàng / nội bộ bị loại.
      </p>
      {cls.sessions === 0 && <p className="text-amber-700 font-bold">Lớp chưa có lịch học: tạo lịch trước khi gửi thư mời.</p>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Gửi lại cho cả học viên đã nhận thư mời</label>
      {!rows ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Không có học viên nào cần gửi.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left sticky top-0"><tr><th className="p-2">Học viên</th><th className="p-2">Gửi tới</th><th className="p-2">CC</th><th className="p-2">CC bị loại</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.enrollment}>
                  <td className="p-2 font-bold">{r.name}{r.invitedAt ? <div className="font-normal text-slate-500">Đã mời {new Date(r.invitedAt).toLocaleString('vi-VN')}</div> : null}</td>
                  <td className="p-2">{r.to}</td>
                  <td className="p-2">{r.cc.join(', ') || '–'}</td>
                  <td className="p-2 text-red-600">{r.rejected.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && <p className="text-emerald-700 font-bold">{result}</p>}
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button type="button" className={primary} disabled={busy || !rows?.length || cls.sessions === 0 || Boolean(result)} onClick={send}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Gửi {rows?.length || 0} thư mời
        </button>
      </div>
    </Modal>
  );
};

const ClassWorkspace: React.FC<{ id: string; courses: CourseOption[] }> = ({ id, courses }) => {
  const canEdit = useStaffCan('corporate.classes');
  const canSend = useStaffCan('corporate.communications_send');
  const [inviting, setInviting] = useState(false);
  const [listVersion, setListVersion] = useState(0); // bumped when something else changed the class list
  const { clients } = useClients();
  const [cls, setCls] = useState<CorpClass | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'learners' | 'overview'>('learners');
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const load = useCallback(() => {
    api.get<CorpClass>(`/staff/corporate/classes/${id}/`).then(setCls).catch((e) => setError(errorText(e)));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!cls) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  return (
    <div className="space-y-4">
      <BackLink to="/corporate/classes" label="Danh sách lớp" />
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 text-lg">{cls.name}</h2>
            <Badge status={cls.status} />
          </div>
          <p className="text-xs text-slate-600">
            {cls.clientCode} · {cls.courseTitle} · Khai giảng {day(cls.startDate)} · {cls.learners}/{cls.capacity} học viên · {cls.sessions} buổi
            {cls.contractNumber ? ` · HĐ ${cls.contractNumber}` : ''}
          </p>
          {cls.location && <p className="text-xs text-slate-500">Địa điểm: {cls.location}</p>}
        </div>
        {(canEdit || canSend) && (
          <div className="flex gap-2">
            {canSend && (
              <button type="button" className={secondary} onClick={() => setInviting(true)}>
                <Mail className="w-4 h-4" /> Gửi thư mời
              </button>
            )}
            {canEdit && (
            <button type="button" className={secondary} onClick={() => setScheduling(true)}>
              <CalendarDays className="w-4 h-4" /> Lịch học
            </button>
            )}
            {canEdit && <button type="button" className={secondary} onClick={() => setEditing(true)}>Sửa thông tin</button>}
          </div>
        )}
      </div>
      <div className="flex gap-1 border-b border-slate-200">
        {([['learners', 'Học viên'], ['overview', 'Tổng quan']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`px-4 py-2 text-xs font-bold cursor-pointer border-b-2 ${tab === key ? 'border-[#0073C1] text-[#0073C1]' : 'border-transparent text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'learners' ? (
        <LearnersTab cls={cls} canEdit={canEdit} onChanged={load} version={listVersion} />
      ) : (
        <div className={`${card} text-xs space-y-2`}>
          <p><strong>Chứng chỉ TWings:</strong> {cls.issueCertificate ? 'Có cấp khi hoàn thành' : 'Không cấp (theo hợp đồng)'}</p>
          <p><strong>Lịch:</strong> {cls.scheduleText || 'Chưa có mô tả lịch'} · {cls.sessions} buổi (điểm danh trên Moodle, mỗi buổi một phiên)</p>
          <p><strong>Giảng viên chính:</strong> {cls.leadInstructorName || '–'}</p>
          {cls.note && <p><strong>Ghi chú:</strong> {cls.note}</p>}
          <p className="text-slate-500">Điểm danh QR, khảo sát và chốt kết quả sẽ có ở các bước tiếp theo của kế hoạch tích hợp.</p>
        </div>
      )}
      {inviting && <InvitationDialog cls={cls} onClose={() => setInviting(false)} onSent={() => { load(); setListVersion((v) => v + 1); }} />}
      {editing && <ClassEditor clients={clients} courses={courses} existing={cls} onClose={() => setEditing(false)} onSaved={setCls} />}
      {scheduling && (
        <SessionsEditor
          intake={{ id: cls.cohort, courseTitle: cls.courseTitle, name: cls.name, startDate: viDateToIso(cls.startDate), location: cls.location, scheduleText: cls.scheduleText }}
          onClose={() => setScheduling(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

const EMPTY_LEARNER = { fullName: '', email: '', phone: '', employeeCode: '', jobTitle: '', unit: '', managerName: '', managerEmail: '' };

const LearnersTab: React.FC<{ cls: CorpClass; canEdit: boolean; onChanged: () => void; version: number }> = ({ cls, canEdit, onChanged, version }) => {
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_LEARNER);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState<Listing | null>(null);
  const [importing, setImporting] = useState(false);
  const { units } = useUnits(cls.client);

  const load = useCallback(() => {
    api.get<Listing[]>(`/staff/corporate/classes/${cls.id}/enrollments/`).then(setRows).catch((e) => setError(errorText(e)));
  }, [cls.id, version]);
  useEffect(load, [load]);

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/staff/corporate/classes/${cls.id}/enrollments/`, { ...form, unit: form.unit || null });
      setForm(EMPTY_LEARNER);
      load();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (row: Listing) => {
    const note = window.prompt(`Hủy ${row.fullName} khỏi lớp (sẽ gỡ khỏi khóa Moodle). Lý do:`, '');
    if (note === null) return;
    try {
      await api.post(`/staff/corporate/enrollments/${row.id}/cancel/`, { note });
      load();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && !['closed', 'cancelled'].includes(cls.status) && (
        <div className={`${card} space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-slate-800 text-sm">Thêm học viên</div>
            <button type="button" className={secondary} onClick={() => setImporting(true)}>
              <FileSpreadsheet className="w-4 h-4" /> Nhập từ Excel
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Trùng email / số điện thoại với học viên đã có thì dùng chung hồ sơ. Cán bộ quản lý (CBQL) được lưu theo ngày để CC đúng người khi gửi kết quả.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <label>Họ tên *<input className={input} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
            <label>Email *<input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Điện thoại<input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Mã nhân viên<input className={input} value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></label>
            <label>Chức danh<input className={input} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></label>
            <label>Đơn vị
              <select className={input} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="">–</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            <label>CBQL – họ tên<input className={input} value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} /></label>
            <label>CBQL – email<input type="email" className={input} value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} /></label>
          </div>
          <div className="flex justify-end">
            <button type="button" className={primary} disabled={busy || !form.fullName.trim() || !form.email.trim()} onClick={add}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Thêm vào lớp
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        {!rows ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 m-5" />
        ) : rows.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có học viên.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3">Học viên</th>
                <th className="p-3">Mã NV · đơn vị</th>
                <th className="p-3">CBQL</th>
                <th className="p-3">Moodle</th>
                <th className="p-3 text-right">Chuyên cần</th>
                <th className="p-3">Trạng thái</th>
                {canEdit && <th className="p-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const active = ['enrolled', 'completed', 'not_passed'].includes(r.status);
                return (
                  <tr key={r.id} className={active ? '' : 'text-slate-400'}>
                    <td className="p-3">
                      <div className="font-bold">{r.fullName}</div>
                      <div>{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
                    </td>
                    <td className="p-3">{r.employeeCode || '–'}{r.unitName ? ` · ${r.unitName}` : ''}</td>
                    <td className="p-3">{r.managerName || r.managerEmail ? <>{r.managerName}<div>{r.managerEmail}</div></> : '–'}</td>
                    <td className="p-3">{r.lmsStatus || 'Chờ ghi danh'}{r.progress != null ? ` · ${r.progress}%` : ''}</td>
                    <td className="p-3 text-right">{r.attendanceRate != null ? `${r.attendanceRate}%` : '–'}</td>
                    <td className="p-3">{LISTING_STATUS[r.status] || r.status}{r.invitedAt ? <div className="text-slate-500">Đã gửi thư mời</div> : null}</td>
                    {canEdit && (
                      <td className="p-3">
                        {active && (
                          <div className="flex gap-2 justify-end">
                            <button type="button" title="Chuyển lớp" className="text-slate-600 cursor-pointer" onClick={() => setMoving(r)}><ArrowRightLeft className="w-4 h-4" /></button>
                            <button type="button" title="Hủy khỏi lớp" className="text-red-600 cursor-pointer" onClick={() => cancel(r)}><UserMinus className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {importing && (
        <ImportDialog kind="roster" target={{ corporateClass: cls.id }} onClose={() => setImporting(false)} onDone={() => { load(); onChanged(); }} />
      )}
      {moving && (
        <TransferDialog listing={moving} cls={cls} onClose={() => setMoving(null)} onDone={() => { setMoving(null); load(); onChanged(); }} />
      )}
    </div>
  );
};

const TransferDialog: React.FC<{ listing: Listing; cls: CorpClass; onClose: () => void; onDone: () => void }> = ({ listing, cls, onClose, onDone }) => {
  const [targets, setTargets] = useState<CorpClass[]>([]);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get<Paginated<CorpClass>>(`/staff/corporate/classes/?client=${cls.client}&pageSize=200`)
      .then((res) => setTargets(res.results.filter((c) => c.id !== cls.id && !['closed', 'cancelled'].includes(c.status))))
      .catch((e) => setError(errorText(e)));
  }, [cls.client, cls.id]);
  const move = async () => {
    try {
      await api.post(`/staff/corporate/enrollments/${listing.id}/transfer/`, { targetClass: target });
      onDone();
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <Modal title={`Chuyển lớp – ${listing.fullName}`} onClose={onClose}>
      <p className="text-slate-600">Học viên rời khóa Moodle của lớp này và được ghi danh vào lớp mới. Lịch sử ở lớp cũ được giữ.</p>
      <select className={input} value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">– Chọn lớp của {cls.clientCode} –</option>
        {targets.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.courseTitle}</option>)}
      </select>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end"><button type="button" className={primary} disabled={!target} onClick={move}>Chuyển</button></div>
    </Modal>
  );
};

// ================================================================ clients & contracts
export const CorporateClientsPage: React.FC<{ courses: CourseOption[] }> = ({ courses }) => {
  const search = useAppSearch();
  const id = search.get('id');
  return id ? <ClientDetail key={id} id={id} courses={courses} /> : <ClientList />;
};

const ClientList: React.FC = () => {
  const canEdit = useStaffCan('corporate.clients');
  const { clients, reload } = useClients();
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div>
          <h2 className="font-bold text-slate-900">Khách hàng doanh nghiệp</h2>
          <p className="text-xs text-slate-500">Mỗi khách hàng có pháp nhân / đơn vị, hợp đồng và đơn giá riêng. Dữ liệu khách hàng này không hiện cho khách hàng khác.</p>
        </div>
        {canEdit && <button type="button" className={primary} onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Thêm khách hàng</button>}
      </div>
      <div className={`${card} p-0 overflow-x-auto`}>
        {clients.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có khách hàng.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr><th className="p-3">Mã</th><th className="p-3">Tên</th><th className="p-3">MST</th><th className="p-3 text-right">Lớp</th><th className="p-3 text-right">HĐ hiệu lực</th><th className="p-3">Trạng thái</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/corporate/clients?id=${c.id}`)}>
                  <td className="p-3 font-bold">{c.code}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.taxCode || '–'}</td>
                  <td className="p-3 text-right">{c.classesCount}</td>
                  <td className="p-3 text-right">{c.activeContracts}</td>
                  <td className="p-3">{c.isActive ? 'Đang hợp tác' : 'Ngừng'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {creating && <ClientEditor onClose={() => setCreating(false)} onSaved={(c) => { reload(); navigate(`/corporate/clients?id=${c.id}`); }} />}
    </div>
  );
};

const ClientEditor: React.FC<{ existing?: Client; onClose: () => void; onSaved: (c: Client) => void }> = ({ existing, onClose, onSaved }) => {
  const [d, setD] = useState({
    name: existing?.name || '',
    code: existing?.code || '',
    taxCode: existing?.taxCode || '',
    emailDomains: csv(existing?.emailDomains || []),
    defaultCc: csv(existing?.defaultCc || []),
    isActive: existing?.isActive ?? true,
    note: existing?.note || ''
  });
  const [error, setError] = useState('');
  const save = async () => {
    const body = { ...d, emailDomains: splitCsv(d.emailDomains), defaultCc: splitCsv(d.defaultCc) };
    try {
      const saved = existing
        ? await api.patch<Client>(`/staff/corporate/clients/${existing.id}/`, body)
        : await api.post<Client>('/staff/corporate/clients/', body);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <Modal title={existing ? `Sửa khách hàng – ${existing.code}` : 'Thêm khách hàng'} onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="md:col-span-2">Tên khách hàng *<input className={input} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
        <label>Mã viết tắt * (dùng trong danh sách, file xuất)<input className={input} value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} /></label>
        <label>Mã số thuế<input className={input} value={d.taxCode} onChange={(e) => setD({ ...d, taxCode: e.target.value })} /></label>
        <label className="md:col-span-2">Tên miền email được phép nhận CC (cách nhau bằng dấu phẩy)
          <input className={input} value={d.emailDomains} placeholder="msb.com.vn, ..." onChange={(e) => setD({ ...d, emailDomains: e.target.value })} />
        </label>
        <label className="md:col-span-2">CC mặc định khi gửi kết quả
          <input className={input} value={d.defaultCc} placeholder="daotao@..., ..." onChange={(e) => setD({ ...d, defaultCc: e.target.value })} />
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} /> Đang hợp tác</label>
        <label className="md:col-span-2">Ghi chú<textarea rows={2} className={input} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} /></label>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end"><button type="button" className={primary} disabled={!d.name.trim() || !d.code.trim()} onClick={save}><Save className="w-4 h-4" /> Lưu</button></div>
    </Modal>
  );
};

const ClientDetail: React.FC<{ id: string; courses: CourseOption[] }> = ({ id, courses }) => {
  const canEdit = useStaffCan('corporate.clients');
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [contract, setContract] = useState<Contract | 'new' | null>(null);
  const { units, reload: reloadUnits } = useUnits(id);
  const { contracts, reload: reloadContracts } = useContracts(id);
  const [unit, setUnit] = useState({ name: '', kind: 'department', code: '', parent: '' });

  useEffect(() => {
    api.get<Client>(`/staff/corporate/clients/${id}/`).then(setClient).catch((e) => setError(errorText(e)));
  }, [id]);
  const addUnit = async () => {
    try {
      await api.post('/staff/corporate/units/', { ...unit, client: id, parent: unit.parent || null });
      setUnit({ name: '', kind: 'department', code: '', parent: '' });
      reloadUnits();
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!client) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const unitName = (uid: string | null) => units.find((u) => u.id === uid)?.name || '';
  return (
    <div className="space-y-4">
      <BackLink to="/corporate/clients" label="Danh sách khách hàng" />
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div className="text-xs space-y-1">
          <h2 className="font-bold text-slate-900 text-lg">{client.code} – {client.name}</h2>
          <p>MST: {client.taxCode || '–'} · {client.isActive ? 'Đang hợp tác' : 'Ngừng hợp tác'}</p>
          <p>Tên miền nhận CC: {csv(client.emailDomains) || '–'} · CC mặc định: {csv(client.defaultCc) || '–'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondary} onClick={() => navigate(`/corporate/classes?client=${client.id}`)}>Lớp của khách hàng</button>
          {canEdit && <button type="button" className={secondary} onClick={() => setEditing(true)}>Sửa</button>}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className={`${card} space-y-3`}>
        <div className="font-bold text-sm text-slate-800">Pháp nhân & đơn vị</div>
        <ul className="text-xs divide-y divide-slate-100">
          {units.map((u) => (
            <li key={u.id} className="py-2 flex justify-between">
              <span><strong>{u.name}</strong>{u.code ? ` (${u.code})` : ''}{u.parent ? ` · thuộc ${unitName(u.parent)}` : ''}</span>
              <span className="text-slate-500">{u.kind === 'legal_entity' ? 'Pháp nhân' : 'Đơn vị'}</span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end text-xs">
            <label className="md:col-span-2">Tên<input className={input} value={unit.name} onChange={(e) => setUnit({ ...unit, name: e.target.value })} /></label>
            <label>Loại
              <select className={input} value={unit.kind} onChange={(e) => setUnit({ ...unit, kind: e.target.value })}>
                <option value="department">Đơn vị / phòng ban</option>
                <option value="legal_entity">Pháp nhân</option>
              </select>
            </label>
            <label>Thuộc
              <select className={input} value={unit.parent} onChange={(e) => setUnit({ ...unit, parent: e.target.value })}>
                <option value="">–</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            <button type="button" className={secondary} disabled={!unit.name.trim()} onClick={addUnit}><Plus className="w-4 h-4" /> Thêm</button>
          </div>
        )}
      </div>

      <div className={`${card} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm text-slate-800">Hợp đồng & đơn giá</div>
          {canEdit && <button type="button" className={secondary} onClick={() => setContract('new')}><Plus className="w-4 h-4" /> Thêm hợp đồng</button>}
        </div>
        {contracts.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa có hợp đồng.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-slate-600"><tr><th className="py-2">Số HĐ</th><th>Hiệu lực</th><th className="text-right">Giá trị (trước thuế)</th><th className="text-right">Đơn giá</th><th>Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map((c) => (
                <tr key={c.id} className={canEdit ? 'hover:bg-slate-50 cursor-pointer' : ''} onClick={() => canEdit && setContract(c)}>
                  <td className="py-2"><strong>{c.number}</strong>{c.title ? ` – ${c.title}` : ''}{c.amends ? ' (phụ lục)' : ''}</td>
                  <td>{day(c.validFrom)} → {day(c.validTo)}</td>
                  <td className="text-right">{vnd(c.value)}</td>
                  <td className="text-right">{c.rates.length}</td>
                  <td>{CONTRACT_STATUS[c.status] || c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing && <ClientEditor existing={client} onClose={() => setEditing(false)} onSaved={setClient} />}
      {contract && (
        <ContractEditor
          clientId={id}
          contracts={contracts}
          courses={courses}
          existing={contract === 'new' ? undefined : contract}
          onClose={() => setContract(null)}
          onSaved={reloadContracts}
        />
      )}
    </div>
  );
};

const EMPTY_RATE: Rate = { kind: 'per_learner', course: null, description: '', unitPrice: 0, vatRate: null, validFrom: null, validTo: null };

const ContractEditor: React.FC<{
  clientId: string;
  contracts: Contract[];
  courses: CourseOption[];
  existing?: Contract;
  onClose: () => void;
  onSaved: () => void;
}> = ({ clientId, contracts, courses, existing, onClose, onSaved }) => {
  const [d, setD] = useState({
    number: existing?.number || '',
    title: existing?.title || '',
    status: existing?.status || 'draft',
    amends: existing?.amends || '',
    signedOn: viDateToIso(existing?.signedOn) || '',
    validFrom: viDateToIso(existing?.validFrom) || '',
    validTo: viDateToIso(existing?.validTo) || '',
    value: existing?.value != null ? String(existing.value) : '',
    vatRate: existing?.vatRate != null ? String(existing.vatRate) : '',
    note: existing?.note || ''
  });
  const [rates, setRates] = useState<Rate[]>(existing?.rates.map((r) => ({ ...r, validFrom: viDateToIso(r.validFrom), validTo: viDateToIso(r.validTo) })) || []);
  const [error, setError] = useState('');
  const setRate = (i: number, patch: Partial<Rate>) => setRates((list) => list.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const save = async () => {
    const body = {
      client: clientId,
      number: d.number.trim(),
      title: d.title,
      status: d.status,
      amends: d.amends || null,
      signedOn: d.signedOn || null,
      validFrom: d.validFrom || null,
      validTo: d.validTo || null,
      value: numberOrNull(d.value),
      vatRate: numberOrNull(d.vatRate),
      note: d.note,
      rates: rates.map(({ courseTitle: _unused, ...r }) => r)
    };
    try {
      if (existing) await api.patch(`/staff/corporate/contracts/${existing.id}/`, body);
      else await api.post('/staff/corporate/contracts/', body);
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <Modal title={existing ? `Hợp đồng ${existing.number}` : 'Thêm hợp đồng'} onClose={onClose} wide>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label>Số hợp đồng *<input className={input} value={d.number} onChange={(e) => setD({ ...d, number: e.target.value })} /></label>
        <label className="md:col-span-2">Tên / nội dung<input className={input} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
        <label>Trạng thái
          <select className={input} value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
            {Object.entries(CONTRACT_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <label>Ngày ký<input type="date" className={input} value={d.signedOn} onChange={(e) => setD({ ...d, signedOn: e.target.value })} /></label>
        <label>Hiệu lực từ<input type="date" className={input} value={d.validFrom} onChange={(e) => setD({ ...d, validFrom: e.target.value })} /></label>
        <label>Đến<input type="date" className={input} value={d.validTo} onChange={(e) => setD({ ...d, validTo: e.target.value })} /></label>
        <label>Phụ lục của
          <select className={input} value={d.amends} onChange={(e) => setD({ ...d, amends: e.target.value })}>
            <option value="">– Hợp đồng gốc –</option>
            {contracts.filter((c) => c.id !== existing?.id).map((c) => <option key={c.id} value={c.id}>{c.number}</option>)}
          </select>
        </label>
        <label>Giá trị trước thuế (đ)<input type="number" min={0} className={input} value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} /></label>
        <label>VAT (%)<input type="number" min={0} max={100} className={input} value={d.vatRate} onChange={(e) => setD({ ...d, vatRate: e.target.value })} /></label>
        <label className="md:col-span-2">Ghi chú<input className={input} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} /></label>
      </div>
      <div className="font-bold text-slate-800 pt-2">Đơn giá (dùng khi lập nghiệm thu; không lấy học phí bán lẻ)</div>
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        {rates.length === 0 && <p className="p-3 text-slate-500">Chưa có đơn giá.</p>}
        {rates.map((r, i) => (
          <div key={i} className="p-2 grid grid-cols-12 gap-2 items-center">
            <select className={`${input} col-span-2`} value={r.kind} onChange={(e) => setRate(i, { kind: e.target.value })}>
              {RATE_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select className={`${input} col-span-3`} value={r.course || ''} onChange={(e) => setRate(i, { course: e.target.value || null })}>
              <option value="">Mọi khóa của hợp đồng</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <input className={`${input} col-span-3`} placeholder="Mô tả" value={r.description} onChange={(e) => setRate(i, { description: e.target.value })} />
            <input type="number" min={0} className={`${input} col-span-2`} placeholder="Đơn giá (đ)" value={r.unitPrice || ''} onChange={(e) => setRate(i, { unitPrice: Number(e.target.value) || 0 })} />
            <input type="number" min={0} max={100} className={`${input} col-span-1`} placeholder="VAT %" value={r.vatRate ?? ''} onChange={(e) => setRate(i, { vatRate: numberOrNull(e.target.value) })} />
            <button type="button" className="text-red-500 cursor-pointer justify-self-end" onClick={() => setRates((list) => list.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <button type="button" className={secondary} onClick={() => setRates((list) => [...list, { ...EMPTY_RATE }])}><Plus className="w-4 h-4" /> Thêm đơn giá</button>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end"><button type="button" className={primary} disabled={!d.number.trim()} onClick={save}><Save className="w-4 h-4" /> Lưu hợp đồng</button></div>
    </Modal>
  );
};

// ================================================================ plans
export const CorporatePlansPage: React.FC<{ courses: CourseOption[] }> = ({ courses }) => {
  const search = useAppSearch();
  const id = search.get('id');
  return id ? <PlanDetail key={id} id={id} courses={courses} /> : <PlanList />;
};

const PlanList: React.FC = () => {
  const canEdit = useStaffCan('corporate.classes');
  const { clients } = useClients();
  const [rows, setRows] = useState<Plan[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<{ client: string; name: string; period: string } | null>(null);
  useEffect(() => {
    api.get<Paginated<Plan>>('/staff/corporate/plans/?pageSize=200').then((res) => setRows(res.results)).catch((e) => setError(errorText(e)));
  }, []);
  const create = async () => {
    if (!draft) return;
    try {
      const plan = await api.post<Plan>('/staff/corporate/plans/', { ...draft, lines: [] });
      navigate(`/corporate/plans?id=${plan.id}`);
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div>
          <h2 className="font-bold text-slate-900">Kế hoạch đào tạo</h2>
          <p className="text-xs text-slate-500">Kế hoạch đã duyệt không sửa: thay đổi thành phiên bản mới, bản cũ được giữ. Từ mỗi dòng kế hoạch tạo được lớp.</p>
        </div>
        {canEdit && <button type="button" className={primary} onClick={() => setDraft({ client: clients[0]?.id || '', name: '', period: String(new Date().getFullYear()) })}><Plus className="w-4 h-4" /> Thêm kế hoạch</button>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        {!rows ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 m-5" />
        ) : rows.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có kế hoạch.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left"><tr><th className="p-3">Kế hoạch</th><th className="p-3">Khách hàng</th><th className="p-3">Kỳ</th><th className="p-3">Phiên bản</th><th className="p-3 text-right">Dòng</th><th className="p-3">Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/corporate/plans?id=${p.id}`)}>
                  <td className="p-3 font-bold">{p.name}</td>
                  <td className="p-3">{p.clientCode}</td>
                  <td className="p-3">{p.period || '–'}</td>
                  <td className="p-3">v{p.version}</td>
                  <td className="p-3 text-right">{p.lines.length}</td>
                  <td className="p-3">{PLAN_STATUS[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {draft && (
        <Modal title="Thêm kế hoạch" onClose={() => setDraft(null)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label>Khách hàng
              <select className={input} value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })}>
                <option value="">– Chọn –</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
              </select>
            </label>
            <label>Tên kế hoạch<input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label>Kỳ<input className={input} value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} /></label>
          </div>
          <div className="flex justify-end"><button type="button" className={primary} disabled={!draft.client || !draft.name.trim()} onClick={create}><Save className="w-4 h-4" /> Tạo</button></div>
        </Modal>
      )}
    </div>
  );
};

const EMPTY_LINE: PlanLine = { course: null, title: '', unit: null, plannedStart: null, plannedEnd: null, plannedClasses: 1, plannedLearners: null, budget: null, note: '' };

const PlanDetail: React.FC<{ id: string; courses: CourseOption[] }> = ({ id, courses }) => {
  const canEdit = useStaffCan('corporate.classes');
  const canApprove = useStaffCan('corporate.approve');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [lines, setLines] = useState<PlanLine[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const { units } = useUnits(plan?.client || '');

  const show = (p: Plan) => {
    setPlan(p);
    setLines(p.lines.map((l) => ({ ...l, plannedStart: viDateToIso(l.plannedStart), plannedEnd: viDateToIso(l.plannedEnd) })));
  };
  useEffect(() => {
    api.get<Plan>(`/staff/corporate/plans/${id}/`).then(show).catch((e) => setError(errorText(e)));
  }, [id]);

  const run = async (call: () => Promise<Plan>, after?: (p: Plan) => void) => {
    setBusy(true);
    setError('');
    try {
      const p = await call();
      after ? after(p) : show(p);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const saveLines = () =>
    run(() =>
      api.patch<Plan>(`/staff/corporate/plans/${id}/`, {
        lines: lines.map(({ id: _id, courseTitle: _c, unitName: _u, classesCount: _n, ...l }, i) => ({ ...l, sortOrder: i }))
      })
    );
  const setLine = (i: number, patch: Partial<PlanLine>) => setLines((list) => list.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  if (!plan) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const editable = canEdit && plan.status === 'draft';
  return (
    <div className="space-y-4">
      <BackLink to="/corporate/plans" label="Danh sách kế hoạch" />
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div className="text-xs space-y-1">
          <h2 className="font-bold text-slate-900 text-lg">{plan.name} · v{plan.version}</h2>
          <p>{plan.clientCode} · Kỳ {plan.period || '–'} · {PLAN_STATUS[plan.status]}{plan.approvedByName ? ` bởi ${plan.approvedByName}` : ''}</p>
          {plan.previous && <button type="button" className="text-[#0073C1] font-bold cursor-pointer" onClick={() => navigate(`/corporate/plans?id=${plan.previous}`)}>Xem phiên bản trước</button>}
        </div>
        <div className="flex gap-2">
          {editable && (
            <button type="button" className={secondary} disabled={busy} onClick={() => setImporting(true)}>
              <FileSpreadsheet className="w-4 h-4" /> Nhập từ Excel
            </button>
          )}
          {editable && <button type="button" className={secondary} disabled={busy} onClick={saveLines}><Save className="w-4 h-4" /> Lưu các dòng</button>}
          {canApprove && plan.status === 'draft' && (
            <button type="button" className={primary} disabled={busy} onClick={() => window.confirm('Duyệt kế hoạch? Sau khi duyệt không sửa được, chỉ tạo phiên bản mới.') && run(() => api.post<Plan>(`/staff/corporate/plans/${id}/approve/`))}>
              <CheckCircle2 className="w-4 h-4" /> Duyệt
            </button>
          )}
          {canEdit && plan.status === 'approved' && (
            <button type="button" className={secondary} disabled={busy} onClick={() => run(() => api.post<Plan>(`/staff/corporate/plans/${id}/revise/`), (p) => navigate(`/corporate/plans?id=${p.id}`))}>
              <CopyPlus className="w-4 h-4" /> Tạo phiên bản mới
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="p-2">Nội dung (theo kế hoạch KH)</th>
              <th className="p-2">Khóa học</th>
              <th className="p-2">Đơn vị</th>
              <th className="p-2">Từ</th>
              <th className="p-2">Đến</th>
              <th className="p-2 text-right">Số lớp</th>
              <th className="p-2 text-right">Học viên</th>
              <th className="p-2 text-right">Ngân sách (đ)</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 && <tr><td colSpan={9} className="p-3 text-slate-500">Chưa có dòng nào.{editable ? ' Thêm dòng bên dưới hoặc nhập từ file Excel của khách hàng.' : ''}</td></tr>}
            {lines.map((l, i) =>
              editable ? (
                <tr key={i}>
                  <td className="p-1"><input className={input} value={l.title} onChange={(e) => setLine(i, { title: e.target.value })} /></td>
                  <td className="p-1">
                    <select className={input} value={l.course || ''} onChange={(e) => setLine(i, { course: e.target.value || null })}>
                      <option value="">–</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </td>
                  <td className="p-1">
                    <select className={input} value={l.unit || ''} onChange={(e) => setLine(i, { unit: e.target.value || null })}>
                      <option value="">–</option>
                      {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </td>
                  <td className="p-1"><input type="date" className={input} value={l.plannedStart || ''} onChange={(e) => setLine(i, { plannedStart: e.target.value || null })} /></td>
                  <td className="p-1"><input type="date" className={input} value={l.plannedEnd || ''} onChange={(e) => setLine(i, { plannedEnd: e.target.value || null })} /></td>
                  <td className="p-1"><input type="number" min={1} className={`${input} text-right`} value={l.plannedClasses} onChange={(e) => setLine(i, { plannedClasses: Number(e.target.value) || 1 })} /></td>
                  <td className="p-1"><input type="number" min={0} className={`${input} text-right`} value={l.plannedLearners ?? ''} onChange={(e) => setLine(i, { plannedLearners: numberOrNull(e.target.value) })} /></td>
                  <td className="p-1"><input type="number" min={0} className={`${input} text-right`} value={l.budget ?? ''} onChange={(e) => setLine(i, { budget: numberOrNull(e.target.value) })} /></td>
                  <td className="p-1"><button type="button" className="text-red-500 cursor-pointer" onClick={() => setLines((list) => list.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></button></td>
                </tr>
              ) : (
                <tr key={l.id || i}>
                  <td className="p-2 font-bold">{l.title}</td>
                  <td className="p-2">{l.courseTitle || '–'}</td>
                  <td className="p-2">{l.unitName || '–'}</td>
                  <td className="p-2">{l.plannedStart || '–'}</td>
                  <td className="p-2">{l.plannedEnd || '–'}</td>
                  <td className="p-2 text-right">{l.classesCount ?? 0} / {l.plannedClasses}</td>
                  <td className="p-2 text-right">{l.plannedLearners ?? '–'}</td>
                  <td className="p-2 text-right">{vnd(l.budget)}</td>
                  <td className="p-2">
                    {canEdit && plan.status === 'approved' && l.id && (
                      <button type="button" className="text-[#0073C1] font-bold cursor-pointer whitespace-nowrap"
                        onClick={() => navigate(`/corporate/classes?new=1&client=${plan.client}&course=${l.course || ''}&planLine=${l.id}`)}>
                        Tạo lớp
                      </button>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {editable && (
          <div className="p-3"><button type="button" className={secondary} onClick={() => setLines((list) => [...list, { ...EMPTY_LINE }])}><Plus className="w-4 h-4" /> Thêm dòng</button></div>
        )}
      </div>
      {importing && (
        <ImportDialog
          kind="plan"
          target={{ plan: plan.id }}
          onClose={() => setImporting(false)}
          onDone={() => api.get<Plan>(`/staff/corporate/plans/${id}/`).then(show).catch((e) => setError(errorText(e)))}
        />
      )}
    </div>
  );
};
