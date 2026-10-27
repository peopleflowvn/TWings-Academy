/**
 * Lớp tuyển sinh (/app/sales/crm?view=campaigns): one class = one admission campaign. Seats, price,
 * schedule (Moodle), roster and grades for the training staff; web page, code (UTM), job and lead funnel
 * for admissions, who open the class's pipeline from here.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Copy, ExternalLink, Loader2, Plus, RefreshCw, Save, Search, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { formatDate, formatVND } from '../../lib/commerce';
import { RosterModal } from './JourneyPages';
import { GradebookModal } from './LearningPages';
import { ImageUploadField } from '../../components/cms/ImageUploadField';

export interface IntakeRow {
  id: string;
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  name: string;
  status: string;
  statusLabel: string;
  startDate: string | null;
  registrationDeadline: string | null;
  daysToDeadline: number | null;
  capacity: number;
  paid: number;
  pending: number;
  seatsLeft: number;
  fillRate: number | null;
  location: string;
  scheduleText: string;
  leadInstructor: string;
  nextCohort: string;
  autoRolloverWaitlist: boolean;
  earlyBirdPrice: number | null;
  earlyBirdDeadline: string | null;
  earlyBirdActive: boolean;
  priceNow: number;
  sessions: number;
  sessionsSynced: number;
  nextSession: string | null;
  // Admissions of the class (it is the campaign)
  code: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  showQuota: boolean;
  summary: string;
  image: string;
  description: string;
  viewCount: number;
  scholarshipBudget: number;
  recruiter: string;
  jobTitle: string;
  jobDepartment: string;
  salaryRange: string;
  jobQuota: number;
  websiteState: 'live' | 'off';
  websiteLabel: string;
  seatsTaken: number;
  funnel: { leads: number; paid: number; stages: Record<string, number> };
}

/** Every class with its admissions, from the server; reload after a change. */
export function useClasses() {
  const [rows, setRows] = useState<IntakeRow[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    setError('');
    api
      .get<{ intakes: IntakeRow[] }>('/staff/intakes/')
      .then((d) => setRows(d.intakes))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);
  return { rows, error, reload };
}

/** The class as people name it: "Course · Khóa 10". */
export const className = (r: Pick<IntakeRow, 'courseTitle' | 'name'>) => `${r.courseTitle} · ${r.name}`;

interface Session {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  online: boolean;
  synced?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  opening: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  full: 'bg-amber-50 text-amber-800 border-amber-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-300',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-200'
};
const STATUSES: [string, string][] = [
  ['upcoming', 'Sắp mở'],
  ['opening', 'Đang nhận đăng ký'],
  ['full', 'Đã đủ sĩ số'],
  ['closed', 'Đã đóng tuyển sinh'],
  ['in_progress', 'Đang học'],
  ['completed', 'Đã kết thúc']
];
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const input = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
const localInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Sessions on chosen weekdays from a start date, e.g. 12 sessions, Mon-Wed-Fri 19:00-21:00. */
function generateSessions(from: string, weekdays: number[], start: string, end: string, count: number, location: string, online: boolean): Session[] {
  const out: Session[] = [];
  const day = new Date(`${from}T00:00:00`);
  for (let guard = 0; out.length < count && guard < 730; guard++, day.setDate(day.getDate() + 1)) {
    if (!weekdays.includes(day.getDay())) continue;
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    out.push({
      title: `Buổi ${out.length + 1}`,
      startsAt: new Date(`${date}T${start}:00`).toISOString(),
      endsAt: new Date(`${date}T${end}:00`).toISOString(),
      location,
      online
    });
  }
  return out;
}

function scheduleText(weekdays: number[], start: string, end: string, online: boolean) {
  const days = [...weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => (d === 0 ? 'CN' : String(d + 1)));
  return `${online ? 'Online' : 'Trực tiếp'} thứ ${days.join('-')}, ${start}–${end}`.replace('thứ CN', 'Chủ nhật');
}

/** The class sessions of an intake; also used for corporate classes (/app/corporate/classes). */
export type SessionTarget = Pick<IntakeRow, 'id' | 'courseTitle' | 'name' | 'startDate' | 'location' | 'scheduleText'>;

