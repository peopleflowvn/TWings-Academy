import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Phone,
  RefreshCw,
  Users
} from 'lucide-react';
import { isBackendEnabled } from '../../lib/api';
import { formatMoodleTime, lmsApi, LmsCatalogRow, LmsIntakeRow, LmsLearner, MoodleCourseRef, openInMoodle, useStaffCan } from '../../lib/lms';

/** "Học tập (LMS)": every course's Moodle space, students vs. paid orders, and per-learner progress. */
export const CMSLmsTab: React.FC = () => {
  const [rows, setRows] = useState<LmsCatalogRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // What the learner list shows: a course's template course or one intake's course.
  const [selected, setSelected] = useState<{ key: string; title: string; moodle: MoodleCourseRef } | null>(null);
  const canManage = useStaffCan('lms.manage');
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [learners, setLearners] = useState<LmsLearner[] | null>(null);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [onlyInactive, setOnlyInactive] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    lmsApi
      .catalog()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isBackendEnabled()) load();
  }, []);

  const openCourse = (key: string, title: string, moodle: MoodleCourseRef | null) => {
    if (!moodle) return;
    setSelected({ key, title, moodle });
    setLearners(null);
    setLearnersLoading(true);
    lmsApi
      .learners(moodle.id)
      .then(setLearners)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLearnersLoading(false));
  };

  if (!isBackendEnabled()) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-600">
        Chế độ demo: tab này đọc dữ liệu trực tiếp từ Moodle khi hệ thống chạy với backend.
      </div>
    );
  }

  const shown = (learners || []).filter((l) => !onlyInactive || l.inactive);
  const totals = (rows || []).reduce(
    (acc, r) => ({
      paid: acc.paid + r.paidOrders,
      students: acc.students + (r.moodle?.students || 0),
      unmapped: acc.unmapped + (r.moodle ? 0 : r.paidOrders > 0 ? 1 : 0),
      waiting: acc.waiting + (r.waitingForIntake || 0)
    }),
    { paid: 0, students: 0, unmapped: 0, waiting: 0 }
  );

  const provision = async (intake: LmsIntakeRow) => {
    setProvisioning(intake.id);
    setError('');
    try {
      const res = await lmsApi.provisionCohort(intake.id);
      window.alert(
        `Đã chuẩn bị khóa Moodle cho ${intake.name}: ${res.teachers} giảng viên, ghi danh thêm ${res.enrolled} học viên đang chờ.`
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được khóa Moodle');
    } finally {
      setProvisioning(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#0073C1]" /> Học Tập Trực Tuyến (LMS)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Học viên được ghi danh tự động khi đơn chuyển sang “Đã thanh toán”. Nội dung, quiz, chấm điểm và báo cáo chi
            tiết thực hiện trên Moodle; nút “Mở” đăng nhập bằng tài khoản CMS của bạn.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button type="button" onClick={() => openInMoodle('/learn/course/index.php')}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0073C1] text-white hover:bg-[#005FA0] flex items-center gap-1.5 cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" /> Quản lý khóa trên Moodle
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {rows && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500">Đơn đã thanh toán</div>
            <div className="text-2xl font-black text-slate-900">{totals.paid}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500">Học viên trên Moodle</div>
            <div className="text-2xl font-black text-slate-900">{totals.students}</div>
          </div>
          <div className={`p-4 rounded-2xl border ${totals.waiting ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="text-[11px] font-semibold text-slate-500">Đã thanh toán, chờ xếp đợt khai giảng</div>
            <div className="text-2xl font-black text-slate-900">{totals.waiting}</div>
          </div>
        </div>
      )}

      {/* Courses */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-3 font-semibold">Khóa học TWings</th>
              <th className="p-3 font-semibold">Khóa trên Moodle</th>
              <th className="p-3 font-semibold text-right">Đã thanh toán</th>
              <th className="p-3 font-semibold text-right">Học viên LMS</th>
              <th className="p-3 font-semibold text-right">Mở trên Moodle</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <React.Fragment key={r.courseId}>
              <tr
                className={`border-t border-slate-100 ${r.moodle ? 'hover:bg-blue-50/40 cursor-pointer' : ''} ${selected?.key === r.courseId ? 'bg-blue-50/60' : ''}`}
                onClick={() => openCourse(r.courseId, r.title, r.moodle)}>
                <td className="p-3">
                  <div className="font-bold text-slate-900">{r.title}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {r.slug} · {r.cohorts.length ? 'khóa mẫu của các đợt' : 'học theo tiến độ riêng'}
                  </div>
                  {r.waitingForIntake > 0 && (
                    <div className="text-[11px] font-bold text-amber-700">{r.waitingForIntake} học viên chờ xếp đợt</div>
                  )}
                </td>
                <td className="p-3">
                  {r.moodle ? (
                    <span className={r.moodle.visible ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {r.moodle.visible ? 'Đang mở' : 'Đang ẩn'}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Chưa có – tạo trên Moodle với short name <code className="font-mono">{r.slug}</code>, hoặc tự tạo khi có học viên đầu tiên
                    </span>
                  )}
                </td>
                <td className="p-3 text-right font-mono">{r.paidOrders}</td>
                <td className={`p-3 text-right font-mono font-bold ${r.moodle && r.moodle.students < r.paidOrders ? 'text-amber-600' : ''}`}>
                  {r.moodle ? r.moodle.students : '–'}
                </td>
                <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {r.moodle && (
                    <div className="flex justify-end gap-2 text-[11px] font-bold text-[#0073C1]">
                      <button type="button" className="hover:underline cursor-pointer" onClick={() => openInMoodle(r.moodle!.links.course)}>Khóa</button>
                      <button type="button" className="hover:underline cursor-pointer" onClick={() => openInMoodle(r.moodle!.links.grades)}>Sổ điểm</button>
                      <button type="button" className="hover:underline cursor-pointer" onClick={() => openInMoodle(r.moodle!.links.completion)}>Tiến độ</button>
                    </div>
                  )}
                </td>
              </tr>
              {r.cohorts.map((c) => (
                <tr key={c.id}
                  className={`border-t border-slate-50 bg-slate-50/50 ${c.moodle ? 'hover:bg-blue-50/40 cursor-pointer' : ''} ${selected?.key === c.id ? 'bg-blue-50/60' : ''}`}
                  onClick={() => openCourse(c.id, `${r.title} – ${c.name}`, c.moodle)}>
                  <td className="p-3 pl-8">
                    <div className="font-semibold text-slate-800">↳ {c.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {c.startDate ? `Khai giảng ${new Date(c.startDate).toLocaleDateString('vi-VN')}` : 'Chưa có ngày khai giảng'} · {c.capacity} chỗ
                    </div>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {c.moodle ? (
                      <span className="text-emerald-700 font-bold">Đã có khóa riêng</span>
                    ) : canManage ? (
                      <button type="button" disabled={provisioning === c.id} onClick={() => provision(c)}
                        className="px-2.5 py-1 rounded-lg border border-[#0073C1] text-[#0073C1] font-bold hover:bg-blue-50 disabled:opacity-50 cursor-pointer">
                        {provisioning === c.id ? 'Đang tạo…' : 'Tạo khóa Moodle'}
                      </button>
                    ) : (
                      <span className="text-slate-400">Chưa có khóa Moodle</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">{c.paidOrders}</td>
                  <td className={`p-3 text-right font-mono font-bold ${c.moodle && c.moodle.students < c.paidOrders ? 'text-amber-600' : ''}`}>
                    {c.moodle ? c.moodle.students : '–'}
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {c.moodle && (
                      <div className="flex justify-end gap-2 text-[11px] font-bold text-[#0073C1]">
                        <button type="button" className="hover:underline cursor-pointer" onClick={() => openInMoodle(c.moodle!.links.course)}>Khóa</button>
                        <button type="button" className="hover:underline cursor-pointer" onClick={() => openInMoodle(c.moodle!.links.grades)}>Sổ điểm</button>
                        <button type="button" className="hover:underline cursor-pointer" onClick={() => openInMoodle(c.moodle!.links.completion)}>Tiến độ</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              </React.Fragment>
            ))}
            {rows && rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Chưa có khóa học.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Learners of the selected course */}
      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0073C1]" /> Học viên – {selected.title}
            </h3>
            <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyInactive} onChange={(e) => setOnlyInactive(e.target.checked)} />
              Chỉ hiện học viên chưa vào học quá 7 ngày
            </label>
          </div>
          {learnersLoading && <p className="text-xs text-slate-500">Đang tải dữ liệu từ Moodle…</p>}
          {learners && shown.length === 0 && <p className="text-xs text-slate-500">Không có học viên phù hợp.</p>}
          {shown.map((l) => (
            <div key={l.moodleUserId} className="p-3 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 min-w-0">
                <div className="font-bold text-sm text-slate-900 truncate">{l.fullname}</div>
                <div className="text-[11px] text-slate-500 truncate">{l.email}</div>
                {l.order && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono">{l.order.orderCode}</span>
                    {l.order.phone && (
                      <a href={`tel:${l.order.phone}`} className="text-[#0073C1] flex items-center gap-1 hover:underline">
                        <Phone className="w-3 h-3" /> {l.order.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${l.completed ? 'bg-emerald-500' : 'bg-[#0073C1]'}`} style={{ width: `${l.progress ?? 0}%` }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold w-12 text-right">{l.progress === null ? '–' : `${l.progress}%`}</span>
                </div>
              </div>
              <div className="md:col-span-2 text-[11px]">
                {l.completed ? (
                  <span className="text-emerald-700 font-bold">Hoàn thành</span>
                ) : l.inactive ? (
                  <span className="text-amber-700 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cần nhắc học</span>
                ) : (
                  <span className="text-slate-600">{formatMoodleTime(l.lastCourseAccess)}</span>
                )}
                {l.suspended && <div className="text-red-600 font-bold">Tài khoản đang khóa</div>}
              </div>
              <div className="md:col-span-2 flex md:justify-end gap-2 text-[11px] font-bold text-[#0073C1]">
                <button type="button" className="hover:underline flex items-center gap-1 cursor-pointer" onClick={() => openInMoodle(l.links.userCourse)}>
                  <BarChart3 className="w-3 h-3" /> Chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!rows && !error && (
        <p className="text-xs text-slate-500 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Đang tải dữ liệu từ Moodle…</p>
      )}
    </div>
  );
};
