import React, { useRef, useState } from 'react';
import { CalendarClock, X, XCircle } from 'lucide-react';

export const CARE_AGAIN = '6. Chăm sóc lại';
export const CANCELLED = '7. Đã hủy';

export const LOST_REASONS = [
  'Học phí cao',
  'Chưa sắp xếp được thời gian',
  'Đã học / chọn nơi khác',
  'Không liên lạc được',
  'Khóa học chưa phù hợp nhu cầu',
  'Đăng ký trùng / nhầm'
];

export interface StageExtra {
  nextContactOn?: string;
  lostReason?: string;
}

const isoIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Stages that need something before the move (the server checks it too): "Chăm sóc lại" asks the day
 * to call back (a task is created), "Đã hủy" asks why (lost-reason report). Usage:
 *   const gate = useStageGate();  ...  const extra = await gate.ask(stage); if (!extra) return;
 *   {gate.dialog}
 */
export function useStageGate() {
  const [stage, setStage] = useState<string | null>(null);
  const [date, setDate] = useState(isoIn(3));
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const resolver = useRef<((v: StageExtra | null) => void) | null>(null);

  const ask = (next: string): Promise<StageExtra | null> => {
    if (next !== CARE_AGAIN && next !== CANCELLED) return Promise.resolve({});
    setStage(next);
    setDate(isoIn(3));
    setReason('');
    setOther('');
    return new Promise((resolve) => (resolver.current = resolve));
  };
  const close = (value: StageExtra | null) => {
    setStage(null);
    resolver.current?.(value);
  };
  const lostReason = (reason === 'Khác' ? other : reason).trim();

  const dialog = stage ? (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4" onClick={() => close(null)}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            {stage === CARE_AGAIN ? <CalendarClock className="w-5 h-5 text-[#0073C1]" /> : <XCircle className="w-5 h-5 text-red-600" />}
            {stage === CARE_AGAIN ? 'Chuyển sang "Chăm sóc lại"' : 'Hủy đăng ký'}
          </h3>
          <button type="button" onClick={() => close(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        {stage === CARE_AGAIN ? (
          <div className="space-y-2 text-sm">
            <label className="block font-bold text-slate-700">Ngày gọi lại</label>
            <input type="date" value={date} min={isoIn(0)} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl" />
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7, 14, 30].map((d) => (
                <button key={d} type="button" onClick={() => setDate(isoIn(d))}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${date === isoIn(d) ? 'border-[#0073C1] text-[#0073C1] bg-blue-50' : 'border-slate-200 text-slate-600'}`}>
                  {d === 1 ? 'Ngày mai' : `${d} ngày`}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Hệ thống tạo việc "Gọi lại" vào ngày này cho tư vấn viên phụ trách.</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <label className="block font-bold text-slate-700">Lý do</label>
            <div className="grid grid-cols-1 gap-1.5">
              {[...LOST_REASONS, 'Khác'].map((r) => (
                <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${reason === r ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
                  <input type="radio" name="lost" checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            {reason === 'Khác' && (
              <input autoFocus value={other} onChange={(e) => setOther(e.target.value)} maxLength={200} placeholder="Ghi lý do" className="w-full p-2.5 border border-slate-300 rounded-xl" />
            )}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => close(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer">
            Thôi
          </button>
          <button
            type="button"
            disabled={stage === CARE_AGAIN ? !date : !lostReason}
            onClick={() => close(stage === CARE_AGAIN ? { nextContactOn: date } : { lostReason })}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 cursor-pointer ${stage === CARE_AGAIN ? 'bg-[#0073C1]' : 'bg-red-600'}`}
          >
            {stage === CARE_AGAIN ? 'Hẹn gọi lại' : 'Hủy đăng ký'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, dialog };
}
