import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Lock,
  Mail,
  RefreshCw,
  Unlock,
  UserMinus,
  UserPlus
} from 'lucide-react';
import { isBackendEnabled } from '../../lib/api';
import {
  formatMoodleTime,
  lmsApi,
  LmsAction,
  openInMoodle,
  OrderLearning,
  useStaffCan
} from '../../lib/lms';

const STATUS_STYLE: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-slate-50 text-slate-600 border-slate-200',
  removed: 'bg-slate-100 text-slate-600 border-slate-300'
};

const ACTION_CONFIRM: Partial<Record<LmsAction, string>> = {
  unenroll: 'Hủy ghi danh học viên khỏi khóa trên LMS? Hệ thống sẽ không tự ghi danh lại đơn này.',
  suspend: 'Tạm khóa tài khoản LMS? Học viên sẽ không đăng nhập được cho tới khi được mở khóa.'
};

/** "Học tập (LMS)" tab of the order workspace: live data from Moodle + staff actions. */
export const LmsLearningPanel: React.FC<{ orderId: string }> = ({ orderId }) => {
  const canManage = useStaffCan('lms.manage');
  const [data, setData] = useState<OrderLearning | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<LmsAction | 'load' | null>('load');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setBusy('load');
    setError('');
    lmsApi
      .order(orderId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(null));
  }, [orderId]);

  useEffect(() => {
    if (isBackendEnabled()) load();
  }, [load]);

  const run = async (action: LmsAction, success: string, note?: string) => {
    const confirmText = ACTION_CONFIRM[action];
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setError('');
    setNotice('');
    try {
      setData(await lmsApi.act(orderId, action, note));
      setNotice(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại');
    } finally {
      setBusy(null);
    }
  };

  if (!isBackendEnabled()) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-600">
        Chế độ demo: dữ liệu học tập lấy trực tiếp từ Moodle khi hệ thống chạy với backend.
      </div>
    );
  }

  const enrollment = data?.enrollment;
  const user = data?.user;
  const btn =
    'px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Enrolment + account */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0073C1]" />
            Học tập trên TWings LMS (Moodle)
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} disabled={busy !== null} className={`${btn} border-slate-200 text-slate-600 hover:bg-slate-50`}>
              <RefreshCw className={`w-3.5 h-3.5 ${busy === 'load' ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            {user && (
              <button
                type="button"
                onClick={() => openInMoodle(user.links.profile)}
                className={`${btn} border-[#0073C1] text-[#0073C1] hover:bg-blue-50`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Hồ sơ trên Moodle
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-500 font-semibold">Ghi danh tự động</div>
              {enrollment ? (
                <span className={`inline-block px-2 py-0.5 rounded-full border font-bold ${STATUS_STYLE[enrollment.status]}`}>
                  {enrollment.statusLabel}
                </span>
              ) : (
                <span className="text-slate-500">{data.paid ? 'Chưa xử lý' : 'Đơn chưa thanh toán'}</span>
              )}
              {enrollment?.cohortName && <div className="text-slate-700">Đợt: <strong>{enrollment.cohortName}</strong></div>}
              {enrollment?.lastError && (
                <div className={`${enrollment.status === 'waiting' ? 'text-amber-700' : 'text-red-600'} break-words`}>
                  {enrollment.lastError}
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-500 font-semibold">Tài khoản LMS</div>
              {user ? (
                <>
                  <div className="font-bold text-slate-900">{user.email}</div>
                  <div className={user.suspended ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                    {user.suspended ? 'Đang tạm khóa' : 'Đang hoạt động'}
                  </div>
                </>
              ) : (
                <span className="text-slate-500">Chưa có tài khoản</span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-500 font-semibold">Truy cập gần nhất</div>
              <div className="font-bold text-slate-900">{formatMoodleTime(user?.lastaccess ?? null)}</div>
              {enrollment?.completedAt && (
                <div className="text-emerald-700 font-bold">
                  Hoàn thành ngày {new Date(enrollment.completedAt).toLocaleDateString('vi-VN')}
                </div>
              )}
              {enrollment?.certificate && (
                <a href={enrollment.certificate.url} target="_blank" rel="noopener" className="text-[#0073C1] font-bold hover:underline">
                  Chứng chỉ {enrollment.certificate.code}{enrollment.certificate.revoked ? ' (đã thu hồi)' : ''}
                </a>
              )}
              {enrollment?.certificate?.printUrl && !enrollment.certificate.revoked && (
                <a href={enrollment.certificate.printUrl} target="_blank" rel="noopener" className="block text-slate-600 hover:underline">
                  Bản in / PDF
                </a>
              )}
              {enrollment?.accessEmailedAt && (
                <div className="text-slate-500">
                  Đã gửi email vào học: {new Date(enrollment.accessEmailedAt).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
          </div>
        )}

        {enrollment && enrollment.status === 'done' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 font-semibold">Chuyên cần</div>
              <div className="font-bold text-slate-900">{enrollment.attendanceRate != null ? `${enrollment.attendanceRate}% (${enrollment.attendance})` : 'Chưa điểm danh'}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 font-semibold">Điểm tổng (Moodle)</div>
              <div className="font-bold text-slate-900">{enrollment.gradePercent != null ? `${enrollment.gradePercent}%` : '–'}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 font-semibold">Vào khóa gần nhất</div>
              <div className="font-bold text-slate-900">{enrollment.lastAccess ? new Date(enrollment.lastAccess).toLocaleDateString('vi-VN') : 'Chưa vào'}</div>
            </div>
            <div className={`p-3 rounded-xl border ${enrollment.riskLevel === 'risk' ? 'bg-red-50 border-red-200' : enrollment.riskLevel === 'watch' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="text-slate-500 font-semibold">Mức độ</div>
              <div className="font-bold">{enrollment.riskLevel === 'risk' ? 'Có nguy cơ' : enrollment.riskLevel === 'watch' ? 'Cần theo dõi' : 'Ổn'}</div>
              {(enrollment.riskFlags || []).map((f) => <div key={f} className="text-[11px] text-slate-700">• {f}</div>)}
            </div>
          </div>
        )}
        {enrollment?.certificateHold && !enrollment.certificate && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            <strong>Chưa cấp chứng chỉ:</strong> {enrollment.certificateHold}. Hệ thống tự cấp khi chuyên cần đạt mức (giảng viên cập nhật điểm danh trên Moodle).
          </div>
        )}

        {canManage && data && (
          <div className="flex flex-wrap gap-2 pt-1">
            {data.paid && enrollment?.status !== 'done' && (
              <button type="button" disabled={busy !== null} onClick={() => run('enroll', 'Đã ghi danh học viên vào khóa trên LMS.')}
                className={`${btn} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                <UserPlus className="w-3.5 h-3.5" /> Ghi danh {enrollment ? 'lại' : 'ngay'}
              </button>
            )}
            {data.email && (
              <button type="button" disabled={busy !== null} onClick={() => run('send_access_email', `Đã gửi email hướng dẫn vào học tới ${data.email}.`)}
                className={`${btn} border-[#0073C1] text-[#0073C1] hover:bg-blue-50`}>
                <Mail className="w-3.5 h-3.5" /> Gửi email hướng dẫn vào học
              </button>
            )}
            {user && !user.suspended && (
              <button type="button" disabled={busy !== null} onClick={() => run('suspend', 'Đã tạm khóa tài khoản LMS.')}
                className={`${btn} border-amber-300 text-amber-700 hover:bg-amber-50`}>
                <Lock className="w-3.5 h-3.5" /> Tạm khóa tài khoản
              </button>
            )}
            {user?.suspended && (
              <button type="button" disabled={busy !== null} onClick={() => run('unsuspend', 'Đã mở khóa tài khoản LMS.')}
                className={`${btn} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                <Unlock className="w-3.5 h-3.5" /> Mở khóa tài khoản
              </button>
            )}
            {enrollment?.status === 'done' && !enrollment.certificate && (
              <button type="button" disabled={busy !== null}
                onClick={() => {
                  const note = window.prompt('Cấp chứng chỉ ngoại lệ – lý do (ghi vào lịch sử học viên):');
                  if (note && note.trim()) run('issue_certificate', 'Đã cấp chứng chỉ.', note.trim());
                }}
                className={`${btn} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                Cấp chứng chỉ (ngoại lệ)
              </button>
            )}
            {enrollment?.status === 'done' && (
              <button type="button" disabled={busy !== null} onClick={() => run('unenroll', 'Đã hủy ghi danh khỏi khóa trên LMS.')}
                className={`${btn} border-red-200 text-red-600 hover:bg-red-50`}>
                <UserMinus className="w-3.5 h-3.5" /> Hủy ghi danh
              </button>
            )}
          </div>
        )}
      </div>

      {/* Courses with progress */}
      {data && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Khóa học trên LMS</h4>
          {data.courses.length === 0 ? (
            <p className="text-xs text-slate-500">Học viên chưa được ghi danh vào khóa nào.</p>
          ) : (
            data.courses.map((c) => (
              <div key={c.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900">{c.fullname}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.completed ? 'Đã hoàn thành khóa học' : `Truy cập khóa: ${formatMoodleTime(c.lastaccess)}`}
                      {c.grade && c.grade !== '-' ? ` · Điểm tổng: ${c.grade}` : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => openInMoodle(c.links.userCourse || c.links.course)}
                    className="text-[11px] font-bold text-[#0073C1] hover:underline flex items-center gap-1 shrink-0 cursor-pointer">
                    Mở trên Moodle <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${c.completed ? 'bg-emerald-500' : 'bg-[#0073C1]'}`}
                      style={{ width: `${c.progress ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700 w-20 text-right">
                    {c.progress === null ? 'Chưa theo dõi' : `${c.progress}%`}
                  </span>
                </div>
              </div>
            ))
          )}
          <p className="text-[11px] text-slate-400">
            % hoàn thành do Moodle tính theo các hoạt động có bật “theo dõi hoàn thành”. Dữ liệu đọc trực tiếp từ LMS.
          </p>
        </div>
      )}
    </div>
  );
};
