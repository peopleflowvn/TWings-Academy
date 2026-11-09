import React, { useCallback, useEffect, useState } from 'react';
import { GitMerge, Loader2, UserX, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { navigate } from '../../admin/router';
import { StageName } from './StageGate';

interface Side {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string | null;
  createdAt: string;
  registrations: Array<{ id: string; orderCode: string; courseTitle: string; crmStatus: string }>;
}
export interface LearnerMatchRow {
  id: string;
  reason: string;
  createdAt: string;
  a: Side;
  b: Side;
}

/** Decide one pair: same person (the newer record merges into the older) or other people (never asked again). */
export async function decideMatch(id: string, same: boolean): Promise<void> {
  await api.post(`/staff/learner-matches/${id}/${same ? 'same' : 'different'}/`);
}

const SideCard: React.FC<{ side: Side }> = ({ side }) => (
  <div className="flex-1 min-w-[220px] p-2.5 rounded-xl border border-slate-200 space-y-1">
    <button type="button" onClick={() => navigate(`/sales/learners?id=${side.id}`)} className="font-bold text-slate-900 hover:underline cursor-pointer text-left">
      {side.fullName} <span className="font-mono text-[10px] text-slate-400">{side.code}</span>
    </button>
    <div className="text-slate-600">{[side.phone, side.email, side.birthDate].filter(Boolean).join(' · ') || '–'}</div>
    {side.registrations.map((r) => (
      <div key={r.id} className="text-[11px] text-slate-500 truncate" title={r.courseTitle}>
        <span className="font-mono">{r.orderCode}</span> · {r.courseTitle || '–'} · <StageName code={r.crmStatus} />
      </div>
    ))}
  </div>
);

/** Learner records that may be one person (smart matching), waiting for staff. */
export const LearnerMatchReview: React.FC = () => {
  const canMerge = useStaffCan('crm.assign_pic');
  const canEdit = useStaffCan('crm.edit_status');
  const [rows, setRows] = useState<LearnerMatchRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<LearnerMatchRow[]>('/staff/learner-matches/').then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const decide = async (m: LearnerMatchRow, same: boolean) => {
    const older = new Date(m.a.createdAt) <= new Date(m.b.createdAt) ? m.a : m.b;
    const newer = older === m.a ? m.b : m.a;
    const question = same
      ? `${m.a.fullName} và ${m.b.fullName} là cùng một người?\n\nHồ sơ ${newer.code} sẽ gộp vào ${older.code} (đăng ký, lịch sử chuyển sang; thông tin trống được bổ sung).`
      : `${m.a.fullName} và ${m.b.fullName} là hai người khác nhau? Cặp này sẽ không được hỏi lại.`;
    if (!window.confirm(question)) return;
    setBusy(m.id);
    setError('');
    try {
      await decideMatch(m.id, same);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setBusy('');
    }
  };

  if (!rows || rows.length === 0) return null;
  return (
    <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-4 space-y-3 text-xs">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
        <Users className="w-4 h-4" /> {rows.length} cặp hồ sơ nghi cùng một người {open ? '▴' : '▾'}
      </button>
      {open && (
        <>
          <p className="text-amber-900/80">
            Hệ thống so khớp email (kể cả dấu chấm / +tag của Gmail), số điện thoại, CCCD, họ tên không dấu và ngày sinh. Cặp dưới đây chưa đủ chắc chắn để tự gộp: hãy xác nhận.
          </p>
          {error && <p className="text-red-600">{error}</p>}
          {rows.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-amber-200 p-3 space-y-2">
              <div className="font-bold text-amber-800">{m.reason}</div>
              <div className="flex flex-wrap gap-2">
                <SideCard side={m.a} />
                <SideCard side={m.b} />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {busy === m.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                {canEdit && (
                  <button type="button" disabled={!!busy} onClick={() => decide(m, false)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-50">
                    <UserX className="w-3.5 h-3.5" /> Khác người
                  </button>
                )}
                {canMerge && (
                  <button type="button" disabled={!!busy} onClick={() => decide(m, true)} className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
                    <GitMerge className="w-3.5 h-3.5" /> Cùng người – gộp hồ sơ
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
