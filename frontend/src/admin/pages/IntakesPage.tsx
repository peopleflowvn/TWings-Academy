import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, Plus, RefreshCw, Save, Target, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { formatDate, formatVND } from '../../lib/commerce';
import { RosterModal } from './JourneyPages';
import { GradebookModal } from './LearningPages';

interface IntakeRow {
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
}

interface Campaign {
  code: string;
  name: string;
  deadline: string | null;
  target: number;
  enrolled: number;
  positions: { title: string; courseTitle: string; target: number; enrolled: number; rate: number | null }[];
}

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
  ['opening', 'Đang tuyển sinh'],
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

const SessionsEditor: React.FC<{ intake: IntakeRow; onClose: () => void; onSaved: () => void }> = ({ intake, onClose, onSaved }) => {
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

type Draft = Partial<IntakeRow> & { id?: string; courseId: string };

const IntakeEditor: React.FC<{ draft: Draft; courses: { id: string; title: string }[]; intakes: IntakeRow[]; onClose: () => void; onSaved: () => void }> = ({ draft: initial, courses, intakes, onClose, onSaved }) => {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const siblings = intakes.filter((i) => i.courseId === d.courseId && i.id !== d.id);
  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
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
          <h3 className="font-bold text-lg">{d.id ? `Sửa đợt ${d.name}` : 'Mở đợt khai giảng mới'}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="sm:col-span-2">Khóa học
            <select className={input} value={d.courseId} disabled={!!d.id} onChange={(e) => setD({ ...d, courseId: e.target.value })}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label>Tên đợt *<input className={input} value={d.name || ''} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="VD: Khóa 12 – Hà Nội" /></label>
          <label>Trạng thái
            <select className={input} value={d.status || 'upcoming'} onChange={(e) => setD({ ...d, status: e.target.value })}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Ngày khai giảng<input type="date" className={input} value={d.startDate || ''} onChange={(e) => setD({ ...d, startDate: e.target.value })} /></label>
          <label>Hạn đăng ký<input type="date" className={input} value={d.registrationDeadline || ''} onChange={(e) => setD({ ...d, registrationDeadline: e.target.value })} /></label>
          <label>Sĩ số tối đa<input type="number" min={1} className={input} value={d.capacity ?? 25} onChange={(e) => setD({ ...d, capacity: Number(e.target.value) })} /></label>
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
        </div>
        <p className="text-slate-500">
          Hệ thống tự chuyển trạng thái: đủ chỗ → “Đã đủ sĩ số”, quá hạn đăng ký → “Đã đóng tuyển sinh”, tới ngày khai giảng → “Đang học”.
          Mở đợt mới sẽ tự tạo khóa Moodle riêng cho đợt (sao chép từ khóa mẫu).
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

/** Journey step 2: intakes (seats, payments, early bird, schedule on Moodle) and campaign quotas. */
export const IntakesPage: React.FC<{ courses: { id: string; title: string }[] }> = ({ courses }) => {
  const canEdit = useStaffCan('courses.edit_info');
  const [data, setData] = useState<{ intakes: IntakeRow[]; campaigns: Campaign[] } | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [scheduling, setScheduling] = useState<IntakeRow | null>(null);
  const [roster, setRoster] = useState<string | null>(null);
  const [gradebook, setGradebook] = useState<string | null>(null);

  const load = () => {
    setError('');
    api.get<{ intakes: IntakeRow[]; campaigns: Campaign[] }>('/staff/intakes/').then(setData).catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);

  const grouped = useMemo(() => {
    const map = new Map<string, IntakeRow[]>();
    (data?.intakes || []).forEach((r) => map.set(r.courseTitle, [...(map.get(r.courseTitle) || []), r]));
    return [...map.entries()];
  }, [data]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Đang tải…</p>;
  const totals = data.intakes.reduce((t, r) => ({ seats: t.seats + r.capacity, paid: t.paid + r.paid, pending: t.pending + r.pending }), { seats: 0, paid: 0, pending: 0 });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="bg-white border border-slate-200 rounded-xl px-3 py-2"><strong>{data.intakes.length}</strong> đợt đang mở / sắp mở / đang học</span>
          <span className="bg-white border border-slate-200 rounded-xl px-3 py-2">Đã đóng phí <strong>{totals.paid}</strong> / {totals.seats} chỗ</span>
          <span className="bg-white border border-slate-200 rounded-xl px-3 py-2">Chờ thanh toán <strong>{totals.pending}</strong></span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 cursor-pointer" title="Làm mới"><RefreshCw className="w-4 h-4" /></button>
          {canEdit && courses.length > 0 && (
            <button type="button" onClick={() => setEditing({ courseId: courses[0].id, status: 'upcoming', capacity: 25, autoRolloverWaitlist: true })}
              className="px-4 py-2 rounded-xl bg-[#0073C1] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Mở đợt mới
            </button>
          )}
        </div>
      </div>

      {grouped.length === 0 && <p className="text-sm text-slate-500">Chưa có đợt khai giảng nào.</p>}
      {grouped.map(([title, rows]) => (
        <section key={title} className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <div className="px-4 py-3 font-bold text-slate-900 border-b border-slate-100">{title}</div>
          <table className="w-full text-xs min-w-[900px]">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="p-3">Đợt</th><th>Trạng thái</th><th>Khai giảng / hạn ĐK</th><th>Chỗ</th><th>Chờ TT</th><th>Học phí hiện tại</th><th>Lịch học</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{r.name}</div>
                    <div className="text-slate-500">{[r.location, r.leadInstructor && `GV: ${r.leadInstructor}`].filter(Boolean).join(' · ')}</div>
                    {r.nextCohort && <div className="text-slate-400">→ {r.nextCohort}{r.autoRolloverWaitlist ? ' (tự chuyển)' : ''}</div>}
                  </td>
                  <td className="py-3"><span className={`border rounded-full px-2 py-0.5 font-bold ${STATUS_STYLE[r.status] || ''}`}>{r.statusLabel}</span></td>
                  <td className="py-3">
                    <div>{r.startDate ? formatDate(r.startDate) : '–'}</div>
                    <div className={r.daysToDeadline !== null && r.daysToDeadline <= 3 && r.status === 'opening' ? 'text-red-600 font-bold' : 'text-slate-500'}>
                      {r.registrationDeadline ? `Hạn ĐK ${formatDate(r.registrationDeadline)}` : 'Chưa đặt hạn'}
                    </div>
                  </td>
                  <td className="py-3 w-36">
                    <div className="font-bold">{r.paid}/{r.capacity} <span className="font-normal text-slate-500">(còn {r.seatsLeft})</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(r.fillRate || 0, 100)}%` }} /></div>
                  </td>
                  <td className="py-3">{r.pending}</td>
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
                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setRoster(r.id)} className="text-[#0073C1] font-bold hover:underline cursor-pointer mr-3">Danh sách lớp</button>
                    {r.status !== 'upcoming' && (
                      <button type="button" onClick={() => setGradebook(r.id)} className="text-[#0073C1] font-bold hover:underline cursor-pointer mr-3">Học tập</button>
                    )}
                    {canEdit && (
                      <>
                        <button type="button" onClick={() => setScheduling(r)} className="text-[#0073C1] font-bold hover:underline cursor-pointer mr-3 inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> Lịch học
                        </button>
                        <button type="button" onClick={() => setEditing({ ...r })} className="text-[#0073C1] font-bold hover:underline cursor-pointer">Sửa</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {data.campaigns.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="font-bold text-slate-900 flex items-center gap-2"><Target className="w-4 h-4 text-[#0073C1]" /> Chỉ tiêu chiến dịch tuyển sinh</div>
          {data.campaigns.map((c) => (
            <div key={c.code} className="text-xs space-y-1.5">
              <div className="font-bold">{c.name} <span className="font-normal text-slate-500">({c.code}{c.deadline ? ` · hạn ${formatDate(c.deadline)}` : ''}) – {c.enrolled}/{c.target || '?'} học viên</span></div>
              {c.positions.map((p) => (
                <div key={p.title + p.courseTitle} className="flex items-center gap-3">
                  <span className="w-48 truncate">{p.title}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${p.rate !== null && p.rate >= 100 ? 'bg-emerald-500' : 'bg-[#0073C1]'}`} style={{ width: `${Math.min(p.rate || 0, 100)}%` }} /></div>
                  <span className="w-24 text-right font-mono">{p.enrolled}/{p.target}{p.rate !== null && p.rate >= 100 && <CheckCircle2 className="inline w-3.5 h-3.5 ml-1 text-emerald-600" />}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {editing && <IntakeEditor draft={editing} courses={courses} intakes={data.intakes} onClose={() => setEditing(null)} onSaved={load} />}
      {scheduling && <SessionsEditor intake={scheduling} onClose={() => setScheduling(null)} onSaved={load} />}
      {roster && <RosterModal cohortId={roster} onClose={() => setRoster(null)} />}
      {gradebook && <GradebookModal cohortId={gradebook} onClose={() => setGradebook(null)} />}
    </div>
  );
};
