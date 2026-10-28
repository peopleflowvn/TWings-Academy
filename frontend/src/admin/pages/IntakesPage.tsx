/**
 * Lớp tuyển sinh (/app/sales/crm?view=campaigns): one class = one admission campaign. Seats, price,
 * schedule (Moodle), roster and grades for the training staff; web page, code (UTM), job and lead funnel
 * for admissions, who open the class's pipeline from here.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUpDown, CalendarDays, CheckCircle2, Copy, ExternalLink, Globe, LayoutGrid, Loader2, MoreHorizontal, Plus, RefreshCw, Save, Search, Table as TableIcon, X
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { formatDate, formatVND } from '../../lib/commerce';
import { rank } from '../../lib/search';
import { RosterModal } from './JourneyPages';
import { GradebookModal } from './LearningPages';
import { ImageUploadField } from '../../components/cms/ImageUploadField';
import { Course } from '../../types';
import { navigate } from '../router';

export interface IntakeRow {
  id: string;
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  /** draft | review | published | archived: a class takes registrations only while its course is on sale. */
  courseStatus: string;
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

/** A new class of this course, with the usual defaults. */
export const newClass = (courseId: string): Draft => ({ courseId, status: 'upcoming', capacity: 25, autoRolloverWaitlist: true, showQuota: true, isPublished: true });

type CourseOption = Pick<Course, 'id' | 'title'> & Partial<Pick<Course, 'slug' | 'status' | 'price'>>;
const COURSE_STATE: Record<string, string> = { draft: 'chưa mở bán', review: 'chờ duyệt', archived: 'ngừng bán' };

export const IntakeEditor: React.FC<{
  draft: Draft;
  courses: CourseOption[];
  intakes: IntakeRow[];
  /** Training staff edit everything; admissions staff only the recruiting part. */
  canTraining: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ draft: initial, courses: allCourses, intakes, canTraining, onClose, onSaved }) => {
  // A new class is opened for a course that is not archived (others labelled); an existing one keeps its course.
  const courses = allCourses.filter((c) => c.id === initial.courseId || c.status !== 'archived');
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const siblings = intakes.filter((i) => i.courseId === d.courseId && i.id !== d.id);
  const course = allCourses.find((c) => c.id === d.courseId);
  const coursePrice = course?.price ?? intakes.find((i) => i.courseId === d.courseId)?.coursePrice ?? 0;
  const save = async () => {
    // Checked by the server too; said here before the round trip.
    if (canTraining && d.startDate && d.registrationDeadline && d.registrationDeadline > d.startDate) {
      setError('Hạn đăng ký phải trước hoặc đúng ngày khai giảng.');
      return;
    }
    if (canTraining && d.earlyBirdPrice != null && coursePrice && d.earlyBirdPrice >= coursePrice) {
      setError(`Giá ưu đãi phải thấp hơn học phí khóa (${formatVND(coursePrice)}).`);
      return;
    }
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
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.status && COURSE_STATE[c.status] ? ` (${COURSE_STATE[c.status]})` : ''}</option>)}
            </select>
            <span className="block mt-1 font-normal text-slate-500">
              Học phí lấy từ khóa: <strong>{formatVND(coursePrice)}</strong>
              {course?.status && course.status !== 'published' && (
                <span className="text-amber-700"> · Khóa {COURSE_STATE[course.status]}: lớp chỉ nhận đăng ký và lên website khi khóa được duyệt & mở bán.</span>
              )}
            </span>
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
            <input type="number" min={0} className={input} value={d.earlyBirdPrice ?? ''} placeholder={`Thấp hơn ${formatVND(coursePrice)}`}
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
            Hiện trên website: trang chủ, thẻ & trang khóa học, mua online, trang Tuyển sinh
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

// ---------------------------------------------------------------- what needs doing on a class

type Tone = 'red' | 'amber' | 'green' | 'slate';
interface Hint {
  tone: Tone;
  text: string;
  /** What to do about it (tooltip). */
  why?: string;
}
const HINT_STYLE: Record<Tone, string> = {
  red: 'text-red-700 bg-red-50 border-red-100',
  amber: 'text-amber-800 bg-amber-50 border-amber-100',
  green: 'text-emerald-800 bg-emerald-50 border-emerald-100',
  slate: 'text-slate-600 bg-slate-50 border-slate-100'
};
const TONE_WEIGHT: Record<Tone, number> = { red: 100, amber: 10, green: 1, slate: 0 };