export const SessionsEditor: React.FC<{ intake: SessionTarget; onClose: () => void; onSaved: () => void }> = ({ intake, onClose, onSaved }) => {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [from, setFrom] = useState(intake.startDate || new Date().toISOString().slice(0, 10));
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [count, setCount] = useState(12);
  const [online, setOnline] = useState(false);
  const [location, setLocation] = useState(intake.location);
  const [text, setText] = useState(intake.scheduleText);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Session[]>(`/staff/cohorts/${intake.id}/sessions/`).then(setSessions).catch((e: Error) => setError(e.message));
  }, [intake.id]);

  const generate = () => {
    if (sessions?.length && !window.confirm('Thay toàn bộ lịch hiện tại bằng lịch mới?')) return;
    setSessions(generateSessions(from, weekdays, start, end, count, location, online));
    setText(scheduleText(weekdays, start, end, online));
  };
  const save = async () => {
    if (!sessions) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.put<{ sessions: Session[]; sync: { synced: number; detail?: string } }>(`/staff/cohorts/${intake.id}/sessions/`, {
        sessions: sessions.map(({ title, startsAt, endsAt, location: loc, online: on }) => ({ title, startsAt, endsAt, location: loc, online: on })),
        scheduleText: text,
        sync: true
      });
      setSessions(res.sessions);
      setResult(res.sync.detail || `Đã lưu ${res.sessions.length} buổi, đã đưa ${res.sync.synced} buổi lên lịch Moodle của đợt.`);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lưu lịch thất bại');
    } finally {
      setBusy(false);
    }
  };
  const update = (i: number, patch: Partial<Session>) => setSessions((list) => list!.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-6 p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Lịch học – {intake.courseTitle} · {intake.name}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="font-bold text-slate-800">Tạo nhanh theo mẫu</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
            <label>Từ ngày<input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>Bắt đầu<input type="time" className={input} value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label>Kết thúc<input type="time" className={input} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            <label>Số buổi<input type="number" min={1} max={200} className={input} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
            <label className="md:col-span-2">Địa điểm<input className={input} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {WEEKDAYS.map((label, d) => (
              <button key={label} type="button" onClick={() => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))}
                className={`w-9 py-1 rounded-lg border font-bold cursor-pointer ${weekdays.includes(d) ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-300'}`}>
                {label}
              </button>
            ))}
            <label className="flex items-center gap-1.5 ml-2"><input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} /> Học online</label>
            <button type="button" onClick={generate} disabled={!weekdays.length} className="ml-auto px-3 py-2 rounded-lg bg-slate-800 text-white font-bold cursor-pointer disabled:opacity-50">
              Tạo lịch
            </button>
          </div>
        </div>
        <label className="block">Mô tả lịch hiển thị trên website
          <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="VD: Tối thứ 2-4-6, 19:00–21:00" />
        </label>
        {!sessions ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
          <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {sessions.length === 0 && <p className="p-3 text-slate-500">Chưa có buổi học nào.</p>}
            {sessions.map((s, i) => (
              <div key={i} className="p-2 grid grid-cols-12 gap-2 items-center">
                <input className={`${input} col-span-2`} value={s.title} onChange={(e) => update(i, { title: e.target.value })} />
                <input type="datetime-local" className={`${input} col-span-3`} value={localInput(s.startsAt)}
                  onChange={(e) => update(i, { startsAt: new Date(e.target.value).toISOString() })} />
                <input type="datetime-local" className={`${input} col-span-3`} value={localInput(s.endsAt)}
                  onChange={(e) => update(i, { endsAt: new Date(e.target.value).toISOString() })} />
                <input className={`${input} col-span-3`} value={s.location} placeholder={s.online ? 'Online' : 'Địa điểm'} onChange={(e) => update(i, { location: e.target.value })} />
                <button type="button" onClick={() => setSessions((list) => list!.filter((_, idx) => idx !== i))} className="text-red-500 cursor-pointer justify-self-end"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-500">Lưu sẽ đưa toàn bộ buổi học lên lịch của khóa Moodle của đợt (học viên thấy trên LMS và ứng dụng Moodle).</span>
          <button type="button" onClick={save} disabled={busy || !sessions} className="px-4 py-2 rounded-xl bg-[#0073C1] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu lịch
          </button>
        </div>
        {result && <p className="text-emerald-700 font-bold">{result}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  );
};

export type Draft = Partial<IntakeRow> & { id?: string; courseId: string };

const IntakeEditor: React.FC<{
  draft: Draft;
  courses: { id: string; title: string }[];
  intakes: IntakeRow[];
  /** Training staff edit everything; admissions staff only the recruiting part. */
  canTraining: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ draft: initial, courses: allCourses, intakes, canTraining, onClose, onSaved }) => {
  // A new intake is opened for a course that is not archived (drafts labelled); an existing one keeps its course.
  const [statusById, setStatusById] = useState<Record<string, string>>({});
  useEffect(() => {
    api
      .get<{ results: { id: string; status: string }[] }>('/staff/courses/?pageSize=200')
      .then((res) => setStatusById(Object.fromEntries(res.results.map((c) => [c.id, c.status]))))
      .catch(() => setStatusById({}));
  }, []);
  const courses = allCourses
    .filter((c) => c.id === initial.courseId || statusById[c.id] !== 'archived')
    .map((c) => ({ ...c, title: statusById[c.id] && statusById[c.id] !== 'published' && statusById[c.id] !== 'archived' ? `${c.title} (chưa mở bán)` : c.title }));
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const siblings = intakes.filter((i) => i.courseId === d.courseId && i.id !== d.id);
  const save = async () => {
    setBusy(true);
    setError('');
    const admissions = {
      code: (d.code || '').trim(),
      slug: (d.slug || '').trim(),
      isPublished: !!d.isPublished && JOINABLE.includes(d.status || 'upcoming'),
      isFeatured: !!d.isFeatured,
      showQuota: d.showQuota ?? true,
      summary: d.summary || '',
      image: d.image || '',
      description: d.description || '',
      scholarshipBudget: d.scholarshipBudget || 0,
      recruiter: d.recruiter || '',
      jobTitle: d.jobTitle || '',
      jobDepartment: d.jobDepartment || '',
      salaryRange: d.salaryRange || '',
      jobQuota: d.jobQuota || 0
    };
    const training = {
      course: d.courseId,
      name: d.name,
      status: d.status || 'upcoming',
      startDate: d.startDate || null,
      registrationDeadline: d.registrationDeadline || null,
      capacity: d.capacity ?? 25,
      location: d.location || '',
      earlyBirdPrice: d.earlyBirdPrice ?? null,
      earlyBirdDeadline: d.earlyBirdDeadline || null,
      autoRolloverWaitlist: d.autoRolloverWaitlist ?? true,
      nextCohort: siblings.find((s) => s.name === d.nextCohort)?.id || null
    };
    const body = canTraining ? { ...training, ...admissions } : admissions;
    try {
      if (d.id) await api.patch(`/staff/cohorts/${d.id}/`, body);
      else await api.post('/staff/cohorts/', body);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message + (e.body ? ` ${JSON.stringify(e.body)}` : '') : 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6 p-6 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{d.id ? `Lớp ${d.name}` : 'Mở lớp mới'}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="font-bold text-slate-900 pt-1">Lớp học{!canTraining && <span className="font-normal text-slate-500"> (bộ phận đào tạo chỉnh sửa)</span>}</div>
        <fieldset disabled={!canTraining} className="grid grid-cols-1 sm:grid-cols-2 gap-3 disabled:opacity-60">
          <label className="sm:col-span-2">Khóa học
            <select className={input} value={d.courseId} disabled={!!d.id} onChange={(e) => setD({ ...d, courseId: e.target.value })}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label>Tên lớp *<input className={input} value={d.name || ''} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="VD: Khóa 12 – Hà Nội" /></label>
          <label>Trạng thái
            <select className={input} value={d.status || 'upcoming'} onChange={(e) => setD({ ...d, status: e.target.value })}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Ngày khai giảng<input type="date" className={input} value={d.startDate || ''} onChange={(e) => setD({ ...d, startDate: e.target.value })} /></label>
          <label>Hạn đăng ký<input type="date" className={input} value={d.registrationDeadline || ''} onChange={(e) => setD({ ...d, registrationDeadline: e.target.value })} /></label>
          <label>Sĩ số tối đa (chỉ tiêu tuyển sinh)<input type="number" min={1} className={input} value={d.capacity ?? 25} onChange={(e) => setD({ ...d, capacity: Number(e.target.value) })} /></label>
          <label>Địa điểm<input className={input} value={d.location || ''} onChange={(e) => setD({ ...d, location: e.target.value })} /></label>
          <label>Giá ưu đãi đăng ký sớm (VND)
            <input type="number" min={0} className={input} value={d.earlyBirdPrice ?? ''} placeholder={`Giá khóa: ${formatVND(courses.find((c) => c.id === d.courseId) ? (intakes.find((i) => i.courseId === d.courseId)?.coursePrice ?? 0) : 0)}`}
              onChange={(e) => setD({ ...d, earlyBirdPrice: e.target.value === '' ? null : Number(e.target.value) })} />
          </label>
          <label>Hạn ưu đãi<input type="date" className={input} value={d.earlyBirdDeadline || ''} onChange={(e) => setD({ ...d, earlyBirdDeadline: e.target.value })} /></label>
          <label>Đợt kế tiếp (nhận học viên chưa đóng phí khi đợt này đủ / đóng)
            <select className={input} value={d.nextCohort || ''} onChange={(e) => setD({ ...d, nextCohort: e.target.value })}>
              <option value="">– Không –</option>
              {siblings.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 mt-5">
            <input type="checkbox" checked={d.autoRolloverWaitlist ?? true} onChange={(e) => setD({ ...d, autoRolloverWaitlist: e.target.checked })} />
            Tự chuyển học viên chưa đóng phí sang đợt kế tiếp
          </label>
        </fieldset>

        <div className="font-bold text-slate-900 pt-3 border-t border-slate-100">Tuyển sinh & website</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>Mã tuyển sinh (UTM)
            <input className={`${input} font-mono uppercase`} value={d.code || ''} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })} placeholder="VD: RM-K12-HN" />
          </label>
          <label>Phụ trách tuyển sinh<input className={input} value={d.recruiter || ''} onChange={(e) => setD({ ...d, recruiter: e.target.value })} /></label>
          <label className={`sm:col-span-2 flex items-center gap-2 font-bold ${JOINABLE.includes(d.status || 'upcoming') ? '' : 'text-slate-400'}`}>
            <input type="checkbox" disabled={!JOINABLE.includes(d.status || 'upcoming')} checked={!!d.isPublished} onChange={(e) => setD({ ...d, isPublished: e.target.checked })} />
            Hiện trên website (trang Tuyển sinh)
            {!JOINABLE.includes(d.status || 'upcoming') && <span className="font-normal">– chỉ khi lớp đang nhận đăng ký / sắp mở</span>}
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.isFeatured} onChange={(e) => setD({ ...d, isFeatured: e.target.checked })} /> Nổi bật (lên đầu)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.showQuota ?? true} onChange={(e) => setD({ ...d, showQuota: e.target.checked })} /> Hiện số chỗ còn lại</label>
          <label className="sm:col-span-2">Giới thiệu ngắn trên thẻ (tối đa 300 ký tự)
            <input maxLength={300} className={input} value={d.summary || ''} onChange={(e) => setD({ ...d, summary: e.target.value })} />
          </label>
          <label className="sm:col-span-2">Mô tả trên trang tuyển sinh
            <textarea rows={3} className={input} value={d.description || ''} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </label>
          <label>Đường dẫn
            <div className="flex items-center gap-1"><span className="text-slate-400">/tuyen-sinh/</span>
              <input className={`${input} font-mono`} value={d.slug || ''} placeholder="tự tạo khi đăng" onChange={(e) => setD({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
            </div>
          </label>
          <label>Ngân sách học bổng (VND)<input type="number" min={0} className={input} value={d.scholarshipBudget || ''} onChange={(e) => setD({ ...d, scholarshipBudget: Number(e.target.value) || 0 })} /></label>
          <div className="sm:col-span-2">
            <ImageUploadField label="Ảnh đại diện (trống: ảnh khóa học)" value={d.image || ''} onChange={(url) => setD({ ...d, image: url })} previewClassName="w-24 h-14 object-cover rounded" />
          </div>
          <label>Vị trí việc làm đầu ra<input className={input} value={d.jobTitle || ''} placeholder="VD: Chuyên viên QHKH DN" onChange={(e) => setD({ ...d, jobTitle: e.target.value })} /></label>
          <label>Đơn vị tuyển dụng<input className={input} value={d.jobDepartment || ''} placeholder="VD: MSB Hà Nội" onChange={(e) => setD({ ...d, jobDepartment: e.target.value })} /></label>
          <label>Thu nhập tham khảo<input className={input} value={d.salaryRange || ''} placeholder="VD: 15–25 triệu" onChange={(e) => setD({ ...d, salaryRange: e.target.value })} /></label>
          <label>Chỉ tiêu tuyển dụng<input type="number" min={0} className={input} value={d.jobQuota || ''} onChange={(e) => setD({ ...d, jobQuota: Number(e.target.value) || 0 })} /></label>
        </div>
        <p className="text-slate-500">
          Hệ thống tự chuyển trạng thái: đủ chỗ → “Đã đủ sĩ số”, quá hạn đăng ký → “Đã đóng tuyển sinh”, tới ngày khai giảng → “Đang học”;
          lớp không còn nhận đăng ký tự rời website. Mở lớp mới sẽ tự tạo khóa Moodle riêng cho lớp (sao chép từ khóa mẫu).
        </p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="button" onClick={save} disabled={busy || !d.name || !d.courseId} className="px-4 py-2 rounded-xl bg-[#0073C1] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

const JOINABLE = ['opening', 'upcoming'];

/** The UTM link of a class: its page when it is on the website, else its course page. */
function classLink(r: IntakeRow, courseSlug?: string) {
  const params = new URLSearchParams({ utm_source: 'twings', utm_medium: 'crm', utm_campaign: r.code || r.name });
  const page = r.websiteState === 'live' && r.slug ? `/tuyen-sinh/${encodeURIComponent(r.slug)}` : courseSlug ? `/khoa-hoc/${encodeURIComponent(courseSlug)}` : '/khoa-hoc';
  return `${window.location.origin}${page}?${params}`;
}

export const ClassesView: React.FC<{
  rows: IntakeRow[];
  courses: { id: string; title: string; slug?: string }[];
  onReload: () => void;
  onOpenPipeline: (scope: string) => void;
  /** Open the editor of this class, or a new class for this course ("new" + course id). */
  editing: Draft | null;
  onEdit: (draft: Draft | null) => void;
}> = ({ rows, courses, onReload, onOpenPipeline, editing, onEdit }) => {
  const canTraining = useStaffCan('courses.edit_info');
  const canAdmissions = useStaffCan('crm.assign_pic');
  const [scheduling, setScheduling] = useState<IntakeRow | null>(null);
  const [roster, setRoster] = useState<string | null>(null);
  const [gradebook, setGradebook] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'all' | 'recruiting' | 'live'>('all');
  const [copied, setCopied] = useState('');

  const grouped = useMemo(() => {
    const words = q.toLowerCase().trim();
    const map = new Map<string, IntakeRow[]>();
    rows
      .filter((r) => (show === 'live' ? r.websiteState === 'live' : show === 'recruiting' ? JOINABLE.includes(r.status) : true))
      .filter((r) => !words || `${r.courseTitle} ${r.name} ${r.code} ${r.location}`.toLowerCase().includes(words))
      .forEach((r) => map.set(r.courseTitle, [...(map.get(r.courseTitle) || []), r]));
    return [...map.entries()];
  }, [rows, q, show]);
  const totals = rows.reduce(
    (t, r) => ({ seats: t.seats + r.capacity, paid: t.paid + r.paid, leads: t.leads + r.funnel.leads, live: t.live + (r.websiteState === 'live' ? 1 : 0) }),
    { seats: 0, paid: 0, leads: 0, live: 0 }
  );
  const copy = (r: IntakeRow) => {
    navigator.clipboard?.writeText(classLink(r, courses.find((c) => c.id === r.courseId)?.slug));
    setCopied(r.id);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Lớp tuyển sinh</h1>
          <p className="text-xs text-slate-500">
            Mỗi lớp là một chiến dịch tuyển sinh: sĩ số là chỉ tiêu, mã tuyển sinh gắn lead (link UTM, form đăng ký), bật “Hiện trên website” để đăng tuyển.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => onOpenPipeline('all')} className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Pipeline tất cả lead</button>
          <button type="button" onClick={() => onOpenPipeline('none')} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold cursor-pointer">Lead chưa gắn lớp</button>
          <button type="button" onClick={onReload} className="p-2 rounded-xl border border-slate-200 bg-white cursor-pointer" title="Làm mới"><RefreshCw className="w-4 h-4" /></button>
          {canTraining && courses.length > 0 && (
            <button type="button" onClick={() => onEdit({ courseId: courses[0].id, status: 'upcoming', capacity: 25, autoRolloverWaitlist: true, showQuota: true })}
              className="px-4 py-2 rounded-xl bg-[#0073C1] text-white font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Mở lớp mới
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-white border border-slate-200 rounded-xl px-3 py-2"><strong>{rows.length}</strong> lớp</span>
        <span className="bg-white border border-slate-200 rounded-xl px-3 py-2">Đã đóng phí <strong>{totals.paid}</strong> / {totals.seats} chỗ</span>
        <span className="bg-white border border-slate-200 rounded-xl px-3 py-2"><strong>{totals.leads}</strong> lead</span>
        <span className="bg-white border border-slate-200 rounded-xl px-3 py-2"><strong>{totals.live}</strong> lớp đang trên website</span>
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm lớp, mã, khóa…" className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white" />
        </div>
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white">
          <option value="all">Mọi lớp</option>
          <option value="recruiting">Đang nhận đăng ký</option>
          <option value="live">Đang trên website</option>
        </select>
      </div>

      {grouped.length === 0 && <p className="text-sm text-slate-500">Không có lớp phù hợp.</p>}
      {grouped.map(([title, list]) => (
        <section key={title} className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <div className="px-4 py-3 font-bold text-slate-900 border-b border-slate-100">{title}</div>
          <table className="w-full text-xs min-w-[1000px]">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-3">Lớp</th><th>Trạng thái · website</th><th>Khai giảng / hạn ĐK</th><th>Chỗ (chỉ tiêu)</th><th>Lead</th><th>Học phí hiện tại</th><th>Lịch học</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{r.name}</div>
                    {r.code && <div className="font-mono text-[11px] text-indigo-700">{r.code}</div>}
                    <div className="text-slate-500">{[r.location, r.leadInstructor && `GV: ${r.leadInstructor}`].filter(Boolean).join(' · ')}</div>
                    {r.jobTitle && <div className="text-slate-500">Đầu ra: {r.jobTitle}{r.jobDepartment ? ` – ${r.jobDepartment}` : ''}</div>}
                    {r.nextCohort && <div className="text-slate-400">→ {r.nextCohort}{r.autoRolloverWaitlist ? ' (tự chuyển)' : ''}</div>}
                  </td>
                  <td className="py-3 space-y-1">
                    <span className={`inline-block border rounded-full px-2 py-0.5 font-bold ${STATUS_STYLE[r.status] || ''}`}>{r.statusLabel}</span>
                    <div title={r.websiteLabel} className={r.websiteState === 'live' ? 'text-sky-700 font-bold' : 'text-slate-400'}>
                      {r.websiteState === 'live' ? 'Trên website' : 'Không trên website'}
                      {r.viewCount ? ` · ${r.viewCount} lượt xem` : ''}
                    </div>
                  </td>
                  <td className="py-3">
                    <div>{r.startDate ? formatDate(r.startDate) : '–'}</div>
                    <div className={r.daysToDeadline !== null && r.daysToDeadline <= 3 && r.status === 'opening' ? 'text-red-600 font-bold' : 'text-slate-500'}>
                      {r.registrationDeadline ? `Hạn ĐK ${formatDate(r.registrationDeadline)}` : 'Chưa đặt hạn'}
                    </div>
                  </td>
                  <td className="py-3 w-36">
                    <div className="font-bold">{r.paid}/{r.capacity} <span className="font-normal text-slate-500">(còn {r.seatsLeft})</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(r.fillRate || 0, 100)}%` }} /></div>
                    {r.pending > 0 && <div className="text-slate-500">{r.pending} chờ thanh toán</div>}
                  </td>
                  <td className="py-3">
                    <button type="button" onClick={() => onOpenPipeline(r.id)} className="font-bold text-[#0073C1] hover:underline cursor-pointer" title="Mở pipeline của lớp">
                      {r.funnel.leads} lead
                    </button>
                    <div className="text-slate-500">{r.funnel.paid} đã đóng phí</div>
                  </td>
                  <td className="py-3">
                    <div className="font-bold">{formatVND(r.priceNow)}</div>
                    {r.earlyBirdActive && <div className="text-emerald-700">Ưu đãi sớm tới {formatDate(r.earlyBirdDeadline)}</div>}
                  </td>
                  <td className="py-3">
                    <div>{r.scheduleText || <span className="text-slate-400">Chưa có lịch</span>}</div>
                    <div className="text-slate-500">
                      {r.sessions ? `${r.sessions} buổi` : ''}{r.sessions ? (r.sessionsSynced === r.sessions ? ' · đã lên Moodle' : ` · ${r.sessionsSynced}/${r.sessions} trên Moodle`) : ''}
                    </div>
                    {r.nextSession && <div className="text-slate-500">Buổi tới: {new Date(r.nextSession).toLocaleString('vi-VN')}</div>}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                      <button type="button" onClick={() => onOpenPipeline(r.id)} className="px-2.5 py-1 rounded-lg bg-[#0073C1] text-white font-bold cursor-pointer">Pipeline</button>
                      <button type="button" onClick={() => copy(r)} className="text-[#0073C1] font-bold hover:underline cursor-pointer inline-flex items-center gap-1" title="Chép link có mã UTM của lớp">
                        <Copy className="w-3.5 h-3.5" /> {copied === r.id ? 'Đã chép' : 'Chép link'}
                      </button>
                      {r.websiteState === 'live' && r.slug && (
                        <a href={`/tuyen-sinh/${encodeURIComponent(r.slug)}`} target="_blank" rel="noopener" className="text-[#0073C1] font-bold hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> Xem
                        </a>
                      )}
                      <button type="button" onClick={() => setRoster(r.id)} className="text-[#0073C1] font-bold hover:underline cursor-pointer">Danh sách lớp</button>
                      {r.status !== 'upcoming' && (
                        <button type="button" onClick={() => setGradebook(r.id)} className="text-[#0073C1] font-bold hover:underline cursor-pointer">Học tập</button>
                      )}
                      {canTraining && (
                        <button type="button" onClick={() => setScheduling(r)} className="text-[#0073C1] font-bold hover:underline cursor-pointer inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> Lịch học
                        </button>
                      )}
                      {(canTraining || canAdmissions) && (
                        <button type="button" onClick={() => onEdit({ ...r })} className="text-[#0073C1] font-bold hover:underline cursor-pointer">Sửa</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {editing && <IntakeEditor draft={editing} courses={courses} intakes={rows} canTraining={canTraining} onClose={() => onEdit(null)} onSaved={onReload} />}
      {scheduling && <SessionsEditor intake={scheduling} onClose={() => setScheduling(null)} onSaved={onReload} />}
      {roster && <RosterModal cohortId={roster} onClose={() => setRoster(null)} />}
      {gradebook && <GradebookModal cohortId={gradebook} onClose={() => setGradebook(null)} />}
    </div>
  );
};
