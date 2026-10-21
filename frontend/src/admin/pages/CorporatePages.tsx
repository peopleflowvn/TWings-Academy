/**
 * Đào tạo doanh nghiệp (B2B, /app/corporate/…): classes a client company sends its staff to, under a
 * service contract. No order, no tuition: a listed learner gets Moodle access at once.
 *   /corporate/overview       activity, quality, finance per class, alerts (KPI definitions on hover)
 *   /corporate/classes        classes; ?id=<id> the class workspace (details, learners, sessions);
 *                             ?new=1&client=&course=&planLine= opens "new class" prefilled (from a plan line)
 *   /corporate/clients        clients; ?id=<id> one client (details, legal entities / units, contracts + rates)
 *   /corporate/plans          training plans; ?id=<id> one plan (lines, approve, new version)
 *   /corporate/acceptance     acceptance batches of contracts; ?id=<id> one batch (lines, approval, export)
 * Every list is limited by the API to the clients the user may see.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, CalendarDays, CheckCircle2, CopyPlus, Download, FileSpreadsheet, Loader2, Mail, Plus, QrCode, RefreshCw, Save, UserMinus, X, XCircle } from 'lucide-react';
import { api, apiFetch, ApiError, API_ROOT, Paginated } from '../../lib/api';
import { openInMoodle, useStaffCan } from '../../lib/lms';
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
  completionPolicy: CompletionPolicy;
  lockedAt: string | null;
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

interface CompletionPolicy {
  minAttendance?: number;
  minGrade?: number;
  surveyRequired?: boolean;
  moodleCompletion?: boolean;
}

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

// ---------------------------------------------------------------- attendance
interface AttendanceCell {
  status: string;
  attended: boolean | null;
  source: 'moodle' | 'adjusted' | 'missing' | 'none';
  pending?: string;
}

interface AttendanceSheet {
  sessions: { id: string; title: string; startsAt: string; endsAt: string; synced: boolean; qrUrl: string }[];
  rows: { enrollment: string; name: string; email: string; cells: Record<string, AttendanceCell>; taken: number; attended: number; rate: number | null }[];
}

interface Adjustment {
  id: string;
  enrollment: string;
  learnerName: string;
  sessionTitle: string;
  sessionStartsAt: string;
  statusLabel: string;
  reason: string;
  evidence: string;
  requestedByName: string;
  decision: 'pending' | 'approved' | 'rejected';
  decidedByName: string;
}

const ADJUST_STATUS: [string, string][] = [
  ['present', 'Có mặt'],
  ['late', 'Đi muộn'],
  ['excused', 'Vắng có phép'],
  ['absent', 'Vắng'],
  ['makeup', 'Học bù']
];
const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const AttendanceTab: React.FC<{ cls: CorpClass }> = ({ cls }) => {
  const canAdjust = useStaffCan('corporate.attendance_adjust');
  const canApprove = useStaffCan('corporate.approve');
  const [sheet, setSheet] = useState<AttendanceSheet | null>(null);
  const [pending, setPending] = useState<Adjustment[]>([]);
  const [editing, setEditing] = useState<{ enrollment: string; name: string; session: string; title: string } | null>(null);
  const [form, setForm] = useState({ status: 'late', reason: '', evidence: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<AttendanceSheet>(`/staff/corporate/classes/${cls.id}/attendance/`).then(setSheet).catch((e) => setError(errorText(e)));
    api
      .get<Paginated<Adjustment>>(`/staff/corporate/attendance-adjustments/?enrollment__corporate_class=${cls.id}&decision=pending&pageSize=200`)
      .then((res) => setPending(res.results))
      .catch(() => setPending([]));
  }, [cls.id]);
  useEffect(load, [load]);

  const request = async () => {
    if (!editing) return;
    try {
      await api.post(`/staff/corporate/classes/${cls.id}/attendance/`, { enrollment: editing.enrollment, session: editing.session, ...form });
      setEditing(null);
      setForm({ status: 'late', reason: '', evidence: '' });
      load();
    } catch (e) {
      setError(errorText(e));
    }
  };
  const decide = async (id: string, approve: boolean) => {
    try {
      await api.post(`/staff/corporate/attendance-adjustments/${id}/${approve ? 'approve' : 'reject'}/`);
      load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!sheet) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const locked = Boolean(cls.lockedAt);
  return (
    <div className="space-y-4">
      <div className={`${card} space-y-2`}>
        <div className="font-bold text-sm text-slate-800">Buổi học & mã QR điểm danh</div>
        <p className="text-xs text-slate-500">
          Học viên tự điểm danh bằng cách quét mã QR xoay vòng (đổi liên tục, chụp lại không dùng được) do giảng viên / PIC mở trên Moodle ở đầu buổi;
          trạng thái có mặt / đi muộn theo giờ quét. Giảng viên vẫn điểm danh tay được trên Moodle. Số liệu cập nhật về đây sau mỗi lần điểm danh.
        </p>
        {sheet.sessions.length === 0 ? (
          <p className="text-xs text-slate-500">Lớp chưa có lịch học.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sheet.sessions.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
                <span><strong>{s.title || 'Buổi học'}</strong> · {when(s.startsAt)}</span>
                {s.qrUrl ? (
                  <button type="button" className="text-[#0073C1] font-bold flex items-center gap-1 cursor-pointer" onClick={() => openInMoodle(s.qrUrl)}>
                    <QrCode className="w-4 h-4" /> Mở QR
                  </button>
                ) : (
                  <span className="text-slate-400">chưa lên Moodle</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className={`${card} space-y-2`}>
          <div className="font-bold text-sm text-slate-800">Điều chỉnh chờ duyệt ({pending.length})</div>
          <ul className="text-xs divide-y divide-slate-100">
            {pending.map((a) => (
              <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{a.learnerName}</strong> · {a.sessionTitle || 'Buổi học'} {when(a.sessionStartsAt)} → <strong>{a.statusLabel}</strong> · {a.reason}
                  {a.evidence ? ` · ${a.evidence}` : ''} <span className="text-slate-500">(đề nghị: {a.requestedByName || '–'})</span>
                </span>
                {canApprove && !locked && (
                  <span className="flex gap-2">
                    <button type="button" className="text-emerald-700 font-bold flex items-center gap-1 cursor-pointer" onClick={() => decide(a.id, true)}><CheckCircle2 className="w-4 h-4" /> Duyệt</button>
                    <button type="button" className="text-red-600 font-bold flex items-center gap-1 cursor-pointer" onClick={() => decide(a.id, false)}><XCircle className="w-4 h-4" /> Từ chối</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className={`${card} p-0 overflow-x-auto`}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="p-2 sticky left-0 bg-slate-50">Học viên</th>
              {sheet.sessions.map((s, i) => <th key={s.id} className="p-2 text-center whitespace-nowrap" title={s.title}>B{i + 1}<div className="font-normal">{when(s.startsAt).split(' ')[1] || ''}</div></th>)}
              <th className="p-2 text-right">Chuyên cần</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.rows.map((r) => (
              <tr key={r.enrollment}>
                <td className="p-2 sticky left-0 bg-white font-bold whitespace-nowrap">{r.name}</td>
                {sheet.sessions.map((s) => {
                  const c = r.cells[s.id];
                  const tone = c.attended === true ? 'text-emerald-700' : c.attended === false ? 'text-red-600' : 'text-slate-400';
                  const label = c.source === 'none' ? '·' : c.source === 'missing' ? '?' : c.status || '–';
                  return (
                    <td key={s.id} className="p-2 text-center">
                      <button
                        type="button"
                        disabled={!canAdjust || locked || c.source === 'none'}
                        title={c.source === 'adjusted' ? 'Đã điều chỉnh (đã duyệt)' : c.source === 'missing' ? 'Buổi đã qua, chưa có điểm danh' : 'Bấm để đề nghị điều chỉnh'}
                        className={`${tone} font-bold cursor-pointer disabled:cursor-default ${c.source === 'adjusted' ? 'underline decoration-dotted' : ''}`}
                        onClick={() => setEditing({ enrollment: r.enrollment, name: r.name, session: s.id, title: `${s.title || 'Buổi học'} ${when(s.startsAt)}` })}
                      >
                        {label}{c.pending ? '*' : ''}
                      </button>
                    </td>
                  );
                })}
                <td className="p-2 text-right font-bold">{r.rate != null ? `${r.rate}%` : '–'} <span className="font-normal text-slate-500">({r.attended}/{r.taken})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-3 text-[11px] text-slate-500">? buổi đã qua chưa có điểm danh · * có đề nghị điều chỉnh chờ duyệt · gạch chân: đã điều chỉnh. Chuyên cần tính trên trạng thái đã xác minh, không đếm số lần quét.</p>
      </div>

      {editing && (
        <Modal title={`Điều chỉnh điểm danh – ${editing.name}`} onClose={() => setEditing(null)}>
          <p className="text-slate-600">{editing.title}. Điều chỉnh chỉ được tính sau khi được duyệt; lịch sử được giữ.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label>Trạng thái
              <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {ADJUST_STATUS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label className="md:col-span-2">Lý do *<input className={input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
            <label className="md:col-span-3">Bằng chứng (link / số văn bản)<input className={input} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} /></label>
          </div>
          <div className="flex justify-end"><button type="button" className={primary} disabled={!form.reason.trim()} onClick={request}><Save className="w-4 h-4" /> Gửi đề nghị</button></div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- surveys
interface SurveyItem {
  name: string;
  type: string;
  average: number | null;
  scaleMax: number | null;
  answers: { text: string; count: number }[];
}

interface Survey {
  id: string;
  name: string;
  anonymous: boolean;
  responses: number;
  learners: number;
  responseRate: number | null;
  respondentsListed: number | null;
  satisfaction: number | null;
  items: SurveyItem[];
  syncedAt: string;
}

const SurveysTab: React.FC<{ cls: CorpClass }> = ({ cls }) => {
  const canRefresh = useStaffCan('corporate.classes');
  const [data, setData] = useState<{ learners: number; surveys: Survey[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get<{ learners: number; surveys: Survey[] }>(`/staff/corporate/classes/${cls.id}/surveys/`).then(setData).catch((e) => setError(errorText(e)));
  }, [cls.id]);
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      setData(await api.post<{ learners: number; surveys: Survey[] }>(`/staff/corporate/classes/${cls.id}/surveys/`));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  if (!data) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <p className="text-xs text-slate-500 max-w-3xl">
          Khảo sát là hoạt động “Phản hồi” (Feedback) trên Moodle: đặt trong khóa mẫu của khóa học thì mọi lớp tạo từ khóa đó đều có, chọn ẩn danh hay ghi tên
          khi tạo. Học viên làm khảo sát trên Moodle; kết quả được đọc về đây cùng lúc với điểm danh. Tỷ lệ phản hồi tính trên học viên còn trong danh sách lớp.
        </p>
        {canRefresh && (
          <button type="button" className={secondary} disabled={busy} onClick={refresh}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Cập nhật từ Moodle
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {data.surveys.length === 0 && <p className={`${card} text-xs text-slate-500`}>Lớp chưa có khảo sát nào trên Moodle (hoặc chưa đồng bộ).</p>}
      {data.surveys.map((sv) => (
        <div key={sv.id} className={`${card} space-y-3 text-xs`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-bold text-sm text-slate-800">{sv.name} <span className="font-normal text-slate-500">· {sv.anonymous ? 'ẩn danh' : 'ghi tên'}</span></div>
            <div className="text-slate-600">
              {sv.responses} phản hồi / {sv.learners} học viên{sv.responseRate != null ? ` (${sv.responseRate}%)` : ''}
              {sv.satisfaction != null && <> · Hài lòng <strong className="text-emerald-700">{sv.satisfaction}%</strong></>}
            </div>
          </div>
          <div className="space-y-2">
            {sv.items.filter((it) => it.answers.length || it.average != null).map((it) => {
              const total = it.answers.reduce((n, a) => n + a.count, 0);
              return (
                <div key={it.name}>
                  <div className="font-bold text-slate-700">{it.name}{it.average != null ? ` · trung bình ${it.average}${it.scaleMax ? `/${it.scaleMax}` : ''}` : ''}</div>
                  {it.answers.map((a) => (
                    <div key={a.text} className="flex items-center gap-2">
                      <span className="w-40 truncate text-slate-600">{a.text}</span>
                      <div className="flex-1 bg-slate-100 rounded h-2"><div className="bg-[#0073C1] h-2 rounded" style={{ width: `${total ? (100 * a.count) / total : 0}%` }} /></div>
                      <span className="w-8 text-right">{a.count}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">Cập nhật {new Date(sv.syncedAt).toLocaleString('vi-VN')}. Câu trả lời tự do xem trên Moodle.</p>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- results
interface ResultRow {
  enrollment: string;
  name: string;
  email: string;
  employeeCode: string;
  unit: string;
  sessionsTaken: number;
  sessionsAttended: number;
  attendanceRate: number | null;
  gradePercent: number | null;
  surveyAnswered: boolean | null;
  result: 'passed' | 'not_passed' | 'pending';
  reasons: string[];
}

interface Snapshot {
  id: string;
  version: number;
  status: 'draft' | 'published' | 'superseded';
  policy: CompletionPolicy;
  learners: ResultRow[];
  kpis: Record<string, number | null>;
  createdAt: string;
  publishedAt: string | null;
  publishedByName: string;
}

const RESULT: Record<ResultRow['result'], [string, string]> = {
  passed: ['Đạt', 'text-emerald-700'],
  not_passed: ['Không đạt', 'text-red-600'],
  pending: ['Chờ xác minh', 'text-amber-700']
};
const SNAPSHOT_STATUS: Record<Snapshot['status'], string> = { draft: 'Bản nháp', published: 'Đã phát hành', superseded: 'Đã thay thế' };
const KPI_LABELS: [string, string, string][] = [
  ['learners', 'Học viên', ''],
  ['passed', 'Đạt', ''],
  ['completionRate', 'Tỷ lệ hoàn thành', '%'],
  ['attendanceRate', 'Chuyên cần TB', '%'],
  ['learnerSessions', 'Lượt có mặt', ''],
  ['surveyResponseRate', 'Phản hồi khảo sát', '%'],
  ['satisfaction', 'Hài lòng', '%']
];

const ResultsTab: React.FC<{ cls: CorpClass; onChanged: () => void }> = ({ cls, onChanged }) => {
  const canEdit = useStaffCan('corporate.classes');
  const canPublish = useStaffCan('corporate.results_publish');
  const [versions, setVersions] = useState<Snapshot[] | null>(null);
  const [shown, setShown] = useState<Snapshot | null>(null);
  const [policy, setPolicy] = useState<CompletionPolicy>(cls.completionPolicy || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<Paginated<Snapshot>>(`/staff/corporate/results/?corporate_class=${cls.id}&pageSize=50`)
      .then((res) => {
        setVersions(res.results);
        setShown((cur) => res.results.find((v) => v.id === cur?.id) || res.results[0] || null);
      })
      .catch((e) => setError(errorText(e)));
  }, [cls.id]);
  useEffect(load, [load]);

  const run = async (call: () => Promise<Snapshot>) => {
    setBusy(true);
    setError('');
    try {
      const snap = await call();
      setShown(snap);
      load();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const savePolicyAndCompute = () =>
    run(async () => {
      await api.patch(`/staff/corporate/classes/${cls.id}/`, { completionPolicy: policy });
      return api.post<Snapshot>(`/staff/corporate/classes/${cls.id}/results/`);
    });
  const numberField = (key: 'minAttendance' | 'minGrade', label: string) => (
    <label>{label}
      <input type="number" min={0} max={100} className={input} disabled={!canEdit || Boolean(cls.lockedAt)} value={policy[key] ?? ''}
        onChange={(e) => setPolicy({ ...policy, [key]: e.target.value === '' ? undefined : Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className={`${card} space-y-3`}>
        <div className="font-bold text-sm text-slate-800">Điều kiện hoàn thành</div>
        <p className="text-xs text-slate-500">
          Kết quả tính từ chuyên cần đã xác minh (Moodle + điều chỉnh đã duyệt), điểm trên Moodle và khảo sát. Thiếu dữ liệu thì là “Chờ xác minh”, không tự coi là đạt.
          Phát hành sẽ chốt lớp (không điều chỉnh điểm danh nữa); sửa sau đó là một phiên bản mới, bản cũ được giữ.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs items-end">
          {numberField('minAttendance', 'Chuyên cần tối thiểu (%)')}
          {numberField('minGrade', 'Điểm tối thiểu (%)')}
          <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit || Boolean(cls.lockedAt)} checked={Boolean(policy.surveyRequired)} onChange={(e) => setPolicy({ ...policy, surveyRequired: e.target.checked })} /> Bắt buộc làm khảo sát</label>
          <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit || Boolean(cls.lockedAt)} checked={Boolean(policy.moodleCompletion)} onChange={(e) => setPolicy({ ...policy, moodleCompletion: e.target.checked })} /> Hoàn thành khóa trên Moodle</label>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {canEdit && !cls.lockedAt && (
            <button type="button" className={primary} disabled={busy} onClick={savePolicyAndCompute}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Tính kết quả (bản nháp)
            </button>
          )}
          {canPublish && cls.lockedAt && (
            <button type="button" className={secondary} disabled={busy}
              onClick={() => window.confirm('Mở lại để sửa? Lần phát hành sau sẽ là phiên bản mới.') && run(() => api.post<Snapshot>(`/staff/corporate/classes/${cls.id}/reopen/`))}>
              Mở lại để sửa
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {versions && versions.length > 1 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {versions.map((v) => (
            <button key={v.id} type="button" onClick={() => setShown(v)}
              className={`px-3 py-1 rounded-full border cursor-pointer ${shown?.id === v.id ? 'border-[#0073C1] text-[#0073C1] font-bold' : 'border-slate-300'}`}>
              v{v.version} · {SNAPSHOT_STATUS[v.status]}
            </button>
          ))}
        </div>
      )}
      {!versions ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : !shown ? (
        <p className={`${card} text-xs text-slate-500`}>Chưa tính kết quả.</p>
      ) : (
        <div className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-sm text-slate-800">
              Phiên bản {shown.version} · {SNAPSHOT_STATUS[shown.status]}
              {shown.publishedAt && <span className="font-normal text-slate-500"> · {new Date(shown.publishedAt).toLocaleString('vi-VN')}{shown.publishedByName ? ` bởi ${shown.publishedByName}` : ''}</span>}
            </div>
            <div className="flex gap-2">
              <a className={secondary} href={`${API_ROOT}/staff/corporate/results/${shown.id}/export/`}><Download className="w-4 h-4" /> Xuất Excel</a>
              {canPublish && shown.status === 'draft' && (
                <button type="button" className={primary} disabled={busy}
                  onClick={() => window.confirm('Phát hành kết quả? Lớp sẽ được chốt; bản phát hành không thay đổi.') && run(() => api.post<Snapshot>(`/staff/corporate/results/${shown.id}/publish/`))}>
                  <CheckCircle2 className="w-4 h-4" /> Phát hành
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            {KPI_LABELS.map(([key, label, unit]) => (
              <div key={key} className="border border-slate-200 rounded-xl p-2 text-center">
                <div className="text-lg font-bold text-slate-900">{shown.kpis[key] ?? '–'}{shown.kpis[key] != null ? unit : ''}</div>
                <div className="text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr><th className="p-2">Học viên</th><th className="p-2">Mã NV · đơn vị</th><th className="p-2 text-right">Chuyên cần</th><th className="p-2 text-right">Điểm</th><th className="p-2">Khảo sát</th><th className="p-2">Kết quả</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.learners.map((r) => {
                  const [label, tone] = RESULT[r.result];
                  return (
                    <tr key={r.enrollment}>
                      <td className="p-2"><div className="font-bold">{r.name}</div><div className="text-slate-500">{r.email}</div></td>
                      <td className="p-2">{r.employeeCode || '–'}{r.unit ? ` · ${r.unit}` : ''}</td>
                      <td className="p-2 text-right">{r.attendanceRate != null ? `${r.attendanceRate}%` : '–'} <span className="text-slate-500">({r.sessionsAttended}/{r.sessionsTaken})</span></td>
                      <td className="p-2 text-right">{r.gradePercent != null ? `${r.gradePercent}%` : '–'}</td>
                      <td className="p-2">{r.surveyAnswered == null ? '–' : r.surveyAnswered ? 'Đã làm' : 'Chưa làm'}</td>
                      <td className="p-2"><span className={`font-bold ${tone}`}>{label}</span>{r.reasons.map((t) => <div key={t} className="text-slate-500">{t}</div>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- communications (result e-mails)
interface BatchRecipient {
  id: string;
  name: string;
  to: string;
  cc: string[];
  rejected: string[];
  emailStatus: string;
  emailStatusLabel: string;
  error: string;
}

interface Batch {
  id: string;
  subject: string;
  message: string;
  status: 'draft' | 'approved' | 'sent' | 'cancelled';
  snapshotVersion: number;
  corrects: string | null;
  createdAt: string;
  createdByName: string;
  approvedByName: string;
  sentAt: string | null;
  recipients: BatchRecipient[];
}

const BATCH_STATUS: Record<Batch['status'], [string, string]> = {
  draft: ['Chờ duyệt', 'text-amber-700'],
  approved: ['Đã duyệt', 'text-blue-700'],
  sent: ['Đã gửi', 'text-emerald-700'],
  cancelled: ['Đã hủy', 'text-slate-500']
};

const CommunicationsTab: React.FC<{ cls: CorpClass }> = ({ cls }) => {
  const canSend = useStaffCan('corporate.communications_send');
  const canApprove = useStaffCan('corporate.approve');
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; message: string; corrects: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<Paginated<Batch>>(`/staff/corporate/communications/?corporate_class=${cls.id}&pageSize=50`)
      .then((res) => setBatches(res.results))
      .catch((e) => setError(errorText(e)));
  }, [cls.id]);
  useEffect(load, [load]);

  const act = async (call: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await call();
      if (done) setNotice(done);
      load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    draft &&
    act(async () => {
      const b = await api.post<Batch>('/staff/corporate/communications/', { corporateClass: cls.id, ...draft });
      setDraft(null);
      setOpen(b.id);
    });
  const send = (b: Batch) =>
    act(async () => {
      const res = await api.post<{ sent: number; failed: number; skipped: number }>(`/staff/corporate/communications/${b.id}/send/`);
      setNotice(`Đã gửi ${res.sent} thư${res.failed ? `, ${res.failed} thư lỗi (bấm Gửi lại để thử lại các thư lỗi)` : ''}.`);
    });

  if (!batches) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <p className="text-xs text-slate-500 max-w-3xl">
          Thư kết quả cuối khóa: mỗi học viên một thư với kết quả của riêng mình (từ bản kết quả đã phát hành), CC cán bộ quản lý và CC mặc định của khách hàng theo
          chính sách tên miền. Người nhận được chốt khi tạo lô; lô chỉ gửi sau khi được duyệt. Gửi nhầm thì tạo lô đính chính, không sửa thư đã gửi.
        </p>
        {canSend && (
          <button type="button" className={primary} disabled={!cls.lockedAt} title={cls.lockedAt ? '' : 'Phát hành kết quả trước'}
            onClick={() => setDraft({ subject: '', message: '', corrects: null })}>
            <Mail className="w-4 h-4" /> Tạo lô thư kết quả
          </button>
        )}
      </div>
      {notice && <p className="text-xs text-emerald-700 font-bold">{notice}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {batches.length === 0 && <p className={`${card} text-xs text-slate-500`}>Chưa có lô thư nào.</p>}
      {batches.map((b) => {
        const [label, tone] = BATCH_STATUS[b.status];
        const failed = b.recipients.filter((r) => r.emailStatus === 'failed').length;
        // A batch waiting for approval always shows its recipients: that is when they are reviewed.
        const expanded = b.status === 'draft' || open === b.id;
        return (
          <div key={b.id} className={`${card} space-y-3 text-xs`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="text-left cursor-pointer" onClick={() => setOpen(open === b.id ? null : b.id)}>
                <div className="font-bold text-sm text-slate-800">{b.subject}</div>
                <div className="text-slate-500">
                  <span className={`font-bold ${tone}`}>{label}</span> · {b.recipients.length} thư · kết quả v{b.snapshotVersion} · tạo bởi {b.createdByName || '–'}
                  {b.approvedByName ? ` · duyệt bởi ${b.approvedByName}` : ''}{b.sentAt ? ` · gửi ${new Date(b.sentAt).toLocaleString('vi-VN')}` : ''}
                </div>
              </button>
              <div className="flex gap-2">
                {canApprove && b.status === 'draft' && <button type="button" className={secondary} disabled={busy} onClick={() => act(() => api.post(`/staff/corporate/communications/${b.id}/approve/`), 'Đã duyệt lô thư.')}><CheckCircle2 className="w-4 h-4" /> Duyệt</button>}
                {canSend && (b.status === 'approved' || (b.status === 'sent' && failed > 0)) && <button type="button" className={primary} disabled={busy} onClick={() => send(b)}><Mail className="w-4 h-4" /> {b.status === 'sent' ? 'Gửi lại thư lỗi' : `Gửi ${b.recipients.length} thư`}</button>}
                {canSend && (b.status === 'draft' || b.status === 'approved') && <button type="button" className={secondary} disabled={busy} onClick={() => act(() => api.post(`/staff/corporate/communications/${b.id}/cancel/`))}>Hủy</button>}
                {canSend && b.status === 'sent' && <button type="button" className={secondary} disabled={busy || !cls.lockedAt} onClick={() => setDraft({ subject: '', message: '', corrects: b.id })}>Gửi đính chính</button>}
              </div>
            </div>
            {expanded && (
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-600 text-left sticky top-0"><tr><th className="p-2">Học viên</th><th className="p-2">Gửi tới</th><th className="p-2">CC</th><th className="p-2">CC bị loại</th><th className="p-2">Trạng thái thư</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {b.recipients.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 font-bold">{r.name}</td>
                        <td className="p-2">{r.to}</td>
                        <td className="p-2">{r.cc.join(', ') || '–'}</td>
                        <td className="p-2 text-red-600">{r.rejected.join(', ')}</td>
                        <td className="p-2">{r.emailStatusLabel || 'Chưa gửi'}{r.error ? <div className="text-red-600">{r.error}</div> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {draft && (
        <Modal title={draft.corrects ? 'Lô thư đính chính' : 'Tạo lô thư kết quả'} onClose={() => setDraft(null)}>
          <p className="text-slate-600">Kết quả từng học viên lấy từ bản kết quả đã phát hành mới nhất. Lời nhắn dưới đây hiện trong mọi thư.</p>
          <label className="block">Tiêu đề (để trống: “Kết quả khóa học …”)<input className={input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label>
          <label className="block">Lời nhắn<textarea rows={5} className={input} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="VD: Cảm ơn anh/chị đã tham gia khóa học. Tài liệu buổi học được đính kèm trên hệ thống…" /></label>
          <div className="flex justify-end"><button type="button" className={primary} disabled={busy} onClick={create}><Save className="w-4 h-4" /> Tạo lô (chờ duyệt)</button></div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- documents & checklist
interface ClassDocument {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  version: number;
  fileName: string;
  size: number;
  note: string;
  uploadedByName: string;
  createdAt: string;
}

const DOCUMENT_KINDS: [string, string][] = [
  ['attendance', 'Danh sách điểm danh có ký'],
  ['acceptance_record', 'Biên bản nghiệm thu'],
  ['invoice', 'Hóa đơn'],
  ['results', 'Kết quả / báo cáo'],
  ['survey', 'Khảo sát'],
  ['roster', 'Danh sách học viên'],
  ['contract', 'Hợp đồng / phụ lục'],
  ['other', 'Khác']
];

const DocumentsTab: React.FC<{ cls: CorpClass }> = ({ cls }) => {
  const canUpload = useStaffCan('corporate.classes');
  const [data, setData] = useState<{ documents: ClassDocument[]; checklist: { kind: string; label: string; done: boolean; source: string }[] } | null>(null);
  const [form, setForm] = useState({ kind: 'attendance', title: '', note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api.get<NonNullable<typeof data>>(`/staff/corporate/classes/${cls.id}/documents/`).then(setData).catch((e) => setError(errorText(e)));
  }, [cls.id]);
  useEffect(load, [load]);
  const upload = async () => {
    if (!file) return;
    const body = new FormData();
    body.append('kind', form.kind);
    body.append('title', form.title);
    body.append('note', form.note);
    body.append('file', file);
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/staff/corporate/classes/${cls.id}/documents/`, { method: 'POST', body });
      setForm({ ...form, title: '', note: '' });
      setFile(null);
      load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  if (!data) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  return (
    <div className="space-y-4">
      <div className={`${card} space-y-2`}>
        <div className="font-bold text-sm text-slate-800">Checklist hồ sơ nghiệm thu</div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {data.checklist.map((c) => (
            <li key={c.kind} className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${c.done ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
              {c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-amber-600" />}
              <span><strong>{c.label}</strong>{c.source === 'system' ? ' · có trên hệ thống' : c.source === 'upload' ? ' · đã tải lên' : ' · còn thiếu'}</span>
            </li>
          ))}
        </ul>
      </div>
      {canUpload && (
        <div className={`${card} space-y-3 text-xs`}>
          <div className="font-bold text-sm text-slate-800">Tải lên tài liệu</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <label>Loại
              <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {DOCUMENT_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label>Tiêu đề (trùng tiêu đề = phiên bản mới)<input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Để trống: tên tệp" /></label>
            <label>Ghi chú<input className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <label>Tệp (PDF, Word, Excel, ảnh, ZIP; ≤ 15 MB)<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
          </div>
          <div className="flex justify-end">
            <button type="button" className={primary} disabled={busy || !file} onClick={upload}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tải lên</button>
          </div>
          {error && <p className="text-red-600">{error}</p>}
        </div>
      )}
      <div className={`${card} p-0 overflow-x-auto`}>
        {data.documents.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có tài liệu tải lên.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left"><tr><th className="p-2">Tài liệu</th><th className="p-2">Loại</th><th className="p-2">Phiên bản</th><th className="p-2">Người tải · lúc</th><th className="p-2" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.documents.map((d) => (
                <tr key={d.id}>
                  <td className="p-2"><div className="font-bold">{d.title}</div><div className="text-slate-500">{d.fileName} · {Math.ceil(d.size / 1024)} KB{d.note ? ` · ${d.note}` : ''}</div></td>
                  <td className="p-2">{d.kindLabel}</td>
                  <td className="p-2">v{d.version}</td>
                  <td className="p-2">{d.uploadedByName || '–'} · {new Date(d.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="p-2"><a className="text-[#0073C1] font-bold flex items-center gap-1" href={`${API_ROOT}/staff/corporate/documents/${d.id}/download/`}><Download className="w-4 h-4" /> Tải</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- costs
interface Expense {
  id: string;
  kind: 'expense' | 'advance' | 'settlement';
  kindLabel: string;
  category: string;
  categoryLabel: string;
  supplier: string;
  description: string;
  amount: number;
  vatAmount: number;
  incurredOn: string;
  advance: string | null;
  settled: number | null;
  approvedAt: string | null;
  approvedByName: string;
}

const EXPENSE_CATEGORIES: [string, string][] = [
  ['trainer', 'Giảng viên'],
  ['venue', 'Phòng học'],
  ['travel', 'Đi lại, lưu trú'],
  ['materials', 'In ấn, tài liệu'],
  ['catering', 'Ăn uống'],
  ['equipment', 'Thiết bị'],
  ['other', 'Khác']
];
const EMPTY_EXPENSE = { kind: 'expense', category: 'trainer', supplier: '', description: '', amount: '', vatAmount: '', incurredOn: new Date().toISOString().slice(0, 10), advance: '' };

const CostsTab: React.FC<{ cls: CorpClass }> = ({ cls }) => {
  const canEdit = useStaffCan('corporate.acceptance');
  const canApprove = useStaffCan('corporate.approve');
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api.get<Paginated<Expense>>(`/staff/corporate/expenses/?corporate_class=${cls.id}&pageSize=200`).then((res) => setRows(res.results)).catch((e) => setError(errorText(e)));
  }, [cls.id]);
  useEffect(load, [load]);
  const add = async () => {
    setError('');
    try {
      await api.post('/staff/corporate/expenses/', {
        corporateClass: cls.id,
        contract: cls.contract,
        kind: form.kind,
        category: form.category,
        supplier: form.supplier,
        description: form.description,
        amount: Number(form.amount),
        vatAmount: Number(form.vatAmount || 0),
        incurredOn: form.incurredOn,
        advance: form.kind === 'settlement' ? form.advance || null : null
      });
      setForm(EMPTY_EXPENSE);
      load();
    } catch (e) {
      setError(errorText(e));
    }
  };
  const act = async (call: () => Promise<unknown>) => {
    setError('');
    try {
      await call();
      load();
    } catch (e) {
      setError(errorText(e));
    }
  };
  if (!rows) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const costs = rows.filter((r) => r.kind !== 'advance').reduce((n, r) => n + r.amount, 0);
  const advances = rows.filter((r) => r.kind === 'advance');
  return (
    <div className="space-y-4">
      <div className={`${card} text-xs space-y-1`}>
        <div className="font-bold text-sm text-slate-800">Chi phí lớp: {vnd(costs)} <span className="font-normal text-slate-500">(trước thuế; tạm ứng chỉ tính khi quyết toán)</span></div>
        {advances.length > 0 && <p className="text-slate-600">Tạm ứng: {advances.map((a) => `${a.description} ${vnd(a.amount)} (đã quyết toán ${vnd(a.settled || 0)})`).join(' · ')}</p>}
      </div>
      {canEdit && (
        <div className={`${card} space-y-3 text-xs`}>
          <div className="font-bold text-sm text-slate-800">Ghi nhận khoản chi</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label>Loại
              <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="expense">Chi phí</option>
                <option value="advance">Tạm ứng</option>
                <option value="settlement">Quyết toán tạm ứng</option>
              </select>
            </label>
            <label>Hạng mục
              <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label>Ngày<input type="date" className={input} value={form.incurredOn} onChange={(e) => setForm({ ...form, incurredOn: e.target.value })} /></label>
            {form.kind === 'settlement' ? (
              <label>Quyết toán cho tạm ứng
                <select className={input} value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })}>
                  <option value="">– Chọn –</option>
                  {advances.map((a) => <option key={a.id} value={a.id}>{a.description} · {vnd(a.amount)}</option>)}
                </select>
              </label>
            ) : (
              <label>Nhà cung cấp / người nhận<input className={input} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></label>
            )}
            <label className="md:col-span-2">Nội dung *<input className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Số tiền trước thuế (đ) *<input type="number" min={1} className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label>Thuế GTGT (đ)<input type="number" min={0} className={input} value={form.vatAmount} onChange={(e) => setForm({ ...form, vatAmount: e.target.value })} /></label>
          </div>
          <div className="flex justify-end"><button type="button" className={primary} disabled={!form.description.trim() || !form.amount} onClick={add}><Plus className="w-4 h-4" /> Ghi nhận</button></div>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có khoản chi nào.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left"><tr><th className="p-2">Ngày</th><th className="p-2">Nội dung</th><th className="p-2">Loại · hạng mục</th><th className="p-2 text-right">Số tiền</th><th className="p-2">Duyệt</th><th className="p-2" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className={r.kind === 'advance' ? 'text-slate-500' : ''}>
                  <td className="p-2">{r.incurredOn}</td>
                  <td className="p-2"><div className="font-bold">{r.description}</div>{r.supplier && <div className="text-slate-500">{r.supplier}</div>}</td>
                  <td className="p-2">{r.kindLabel} · {r.categoryLabel}</td>
                  <td className="p-2 text-right">{vnd(r.amount)}{r.vatAmount ? <div className="text-slate-500">VAT {vnd(r.vatAmount)}</div> : null}</td>
                  <td className="p-2">{r.approvedAt ? `Đã duyệt${r.approvedByName ? ` · ${r.approvedByName}` : ''}` : canApprove ? <button type="button" className="text-emerald-700 font-bold cursor-pointer" onClick={() => act(() => api.post(`/staff/corporate/expenses/${r.id}/approve/`))}>Duyệt</button> : 'Chờ duyệt'}</td>
                  <td className="p-2">{canEdit && !r.approvedAt && <button type="button" title="Xóa" className="text-red-500 cursor-pointer" onClick={() => window.confirm('Xóa khoản chi?') && act(() => api.delete(`/staff/corporate/expenses/${r.id}/`))}><X className="w-4 h-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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
  const [tab, setTab] = useState<'learners' | 'attendance' | 'surveys' | 'results' | 'communications' | 'documents' | 'costs' | 'overview'>('learners');
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
        {([['learners', 'Học viên'], ['attendance', 'Điểm danh'], ['surveys', 'Khảo sát'], ['results', 'Kết quả'], ['communications', 'Truyền thông'], ['documents', 'Hồ sơ'], ['costs', 'Chi phí'], ['overview', 'Tổng quan']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`px-4 py-2 text-xs font-bold cursor-pointer border-b-2 ${tab === key ? 'border-[#0073C1] text-[#0073C1]' : 'border-transparent text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'learners' ? (
        <LearnersTab cls={cls} canEdit={canEdit} onChanged={load} version={listVersion} />
      ) : tab === 'attendance' ? (
        <AttendanceTab cls={cls} />
      ) : tab === 'surveys' ? (
        <SurveysTab cls={cls} />
      ) : tab === 'results' ? (
        <ResultsTab cls={cls} onChanged={load} />
      ) : tab === 'communications' ? (
        <CommunicationsTab cls={cls} />
      ) : tab === 'documents' ? (
        <DocumentsTab cls={cls} />
      ) : tab === 'costs' ? (
        <CostsTab cls={cls} />
      ) : (
        <div className={`${card} text-xs space-y-2`}>
          <p><strong>Chứng chỉ TWings:</strong> {cls.issueCertificate ? 'Có cấp khi hoàn thành' : 'Không cấp (theo hợp đồng)'}</p>
          <p><strong>Lịch:</strong> {cls.scheduleText || 'Chưa có mô tả lịch'} · {cls.sessions} buổi (điểm danh trên Moodle, mỗi buổi một phiên)</p>
          <p><strong>Giảng viên chính:</strong> {cls.leadInstructorName || '–'}</p>
          {cls.note && <p><strong>Ghi chú:</strong> {cls.note}</p>}
          <p className="text-slate-500">{cls.lockedAt ? `Kết quả đã chốt lúc ${new Date(cls.lockedAt).toLocaleString('vi-VN')}.` : 'Kết quả chưa chốt.'}</p>
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

// ================================================================ acceptance (nghiệm thu)
interface AcceptanceLine {
  id: string;
  kind: 'service' | 'adjustment';
  corporateClass: string | null;
  className: string;
  snapshotVersion: number | null;
  adjusts: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: number | null;
  vatAmount: number;
}

interface AcceptanceBatch {
  id: string;
  contract: string;
  contractNumber: string;
  client: string;
  clientCode: string;
  title: string;
  periodFrom: string | null;
  periodTo: string | null;
  learnerBasis: 'listed' | 'attended' | 'passed';
  status: 'draft' | 'submitted' | 'approved' | 'accepted' | 'cancelled';
  invoiceNumber: string;
  invoiceDate: string | null;
  note: string;
  createdByName: string;
  approvedByName: string;
  lines: AcceptanceLine[];
  totals: { amount: number; vat: number; total: number; lines: number };
}

const ACCEPTANCE_STATUS: Record<AcceptanceBatch['status'], [string, string]> = {
  draft: ['Đang lập', 'text-slate-600'],
  submitted: ['Chờ duyệt nội bộ', 'text-amber-700'],
  approved: ['Đã duyệt – gửi khách hàng', 'text-blue-700'],
  accepted: ['Khách hàng đã nghiệm thu', 'text-emerald-700'],
  cancelled: ['Đã hủy', 'text-slate-400']
};
const LEARNER_BASIS: [AcceptanceBatch['learnerBasis'], string][] = [
  ['listed', 'Học viên trong danh sách lớp'],
  ['attended', 'Học viên có mặt ít nhất 1 buổi'],
  ['passed', 'Học viên đạt']
];

export const CorporateAcceptancePage: React.FC = () => {
  const search = useAppSearch();
  const id = search.get('id');
  return id ? <AcceptanceDetail key={id} id={id} /> : <AcceptanceList />;
};

const AcceptanceList: React.FC = () => {
  const canCreate = useStaffCan('corporate.acceptance');
  const { clients } = useClients();
  const [rows, setRows] = useState<AcceptanceBatch[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get<Paginated<AcceptanceBatch>>('/staff/corporate/acceptances/?pageSize=200').then((res) => setRows(res.results)).catch((e) => setError(errorText(e)));
  }, []);
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div>
          <h2 className="font-bold text-slate-900">Nghiệm thu</h2>
          <p className="text-xs text-slate-500">
            Mỗi đợt nghiệm thu thuộc một hợp đồng: các lớp đã phát hành kết quả × đơn giá hợp đồng. Khối lượng lấy từ kết quả và lịch học, không nhập tay.
            Đợt khách hàng đã nghiệm thu không sửa được; sai sót xử lý bằng dòng điều chỉnh ở đợt sau.
          </p>
        </div>
        {canCreate && <button type="button" className={primary} onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Lập đợt nghiệm thu</button>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        {!rows ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 m-5" />
        ) : rows.length === 0 ? (
          <p className="p-5 text-xs text-slate-500">Chưa có đợt nghiệm thu.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left"><tr><th className="p-3">Đợt</th><th className="p-3">Khách hàng · HĐ</th><th className="p-3 text-right">Dòng</th><th className="p-3 text-right">Tổng (gồm VAT)</th><th className="p-3">Hóa đơn</th><th className="p-3">Trạng thái</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => {
                const [label, tone] = ACCEPTANCE_STATUS[b.status];
                return (
                  <tr key={b.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/corporate/acceptance?id=${b.id}`)}>
                    <td className="p-3 font-bold">{b.title}</td>
                    <td className="p-3">{b.clientCode} · {b.contractNumber}</td>
                    <td className="p-3 text-right">{b.totals.lines}</td>
                    <td className="p-3 text-right">{vnd(b.totals.total)}</td>
                    <td className="p-3">{b.invoiceNumber || '–'}</td>
                    <td className={`p-3 font-bold ${tone}`}>{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {creating && <AcceptanceCreator clients={clients} onClose={() => setCreating(false)} />}
    </div>
  );
};

const AcceptanceCreator: React.FC<{ clients: Client[]; onClose: () => void }> = ({ clients, onClose }) => {
  const [client, setClient] = useState('');
  const { contracts } = useContracts(client);
  const [contract, setContract] = useState('');
  const [eligible, setEligible] = useState<{ id: string; name: string; courseTitle: string; startDate: string | null }[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [d, setD] = useState({ title: '', periodFrom: '', periodTo: '', learnerBasis: 'listed', adjustmentOnly: false });
  const [error, setError] = useState('');
  useEffect(() => {
    setEligible([]);
    setPicked([]);
    if (!contract) return;
    api
      .get<{ id: string; name: string; courseTitle: string; startDate: string | null }[]>(`/staff/corporate/acceptances/eligible/?contract=${contract}`)
      .then((rows) => {
        setEligible(rows);
        setPicked(rows.map((r) => r.id));
      })
      .catch((e) => setError(errorText(e)));
  }, [contract]);
  const create = async () => {
    try {
      const b = await api.post<AcceptanceBatch>('/staff/corporate/acceptances/', {
        contract,
        title: d.title.trim(),
        periodFrom: d.periodFrom || null,
        periodTo: d.periodTo || null,
        learnerBasis: d.learnerBasis,
        adjustmentOnly: d.adjustmentOnly,
        classes: d.adjustmentOnly ? [] : picked
      });
      navigate(`/corporate/acceptance?id=${b.id}`);
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <Modal title="Lập đợt nghiệm thu" onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label>Khách hàng
          <select className={input} value={client} onChange={(e) => { setClient(e.target.value); setContract(''); }}>
            <option value="">– Chọn –</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
          </select>
        </label>
        <label>Hợp đồng
          <select className={input} value={contract} onChange={(e) => setContract(e.target.value)}>
            <option value="">– Chọn –</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.number}{c.title ? ` – ${c.title}` : ''}</option>)}
          </select>
        </label>
        <label>Tên đợt *<input className={input} value={d.title} placeholder="VD: Nghiệm thu đợt 1/2026" onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
        <label>Kỳ từ ngày<input type="date" className={input} value={d.periodFrom} onChange={(e) => setD({ ...d, periodFrom: e.target.value })} /></label>
        <label>Đến ngày (tính buổi / giờ đã học tới ngày này)<input type="date" className={input} value={d.periodTo} onChange={(e) => setD({ ...d, periodTo: e.target.value })} /></label>
        <label>Đơn giá theo học viên tính trên
          <select className={input} value={d.learnerBasis} onChange={(e) => setD({ ...d, learnerBasis: e.target.value })}>
            {LEARNER_BASIS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={d.adjustmentOnly} onChange={(e) => setD({ ...d, adjustmentOnly: e.target.checked })} /> Đợt chỉ gồm điều chỉnh cho đợt đã nghiệm thu (không thêm lớp)</label>
      {!d.adjustmentOnly && contract && (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          {eligible.length === 0 && <p className="p-3 text-slate-500">Không có lớp nào của hợp đồng đã phát hành kết quả mà chưa nghiệm thu.</p>}
          {eligible.map((c) => (
            <label key={c.id} className="p-2 flex items-center gap-2">
              <input type="checkbox" checked={picked.includes(c.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))} />
              <span><strong>{c.name}</strong> · {c.courseTitle} · khai giảng {day(c.startDate)}</span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button type="button" className={primary} disabled={!contract || !d.title.trim() || (!d.adjustmentOnly && picked.length === 0)} onClick={create}><Save className="w-4 h-4" /> Lập đợt</button>
      </div>
    </Modal>
  );
};

const AcceptanceDetail: React.FC<{ id: string }> = ({ id }) => {
  const canEdit = useStaffCan('corporate.acceptance');
  const canApprove = useStaffCan('corporate.approve');
  const [batch, setBatch] = useState<AcceptanceBatch | null>(null);
  const [acceptedLines, setAcceptedLines] = useState<(AcceptanceLine & { batchTitle: string })[]>([]);
  const [adjusting, setAdjusting] = useState(false);
  const [adj, setAdj] = useState({ adjusts: '', description: '', amount: '', vatRate: '' });
  const [invoice, setInvoice] = useState<{ invoiceNumber: string; invoiceDate: string } | null>(null);
  const [error, setError] = useState('');
  const base = `/staff/corporate/acceptances/${id}/`;

  useEffect(() => {
    api.get<AcceptanceBatch>(base).then(setBatch).catch((e) => setError(errorText(e)));
  }, [base]);
  useEffect(() => {
    if (!batch || batch.status !== 'draft') return;
    api
      .get<Paginated<AcceptanceBatch>>(`/staff/corporate/acceptances/?contract=${batch.contract}&status=accepted&pageSize=200`)
      .then((res) => setAcceptedLines(res.results.flatMap((b) => b.lines.filter((l) => l.kind === 'service').map((l) => ({ ...l, batchTitle: b.title })))))
      .catch(() => setAcceptedLines([]));
  }, [batch]);

  const run = async (path: string, body?: unknown) => {
    setError('');
    try {
      setBatch(await api.post<AcceptanceBatch>(`${base}${path}`, body));
    } catch (e) {
      setError(errorText(e));
    }
  };
  const addAdjustment = async () => {
    await run('adjustments/', {
      adjusts: adj.adjusts || null,
      description: adj.description,
      amount: Number(adj.amount),
      vatRate: adj.vatRate === '' ? null : Number(adj.vatRate)
    });
    setAdjusting(false);
    setAdj({ adjusts: '', description: '', amount: '', vatRate: '' });
  };

  if (!batch) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const [label, tone] = ACCEPTANCE_STATUS[batch.status];
  const draft = batch.status === 'draft';
  return (
    <div className="space-y-4">
      <BackLink to="/corporate/acceptance" label="Danh sách nghiệm thu" />
      <div className={`${card} flex flex-wrap items-start justify-between gap-3`}>
        <div className="text-xs space-y-1">
          <h2 className="font-bold text-slate-900 text-lg">{batch.title}</h2>
          <p>{batch.clientCode} · HĐ {batch.contractNumber} · {LEARNER_BASIS.find(([k]) => k === batch.learnerBasis)?.[1]}{batch.periodTo ? ` · tính đến ${day(batch.periodTo)}` : ''}</p>
          <p><span className={`font-bold ${tone}`}>{label}</span>{batch.approvedByName ? ` · duyệt bởi ${batch.approvedByName}` : ''}{batch.invoiceNumber ? ` · hóa đơn ${batch.invoiceNumber}${batch.invoiceDate ? ` ngày ${day(batch.invoiceDate)}` : ''}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={secondary} href={`${API_ROOT}${base}export/`}><Download className="w-4 h-4" /> Xuất Excel</a>
          {canEdit && draft && <button type="button" className={secondary} onClick={() => setAdjusting(true)}><Plus className="w-4 h-4" /> Dòng điều chỉnh</button>}
          {canEdit && draft && <button type="button" className={primary} onClick={() => run('submit/')}>Gửi duyệt</button>}
          {canApprove && batch.status === 'submitted' && <button type="button" className={primary} onClick={() => run('approve/')}><CheckCircle2 className="w-4 h-4" /> Duyệt</button>}
          {canEdit && batch.status === 'approved' && <button type="button" className={primary} onClick={() => setInvoice({ invoiceNumber: '', invoiceDate: '' })}><CheckCircle2 className="w-4 h-4" /> Khách hàng đã nghiệm thu</button>}
          {canEdit && (batch.status === 'submitted' || batch.status === 'approved') && <button type="button" className={secondary} onClick={() => run('back-to-draft/')}>Trả về đang lập</button>}
          {canEdit && batch.status !== 'accepted' && batch.status !== 'cancelled' && <button type="button" className={secondary} onClick={() => window.confirm('Hủy đợt nghiệm thu? Các lớp sẽ được lập lại ở đợt khác.') && run('cancel/')}>Hủy đợt</button>}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className={`${card} p-0 overflow-x-auto`}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr><th className="p-2">Nội dung</th><th className="p-2">ĐVT</th><th className="p-2 text-right">Khối lượng</th><th className="p-2 text-right">Đơn giá</th><th className="p-2 text-right">Thành tiền</th><th className="p-2 text-right">VAT</th>{canEdit && draft && <th className="p-2" />}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batch.lines.map((l) => (
              <tr key={l.id} className={l.kind === 'adjustment' ? 'bg-amber-50/40' : ''}>
                <td className="p-2">{l.kind === 'adjustment' && <span className="font-bold text-amber-700">[Điều chỉnh] </span>}{l.description}{l.snapshotVersion ? <span className="text-slate-400"> · kết quả v{l.snapshotVersion}</span> : null}</td>
                <td className="p-2">{l.unit}</td>
                <td className="p-2 text-right">{new Intl.NumberFormat('vi-VN').format(l.quantity)}</td>
                <td className="p-2 text-right">{vnd(l.unitPrice)}</td>
                <td className="p-2 text-right">{vnd(l.amount)}</td>
                <td className="p-2 text-right">{l.vatRate != null ? `${l.vatRate}% · ${vnd(l.vatAmount)}` : '–'}</td>
                {canEdit && draft && <td className="p-2"><button type="button" title="Bỏ dòng" className="text-red-500 cursor-pointer" onClick={() => run('remove-line/', { line: l.id })}><X className="w-4 h-4" /></button></td>}
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold">
            <tr><td className="p-2" colSpan={4}>Cộng trước thuế</td><td className="p-2 text-right">{vnd(batch.totals.amount)}</td><td /></tr>
            <tr><td className="p-2" colSpan={4}>Thuế GTGT</td><td className="p-2 text-right">{vnd(batch.totals.vat)}</td><td /></tr>
            <tr><td className="p-2" colSpan={4}>Tổng cộng</td><td className="p-2 text-right">{vnd(batch.totals.total)}</td><td /></tr>
          </tfoot>
        </table>
      </div>
      {adjusting && (
        <Modal title="Dòng điều chỉnh" onClose={() => setAdjusting(false)}>
          <p className="text-slate-600">Số tiền trước thuế, âm để giảm. Gắn với dòng của đợt đã nghiệm thu nếu là đính chính đợt đó.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="md:col-span-3">Điều chỉnh cho dòng (tùy chọn)
              <select className={input} value={adj.adjusts} onChange={(e) => setAdj({ ...adj, adjusts: e.target.value })}>
                <option value="">– Không gắn –</option>
                {acceptedLines.map((l) => <option key={l.id} value={l.id}>{l.batchTitle}: {l.description} ({vnd(l.amount)})</option>)}
              </select>
            </label>
            <label className="md:col-span-3">Nội dung / lý do *<input className={input} value={adj.description} onChange={(e) => setAdj({ ...adj, description: e.target.value })} /></label>
            <label>Số tiền (đ) *<input type="number" className={input} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} /></label>
            <label>VAT (%)<input type="number" min={0} max={100} className={input} value={adj.vatRate} onChange={(e) => setAdj({ ...adj, vatRate: e.target.value })} placeholder="theo dòng / HĐ" /></label>
          </div>
          <div className="flex justify-end"><button type="button" className={primary} disabled={!adj.description.trim() || adj.amount === ''} onClick={addAdjustment}><Save className="w-4 h-4" /> Thêm</button></div>
        </Modal>
      )}
      {invoice && (
        <Modal title="Khách hàng đã nghiệm thu" onClose={() => setInvoice(null)}>
          <p className="text-slate-600">Sau bước này đợt nghiệm thu không sửa được nữa.</p>
          <div className="grid grid-cols-2 gap-3">
            <label>Số hóa đơn (phần mềm kế toán)<input className={input} value={invoice.invoiceNumber} onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })} /></label>
            <label>Ngày hóa đơn<input type="date" className={input} value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></label>
          </div>
          <div className="flex justify-end">
            <button type="button" className={primary} onClick={async () => { await run('accept/', { invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate || null }); setInvoice(null); }}>
              <CheckCircle2 className="w-4 h-4" /> Xác nhận
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ================================================================ overview (Tổng quan B2B)
interface OverviewRow {
  id: string;
  clientCode: string;
  name: string;
  courseTitle: string;
  status: string;
  startDate: string | null;
  learners: number;
  resultsPublished: boolean;
  completionRate: number | null;
  attendanceRate: number | null;
  satisfaction: number | null;
  acceptedAmount: number;
  costs: number;
  margin: number | null;
}

interface Overview {
  activity: Record<string, number>;
  quality: Record<string, number | null>;
  finance: Record<string, number>;
  classes: OverviewRow[];
  alerts: { level: 'error' | 'warning' | 'info'; text: string; class?: string; acceptance?: string }[];
  kpiDictionary: Record<string, string>;
}

const Tile: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="border border-slate-200 rounded-xl p-3 bg-white" title={hint}>
    <div className="text-lg font-bold text-slate-900">{value}</div>
    <div className="text-[11px] text-slate-500">{label}{hint ? ' ⓘ' : ''}</div>
  </div>
);
const pct = (v: number | null | undefined) => (v == null ? '–' : `${v}%`);
const ALERT_TONE = { error: 'border-red-200 bg-red-50 text-red-800', warning: 'border-amber-200 bg-amber-50 text-amber-900', info: 'border-slate-200 bg-slate-50 text-slate-700' };

export const CorporateOverviewPage: React.FC = () => {
  const { clients } = useClients();
  const [client, setClient] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    api.get<Overview>(`/staff/corporate/dashboard/${client ? `?client=${client}` : ''}`).then(setData).catch((e) => setError(errorText(e)));
  }, [client]);
  if (!data) return error ? <p className="text-xs text-red-600">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  const k = data.kpiDictionary;
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h2 className="font-bold text-slate-900">Tổng quan đào tạo doanh nghiệp</h2>
          <p className="text-xs text-slate-500">Số quản trị của mảng B2B (không gộp học phí B2C). Rê chuột lên ô số để xem định nghĩa.</p>
        </div>
        <select className={`${input} max-w-xs`} value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">Mọi khách hàng</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Tile label="Lớp (đang học)" value={`${data.activity.classes} (${data.activity.classesRunning})`} />
        <Tile label="Lượt học viên" value={data.activity.learnerEnrolments} hint={k.learnerEnrolments} />
        <Tile label="Học viên duy nhất" value={data.activity.uniqueLearners} hint={k.uniqueLearners} />
        <Tile label="Buổi đã học" value={data.activity.sessionsHeld} />
        <Tile label="Hoàn thành TB" value={pct(data.quality.completionRate)} hint={k.completionRate} />
        <Tile label="Chuyên cần TB" value={pct(data.quality.attendanceRate)} hint={k.attendanceRate} />
        <Tile label="Hài lòng TB" value={pct(data.quality.satisfaction)} hint={k.satisfaction} />
        <Tile label="Giá trị HĐ hiệu lực" value={vnd(data.finance.contractValue)} hint={k.contractValue} />
        <Tile label="Đã nghiệm thu" value={vnd(data.finance.acceptedAmount)} hint={k.acceptedAmount} />
        <Tile label="Chờ nghiệm thu" value={vnd(data.finance.awaitingAcceptance)} />
        <Tile label="Chi phí" value={vnd(data.finance.costs)} hint={k.costs} />
        <Tile label="Biên đóng góp" value={vnd(data.finance.margin)} hint={k.margin} />
      </div>
      {data.alerts.length > 0 && (
        <div className={`${card} space-y-2`}>
          <div className="font-bold text-sm text-slate-800">Cần xử lý ({data.alerts.length})</div>
          <ul className="space-y-1 text-xs">
            {data.alerts.map((a, i) => (
              <li key={i}>
                <button type="button" className={`w-full text-left border rounded-lg px-3 py-1.5 cursor-pointer ${ALERT_TONE[a.level]}`}
                  onClick={() => navigate(a.class ? `/corporate/classes?id=${a.class}` : `/corporate/acceptance?id=${a.acceptance}`)}>
                  {a.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={`${card} p-0 overflow-x-auto`}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr><th className="p-2">Lớp</th><th className="p-2">KH</th><th className="p-2 text-right">HV</th><th className="p-2 text-right">Hoàn thành</th><th className="p-2 text-right">Chuyên cần</th><th className="p-2 text-right">Hài lòng</th><th className="p-2 text-right">Nghiệm thu</th><th className="p-2 text-right">Chi phí</th><th className="p-2 text-right">Biên</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.classes.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/corporate/classes?id=${r.id}`)}>
                <td className="p-2"><div className="font-bold">{r.name}</div><div className="text-slate-500">{r.courseTitle}{r.resultsPublished ? '' : ' · chưa chốt kết quả'}</div></td>
                <td className="p-2">{r.clientCode}</td>
                <td className="p-2 text-right">{r.learners}</td>
                <td className="p-2 text-right">{pct(r.completionRate)}</td>
                <td className="p-2 text-right">{pct(r.attendanceRate)}</td>
                <td className="p-2 text-right">{pct(r.satisfaction)}</td>
                <td className="p-2 text-right">{r.acceptedAmount ? vnd(r.acceptedAmount) : '–'}</td>
                <td className="p-2 text-right">{r.costs ? vnd(r.costs) : '–'}</td>
                <td className={`p-2 text-right font-bold ${r.margin != null && r.margin < 0 ? 'text-red-600' : ''}`}>{r.margin != null ? vnd(r.margin) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
