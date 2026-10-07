import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, ExternalLink, Megaphone, RefreshCw } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { AtRiskRow, CohortGradebook, lmsApi, openInMoodle, useStaffCan } from '../../lib/lms';

const RISK: Record<string, { label: string; style: string }> = {
  risk: { label: 'Có nguy cơ', style: 'bg-red-50 text-red-700 border-red-200' },
  watch: { label: 'Cần theo dõi', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  ok: { label: 'Ổn', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const csv = (name: string, header: string[], rows: (string | number | null)[][]) => {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const url = URL.createObjectURL(new Blob(['﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Step 7: learners who need support, from Moodle signals (synced every 30 minutes). */
export const LearningSupportPage: React.FC = () => {
  const canManage = useStaffCan('lms.manage');
  const [rows, setRows] = useState<AtRiskRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => lmsApi.atRisk().then(setRows).catch((e: Error) => setMsg(e.message));
  useEffect(() => {
    load();
  }, []);
  const refresh = async () => {
    setBusy(true);
    setMsg('');
    try {
      const r = await lmsApi.refreshLearning();
      setMsg(`Đã cập nhật ${r.learners} học viên ở ${r.courses} khóa Moodle${r.releasedHolds ? `, cấp ${r.releasedHolds} chứng chỉ đang chờ` : ''}.`);
      await load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Không cập nhật được');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-3xl">
          Dấu hiệu lấy từ Moodle: không vào học ≥ 7 ngày, chuyên cần dưới mức của khóa, tiến độ chậm xa so với lịch lớp, điểm tổng
          dưới 50%. Một dấu hiệu = <strong>cần theo dõi</strong>, từ hai = <strong>có nguy cơ</strong>. Cập nhật tự động 30 phút/lần.
        </p>
        <div className="flex gap-2">
          {rows && rows.length > 0 && (
            <button type="button" onClick={() => csv('hoc-vien-can-ho-tro', ['Học viên', 'SĐT', 'Email', 'Khóa', 'Đợt', 'Mức', 'Dấu hiệu', 'Tiến độ %', 'Chuyên cần %'],
              rows.map((r) => [r.name, r.phone, r.email, r.course, r.cohort, RISK[r.riskLevel].label, r.flags.join('; '), r.progress, r.attendanceRate]))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" /> CSV</button>
          )}
          {canManage && (
            <button type="button" onClick={refresh} disabled={busy} className="px-3 py-2 rounded-xl bg-[#0073C1] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Cập nhật từ Moodle
            </button>
          )}
        </div>
      </div>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
      {!rows ? <p className="text-sm text-slate-500">Đang tải…</p> : rows.length === 0 && <p className="text-sm text-emerald-700 font-bold">Không có học viên nào cần hỗ trợ.</p>}
      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.orderId} className="bg-white rounded-2xl border border-slate-200 p-4 text-sm flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                {r.riskLevel === 'risk' && <AlertTriangle className="w-4 h-4 text-red-600" />}{r.name}
                <span className={`text-[11px] border rounded-full px-2 py-0.5 ${RISK[r.riskLevel].style}`}>{RISK[r.riskLevel].label}</span>
              </div>
              <div className="text-xs text-slate-500">{r.course}{r.cohort ? ` · ${r.cohort}` : ''} · {r.phone} · {r.email}</div>
              <ul className="text-xs text-slate-700 mt-1 list-disc pl-5">{r.flags.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div className="flex gap-2 text-xs">
              {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 font-bold">Gọi</a>}
              {r.phone && <a href={`https://zalo.me/${r.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-blue-300 text-[#0068FF] font-bold">Zalo</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Step 7: an intake's learning summary (progress, attendance, course grade, risk; synced every 30 minutes).
 * The detailed gradebook, attendance sheet and class announcements live in Moodle and open from here.
 */
export const GradebookModal: React.FC<{ cohortId: string; onClose: () => void }> = ({ cohortId, onClose }) => {
  const [data, setData] = useState<CohortGradebook | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    lmsApi.gradebook(cohortId).then(setData).catch((e: Error) => setError(e.message));
  }, [cohortId]);
  const pct = (v: number | null) => (v === null ? <span className="text-slate-300">–</span> : <span className={v < 50 ? 'text-red-600 font-bold' : ''}>{v}%</span>);
  const link = (label: string, path?: string, primary = false) =>
    path && (
      <button
        type="button"
        onClick={() => openInMoodle(path)}
        className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer flex items-center gap-1 ${primary ? 'bg-[#0073C1] text-white' : 'border border-slate-200'}`}
      >
        {primary ? <Megaphone className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />} {label}
      </button>
    );
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-6 p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-lg">Học tập – {data ? `${data.course} · ${data.cohort}` : '…'}</h3>
          <div className="flex gap-2">
            {data && (
              <button type="button" onClick={() => csv(`hoc-tap-${data.cohort}`, ['Học viên', 'Tiến độ %', 'Chuyên cần', 'Điểm tổng %', 'Mức', 'Dấu hiệu'],
                data.rows.map((r) => [r.name, r.progress, r.attendance, r.coursePercent, RISK[r.riskLevel].label, r.riskFlags.join('; ')]))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold cursor-pointer flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>
            )}
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer">Đóng</button>
          </div>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        {!data && !error && <p className="text-slate-500">Đang tải…</p>}
        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {link('Đăng thông báo cho lớp (Moodle gửi email)', data.links.announcements, true)}
              {link('Sổ điểm chi tiết', data.links.grades)}
              {link('Tiến độ hoạt động', data.links.completion)}
              {link('Khóa học & điểm danh', data.links.course)}
            </div>
            <p className="text-slate-500">
              Số liệu đồng bộ từ Moodle 30 phút/lần{data.syncedAt ? ` (lần cuối ${new Date(data.syncedAt).toLocaleString('vi-VN')})` : ''}.
              {' '}
              {data.attendanceEnabled ? 'Giảng viên điểm danh trong hoạt động “Điểm danh” của khóa Moodle.' : 'Đợt chưa có điểm danh – tạo lịch học để hệ thống tạo phiên điểm danh trên Moodle.'}
              {data.expectedProgress !== null && ` Lịch lớp đã qua ${data.expectedProgress}%.`}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-3">Học viên</th><th className="pr-3">Tiến độ</th><th className="pr-3">Chuyên cần</th>
                    <th className="pr-3">Điểm tổng</th><th className="pr-3">Mức</th><th />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.orderId} className="border-t border-slate-100 align-top">
                      <td className="py-2 pr-3 font-bold">{r.name}{r.completedAt && <div className="font-normal text-emerald-700">Đã hoàn thành</div>}{r.certificateHold && <div className="font-normal text-amber-700">{r.certificateHold}</div>}</td>
                      <td className="pr-3">{r.progress ?? 0}%</td>
                      <td className="pr-3">{r.attendanceRate !== null ? `${r.attendanceRate}% (${r.attendance})` : '–'}</td>
                      <td className="pr-3">{pct(r.coursePercent)}</td>
                      <td className="pr-3"><span className={`border rounded-full px-2 py-0.5 ${RISK[r.riskLevel].style}`} title={r.riskFlags.join('\n')}>{RISK[r.riskLevel].label}</span></td>
                      <td>{r.links.userCourse && <button type="button" onClick={() => openInMoodle(r.links.userCourse)} className="text-[#0073C1] hover:underline cursor-pointer">Moodle</button>}</td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && <tr><td className="py-2 text-slate-500" colSpan={6}>Chưa có học viên ghi danh.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