/** Days from today to an ISO date (negative: past), or null. */
function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}
const inDays = (d: number) => (d === 0 ? 'hôm nay' : d === 1 ? 'ngày mai' : d > 0 ? `còn ${d} ngày` : `${-d} ngày trước`);

/** What the admissions / training staff should look at on a class, worst first. */
function hintsOf(r: IntakeRow): Hint[] {
  const out: Hint[] = [];
  const recruiting = JOINABLE.includes(r.status);
  const start = daysTo(r.startDate);
  const offSale = r.courseStatus !== 'published';
  if (recruiting && offSale) {
    out.push({
      tone: 'red',
      text: r.courseStatus === 'archived' ? 'Khóa đã ngừng bán: lớp không nhận đăng ký' : 'Khóa chưa mở bán: lớp chưa nhận đăng ký',
      why: 'Duyệt & mở bán khóa học ở Danh mục khóa học (mở từ tên khóa)'
    });
  }
  if (recruiting) {
    const d = r.daysToDeadline;
    if (start !== null && start < 0) out.push({ tone: 'red', text: `Đã khai giảng ${-start} ngày, vẫn đang tuyển`, why: 'Chuyển lớp sang "Đang học" hoặc dời ngày khai giảng' });
    else if (d !== null && d < 0) out.push({ tone: 'red', text: `Quá hạn đăng ký ${-d} ngày`, why: 'Đóng tuyển sinh hoặc dời hạn đăng ký' });
    if (d !== null && d >= 0 && d <= 3 && r.seatsLeft > 0) out.push({ tone: 'red', text: `Hạn ĐK ${inDays(d)}, còn ${r.seatsLeft} chỗ`, why: 'Gọi lại lead đang tư vấn, nhắc người giữ chỗ thanh toán' });
    if (!r.funnel.leads) out.push({ tone: 'amber', text: 'Chưa có lead nào' });
    if (!r.code) out.push({ tone: 'amber', text: 'Chưa có mã tuyển sinh', why: 'Đặt mã để lead từ link UTM / form đăng ký tự vào lớp' });
    // Off sale, the course is why the class is not on the website (said above).
    if (!offSale && r.isPublished && r.websiteState !== 'live') out.push({ tone: 'amber', text: 'Bật đăng web nhưng không hiện', why: r.websiteLabel });
    else if (!offSale && !r.isPublished && (d === null || d >= 0)) out.push({ tone: 'slate', text: 'Lớp nội bộ: không hiện trên website', why: 'Khách chỉ vào lớp qua mã / link của lớp. Bật “Hiện trên website” trong Sửa để mở bán công khai.' });
    if (!r.registrationDeadline) out.push({ tone: 'slate', text: 'Chưa đặt hạn đăng ký' });
    if (r.capacity && r.seatsLeft > 0 && (r.fillRate || 0) >= 80) out.push({ tone: 'green', text: `Sắp đủ sĩ số: còn ${r.seatsLeft} chỗ` });
  }
  if (r.pending > 0) out.push({ tone: 'amber', text: `${r.pending} học viên chờ thanh toán` });
  if (start !== null && start >= 0 && start <= 14 && !r.sessions && r.status !== 'completed') {
    out.push({ tone: 'red', text: `Khai giảng ${inDays(start)}, chưa có lịch`, why: 'Tạo lịch học (đồng bộ lên Moodle) trong menu "…" → Lịch học' });
  }
  return out.sort((a, b) => TONE_WEIGHT[b.tone] - TONE_WEIGHT[a.tone]);
}
const needsAttention = (hints: Hint[]) => hints.some((h) => h.tone === 'red' || h.tone === 'amber');
const conversion = (r: IntakeRow) => (r.funnel.leads ? Math.round((100 * r.funnel.paid) / r.funnel.leads) : null);

const FILTERS = [
  ['recruiting', 'Đang tuyển'],
  ['attention', 'Cần xử lý'],
  ['live', 'Trên website'],
  ['training', 'Đang học'],
  ['ended', 'Đã đóng'],
  ['all', 'Tất cả']
] as const;
type Filter = (typeof FILTERS)[number][0];
const inFilter = (f: Filter, r: IntakeRow, hints: Hint[]) =>
  f === 'recruiting' ? JOINABLE.includes(r.status)
    : f === 'attention' ? needsAttention(hints)
      : f === 'live' ? r.websiteState === 'live'
        : f === 'training' ? r.status === 'in_progress'
          : f === 'ended' ? ['full', 'closed', 'completed'].includes(r.status)
            : true;

