import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckSquare, GraduationCap, TrendingUp, Users, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminUser } from '../../types';
import { linkProps } from '../router';

interface DashboardData {
  generatedAt: string;
  sales?: {
    pipeline: Record<string, number>;
    newLeads7d: number;
    leads30d: number;
    paid30d: number;
    tasksDueToday: number;
    overdueLeads: number;
    overdueList: { id: string; customerName: string; course: string; pic: string; dueAt: string }[];
    myOpenLeads: number;
    appointmentsToday: number;
    upcomingTasks: { id: string; title: string; dueDate: string | null; priority: string; orderId: string; customerName: string }[];
  };
  finance?: { revenueMonth: number; revenueToday: number; receivable: number; unmatchedTransactions: number };
  training?: {
    atRisk: number;
    watch: number;
    certificateHolds: number;
    enrollments: Record<string, number>;
    upcomingCohorts: { id: string; name: string; courseTitle: string; startDate: string; capacity: number; paid: number; status: string }[];
  };
}

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const STAGES = ['1. Mới', '2. Đã tiếp cận', '3. Đang tư vấn', '4. Hẹn gặp', '5. Đã đóng phí', '6. Chăm sóc lại', '7. Đã hủy'];

const Stat: React.FC<{ label: string; value: string | number; icon: React.ElementType; tone?: string; to?: string }> = ({
  label,
  value,
  icon: Icon,
  tone = 'text-[#0073C1] bg-blue-50',
  to
}) => {
  const body = (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 h-full hover:border-slate-300 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500">{label}</div>
        <div className="text-xl font-black text-slate-900 truncate">{value}</div>
      </div>
    </div>
  );
  return to ? <a {...linkProps(to)}>{body}</a> : body;
};

/** Role-aware home: each section only appears when the user's permissions allow it (server-side). */
export const DashboardPage: React.FC<{ user: AdminUser }> = ({ user }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<DashboardData>('/staff/dashboard/')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const s = data?.sales;
  const f = data?.finance;
  const t = data?.training;
  const maxStage = Math.max(1, ...STAGES.map((k) => s?.pipeline[k] || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {greeting}, {user.name.split(' ').slice(-1)[0]}
          </h1>
          <p className="text-sm text-slate-500">Tổng quan hoạt động TWings Academy hôm nay.</p>
        </div>
        <a
          {...linkProps('/reports')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#0073C1] hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-[#0073C1] transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <TrendingUp className="w-4 h-4 text-[#0073C1]" />
          <span>Xem báo cáo phân tích xu hướng →</span>
        </a>
      </div>

      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {!data && !error && <p className="text-sm text-slate-500">Đang tải…</p>}

      {(s || f) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {s && <Stat label="Lead mới (7 ngày)" value={s.newLeads7d} icon={Users} to="/sales/crm" />}
          {s && (
            <Stat
              label="Chuyển đổi 30 ngày"
              value={s.leads30d ? `${Math.round((s.paid30d / s.leads30d) * 100)}% (${s.paid30d}/${s.leads30d})` : '–'}
              icon={TrendingUp}
              tone="text-emerald-700 bg-emerald-50"
            />
          )}
          {f && <Stat label="Doanh thu tháng này" value={vnd(f.revenueMonth)} icon={Wallet} tone="text-emerald-700 bg-emerald-50" to="/finance/transactions" />}
          {f && <Stat label="Còn phải thu" value={vnd(f.receivable)} icon={Wallet} tone="text-amber-700 bg-amber-50" to="/sales/crm" />}
          {s && <Stat label="Việc đến hạn" value={s.tasksDueToday} icon={CheckSquare} tone="text-amber-700 bg-amber-50" />}
          {s && (
            <Stat label="Lead quá hạn phản hồi" value={s.overdueLeads} icon={AlertTriangle}
              tone={s.overdueLeads ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100'} to="/sales/consulting" />
          )}
          {s && <Stat label="Lead đang mở của tôi" value={s.myOpenLeads} icon={Users} to="/sales/crm" />}
          {s && <Stat label="Lịch hẹn tư vấn hôm nay" value={s.appointmentsToday} icon={CalendarClock} to="/sales/consulting" />}
          {data?.training && (
            <Stat label="Học viên có nguy cơ / cần theo dõi" value={`${data.training.atRisk} / ${data.training.watch}`} icon={GraduationCap}
              tone={data.training.atRisk ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100'} to="/learning/support" />
          )}
          {data?.training && data.training.certificateHolds > 0 && (
            <Stat label="Chứng chỉ đang giữ (chuyên cần)" value={data.training.certificateHolds} icon={AlertTriangle} tone="text-amber-700 bg-amber-50" to="/learning/support" />
          )}
          {f && (
            <Stat
              label="Giao dịch chưa khớp"
              value={f.unmatchedTransactions}
              icon={AlertTriangle}
              tone={f.unmatchedTransactions ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100'}
              to="/finance/transactions?status=unmatched"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {s && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-900">Phễu tuyển sinh</h2>
            {STAGES.map((stage) => {
              const n = s.pipeline[stage] || 0;
              return (
                <div key={stage} className="flex items-center gap-3 text-xs">
                  <span className="w-32 shrink-0 text-slate-600">{stage}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0073C1]" style={{ width: `${(n / maxStage) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono font-bold">{n}</span>
                </div>
              );
            })}
          </section>
        )}

        {s && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0073C1]" /> Việc cần làm sắp tới
            </h2>
            {s.upcomingTasks.length === 0 && <p className="text-xs text-slate-500">Không có việc nào đang mở.</p>}
            {s.upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 text-xs border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{task.title}</div>
                  <div className="text-slate-500 truncate">{task.customerName}</div>
                </div>
                <span className={`shrink-0 font-mono ${task.dueDate && new Date(task.dueDate) <= new Date() ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Không hạn'}
                </span>
              </div>
            ))}
          </section>
        )}

        {t && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#0073C1]" /> Khai giảng trong 45 ngày tới
            </h2>
            {t.upcomingCohorts.length === 0 && <p className="text-xs text-slate-500">Chưa có đợt khai giảng sắp tới.</p>}
            {t.upcomingCohorts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-xs border-b border-slate-100 pb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                  <div className="text-slate-500 truncate">{c.courseTitle}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono">{new Date(c.startDate).toLocaleDateString('vi-VN')}</div>
                  <div className={c.paid >= c.capacity ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {c.paid}/{c.capacity} chỗ
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {t && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#0073C1]" /> Ghi danh LMS
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['done', 'Đã ghi danh', 'text-emerald-700'],
                ['failed', 'Lỗi, đang thử lại', 'text-red-600'],
                ['pending', 'Đang chờ', 'text-amber-700'],
                ['removed', 'Đã hủy ghi danh', 'text-slate-600']
              ].map(([key, label, tone]) => (
                <div key={key} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">{label}</div>
                  <div className={`text-lg font-black ${tone}`}>{t.enrollments[key] || 0}</div>
                </div>
              ))}
            </div>
            <a {...linkProps('/learning/lms')} className="text-xs font-bold text-[#0073C1] hover:underline">
              Xem tiến độ học tập →
            </a>
          </section>
        )}
      </div>
    </div>
  );
};
