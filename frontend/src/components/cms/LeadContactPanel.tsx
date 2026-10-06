import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Download, FileCheck2, Mail, Phone } from 'lucide-react';
import { api, API_ROOT, ApiError } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';

export interface Appointment {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  courseTitle: string;
  startsAt: string;
  durationMinutes: number;
  channel: 'call' | 'zalo' | 'online' | 'office';
  location: string;
  note: string;
  status: 'planned' | 'done' | 'no_show' | 'cancelled';
  staffName: string;
}

export const CHANNEL_LABEL: Record<Appointment['channel'], string> = {
  call: 'Gọi điện',
  zalo: 'Zalo',
  online: 'Họp online',
  office: 'Tại văn phòng'
};
export const STATUS_LABEL: Record<Appointment['status'], string> = {
  planned: 'Đã hẹn',
  done: 'Đã tư vấn',
  no_show: 'Khách không đến',
  cancelled: 'Đã hủy'
};

const digits = (phone?: string) => (phone || '').replace(/[^\d+]/g, '');

/**
 * Step 4 in the lead workspace: one-tap contact (call / Zalo / e-mail), first-response status,
 * consultation appointments (confirmation e-mailed to the lead) and the step-6 enrolment file.
 */
export const LeadContactPanel: React.FC<{
  orderId: string;
  name: string;
  phone?: string;
  email?: string;
  responseDueAt?: string | null;
  firstResponseAt?: string | null;
  dossierSubmittedAt?: string | null;
  hasCv?: boolean;
}> = ({ orderId, name, phone, email, responseDueAt, firstResponseAt, dossierSubmittedAt, hasCv }) => {
  const canEdit = useStaffCan('crm.edit_status');
  const [rows, setRows] = useState<Appointment[]>([]);
  const [form, setForm] = useState({ date: '', time: '09:00', channel: 'call' as Appointment['channel'], location: '', note: '', notify: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<Appointment[]>(`/staff/orders/${orderId}/appointments/`).then(setRows).catch(() => setRows([]));
  }, [orderId]);
  useEffect(load, [load]);

  const book = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/staff/orders/${orderId}/appointments/`, {
        startsAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        channel: form.channel,
        location: form.location,
        note: form.note,
        notify: form.notify
      });
      setForm({ ...form, date: '', note: '' });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không đặt được lịch');
    } finally {
      setBusy(false);
    }
  };
  const setStatus = async (a: Appointment, status: Appointment['status']) => {
    await api.patch(`/staff/appointments/${a.id}/`, { status }).catch(() => undefined);
    load();
  };

  const overdue = !firstResponseAt && responseDueAt && new Date(responseDueAt) < new Date();
  const card = 'bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3';
  const btn = 'px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5';
  const field = 'p-2 border border-slate-300 rounded-lg text-xs';
  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-slate-900">Liên hệ {name}</h3>
          <span className={`font-bold ${firstResponseAt ? 'text-emerald-700' : overdue ? 'text-red-600' : 'text-amber-700'}`}>
            {firstResponseAt
              ? `Đã phản hồi lần đầu ${new Date(firstResponseAt).toLocaleString('vi-VN')}`
              : responseDueAt
                ? `${overdue ? 'QUÁ HẠN phản hồi' : 'Cần phản hồi trước'} ${new Date(responseDueAt).toLocaleString('vi-VN')}`
                : 'Chưa ghi nhận phản hồi'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {phone && <a href={`tel:${digits(phone)}`} className={`${btn} border-emerald-300 text-emerald-700`}><Phone className="w-3.5 h-3.5" /> Gọi {phone}</a>}
          {phone && <a href={`https://zalo.me/${digits(phone)}`} target="_blank" rel="noopener noreferrer" className={`${btn} border-blue-300 text-[#0068FF]`}>Zalo</a>}
          {email && <a href={`mailto:${email}`} className={`${btn} border-slate-300 text-slate-700`}><Mail className="w-3.5 h-3.5" /> {email}</a>}
        </div>
        <p className="text-slate-500">Ghi một hoạt động Gọi / Zalo / Email / Gặp mặt hoặc chuyển trạng thái tư vấn là hệ thống ghi nhận đã phản hồi.</p>
      </div>

      <div className={card}>
        <h3 className="font-bold text-sm text-slate-900">Lịch hẹn tư vấn</h3>
        {rows.length === 0 && <p className="text-slate-500">Chưa có lịch hẹn.</p>}
        {rows.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <span>
              <strong>{new Date(a.startsAt).toLocaleString('vi-VN')}</strong> · {CHANNEL_LABEL[a.channel]}
              {a.location ? ` · ${a.location}` : ''} {a.staffName ? `· ${a.staffName}` : ''}
              {a.note && <span className="block text-slate-500">{a.note}</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-bold">{STATUS_LABEL[a.status]}</span>
              {canEdit && a.status === 'planned' && (
                <>
                  <button type="button" onClick={() => setStatus(a, 'done')} className="text-emerald-700 font-bold cursor-pointer">Đã tư vấn</button>
                  <button type="button" onClick={() => setStatus(a, 'no_show')} className="text-amber-700 font-bold cursor-pointer">Không đến</button>
                  <button type="button" onClick={() => setStatus(a, 'cancelled')} className="text-slate-500 cursor-pointer">Hủy</button>
                </>
              )}
            </span>
          </div>
        ))}
        {canEdit && (
          <div className="border-t border-slate-100 pt-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
            <label>Ngày<input type="date" className={`${field} w-full`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label>Giờ<input type="time" className={`${field} w-full`} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
            <label>Hình thức
              <select className={`${field} w-full`} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Appointment['channel'] })}>
                {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="md:col-span-3">Địa điểm / link họp<input className={`${field} w-full`} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            <label className="col-span-2 md:col-span-4">Ghi chú<input className={`${field} w-full`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} /> Gửi email xác nhận</label>
            <button type="button" disabled={busy || !form.date} onClick={book} className={`${btn} border-[#0073C1] bg-[#0073C1] text-white justify-center cursor-pointer disabled:opacity-50`}>
              <CalendarPlus className="w-3.5 h-3.5" /> Đặt lịch
            </button>
          </div>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </div>

      <div className={card}>
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Hồ sơ nhập học</h3>
        <p>
          {dossierSubmittedAt
            ? `Học viên đã nộp hồ sơ ngày ${new Date(dossierSubmittedAt).toLocaleDateString('vi-VN')} (xem ở tab Hồ sơ).`
            : 'Học viên chưa nộp đủ hồ sơ (họ tự điền trong Tài khoản học viên: ngày sinh, CCCD, địa chỉ thường trú, trình độ, CV).'}
        </p>
        {hasCv && (
          <a href={`${API_ROOT}/staff/orders/${orderId}/cv/`} className={`${btn} border-slate-300 text-slate-700 w-fit`}>
            <Download className="w-3.5 h-3.5" /> Tải CV
          </a>
        )}
      </div>
    </div>
  );
};
