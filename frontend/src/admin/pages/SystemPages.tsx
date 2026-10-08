import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileQuestion,
  FolderTree,
  Gauge,
  GraduationCap,
  History,
  RefreshCw,
  Upload,
  Users,
  XCircle
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { openInMoodle } from '../../lib/lms';

// ---------------------------------------------------------------- Moodle hub
interface MoodleLink {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
}

const MOODLE_GROUPS: { title: string; links: MoodleLink[] }[] = [
  {
    title: 'Khóa học & nội dung',
    links: [
      { label: 'Quản lý khóa học & danh mục', description: 'Tạo khóa, sắp xếp danh mục, ẩn/hiện khóa', path: '/learn/course/management.php', icon: FolderTree },
      { label: 'Tất cả khóa học', description: 'Danh sách khóa đang có trên LMS', path: '/learn/course/index.php', icon: BookOpen },
      { label: 'Khôi phục / sao chép khóa', description: 'Tạo khóa cho đợt mới từ bản sao lưu khóa mẫu', path: '/learn/backup/restorefile.php?contextid=1', icon: Upload }
    ]
  },
  {
    title: 'Đề thi & đánh giá',
    links: [
      { label: 'Ngân hàng câu hỏi', description: 'Ngân hàng đề dùng chung của hệ thống (theo khóa: vào khóa → Ngân hàng câu hỏi)', path: '/learn/question/banks.php?courseid=1', icon: FileQuestion },
      { label: 'Huy hiệu', description: 'Huy hiệu cấp khi hoàn thành khóa/hoạt động', path: '/learn/badges/index.php?type=1', icon: Award },
      { label: 'Khung năng lực', description: 'Năng lực nghề nghiệp gắn với khóa học và lộ trình', path: '/learn/admin/tool/lp/competencyframeworks.php?pagecontextid=1', icon: ClipboardList }
    ]
  },
  {
    title: 'Học viên & giảng viên',
    links: [
      { label: 'Tài khoản người dùng', description: 'Tìm, sửa, khóa tài khoản trên LMS', path: '/learn/admin/user.php', icon: Users },
      { label: 'Nhóm học viên toàn hệ thống (cohort)', description: 'Nhóm dùng để ghi danh hàng loạt', path: '/learn/cohort/index.php', icon: GraduationCap },
      { label: 'Nhập học viên từ file CSV', description: 'Tạo/ghi danh hàng loạt (ngoài luồng thanh toán tự động)', path: '/learn/admin/tool/uploaduser/index.php', icon: Upload }
    ]
  },
  {
    title: 'Báo cáo & nhật ký',
    links: [
      { label: 'Nhật ký hoạt động', description: 'Ai làm gì, khi nào trên LMS', path: '/learn/report/log/index.php?id=1', icon: History },
      { label: 'Quản trị Moodle', description: 'Toàn bộ cài đặt của LMS (chỉ Quản trị)', path: '/learn/admin/search.php', icon: Gauge }
    ]
  }
];

