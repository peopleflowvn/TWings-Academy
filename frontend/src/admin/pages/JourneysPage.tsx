import React, { useEffect, useState } from 'react';
import { Mail, Play } from 'lucide-react';
import { api } from '../../lib/api';

interface Journey {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  sent30d: number;
  delivered30d: number;
  opened30d: number;
  failed30d: number;
  lastSentAt: string | null;
  waiting: number;
}

/** Automated learner-journey e-mails: what each one does, on/off, 30-day stats, send what is due now. */
export const JourneysPage: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [rows, setRows] = useState<Journey[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Journey[]>('/staff/journeys/').then(setRows).catch((e: Error) => setError(e.message));
  }, []);

  const toggle = async (j: Journey) => {
    setError('');
    try {
      setRows(await api.patch<Journey[]>('/staff/journeys/', { key: j.key, enabled: !j.enabled }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được');
    }
  };
  const runNow = async () => {
    if (!window.confirm('Gửi ngay các email đang chờ của mọi hành trình đang bật?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ result: Record<string, { sent: number } | string>; journeys: Journey[] }>('/staff/journeys/');
      setRows(res.journeys);
      const sent = Object.values(res.result).reduce((s, r) => s + (typeof r === 'string' ? 0 : r.sent), 0);
      setNotice(`Đã gửi ${sent} email.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          Hệ thống tự gửi các email này mỗi sáng 9:30 theo hành trình của từng học viên; mỗi đơn nhận mỗi email tối đa một
          lần. Nội dung và lịch sử gửi xem trong “Mẫu email & lịch sử gửi”.
        </p>
        {canEdit && (
          <button type="button" onClick={runNow} disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#0073C1] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Play className="w-4 h-4" /> Gửi các email đang chờ ngay
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 font-bold">{notice}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map((j) => (
          <div key={j.key} className={`bg-white rounded-2xl border p-5 space-y-3 ${j.enabled ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Mail className="w-4 h-4 text-[#0073C1]" />{j.label}</h3>
                <p className="text-xs text-slate-600 mt-1">{j.description}</p>
              </div>
              <label className={`flex items-center gap-2 text-xs font-bold shrink-0 ${canEdit ? 'cursor-pointer' : ''}`}>
                <input type="checkbox" checked={j.enabled} disabled={!canEdit} onChange={() => toggle(j)} />
                {j.enabled ? 'Đang bật' : 'Đã tắt'}
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-50 rounded-xl p-2"><div className="font-black text-lg">{j.waiting}</div>đang chờ</div>
              <div className="bg-slate-50 rounded-xl p-2"><div className="font-black text-lg">{j.sent30d}</div>đã gửi 30 ngày</div>
              <div className="bg-slate-50 rounded-xl p-2"><div className="font-black text-lg">{j.sent30d ? `${Math.round((100 * j.opened30d) / j.sent30d)}%` : '–'}</div>đã mở</div>
              <div className="bg-slate-50 rounded-xl p-2"><div className={`font-black text-lg ${j.failed30d ? 'text-red-600' : ''}`}>{j.failed30d}</div>lỗi</div>
            </div>
            <div className="text-[11px] text-slate-500">
              Lần gửi gần nhất: {j.lastSentAt ? new Date(j.lastSentAt).toLocaleString('vi-VN') : 'chưa có'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