const SORTS = [
  ['smart', 'Cần xử lý trước'],
  ['deadline', 'Hạn đăng ký gần nhất'],
  ['start', 'Khai giảng sớm nhất'],
  ['fill', 'Lấp đầy cao nhất'],
  ['leads', 'Nhiều lead nhất']
] as const;
type Sort = (typeof SORTS)[number][0];
const FAR = 99_999;
function compare(sort: Sort, a: Item, b: Item): number {
  const deadline = (x: Item) => (x.row.daysToDeadline !== null && x.row.daysToDeadline >= 0 ? x.row.daysToDeadline : FAR);
  const start = (x: Item) => daysTo(x.row.startDate) ?? FAR;
  if (sort === 'deadline') return deadline(a) - deadline(b) || start(a) - start(b);
  if (sort === 'start') return start(a) - start(b);
  if (sort === 'fill') return (b.row.fillRate || 0) - (a.row.fillRate || 0);
  if (sort === 'leads') return b.row.funnel.leads - a.row.funnel.leads;
  const weight = (x: Item) => x.hints.reduce((s, h) => s + TONE_WEIGHT[h.tone], 0) + (JOINABLE.includes(x.row.status) ? 5 : 0);
  return weight(b) - weight(a) || deadline(a) - deadline(b) || start(a) - start(b);
}
interface Item {
  row: IntakeRow;
  hints: Hint[];
}

type Layout = 'cards' | 'table';
const LAYOUT_KEY = 'twings.classes.layout';
function initialLayout(): Layout {
  try {
    const saved = window.localStorage.getItem(LAYOUT_KEY);
    if (saved === 'cards' || saved === 'table') return saved;
  } catch {
    /* storage blocked: fall back to the screen size */
  }
  return window.matchMedia?.('(max-width: 1023px)').matches ? 'cards' : 'table';
}

// ---------------------------------------------------------------- small parts

const StatusBadge: React.FC<{ r: IntakeRow }> = ({ r }) => (
  <span className={`inline-block border rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${STATUS_STYLE[r.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{r.statusLabel}</span>
);

const WebBadge: React.FC<{ r: IntakeRow }> = ({ r }) => (
  <span title={r.websiteLabel} className={`inline-flex items-center gap-1 text-[11px] whitespace-nowrap ${r.websiteState === 'live' ? 'text-sky-700 font-bold' : 'text-slate-400'}`}>
    <Globe className="w-3 h-3" />
    {r.websiteState === 'live' ? 'Trên website' : 'Không trên website'}
    {r.viewCount ? ` · ${r.viewCount} lượt xem` : ''}
  </span>
);

const SeatsBar: React.FC<{ r: IntakeRow }> = ({ r }) => {
  const rate = Math.min(r.fillRate || 0, 100);
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${rate >= 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${rate}%` }} />
    </div>
  );
};

const HintList: React.FC<{ hints: Hint[]; max?: number }> = ({ hints, max = 3 }) =>
  hints.length ? (
    <ul className="space-y-1">
      {hints.slice(0, max).map((h) => (
        <li key={h.text} title={h.why} className={`border rounded-lg px-2 py-1 text-[11px] leading-snug ${HINT_STYLE[h.tone]}`}>{h.text}</li>
      ))}
      {hints.length > max && <li className="text-[11px] text-slate-400">+{hints.length - max} việc khác</li>}
    </ul>
  ) : null;

// ---------------------------------------------------------------- the screen