/** Shortcuts into Moodle's own management screens (opened with the CMS session through SSO). */
export const MoodleHubPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-xl font-black text-slate-900">Trung tâm quản lý đào tạo (Moodle)</h1>
      <p className="text-xs text-slate-500 max-w-3xl">
        Soạn bài giảng, ngân hàng câu hỏi, đề thi, chấm điểm, điểm danh và chứng chỉ được thực hiện bằng các công cụ có sẵn
        của Moodle. Các lối tắt dưới đây mở đúng màn hình trên Moodle bằng tài khoản CMS của bạn (“Đăng nhập bằng TWings”).
        Theo dõi tiến độ học viên theo khóa ở mục <strong>Học viên & tiến độ</strong>.
      </p>
    </div>
    {MOODLE_GROUPS.map((group) => (
      <section key={group.title} className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {group.links.map(({ label, description, path, icon: Icon }) => (
            <button key={path} type="button" onClick={() => openInMoodle(path)}
              className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#0073C1] hover:shadow-xs transition-all flex gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0073C1] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  {label} <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-xs text-slate-500">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    ))}
  </div>
);

// ---------------------------------------------------------------- integrations health
interface HealthCheck {
  key: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
}

const STATUS_ICON = {
  ok: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  error: <XCircle className="w-5 h-5 text-red-600" />
};

/** Configuration and liveness of every integration (no secret values are ever shown). */
export const HealthPage: React.FC = () => {
  const [checks, setChecks] = useState<HealthCheck[] | null>(null);
  const [checkedAt, setCheckedAt] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    setChecks(null);
    api
      .get<{ checks: HealthCheck[]; checkedAt: string }>('/staff/system/health/')
      .then((res) => {
        setChecks(res.checks);
        setCheckedAt(new Date(res.checkedAt).toLocaleString('vi-VN'));
      })
      .catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Tình trạng tích hợp</h1>
          <p className="text-xs text-slate-500">Kiểm tra lúc {checkedAt || '…'} · Sao lưu dữ liệu chạy hằng đêm lúc 02:30 trên máy chủ.</p>
        </div>
        <button type="button" onClick={load} className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Kiểm tra lại
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {(checks || []).map((c) => (
          <div key={c.key} className="p-4 flex items-start gap-3">
            {STATUS_ICON[c.status]}
            <div>
              <div className="font-bold text-sm text-slate-900">{c.label}</div>
              <div className="text-xs text-slate-500">{c.detail}</div>
            </div>
          </div>
        ))}
        {!checks && !error && <p className="p-4 text-xs text-slate-500">Đang kiểm tra…</p>}
      </div>
      <BackgroundTasks onChange={load} />
    </div>
  );
};

// ---------------------------------------------------------------- background tasks (worker)
interface FailedTask {
  id: string;
  label: string;
  args: (string | number)[];
  error: string;
  finishedAt: string | null;
}
interface PeriodicJob {
  job: string;
  label: string;
  nextRun: string | null;
  lastRun: string | null;
  lastStatus: string | null;
}
interface TasksData {
  enabled: boolean;
  overdue?: number;
  running?: number;
  failed: FailedTask[];
  schedule: PeriodicJob[];
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const LAST_STATUS: Record<string, string> = { SUCCESSFUL: 'Thành công', FAILED: 'Lỗi', RUNNING: 'Đang chạy' };

/** Failed tasks of the last 7 days (retry), queue backlog and the periodic jobs' next / last runs. */
const BackgroundTasks: React.FC<{ onChange: () => void }> = ({ onChange }) => {
  const [data, setData] = useState<TasksData | null>(null);
  const [msg, setMsg] = useState('');
  const load = () => api.get<TasksData>('/staff/system/tasks/').then(setData).catch((e: Error) => setMsg(e.message));
  useEffect(() => {
    load();
  }, []);
  const retry = async (task: FailedTask) => {
    setMsg('');
    try {
      await api.post(`/staff/system/tasks/${task.id}/retry/`, {});
      setMsg(`Đã xếp chạy lại: ${task.label}.`);
      await load();
      onChange();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Không chạy lại được');
    }
  };
  if (!data) return msg ? <p className="text-xs text-red-600">{msg}</p> : null;
  if (!data.enabled) {
    return <p className="text-xs text-slate-500">Tác vụ nền đang chạy ngay trong web (máy chủ chưa có container worker).</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">Tác vụ nền</h2>
          <p className="text-xs text-slate-500">
            Worker chạy việc gọi Moodle và các việc định kỳ · {data.running ?? 0} đang chạy · {data.overdue ?? 0} quá hạn chưa chạy.
          </p>
        </div>
      </div>
      {msg && <p className="text-xs text-slate-700">{msg}</p>}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">
          Lỗi trong 7 ngày, chưa xử lý ({data.failed.length})
        </div>
        {data.failed.length === 0 && <p className="p-4 text-xs text-emerald-700 font-bold">Không có tác vụ lỗi.</p>}
        <div className="divide-y divide-slate-100">
          {data.failed.map((t) => (
            <div key={t.id} className="p-4 flex flex-wrap items-start justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" /> {t.label}
                  {t.args.length > 0 && <span className="font-mono font-normal text-slate-500">{t.args.join(', ')}</span>}
                </div>
                <div className="text-red-700 mt-1 break-all">{t.error}</div>
                <div className="text-slate-400 mt-0.5">{when(t.finishedAt)}</div>
              </div>
              <button type="button" onClick={() => retry(t)} className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 flex items-center gap-1 cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Chạy lại
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-2">Việc định kỳ (giờ Việt Nam)</th><th className="px-2">Lần tới</th><th className="px-2">Lần gần nhất</th><th className="px-2">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {data.schedule.map((j) => (
              <tr key={j.job} className="border-t border-slate-100">
                <td className="px-4 py-2 font-bold text-slate-800">{j.label}</td>
                <td className="px-2">{when(j.nextRun)}</td>
                <td className="px-2">{when(j.lastRun)}</td>
                <td className={`px-2 ${j.lastStatus === 'FAILED' ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                  {j.lastStatus ? LAST_STATUS[j.lastStatus] || j.lastStatus : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
