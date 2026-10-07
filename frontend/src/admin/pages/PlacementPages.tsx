import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Copy, Download, Link2, RefreshCw, Send, UserPlus } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import {
  Candidate,
  fmtDate,
  fmtDateTime,
  MovePayload,
  NEXT,
  Outcomes,
  PartnerShare,
  Placement,
  placementApi,
  PlacementStage,
  STAGES,
  stageStyle
} from '../../lib/placement';

const input = 'w-full p-2 border border-slate-300 rounded-lg text-sm';
const btn = 'px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50';
const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const label = (s: PlacementStage) => STAGES.find((x) => x.id === s)?.label || s;

const csv = (name: string, header: string[], rows: (string | number | null)[][]) => {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const url = URL.createObjectURL(new Blob(['﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl w-full max-w-lg my-10 p-6 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{title}</h3>
        <button type="button" onClick={onClose} className={`${btn} border border-slate-200`}>Đóng</button>
      </div>
      {children}
    </div>
  </div>
);

/** Move a referral to its next step (fields depend on the step). */
export const MoveDialog: React.FC<{ placement: Placement; onClose: () => void; onDone: (p: Placement) => void }> = ({ placement, onClose, onDone }) => {
  const options = NEXT[placement.stage];
  const [form, setForm] = useState<MovePayload>({ stage: options[0], notify: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof MovePayload, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, interviewAt: form.interviewAt ? new Date(form.interviewAt).toISOString() : undefined };
      onDone(await placementApi.move(placement.id, payload));
    } catch (e) {
      setError(errText(e, 'Không cập nhật được'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`${placement.name} – ${placement.employer}`} onClose={onClose}>
      <label className="block font-bold">Chuyển sang
        <select className={input} value={form.stage} onChange={(e) => set('stage', e.target.value)}>
          {options.map((s) => <option key={s} value={s}>{s === placement.stage ? `${label(s)} (vòng tiếp theo)` : label(s)}</option>)}
        </select>
      </label>
      {form.stage === 'interview' && (
        <>
          <label className="block">Thời gian phỏng vấn<input type="datetime-local" className={input} onChange={(e) => set('interviewAt', e.target.value)} /></label>
          <label className="block">Địa điểm / link<input className={input} maxLength={300} onChange={(e) => set('interviewLocation', e.target.value)} /></label>
        </>
      )}
      {form.stage === 'offer' && <label className="block">Mức lương / chế độ<input className={input} maxLength={100} onChange={(e) => set('offerSalary', e.target.value)} /></label>}
      {form.stage === 'hired' && (
        <label className="block">Ngày bắt đầu làm việc<input type="date" className={input} onChange={(e) => set('startDate', e.target.value)} />
          <span className="text-xs text-slate-500">Hệ thống tự tính thử việc 60 ngày, cam kết việc làm 12 tháng và tạo các mốc hỏi thăm.</span>
        </label>
      )}
      {(form.stage === 'rejected' || form.stage === 'withdrawn') && (
        <label className="block">Lý do<input className={input} maxLength={300} onChange={(e) => set('reason', e.target.value)} /></label>
      )}
      <label className="block">Ghi chú<textarea className={input} rows={2} maxLength={2000} onChange={(e) => set('note', e.target.value)} /></label>
      {['interview', 'offer', 'hired'].includes(form.stage) && (
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.notify !== false} onChange={(e) => set('notify', e.target.checked)} /> Gửi email thông báo cho học viên</label>
      )}
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button type="button" disabled={busy} onClick={save} className={`${btn} bg-[#0073C1] text-white`}>Lưu</button>
    </Modal>
  );
};

/** Step 10: probation result / leaving the job. */
export const OutcomeDialog: React.FC<{ placement: Placement; onClose: () => void; onDone: (p: Placement) => void }> = ({ placement, onClose, onDone }) => {
  const [probation, setProbation] = useState<string>(placement.probationResult);
  const [leftAt, setLeftAt] = useState(placement.leftAt || '');
  const [reason, setReason] = useState(placement.leftReason);
  const [error, setError] = useState('');
  const save = async () => {
    setError('');
    try {
      onDone(await placementApi.outcome(placement.id, { probationResult: probation, ...(leftAt ? { leftAt, leftReason: reason } : {}) }));
    } catch (e) {
      setError(errText(e, 'Không cập nhật được'));
    }
  };
  return (
    <Modal title={`Sau tuyển dụng – ${placement.name}`} onClose={onClose}>
      <p className="text-xs text-slate-500">Bắt đầu {fmtDate(placement.startDate)} · thử việc đến {fmtDate(placement.probationEnd)} · cam kết đến {fmtDate(placement.guaranteeUntil)}</p>
      <label className="block font-bold">Kết quả thử việc
        <select className={input} value={probation} onChange={(e) => setProbation(e.target.value)}>
          <option value="">Chưa đánh giá</option><option value="passed">Qua thử việc</option><option value="failed">Không qua thử việc</option>
        </select>
      </label>
      <label className="block">Ngày nghỉ việc (nếu có)<input type="date" className={input} value={leftAt} onChange={(e) => setLeftAt(e.target.value)} /></label>
      {leftAt && <label className="block">Lý do nghỉ<input className={input} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      <p className="text-xs text-slate-500">Không qua thử việc hoặc nghỉ trong thời gian cam kết → học viên được đưa lại vào danh sách chờ giới thiệu.</p>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button type="button" onClick={save} className={`${btn} bg-[#0073C1] text-white`}>Lưu</button>
    </Modal>
  );
};

const PlacementCard: React.FC<{
  p: Placement;
  canManage: boolean;
  selected?: boolean;
  onSelect?: (v: boolean) => void;
  onMove: () => void;
  onOutcome: () => void;
}> = ({ p, canManage, selected, onSelect, onMove, onOutcome }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4 text-sm flex flex-wrap items-start justify-between gap-3">
    <div className="flex gap-3">
      {onSelect && <input type="checkbox" className="mt-1" checked={!!selected} onChange={(e) => onSelect(e.target.checked)} />}
      <div>
        <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
          {p.name}
          <span className={`text-[11px] border rounded-full px-2 py-0.5 ${stageStyle(p.stage)}`}>{p.leftAt ? 'Đã nghỉ việc' : p.stageLabel}</span>
        </div>
        <div className="text-xs text-slate-500">{p.course} · {p.orderCode} · {p.phone}</div>
        <div className="text-xs text-slate-700 mt-1">
          {p.employer}{p.unit ? ` – ${p.unit}` : ''}{p.jobTitle ? ` · ${p.jobTitle}` : ''}
          {p.gradePercent !== null && ` · Điểm ${p.gradePercent}%`}{p.attendanceRate !== null && ` · Chuyên cần ${p.attendanceRate}%`}
        </div>
        {p.stage === 'interview' && <div className="text-xs text-indigo-700 mt-0.5">Phỏng vấn {fmtDateTime(p.interviewAt)}{p.interviewLocation ? ` – ${p.interviewLocation}` : ''}</div>}
        {p.stage === 'hired' && (
          <div className="text-xs text-emerald-700 mt-0.5">
            Bắt đầu {fmtDate(p.startDate)} · thử việc đến {fmtDate(p.probationEnd)}
            {p.probationResult === 'passed' ? ' (đã qua)' : p.probationResult === 'failed' ? ' (không qua)' : ''} · cam kết đến {fmtDate(p.guaranteeUntil)}
            {p.leftAt && <span className="text-red-600"> · nghỉ {fmtDate(p.leftAt)}: {p.leftReason}</span>}
          </div>
        )}
        {p.rejectionReason && <div className="text-xs text-red-700 mt-0.5">Lý do: {p.rejectionReason}</div>}
        {p.feedback && <div className="text-xs text-slate-600 mt-0.5 italic">“{p.feedback}”</div>}
      </div>
    </div>
    {canManage && (
      <div className="flex gap-2">
        {NEXT[p.stage].length > 0 && <button type="button" onClick={onMove} className={`${btn} border border-[#0073C1] text-[#0073C1]`}>Cập nhật bước</button>}
        {p.stage === 'hired' && <button type="button" onClick={onOutcome} className={`${btn} border border-emerald-400 text-emerald-700`}>Thử việc / nghỉ việc</button>}
      </div>
    )}
  </div>
);

type Tab = 'candidates' | 'open' | 'hired' | 'closed' | 'shares';

/** Step 9: graduates -> referral -> partner HR -> interview -> offer -> start. */
export const JobsPage: React.FC = () => {
  const canManage = useStaffCan('placement.manage');
  const [tab, setTab] = useState<Tab>('candidates');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [shares, setShares] = useState<PartnerShare[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState<Placement | null>(null);
  const [outcome, setOutcome] = useState<Placement | null>(null);
  const [referring, setReferring] = useState<Candidate | null>(null);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');

  const load = () => {
    placementApi.candidates().then(setCandidates).catch((e: Error) => setMsg(e.message));
    placementApi.list().then(setPlacements).catch((e: Error) => setMsg(e.message));
    placementApi.shares().then(setShares).catch(() => setShares([]));
  };
  useEffect(load, []);

  const groups = useMemo(() => {
    const match = (p: Placement) => !q || `${p.name} ${p.orderCode} ${p.employer} ${p.unit}`.toLowerCase().includes(q.toLowerCase());
    const all = (placements || []).filter(match);
    return {
      open: all.filter((p) => ['shortlisted', 'submitted', 'interview', 'offer'].includes(p.stage)),
      hired: all.filter((p) => p.stage === 'hired'),
      closed: all.filter((p) => p.stage === 'rejected' || p.stage === 'withdrawn')
    };
  }, [placements, q]);

  const updated = (p: Placement) => {
    setMoving(null);
    setOutcome(null);
    setPlacements((list) => (list || []).map((x) => (x.id === p.id ? p : x)));
    placementApi.candidates().then(setCandidates).catch(() => undefined);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'candidates', label: 'Chờ giới thiệu', count: candidates?.length },
    { id: 'open', label: 'Đang giới thiệu', count: groups.open.length },
    { id: 'hired', label: 'Đã nhận việc', count: groups.hired.length },
    { id: 'closed', label: 'Đã đóng', count: groups.closed.length },
    { id: 'shares', label: 'Link gửi đối tác', count: shares?.filter((s) => s.active).length }
  ];
  const list = tab === 'open' ? groups.open : tab === 'hired' ? groups.hired : groups.closed;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 max-w-3xl">
        Học viên có chứng chỉ hợp lệ được đề cử sang ngân hàng đối tác. Gửi hồ sơ bằng <strong>link bảo mật có hạn</strong>, HR đối tác
        tự cập nhật lịch phỏng vấn và kết quả; học viên nhận email ở mỗi bước. Sau khi nhận việc, hệ thống tạo các mốc hỏi thăm và theo dõi thử việc, cam kết việc làm.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`${btn} border ${tab === t.id ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-200 text-slate-700'}`}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
        <button type="button" onClick={load} className={`${btn} border border-slate-200 flex items-center gap-1`}><RefreshCw className="w-3.5 h-3.5" /> Tải lại</button>
        {tab !== 'candidates' && tab !== 'shares' && (
          <input className="ml-auto p-2 border border-slate-300 rounded-lg text-xs w-56" placeholder="Tìm tên, mã đơn, đơn vị…" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
      </div>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}

      {tab === 'candidates' && (
        <div className="space-y-2">
          {!candidates ? <p className="text-sm text-slate-500">Đang tải…</p> : candidates.length === 0 && <p className="text-sm text-slate-500">Không có học viên tốt nghiệp nào đang chờ giới thiệu.</p>}
          {candidates?.map((c) => (
            <div key={c.orderId} className="bg-white rounded-2xl border border-slate-200 p-4 text-sm flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{c.name}{c.rereferral && <span className="ml-2 text-[11px] border rounded-full px-2 py-0.5 bg-red-50 text-red-700 border-red-200">Giới thiệu lại (cam kết)</span>}</div>
                <div className="text-xs text-slate-500">{c.course}{c.cohort ? ` · ${c.cohort}` : ''} · tốt nghiệp {fmtDate(c.graduatedAt)} · {c.phone}</div>
                <div className="text-xs text-slate-700 mt-1">
                  {c.gradePercent !== null ? `Điểm ${c.gradePercent}%` : 'Chưa có điểm'}{c.attendanceRate !== null ? ` · Chuyên cần ${c.attendanceRate}%` : ''} · {c.hasCv ? 'Đã có CV' : 'Chưa có CV'}
                  {c.positions.length > 0 && ` · Phù hợp: ${c.positions.map((p) => p.title).join(', ')}`}
                </div>
                {c.previous.length > 0 && <div className="text-xs text-slate-500 mt-0.5">Trước đây: {c.previous.join('; ')}</div>}
              </div>
              {canManage && <button type="button" onClick={() => setReferring(c)} className={`${btn} bg-[#0073C1] text-white flex items-center gap-1`}><UserPlus className="w-3.5 h-3.5" /> Đề cử</button>}
            </div>
          ))}
        </div>
      )}

      {(tab === 'open' || tab === 'hired' || tab === 'closed') && (
        <div className="space-y-2">
          {tab === 'open' && canManage && (
            <div className="flex items-center gap-3 text-xs">
              <button type="button" disabled={!selected.size} onClick={() => setSharing(true)} className={`${btn} bg-[#0073C1] text-white flex items-center gap-1`}>
                <Send className="w-3.5 h-3.5" /> Gửi {selected.size || ''} hồ sơ cho đối tác
              </button>
              <span className="text-slate-500">Chọn ứng viên để tạo link cho HR ngân hàng.</span>
            </div>
          )}
          {tab === 'hired' && list.length > 0 && (
            <button type="button" onClick={() => csv('viec-lam-da-nhan', ['Học viên', 'Mã đơn', 'Khóa', 'Đơn vị', 'Vị trí', 'Bắt đầu', 'Thử việc đến', 'Kết quả thử việc', 'Cam kết đến', 'Nghỉ việc'],
              list.map((p) => [p.name, p.orderCode, p.course, `${p.employer} ${p.unit}`, p.jobTitle, p.startDate, p.probationEnd, p.probationResult, p.guaranteeUntil, p.leftAt]))}
              className={`${btn} border border-slate-200 flex items-center gap-1`}><Download className="w-3.5 h-3.5" /> CSV</button>
          )}
          {!placements ? <p className="text-sm text-slate-500">Đang tải…</p> : list.length === 0 && <p className="text-sm text-slate-500">Không có hồ sơ.</p>}
          {list.map((p) => (
            <PlacementCard key={p.id} p={p} canManage={canManage}
              selected={selected.has(p.id)}
              onSelect={tab === 'open' && canManage ? (v) => setSelected((s) => { const n = new Set(s); if (v) n.add(p.id); else n.delete(p.id); return n; }) : undefined}
              onMove={() => setMoving(p)} onOutcome={() => setOutcome(p)} />
          ))}
        </div>
      )}

      {tab === 'shares' && <SharesList shares={shares} canManage={canManage} onChange={load} />}

      {moving && <MoveDialog placement={moving} onClose={() => setMoving(null)} onDone={updated} />}
      {outcome && <OutcomeDialog placement={outcome} onClose={() => setOutcome(null)} onDone={updated} />}
      {referring && <ReferDialog candidate={referring} onClose={() => setReferring(null)} onDone={() => { setReferring(null); load(); setTab('open'); }} />}
      {sharing && (
        <ShareDialog ids={[...selected]} onClose={() => setSharing(false)}
          onDone={() => { setSelected(new Set()); load(); }} />
      )}
    </div>
  );
};

const ReferDialog: React.FC<{ candidate: Candidate | { orderId: string; name: string; positions: Candidate['positions'] }; onClose: () => void; onDone: () => void }> = ({ candidate, onClose, onDone }) => {
  const [positionId, setPositionId] = useState(candidate.positions[0]?.id || '');
  const [employer, setEmployer] = useState('MSB');
  const [unit, setUnit] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    try {
      await placementApi.refer({ orderId: candidate.orderId, positionId: positionId || undefined, employer, unit, jobTitle });
      onDone();
    } catch (e) {
      setError(errText(e, 'Không đề cử được'));
    }
  };
  return (
    <Modal title={`Đề cử ${candidate.name}`} onClose={onClose}>
      {candidate.positions.length > 0 && (
        <label className="block font-bold">Vị trí trong chiến dịch tuyển dụng
          <select className={input} value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            {candidate.positions.map((p) => <option key={p.id} value={p.id}>{p.title} – {p.campaign}</option>)}
            <option value="">Khác (nhập tay)</option>
          </select>
        </label>
      )}
      <label className="block">Ngân hàng / doanh nghiệp<input className={input} value={employer} onChange={(e) => setEmployer(e.target.value)} /></label>
      <label className="block">Đơn vị / chi nhánh{positionId && ' (để trống = theo vị trí)'}<input className={input} value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      <label className="block">Chức danh{positionId && ' (để trống = theo vị trí)'}<input className={input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></label>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button type="button" onClick={save} className={`${btn} bg-[#0073C1] text-white`}>Đề cử</button>
    </Modal>
  );
};

const ShareDialog: React.FC<{ ids: string[]; onClose: () => void; onDone: () => void }> = ({ ids, onClose, onDone }) => {
  const [title, setTitle] = useState(`Ứng viên TWings – ${new Date().toLocaleDateString('vi-VN')}`);
  const [employer, setEmployer] = useState('MSB');
  const [allowCv, setAllowCv] = useState(true);
  const [days, setDays] = useState(30);
  const [created, setCreated] = useState<PartnerShare | null>(null);
  const [error, setError] = useState('');
  const save = async () => {
    try {
      setCreated(await placementApi.share({ title, employer, placementIds: ids, allowCv, days }));
      onDone();
    } catch (e) {
      setError(errText(e, 'Không tạo được link'));
    }
  };
  return (
    <Modal title="Gửi hồ sơ cho đối tác" onClose={onClose}>
      {created?.url ? (
        <>
          <p className="text-emerald-700 font-bold">Đã tạo link cho {created.candidates} ứng viên (hết hạn {fmtDate(created.expiresAt)}).</p>
          <div className="flex gap-2">
            <input readOnly className={`${input} font-mono text-xs`} value={created.url} onFocus={(e) => e.target.select()} />
            <button type="button" onClick={() => navigator.clipboard?.writeText(created.url || '')} className={`${btn} border border-slate-200 flex items-center gap-1`}><Copy className="w-3.5 h-3.5" /> Chép</button>
          </div>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Link chỉ hiển thị một lần – hãy gửi ngay cho HR đối tác qua email công việc. Ai có link đều xem được hồ sơ; có thể thu hồi trong tab “Link gửi đối tác”.
          </p>
        </>
      ) : (
        <>
          <label className="block">Tiêu đề<input className={input} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="block">Gửi cho<input className={input} value={employer} onChange={(e) => setEmployer(e.target.value)} /></label>
          <label className="block">Hiệu lực (ngày)<input type="number" min={1} max={90} className={input} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allowCv} onChange={(e) => setAllowCv(e.target.checked)} /> Cho phép tải CV</label>
          <p className="text-xs text-slate-500">{ids.length} ứng viên; hồ sơ ở bước “Đề cử” sẽ chuyển sang “Đã gửi hồ sơ”.</p>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="button" onClick={save} className={`${btn} bg-[#0073C1] text-white flex items-center gap-1`}><Link2 className="w-3.5 h-3.5" /> Tạo link</button>
        </>
      )}
    </Modal>
  );
};

const SharesList: React.FC<{ shares: PartnerShare[] | null; canManage: boolean; onChange: () => void }> = ({ shares, canManage, onChange }) => {
  const revoke = async (s: PartnerShare) => {
    if (!window.confirm(`Thu hồi link “${s.title}”? HR đối tác sẽ không mở được nữa.`)) return;
    await placementApi.revoke(s.id);
    onChange();
  };
  if (!shares) return <p className="text-sm text-slate-500">Đang tải…</p>;
  if (!shares.length) return <p className="text-sm text-slate-500">Chưa tạo link nào. Chọn ứng viên ở tab “Đang giới thiệu” để gửi.</p>;
  return (
    <table className="w-full text-xs bg-white rounded-2xl border border-slate-200">
      <thead className="text-left text-slate-500"><tr><th className="p-3">Tiêu đề</th><th>Đối tác</th><th>Ứng viên</th><th>Lượt xem</th><th>Hết hạn</th><th>Tạo bởi</th><th /></tr></thead>
      <tbody>
        {shares.map((s) => (
          <tr key={s.id} className="border-t border-slate-100">
            <td className="p-3 font-bold">{s.title}</td><td>{s.employer}</td><td>{s.candidates}</td>
            <td>{s.viewCount}{s.lastViewedAt ? ` (gần nhất ${fmtDateTime(s.lastViewedAt)})` : ''}</td>
            <td>{s.revoked ? <span className="text-red-600">Đã thu hồi</span> : s.active ? fmtDate(s.expiresAt) : <span className="text-slate-400">Hết hạn</span>}</td>
            <td>{s.createdBy}</td>
            <td className="pr-3 text-right">{canManage && s.active && <button type="button" onClick={() => revoke(s)} className="text-red-600 font-bold hover:underline cursor-pointer">Thu hồi</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** Step 10: placement rate per course, quotas, probation and guarantee follow-up. */
export const JobOutcomesPage: React.FC = () => {
  const [data, setData] = useState<Outcomes | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    placementApi.outcomes().then(setData).catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Đang tải…</p>;
  const BriefList: React.FC<{ title: string; rows: Outcomes['probationDue']; empty: string; tone: string }> = ({ title, rows, empty, tone }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs">
      <div className={`font-bold mb-2 ${tone}`}>{title} ({rows.length})</div>
      {rows.length === 0 ? <p className="text-slate-500">{empty}</p> : (
        <ul className="space-y-1">{rows.map((r) => <li key={r.id}><strong>{r.name}</strong> – {r.employer}{r.unit ? ` ${r.unit}` : ''} · bắt đầu {fmtDate(r.startDate)} · thử việc {fmtDate(r.probationEnd)} · cam kết {fmtDate(r.guaranteeUntil)}</li>)}</ul>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((s) => (
          <div key={s.id} className={`rounded-2xl border p-3 ${s.style}`}>
            <div className="text-[11px] font-semibold">{s.label}</div>
            <div className="text-xl font-bold">{data.funnel[s.id] || 0}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
        <div className="font-bold text-sm mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#0073C1]" /> Tỷ lệ có việc theo khóa</div>
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500"><tr><th className="py-1.5">Khóa</th><th>Tốt nghiệp</th><th>Đã giới thiệu</th><th>Phỏng vấn</th><th>Nhận việc</th><th>Tỷ lệ có việc</th><th>Qua thử việc</th><th>Đang làm</th><th>Số ngày TB đến khi đi làm</th></tr></thead>
          <tbody>
            {data.courses.map((r) => (
              <tr key={r.course} className="border-t border-slate-100">
                <td className="py-2 font-bold">{r.course}</td><td>{r.graduates}</td><td>{r.referred}</td><td>{r.interviewed}</td><td>{r.hired}</td>
                <td className="font-bold">{r.placementRate}%</td><td>{r.passedProbation}</td><td>{r.working}</td><td>{r.avgDaysToJob ?? '–'}</td>
              </tr>
            ))}
            {data.courses.length === 0 && <tr><td colSpan={9} className="py-2 text-slate-500">Chưa có học viên tốt nghiệp.</td></tr>}
          </tbody>
        </table>
      </div>
      {data.quotas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <div className="font-bold text-sm mb-2">Chỉ tiêu tuyển dụng theo vị trí</div>
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500"><tr><th className="py-1.5">Chiến dịch</th><th>Vị trí</th><th>Chỉ tiêu</th><th>Đang xử lý</th><th>Đã nhận việc</th><th>Hoàn thành</th></tr></thead>
            <tbody>
              {data.quotas.map((r) => (
                <tr key={`${r.campaign}-${r.position}`} className="border-t border-slate-100">
                  <td className="py-2">{r.campaign}</td><td className="font-bold">{r.position}</td><td>{r.target}</td><td>{r.inProcess}</td><td>{r.hired}</td>
                  <td>{r.target ? `${Math.round((100 * r.hired) / r.target)}%` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-3">
        <BriefList title="Đến hạn đánh giá thử việc" rows={data.probationDue} empty="Không có." tone="text-amber-800" />
        <BriefList title="Sắp hết cam kết việc làm (30 ngày)" rows={data.guaranteeEnding} empty="Không có." tone="text-slate-700" />
        <BriefList title="Cần giới thiệu lại" rows={data.rereferral} empty="Không có." tone="text-red-700" />
      </div>
    </div>
  );
};

/** In the learner's file (CRM): this learner's referrals and their steps. */
export const PlacementPanel: React.FC<{ orderId: string; name: string }> = ({ orderId, name }) => {
  const canManage = useStaffCan('placement.manage');
  const [rows, setRows] = useState<Placement[] | null>(null);
  const [moving, setMoving] = useState<Placement | null>(null);
  const [outcome, setOutcome] = useState<Placement | null>(null);
  const [referring, setReferring] = useState(false);
  const [error, setError] = useState('');
  const load = () => placementApi.list({ order: orderId }).then(setRows).catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, [orderId]);
  const done = () => {
    setMoving(null);
    setOutcome(null);
    setReferring(false);
    load();
  };
  const open = rows?.some((p) => ['shortlisted', 'submitted', 'interview', 'offer'].includes(p.stage));
  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rows && rows.length === 0 && <p className="text-xs text-slate-500">Chưa giới thiệu việc làm. Học viên cần có chứng chỉ hợp lệ để được đề cử.</p>}
      {rows?.map((p) => <PlacementCard key={p.id} p={p} canManage={canManage} onMove={() => setMoving(p)} onOutcome={() => setOutcome(p)} />)}
      {canManage && rows && !open && (
        <button type="button" onClick={() => setReferring(true)} className={`${btn} border border-[#0073C1] text-[#0073C1] flex items-center gap-1`}><UserPlus className="w-3.5 h-3.5" /> Đề cử việc làm</button>
      )}
      {moving && <MoveDialog placement={moving} onClose={() => setMoving(null)} onDone={done} />}
      {outcome && <OutcomeDialog placement={outcome} onClose={() => setOutcome(null)} onDone={done} />}
      {referring && <ReferDialog candidate={{ orderId, name, positions: [] }} onClose={() => setReferring(false)} onDone={done} />}
    </div>
  );
};
