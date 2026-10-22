/**
 * /app/sales/today: a consultant's working list for today, made for the phone they call from.
 * My leads past their first-response deadline, my new leads to contact, my tasks due, my appointments
 * today; one tap to call / Zalo / log the contact / open the lead. Lead managers also see the leads nobody
 * owns and assign them here.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, CheckCircle2, ChevronRight, Loader2, MessageCircle, Phone, RefreshCw, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { phoneDigits, zaloLink } from '../../lib/siteSeo';
import { navigate } from '../router';

interface Lead {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  course: string;
  crmStatus: string;
  responseDueAt: string | null;
  pic: string;
}
interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  overdue: boolean;
  lead: Lead;
}
interface Appointment {
  id: string;
  startsAt: string;
  channel: string;
  lead: Lead;
}
interface MyDay {
  overdue: Lead[];
  newLeads: Lead[];
  tasks: Task[];
  appointments: Appointment[];
  isLeadManager: boolean;
  unassigned?: Lead[];
  teamOverdue?: number;
}
interface Consultant {
  id: string;
  name: string;
  receivesLeads: boolean;
  openLeads: number;
}

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
const CHANNEL: Record<string, string> = { call: 'Gọi điện', zalo: 'Zalo', online: 'Online', office: 'Tại văn phòng', meeting: 'Gặp mặt' };

const openLead = (id: string) => navigate(`/sales/crm?view=kanban&campaignId=all&orderId=${encodeURIComponent(id)}`);

const LeadActions: React.FC<{ lead: Lead; onContacted?: () => void }> = ({ lead, onContacted }) => {
  const phone = phoneDigits(lead.customerPhone);
  const zalo = zaloLink(lead.customerPhone);
  const btn = 'flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold';
  return (
    <div className="flex gap-2 pt-2">
      {phone && (
        <a href={`tel:${phone}`} className={`${btn} bg-emerald-600 text-white`}>
          <Phone className="w-4 h-4" /> Gọi
        </a>
      )}
      {zalo && (
        <a href={zalo} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#0068FF] text-white`}>
          <MessageCircle className="w-4 h-4" /> Zalo
        </a>
      )}
      {onContacted && (
        <button type="button" onClick={onContacted} className={`${btn} border border-slate-300 text-slate-700 cursor-pointer`}>
          <Check className="w-4 h-4" /> Đã liên hệ
        </button>
      )}
      <button type="button" onClick={() => openLead(lead.id)} className={`${btn} border border-slate-300 text-slate-700 cursor-pointer`}>
        Hồ sơ <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const LeadLine: React.FC<{ lead: Lead; note?: React.ReactNode }> = ({ lead, note }) => (
  <div className="min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className="font-bold text-slate-900 truncate">{lead.customerName}</span>
      <span className="text-[11px] text-slate-500 shrink-0">{lead.crmStatus}</span>
    </div>
    <div className="text-xs text-slate-600 truncate">
      {lead.customerPhone} · {lead.course || 'Chưa chọn khóa'}
    </div>
    {note && <div className="text-xs mt-0.5">{note}</div>}
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; count: number; tone?: string; children: React.ReactNode; empty: string }> = ({
  title,
  icon,
  count,
  tone = 'text-slate-900',
  children,
  empty
}) => (
  <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
    <h2 className={`px-4 py-3 border-b border-slate-100 font-black text-sm flex items-center gap-2 ${tone}`}>
      {icon} {title} <span className="ml-auto text-xs font-bold text-slate-500">{count}</span>
    </h2>
    {count ? <div className="divide-y divide-slate-100">{children}</div> : <p className="px-4 py-4 text-sm text-slate-500">{empty}</p>}
  </section>
);

export const MyDayPage: React.FC = () => {
  const [day, setDay] = useState<MyDay | null>(null);
  const [error, setError] = useState('');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    setError('');
    api
      .get<MyDay>('/staff/my-day/')
      .then((d) => {
        setDay(d);
        if (d.isLeadManager) api.get<Consultant[]>('/staff/consultants/').then(setConsultants).catch(() => undefined);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const act = async (key: string, run: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await run();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const contacted = (lead: Lead) =>
    act(`c-${lead.id}`, () => api.post(`/staff/orders/${lead.id}/activities/`, { type: 'call', title: 'Đã liên hệ (từ danh sách hôm nay)' }));
  const done = (task: Task) => act(`t-${task.id}`, () => api.patch(`/staff/orders/${task.lead.id}/followups/${task.id}/`, { isCompleted: true }));
  const assign = (lead: Lead, userId: string) =>
    act(`a-${lead.id}`, () => api.post('/staff/orders/assign/', { ids: [lead.id], assignedToId: userId }));

  if (error && !day) return <p className="text-sm text-red-600">{error}</p>;
  if (!day) return <div className="py-16 flex justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const total = day.overdue.length + day.newLeads.length + day.tasks.length + day.appointments.length;
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Hôm nay của tôi</h1>
          <p className="text-xs text-slate-500">
            {total ? `${total} việc cần xử lý` : 'Không còn việc tồn hôm nay'}
            {day.isLeadManager && day.teamOverdue ? ` · cả đội có ${day.teamOverdue} lead quá hạn` : ''}
          </p>
        </div>
        <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 text-slate-600 cursor-pointer" aria-label="Tải lại">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {day.isLeadManager && (day.unassigned?.length ?? 0) > 0 && (
        <Section title="Lead chưa có tư vấn viên" icon={<UserPlus className="w-4 h-4" />} count={day.unassigned!.length} tone="text-red-700" empty="">
          {day.unassigned!.map((lead) => (
            <div key={lead.id} className="px-4 py-3">
              <LeadLine lead={lead} />
              <div className="flex gap-2 pt-2">
                <select
                  defaultValue=""
                  disabled={busy === `a-${lead.id}`}
                  onChange={(e) => e.target.value && assign(lead, e.target.value)}
                  className="flex-1 min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm"
                  aria-label="Giao cho tư vấn viên"
                >
                  <option value="">Giao cho…</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.openLeads} lead{c.receivesLeads ? '' : ', đang nghỉ'})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => openLead(lead.id)} className="px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer">
                  Hồ sơ
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Quá hạn liên hệ lần đầu" icon={<AlertTriangle className="w-4 h-4" />} count={day.overdue.length} tone="text-red-700" empty="Không có lead quá hạn.">
        {day.overdue.map((lead) => (
          <div key={lead.id} className="px-4 py-3 bg-red-50/40">
            <LeadLine lead={lead} note={<span className="text-red-700 font-bold">Hạn {time(lead.responseDueAt)}</span>} />
            <LeadActions lead={lead} onContacted={() => contacted(lead)} />
          </div>
        ))}
      </Section>

      <Section title="Lịch hẹn hôm nay" icon={<CalendarClock className="w-4 h-4" />} count={day.appointments.length} empty="Không có lịch hẹn.">
        {day.appointments.map((a) => (
          <div key={a.id} className="px-4 py-3">
            <LeadLine lead={a.lead} note={<span className="text-[#0073C1] font-bold">{time(a.startsAt)} · {CHANNEL[a.channel] || a.channel}</span>} />
            <LeadActions lead={a.lead} />
          </div>
        ))}
      </Section>

      <Section title="Lead mới cần liên hệ" icon={<Phone className="w-4 h-4" />} count={day.newLeads.length} empty="Không có lead mới.">
        {day.newLeads.map((lead) => (
          <div key={lead.id} className="px-4 py-3">
            <LeadLine lead={lead} note={lead.responseDueAt ? <span className="text-amber-700">Liên hệ trước {time(lead.responseDueAt)}</span> : null} />
            <LeadActions lead={lead} onContacted={() => contacted(lead)} />
          </div>
        ))}
      </Section>

      <Section title="Việc đến hạn" icon={<CheckCircle2 className="w-4 h-4" />} count={day.tasks.length} empty="Không có việc đến hạn.">
        {day.tasks.map((t) => (
          <div key={t.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={`text-sm font-bold ${t.overdue ? 'text-red-700' : 'text-slate-900'}`}>{t.title}</div>
                <div className="text-xs text-slate-600 truncate">
                  {t.lead.customerName} · {t.lead.customerPhone}
                  {t.overdue && t.dueDate ? ` · quá hạn từ ${new Date(`${t.dueDate}T00:00:00`).toLocaleDateString('vi-VN')}` : ''}
                </div>
              </div>
              <button
                type="button"
                disabled={busy === `t-${t.id}`}
                onClick={() => done(t)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Xong
              </button>
            </div>
            <LeadActions lead={t.lead} />
          </div>
        ))}
      </Section>
    </div>
  );
};