export const ClassesView: React.FC<{
  rows: IntakeRow[];
  courses: CourseOption[];
  onReload: () => void;
  onOpenPipeline: (scope: string) => void;
  /** Open the editor of this class, or a new class for this course ("new" + course id). */
  editing: Draft | null;
  onEdit: (draft: Draft | null) => void;
}> = ({ rows, courses, onReload, onOpenPipeline, editing, onEdit }) => {
  const canTraining = useStaffCan('courses.edit_info');
  const canAdmissions = useStaffCan('crm.assign_pic');
  const canCourses = useStaffCan('courses.view');
  const [scheduling, setScheduling] = useState<IntakeRow | null>(null);
  const [roster, setRoster] = useState<string | null>(null);
  const [gradebook, setGradebook] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [q, setQ] = useState('');
  // ?course=<id>: the classes of one course (link from its page in the catalogue).
  const [course, setCourse] = useState(() => new URLSearchParams(window.location.search).get('course') || '');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.get('course') || '') === course) return;
    if (course) params.set('course', course);
    else params.delete('course');
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [course]);
  const [sort, setSort] = useState<Sort>('smart');
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [copied, setCopied] = useState('');

  const items = useMemo<Item[]>(() => rows.map((row) => ({ row, hints: hintsOf(row) })), [rows]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(([f]) => [f, items.filter((i) => inFilter(f, i.row, i.hints)).length])) as Record<Filter, number>,
    [items]
  );
  // Open on the classes being recruited when there are some.
  const [filter, setFilter] = useState<Filter>(() => (rows.some((r) => JOINABLE.includes(r.status)) ? 'recruiting' : 'all'));

  const shown = useMemo(() => {
    const list = items.filter((i) => inFilter(filter, i.row, i.hints) && (!course || i.row.courseId === course));
    if (q.trim()) {
      return rank(list, q, (i) => [
        { text: i.row.name, weight: 3 },
        { text: i.row.code, weight: 3 },
        { text: i.row.courseTitle, weight: 2 },
        { text: [i.row.location, i.row.leadInstructor, i.row.recruiter, i.row.jobTitle, i.row.jobDepartment].join(' '), weight: 1 }
      ]);
    }
    return [...list].sort((a, b) => compare(sort, a, b));
  }, [items, filter, course, q, sort]);

  const recruiting = rows.filter((r) => JOINABLE.includes(r.status));
  const kpi = recruiting.reduce(
    (t, r) => ({ seats: t.seats + r.capacity, paid: t.paid + r.paid, left: t.left + r.seatsLeft, leads: t.leads + r.funnel.leads, leadsPaid: t.leadsPaid + r.funnel.paid }),
    { seats: 0, paid: 0, left: 0, leads: 0, leadsPaid: 0 }
  );
  const pending = rows.reduce((s, r) => s + r.pending, 0);
  const classCourses = useMemo(() => [...new Map(rows.map((r) => [r.courseId, r.courseTitle])).entries()], [rows]);

  const switchLayout = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* not remembered: fine */
    }
  };
  const copy = (r: IntakeRow) => {
    navigator.clipboard?.writeText(classLink(r, courses.find((c) => c.id === r.courseId)?.slug));
    setCopied(r.id);
    setTimeout(() => setCopied(''), 1500);
  };
  const canEdit = canTraining || canAdmissions;

  /** The less used actions of a class, behind "…". */
  const moreMenu = (r: IntakeRow) => (
    <div className="relative">
      <button type="button" onClick={() => setMenu(menu === r.id ? null : r.id)} title="Thêm thao tác" aria-label="Thêm thao tác"
        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {menu === r.id && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs text-left">
            {r.websiteState === 'live' && r.slug && (
              <a href={`/tuyen-sinh/${encodeURIComponent(r.slug)}`} target="_blank" rel="noopener" onClick={() => setMenu(null)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                <ExternalLink className="w-3.5 h-3.5" /> Xem trên website
              </a>
            )}
            <button type="button" onClick={() => { setMenu(null); setRoster(r.id); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Danh sách lớp</button>
            {r.status !== 'upcoming' && (
              <button type="button" onClick={() => { setMenu(null); setGradebook(r.id); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Học tập</button>
            )}
            {canTraining && (
              <button type="button" onClick={() => { setMenu(null); setScheduling(r); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" /> Lịch học
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  /** The course of a class: opens its page in the catalogue (content, price, publishing). */
  const courseLink = (r: IntakeRow) =>
    canCourses ? (
      <button type="button" onClick={() => navigate(`/catalog/courses?id=${encodeURIComponent(r.courseId)}&subtab=info`)} title="Mở trang khóa học (nội dung, học phí, mở bán)"
        className="block max-w-full text-left text-[11px] text-slate-500 hover:text-[#0073C1] hover:underline truncate cursor-pointer">
        {r.courseTitle}
      </button>
    ) : (
      <div className="text-[11px] text-slate-500 truncate">{r.courseTitle}</div>
    );

  const copyButton = (r: IntakeRow) => (
    <button type="button" onClick={() => copy(r)} title="Chép link có mã UTM của lớp"
      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1 text-[#0073C1] font-bold whitespace-nowrap">
      {copied === r.id ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  const card = ({ row: r, hints }: Item) => {
    const start = daysTo(r.startDate);
    const conv = conversion(r);
    const deadlineUrgent = r.daysToDeadline !== null && r.daysToDeadline <= 3 && r.status === 'opening';
    return (
      <article key={r.id} data-class={r.code || r.id} className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 ${needsAttention(hints) ? 'border-amber-200' : 'border-slate-200'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {courseLink(r)}
            <div className="font-black text-slate-900 leading-snug">{r.name}</div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              <StatusBadge r={r} />
              {r.code && <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">{r.code}</span>}
              <WebBadge r={r} />
            </div>
          </div>
          {moreMenu(r)}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <div className="text-[11px] text-slate-500">Khai giảng</div>
            <div className="font-bold">{r.startDate ? formatDate(r.startDate) : '–'}</div>
            {start !== null && start >= 0 && <div className="text-[11px] text-slate-500">{inDays(start)}</div>}
          </div>
          <div className={`rounded-xl px-3 py-2 ${deadlineUrgent ? 'bg-red-50' : 'bg-slate-50'}`}>
            <div className="text-[11px] text-slate-500">Hạn đăng ký</div>
            <div className={`font-bold ${deadlineUrgent ? 'text-red-700' : ''}`}>{r.registrationDeadline ? formatDate(r.registrationDeadline) : 'Chưa đặt'}</div>
            {r.daysToDeadline !== null && (r.daysToDeadline >= 0 || JOINABLE.includes(r.status)) && <div className={`text-[11px] ${deadlineUrgent ? 'text-red-700 font-bold' : 'text-slate-500'}`}>{inDays(r.daysToDeadline)}</div>}
          </div>
        </div>

        <div className="text-xs space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-slate-500">Đã đóng phí / chỉ tiêu</span>
            <span><strong>{r.paid}/{r.capacity}</strong> <span className="text-slate-500">· còn {r.seatsLeft}</span></span>
          </div>
          <SeatsBar r={r} />
          <div className="flex items-baseline justify-between gap-2 text-slate-500">
            <span>{r.funnel.leads} lead → {r.funnel.paid} đóng phí{conv !== null ? ` (${conv}%)` : ''}</span>
            <span className="font-bold text-slate-800">{formatVND(r.priceNow)}</span>
          </div>
          {r.earlyBirdActive && <div className="text-emerald-700 text-[11px]">Ưu đãi sớm tới {formatDate(r.earlyBirdDeadline)}</div>}
          {r.jobTitle && <div className="text-slate-500 text-[11px]">Đầu ra: {r.jobTitle}{r.jobDepartment ? ` – ${r.jobDepartment}` : ''}</div>}
        </div>

        <HintList hints={hints} />

        <div className="flex items-center gap-2 mt-auto pt-1">
          <button type="button" onClick={() => onOpenPipeline(r.id)} title="Mở pipeline của lớp"
            className="flex-1 px-3 py-2 rounded-xl bg-[#0073C1] text-white text-xs font-bold cursor-pointer">
            Pipeline · {r.funnel.leads} lead
          </button>
          {copyButton(r)}
          {canEdit && (
            <button type="button" onClick={() => onEdit({ ...r })} className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#0073C1] cursor-pointer">Sửa</button>
          )}
        </div>
      </article>
    );
  };

  const kpiTile = 'shrink-0 min-w-[150px] snap-start lg:min-w-0 border rounded-2xl px-3 py-2.5 text-left';
  const kpiBox = `${kpiTile} bg-white border-slate-200`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-900">Lớp tuyển sinh</h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Mỗi lớp là một chiến dịch tuyển sinh: sĩ số là chỉ tiêu, mã tuyển sinh gắn lead (link UTM, form đăng ký), bật “Hiện trên website” để đăng tuyển.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => onOpenPipeline('all')} className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Pipeline tất cả lead</button>
          <button type="button" onClick={() => onOpenPipeline('none')} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold cursor-pointer">Lead chưa gắn lớp</button>
          <button type="button" onClick={onReload} className="p-2 rounded-xl border border-slate-200 bg-white cursor-pointer" title="Làm mới" aria-label="Làm mới"><RefreshCw className="w-4 h-4" /></button>
          {canTraining && courses.length > 0 && (
            <button type="button" onClick={() => onEdit(newClass(course || courses[0].id))}
              className="px-4 py-2 rounded-xl bg-[#0073C1] text-white font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Mở lớp mới
            </button>
          )}
        </div>
      </div>

      {courses.length === 0 && (
        <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-amber-950">Chưa thể mở lớp vì chưa có khóa học</h2>
            <p className="text-xs leading-relaxed text-amber-900">
              Mỗi lớp tuyển sinh phải thuộc một khóa học để lấy học phí, nội dung đào tạo và tạo khóa Moodle. Hãy tạo khóa học trước, sau đó quay lại đây để mở lớp.
            </p>
          </div>
          {canTraining ? (
            <button
              type="button"
              onClick={() => navigate('/catalog/courses')}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo khóa học đầu tiên
            </button>
          ) : (
            <p className="shrink-0 text-xs font-bold text-amber-900 sm:max-w-52">
              Cần người có quyền Quản lý khóa học tạo khóa học trước.
            </p>
          )}
        </section>
      )}

      {/* The admissions at a glance (classes being recruited) */}
      <div className="flex gap-2 overflow-x-auto snap-x pb-1 -mx-1 px-1 lg:grid lg:grid-cols-5 lg:overflow-visible text-xs">
        <button type="button" onClick={() => setFilter('attention')}
          className={`${kpiTile} cursor-pointer ${counts.attention ? 'border-amber-300 bg-amber-50 hover:border-amber-400' : 'bg-white border-slate-200 hover:border-[#0073C1]'}`}>
          <div className="text-slate-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Cần xử lý</div>
          <div className="text-lg font-black text-slate-900">{counts.attention} lớp</div>
          <div className="text-slate-500">sắp hết hạn, chưa có lead, chưa có lịch…</div>
        </button>
        <button type="button" onClick={() => setFilter('recruiting')} className={`${kpiBox} cursor-pointer hover:border-[#0073C1]`}>
          <div className="text-slate-500">Đang tuyển</div>
          <div className="text-lg font-black text-slate-900">{recruiting.length} lớp</div>
          <div className="text-slate-500">còn {kpi.left} chỗ trống</div>
        </button>
        <div className={kpiBox}>
          <div className="text-slate-500">Đã đóng phí / chỉ tiêu</div>
          <div className="text-lg font-black text-slate-900">{kpi.paid}/{kpi.seats}</div>
          <div className="text-slate-500">{kpi.seats ? `${Math.round((100 * kpi.paid) / kpi.seats)}% lấp đầy` : '–'}</div>
        </div>
        <div className={kpiBox}>
          <div className="text-slate-500">Lead của lớp đang tuyển</div>
          <div className="text-lg font-black text-slate-900">{kpi.leads}</div>
          <div className="text-slate-500">{kpi.leads ? `${Math.round((100 * kpi.leadsPaid) / kpi.leads)}% đã đóng phí` : 'chưa có lead'}</div>
        </div>
        <div className={kpiBox}>
          <div className="text-slate-500">Chờ thanh toán</div>
          <div className="text-lg font-black text-slate-900">{pending}</div>
          <div className="text-slate-500">học viên đã giữ chỗ</div>
        </div>
      </div>

      {/* Filters, search, order, layout */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 text-xs">
          {FILTERS.map(([f, label]) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full border font-bold cursor-pointer ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {label} <span className={filter === f ? 'text-slate-300' : 'text-slate-400'}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm lớp, mã, khóa, địa điểm… (gõ không dấu được)" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white" />
          </div>
          {classCourses.length > 1 && (
            <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Khóa học" className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white max-w-[45%] sm:max-w-[220px]">
              <option value="">Mọi khóa</option>
              {classCourses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1 px-2.5 py-2 border border-slate-200 rounded-xl bg-white" title="Sắp xếp">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} disabled={!!q.trim()} aria-label="Sắp xếp" className="bg-transparent outline-none disabled:text-slate-400">
              {SORTS.map(([s, label]) => <option key={s} value={s}>{label}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl ml-auto">
            {(['cards', 'table'] as const).map((l) => (
              <button key={l} type="button" onClick={() => switchLayout(l)} aria-pressed={layout === l}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${layout === l ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>
                {l === 'cards' ? <LayoutGrid className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
                {l === 'cards' ? 'Thẻ' : 'Bảng'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center text-sm text-slate-500">
          Không có lớp phù hợp.{' '}
          {(filter !== 'all' || course || q) && (
            <button type="button" onClick={() => { setFilter('all'); setCourse(''); setQ(''); }} className="text-[#0073C1] font-bold hover:underline cursor-pointer">Xem tất cả lớp</button>
          )}
        </div>
      )}

      {shown.length > 0 && layout === 'cards' && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{shown.map(card)}</div>}

      {shown.length > 0 && layout === 'table' && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[1080px]">
            <thead className="text-slate-500 text-left bg-slate-50">
              <tr>
                <th className="p-3">Lớp</th><th>Trạng thái · website</th><th>Khai giảng / hạn ĐK</th><th>Chỗ (chỉ tiêu)</th><th>Lead</th><th>Học phí</th><th>Cần xử lý</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ row: r, hints }) => {
                const conv = conversion(r);
                return (
                  <tr key={r.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                    <td className="p-3 max-w-[210px]">
                      {courseLink(r)}
                      <div className="font-bold text-slate-900">{r.name}</div>
                      {r.code && <div className="font-mono text-[11px] text-indigo-700">{r.code}</div>}
                      <div className="text-slate-500">{[r.location, r.leadInstructor && `GV: ${r.leadInstructor}`].filter(Boolean).join(' · ')}</div>
                      {r.jobTitle && <div className="text-slate-500">Đầu ra: {r.jobTitle}{r.jobDepartment ? ` – ${r.jobDepartment}` : ''}</div>}
                    </td>
                    <td className="py-3 pr-2 space-y-1">
                      <StatusBadge r={r} />
                      <div><WebBadge r={r} /></div>
                    </td>
                    <td className="py-3 pr-2 whitespace-nowrap">
                      <div>{r.startDate ? formatDate(r.startDate) : '–'}</div>
                      <div className={r.daysToDeadline !== null && r.daysToDeadline <= 3 && r.status === 'opening' ? 'text-red-600 font-bold' : 'text-slate-500'}>
                        {r.registrationDeadline ? `Hạn ĐK ${formatDate(r.registrationDeadline)}` : 'Chưa đặt hạn'}
                      </div>
                    </td>
                    <td className="py-3 pr-2 w-36 whitespace-nowrap">
                      <div className="font-bold">{r.paid}/{r.capacity} <span className="font-normal text-slate-500">(còn {r.seatsLeft})</span></div>
                      <div className="mt-1"><SeatsBar r={r} /></div>
                      {r.pending > 0 && <div className="text-slate-500">{r.pending} chờ thanh toán</div>}
                    </td>
                    <td className="py-3 pr-2 whitespace-nowrap">
                      <button type="button" onClick={() => onOpenPipeline(r.id)} className="font-bold text-[#0073C1] hover:underline cursor-pointer" title="Mở pipeline của lớp">
                        {r.funnel.leads} lead
                      </button>
                      <div className="text-slate-500">{r.funnel.paid} đã đóng phí{conv !== null ? ` · ${conv}%` : ''}</div>
                    </td>
                    <td className="py-3 pr-2 whitespace-nowrap">
                      <div className="font-bold">{formatVND(r.priceNow)}</div>
                      {r.earlyBirdActive && <div className="text-emerald-700">Ưu đãi sớm tới {formatDate(r.earlyBirdDeadline)}</div>}
                    </td>
                    <td className="py-3 pr-2 min-w-[160px] max-w-[200px]"><HintList hints={hints} max={2} /></td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => onOpenPipeline(r.id)} className="px-2.5 py-2 rounded-lg bg-[#0073C1] text-white font-bold cursor-pointer">Pipeline</button>
                        {copyButton(r)}
                        {canEdit && (
                          <button type="button" onClick={() => onEdit({ ...r })} className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-[#0073C1] cursor-pointer">Sửa</button>
                        )}
                        {moreMenu(r)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {editing && <IntakeEditor draft={editing} courses={courses} intakes={rows} canTraining={canTraining} onClose={() => onEdit(null)} onSaved={onReload} />}
      {scheduling && <SessionsEditor intake={scheduling} onClose={() => setScheduling(null)} onSaved={onReload} />}
      {roster && <RosterModal cohortId={roster} onClose={() => setRoster(null)} />}
      {gradebook && <GradebookModal cohortId={gradebook} onClose={() => setGradebook(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------- the classes of one course

const byStart = (a: IntakeRow, b: IntakeRow) => (a.startDate || '9999').localeCompare(b.startDate || '9999');

/**
 * On a course's page (/app/catalog/courses): its classes, opened and edited with the same form as the
 * admissions screen, so the training staff open classes where they write the course.
 */
export const CourseClassesPanel: React.FC<{
  course: Course;
  courses: CourseOption[];
  rows: IntakeRow[] | null;
  error?: string;
  onReload: () => void;
}> = ({ course, courses, rows, error, onReload }) => {
  const canTraining = useStaffCan('courses.edit_info');
  const canAdmissions = useStaffCan('crm.assign_pic');
  const canLeads = useStaffCan('crm.view_leads');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [scheduling, setScheduling] = useState<IntakeRow | null>(null);
  const mine = useMemo(() => (rows || []).filter((r) => r.courseId === course.id).sort(byStart), [rows, course.id]);
  const recruiting = mine.filter((r) => JOINABLE.includes(r.status));
  const byClass = course.deliveryFormat === 'offline' || course.deliveryFormat === 'hybrid';
  const offSale = course.status !== 'published';

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <CalendarDays className="w-5 h-5 text-[#0073C1] shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">
              Lớp tuyển sinh {mine.length > 0 && <span className="font-normal text-slate-500">· {recruiting.length} đang tuyển / {mine.length} lớp</span>}
            </div>
            <div className="text-[11px] text-slate-500">
              Mỗi lớp là một đợt tuyển sinh: khai giảng, hạn đăng ký, chỉ tiêu, giá ưu đãi sớm, trang tuyển sinh. Học phí lấy từ khóa học.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canLeads && mine.length > 0 && (
            <button type="button" onClick={() => navigate(`/sales/crm?view=campaigns&course=${encodeURIComponent(course.id)}`)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer">
              Xem ở Tuyển sinh
            </button>
          )}
          {canTraining && rows && (
            <button type="button" onClick={() => setEditing(newClass(course.id))}
              className="px-3 py-2 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Mở lớp mới
            </button>
          )}
        </div>
      </div>

      {offSale && recruiting.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
          Khóa {COURSE_STATE[course.status || 'draft']}: {recruiting.length} lớp đang tuyển chưa nhận đăng ký và chưa lên website. Duyệt & mở bán ở mục trên.
        </div>
      )}

      {error && <p className="text-red-600">Không tải được danh sách lớp: {error}</p>}
      {!rows && !error && <p className="text-slate-500">Đang tải…</p>}
      {rows && mine.length === 0 && (
        <div className={`border border-dashed rounded-xl p-4 ${byClass ? 'border-amber-300 bg-amber-50/50 text-amber-900' : 'border-slate-300 text-slate-500'}`}>
          Chưa có lớp nào đang mở.{' '}
          {byClass ? 'Khóa học trực tiếp / kết hợp cần ít nhất 1 lớp sắp mở để bán.' : 'Khóa online không bắt buộc có lớp; mở lớp nếu học theo đợt.'}
        </div>
      )}

      {mine.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {mine.map((r) => {
            const hints = hintsOf(r);
            return (
              <article key={r.id} data-course-class={r.code || r.id} className={`border rounded-xl p-3 flex flex-col gap-2 ${needsAttention(hints) ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 leading-snug">{r.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <StatusBadge r={r} />
                      {r.code && <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">{r.code}</span>}
                    </div>
                  </div>
                  <WebBadge r={r} />
                </div>
                <div className="text-slate-600">
                  KG {r.startDate ? formatDate(r.startDate) : '–'} · Hạn ĐK {r.registrationDeadline ? formatDate(r.registrationDeadline) : 'chưa đặt'}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Đã đóng phí / chỉ tiêu</span>
                    <span><strong>{r.paid}/{r.capacity}</strong> · {r.funnel.leads} lead</span>
                  </div>
                  <SeatsBar r={r} />
                </div>
                <HintList hints={hints} max={2} />
                <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                  {(canTraining || canAdmissions) && (
                    <button type="button" onClick={() => setEditing({ ...r })} className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-[#0073C1] cursor-pointer">Sửa</button>
                  )}
                  {canTraining && (
                    <button type="button" onClick={() => setScheduling(r)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 cursor-pointer">
                      Lịch học{r.sessions ? ` (${r.sessions} buổi)` : ''}
                    </button>
                  )}
                  {canLeads && (
                    <button type="button" onClick={() => navigate(`/sales/crm?view=kanban&campaignId=${encodeURIComponent(r.id)}`)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 cursor-pointer">
                      Pipeline
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && <IntakeEditor draft={editing} courses={courses} intakes={rows || []} canTraining={canTraining} onClose={() => setEditing(null)} onSaved={onReload} />}
      {scheduling && <SessionsEditor intake={scheduling} onClose={() => setScheduling(null)} onSaved={onReload} />}
    </section>
  );
};
