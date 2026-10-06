import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, Eye, History, Loader2, Send, ShieldCheck, Undo2, XCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { openInMoodle, useStaffCan } from '../../lib/lms';
import { Course, CourseReadinessItem } from '../../types';

const STATUS: Record<string, { label: string; style: string }> = {
  draft: { label: 'Nháp', style: 'bg-slate-100 text-slate-700 border-slate-300' },
  review: { label: 'Chờ duyệt', style: 'bg-amber-50 text-amber-800 border-amber-300' },
  published: { label: 'Đang bán', style: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  archived: { label: 'Ngừng bán', style: 'bg-red-50 text-red-700 border-red-200' }
};

const HISTORY_LABELS: Record<string, string> = {
  'course.create': 'Tạo khóa',
  'course.update': 'Sửa nội dung',
  'course.price_change': 'Đổi giá',
  'course.submit': 'Gửi duyệt',
  'course.return': 'Trả lại để sửa',
  'course.publish': 'Duyệt & mở bán',
  'course.unpublish': 'Ngừng bán',
  'course.moodle_template': 'Tạo / nối khóa mẫu Moodle',
  'lms.import_outline': 'Lấy đề cương từ Moodle'
};

const vnd = (n: unknown) => (typeof n === 'number' ? new Intl.NumberFormat('vi-VN').format(n) + 'đ' : String(n ?? ''));

/**
 * Journey step 1 (authoring & pricing): status, readiness checklist, review / publish, preview,
 * the Moodle template where the learning content lives, and the course history.
 */
export const CoursePublishingPanel: React.FC<{ course: Course; onChanged: () => void }> = ({ course, onChanged }) => {
  const canPublish = useStaffCan('courses.publish');
  const canEditInfo = useStaffCan('courses.edit_info');
  const canCurriculum = useStaffCan('courses.curriculum');
  const canLms = useStaffCan('lms.manage');
  const canEdit = canEditInfo || canCurriculum;
  const canMoodle = canCurriculum || canLms;
  const [items, setItems] = useState<CourseReadinessItem[]>(course.readiness || []);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<{ at: string; actor: string; action: string; details: Record<string, unknown> }[] | null>(null);

  const loadReadiness = useCallback(() => {
    api.get<CourseReadinessItem[]>(`/staff/courses/${course.id}/readiness/`).then(setItems).catch(() => undefined);
  }, [course.id]);
  useEffect(() => {
    setItems(course.readiness || []);
    setHistory(null);
    setError('');
    setNotice('');
    loadReadiness();
  }, [course.id, course.updatedAt, course.readiness, loadReadiness]);

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(success);
      onChanged();
      loadReadiness();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Thao tác thất bại');
    } finally {
      setBusy('');
    }
  };
  const flow = (action: string, note = '') => api.post(`/staff/courses/${course.id}/workflow/`, { action, note });

  const status = course.status || 'draft';
  const missing = items.filter((i) => i.required && !i.ok);
  const moodleItem = items.find((i) => i.key === 'moodle');
  const btn = 'px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#0073C1]" />
          <div>
            <div className="text-sm font-bold text-slate-900">Trạng thái & xuất bản</div>
            <div className="text-[11px] text-slate-500">
              Nháp → Chờ duyệt → Đang bán. Người duyệt chốt nội dung và học phí khi mở bán. Lưu thay đổi trước khi gửi duyệt.
            </div>
          </div>
          <span className={`text-xs font-bold border rounded-full px-2.5 py-1 ${STATUS[status].style}`}>{STATUS[status].label}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}
            onClick={() => run('preview', async () => {
              const { url } = await api.post<{ url: string }>(`/staff/courses/${course.id}/preview-link/`);
              window.open(url, '_blank', 'noopener');
            }, 'Đã mở bản xem trước (link hiệu lực 7 ngày, gửi được cho người duyệt).')}>
            <Eye className="w-3.5 h-3.5" /> Xem trước
          </button>
          {status === 'draft' && canEdit && (
            <button type="button" disabled={!!busy || missing.length > 0} title={missing.length ? 'Còn mục bắt buộc chưa đạt' : ''}
              className={`${btn} bg-[#0073C1] text-white hover:bg-[#005fa3]`}
              onClick={() => run('submit', () => flow('submit'), 'Đã gửi duyệt.')}>
              <Send className="w-3.5 h-3.5" /> Gửi duyệt
            </button>
          )}
          {canPublish && ['draft', 'review', 'archived'].includes(status) && (
            <button type="button" disabled={!!busy || missing.length > 0}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
              onClick={() => {
                if (!window.confirm(`Duyệt và mở bán "${course.title}" với học phí ${vnd(course.price)}${(course.installmentCount || 1) > 1 ? `, trả góp ${course.installmentCount} kỳ` : ''}?`)) return;
                run('publish', () => flow('publish'), 'Khóa học đã lên website.');
              }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt & mở bán
            </button>
          )}
          {canPublish && status === 'review' && (
            <button type="button" disabled={!!busy} className={`${btn} border border-amber-300 text-amber-800 hover:bg-amber-50`}
              onClick={() => {
                const note = window.prompt('Lý do trả lại / cần sửa gì?');
                if (note) run('return', () => flow('return', note), 'Đã trả lại cho người soạn.');
              }}>
              <Undo2 className="w-3.5 h-3.5" /> Trả lại
            </button>
          )}
          {canPublish && status === 'published' && (
            <button type="button" disabled={!!busy} className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}
              onClick={() => {
                if (window.confirm('Ngừng bán khóa này? Trang khóa học bị gỡ khỏi website; học viên đã ghi danh không bị ảnh hưởng.'))
                  run('unpublish', () => flow('unpublish'), 'Đã ngừng bán.');
              }}>
              <XCircle className="w-3.5 h-3.5" /> Ngừng bán
            </button>
          )}
        </div>
      </div>

      {course.reviewNote && status === 'draft' && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
          <strong>Người duyệt góp ý:</strong> {course.reviewNote}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        {items.map((i) => (
          <div key={i.key} className="flex items-start gap-2">
            {i.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : i.required ? (
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            )}
            <span className={i.ok ? 'text-slate-600' : i.required ? 'text-red-700 font-semibold' : 'text-slate-500'}>
              {i.label}{!i.required && <span className="text-slate-400"> (nên có)</span>}
              {!i.ok && i.hint && <span className="block text-[11px] text-slate-400 font-normal">{i.hint}</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
        {canMoodle && moodleItem && !moodleItem.ok && (
          <button type="button" disabled={!!busy} className={`${btn} border border-[#0073C1] text-[#0073C1] hover:bg-blue-50 mt-3`}
            onClick={() => run('moodle', async () => {
              const res = await api.post<{ links: { course: string } }>(`/staff/courses/${course.id}/moodle-template/`);
              openInMoodle(res.links.course);
            }, 'Đã tạo khóa mẫu trên Moodle – soạn bài học, bài kiểm tra và điều kiện hoàn thành tại đó.')}>
            {busy === 'moodle' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Tạo khóa mẫu trên Moodle
          </button>
        )}
        <button type="button" className={`${btn} text-slate-600 hover:bg-slate-50 mt-3`}
          onClick={() => history ? setHistory(null) : api.get<typeof history>(`/staff/courses/${course.id}/history/`).then(setHistory).catch(() => setHistory([]))}>
          <History className="w-3.5 h-3.5" /> {history ? 'Ẩn lịch sử' : 'Lịch sử thay đổi'}
        </button>
        {busy && busy !== 'moodle' && <Loader2 className="w-4 h-4 animate-spin text-slate-400 mt-3" />}
      </div>

      {error && <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">{error}</div>}
      {notice && <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3">{notice}</div>}

      {history && (
        <div className="text-xs border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {history.length === 0 && <p className="p-3 text-slate-500">Chưa có thay đổi nào được ghi nhận.</p>}
          {history.map((h, idx) => (
            <div key={idx} className="p-2.5 flex flex-wrap gap-x-3">
              <span className="text-slate-400 w-32 shrink-0">{new Date(h.at).toLocaleString('vi-VN')}</span>
              <span className="font-bold text-slate-800">{HISTORY_LABELS[h.action] || h.action}</span>
              <span className="text-slate-500">{h.actor}</span>
              <span className="text-slate-600 w-full sm:w-auto">
                {h.action === 'course.price_change'
                  ? Object.entries(h.details).map(([f, v]) => {
                      const c = v as { from: unknown; to: unknown };
                      return `${f}: ${vnd(c.from)} → ${vnd(c.to)}`;
                    }).join(' · ')
                  : h.action === 'course.update'
                    ? `Trường: ${(h.details.fields as string[] | undefined)?.join(', ')}`
                    : h.details.note
                      ? `“${String(h.details.note)}”`
                      : h.action === 'course.publish'
                        ? `Học phí ${vnd(h.details.price)}`
                        : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
