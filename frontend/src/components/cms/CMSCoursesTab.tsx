import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Award,
  Star,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  Layers,
  Users,
  ShieldCheck,
  Check,
  Eye,
  Loader2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Module, Lesson, Instructor } from '../../types';
import { api, isBackendEnabled, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { CoursePublishingPanel } from './CoursePublishingPanel';
import { CourseListView } from './CourseListView';
import { ImageUploadField } from './ImageUploadField';
import { navigate, useAppSearch } from '../../admin/router';
import { CourseClassesPanel, useClasses } from '../../admin/pages/IntakesPage';
import { viDateToIso } from '../../lib/serverCollection';

interface CMSCoursesTabProps {
  courses: Course[];
  /** Saves a new course; resolves to the saved course (its server id) or nothing when it failed. */
  onAddCourse: (newCourse: Course) => Promise<Course | undefined>;
  /** Saves the course; resolves to what the server stored, or nothing when it failed (the error was shown). */
  onUpdateCourse: (updatedCourse: Course) => Promise<Course | undefined>;
  /** Deletes the course; resolves to false when the server refused (the error was shown). */
  onDeleteCourse: (courseId: string) => Promise<boolean>;
  onPreviewCourse?: (course: Course) => void;
  /** Reload the course list (after a publishing step changed the course on the server). */
  onReload?: () => void;
}

const SUBTABS = ['info', 'youtube', 'instructors', 'modules', 'reviews', 'guarantees'] as const;
type SubTab = (typeof SUBTABS)[number];
const readSubTab = (): SubTab => {
  const t = new URLSearchParams(window.location.search).get('subtab') as SubTab | null;
  return t && SUBTABS.includes(t) ? t : 'info';
};

const STATUS_LABEL: Record<string, string> = { draft: 'Nháp', review: 'Chờ duyệt', published: 'Đang bán', archived: 'Ngừng bán' };
// Suggestions; a course keeps whatever category / level it already has.
const CATEGORIES = [
  'Ngân Hàng & Tín Dụng',
  'Quản Trị & Lãnh Đạo (OKR/MBO)',
  'Tư Duy & Đột Phá',
  'Trí tuệ nhân tạo (AI)',
  'Dữ Liệu & Phân Tích',
  'Chứng chỉ Chuyên môn'
];
const LEVELS = ['Người mới bắt đầu', 'Chuyên viên Mới (Fresher)', 'Chuyên viên Chính', 'Quản lý / Trưởng nhóm', 'Nâng cao', 'Mọi cấp độ'];
const LESSON_TYPES: [Lesson['type'], string][] = [
  ['video', 'Video'],
  ['reading', 'Bài đọc'],
  ['quiz', 'Trắc nghiệm'],
  ['project', 'Bài tập / dự án'],
  ['audio_listening', 'Nghe'],
  ['flashcard', 'Flashcard'],
  ['pdf_material', 'Tài liệu PDF']
];
const withCurrent = (options: string[], current: string | undefined, more: string[] = []) =>
  [...new Set([...options, ...more, ...(current ? [current] : [])].filter(Boolean))];

/** The editable copy of a course: the syllabus is edited as `syllabus` (what the server stores). */
const formOf = (course: Course): Course => {
  const form: Course = JSON.parse(JSON.stringify(course));
  form.syllabus = course.syllabus || course.chapters || [];
  delete form.chapters;
  return form;
};

const extractYouTubeId = (input: string): string => {
  const trimmed = (input || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : trimmed;
};

const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0) + ' ₫';

export const CMSCoursesTab: React.FC<CMSCoursesTabProps> = ({
  courses,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onPreviewCourse,
  onReload,
}) => {
  const appSearch = useAppSearch();
  const requestedCourseId = appSearch.get('id');
  const isDetailView = !!requestedCourseId && courses.some((course) => course.id === requestedCourseId);
  const canPrice = useStaffCan('courses.pricing');
  const canEditInfo = useStaffCan('courses.edit_info');
  const canCurriculum = useStaffCan('courses.curriculum');
  const canEdit = canEditInfo || canCurriculum;
  const canDelete = useStaffCan('courses.delete');
  // The classes of every course: counts on the list, the classes panel on a course's page.
  const classes = useClasses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() =>
    requestedCourseId && courses.some((c) => c.id === requestedCourseId) ? requestedCourseId : courses[0]?.id || ''
  );
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(readSubTab);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'create' | 'copy' | 'delete'>('');
  const flash = (ok: boolean, text: string) => {
    setNotice({ ok, text });
    setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), ok ? 3500 : 8000);
  };

  // Keep the URL in step with the course and sub-tab.
  useEffect(() => {
    if (!isDetailView || !selectedCourseId || selectedCourseId !== requestedCourseId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('id') === selectedCourseId && params.get('subtab') === activeSubTab) return;
    params.set('id', selectedCourseId);
    params.set('subtab', activeSubTab);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [selectedCourseId, activeSubTab, isDetailView, requestedCourseId]);

  // `navigate()` dispatches the app-router event rather than a browser popstate event.
  useEffect(() => {
    if (requestedCourseId && courses.some((course) => course.id === requestedCourseId)) setSelectedCourseId(requestedCourseId);
  }, [requestedCourseId, courses]);

  useEffect(() => {
    const sync = () => setActiveSubTab(readSubTab());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // Editable copy of the selected course, and what it was when loaded (unsaved changes = they differ).
  const currentCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const [editForm, setEditForm] = useState<Course | null>(null);
  const [baseline, setBaseline] = useState('');
  const dirty = !!editForm && JSON.stringify(editForm) !== baseline;
  const loadForm = (course: Course) => {
    const form = formOf(course);
    setEditForm(form);
    setBaseline(JSON.stringify(form));
  };
  // Another course, or this one changed on the server (saved, published…): reload unless edits are pending.
  useEffect(() => {
    if (!currentCourse) return;
    if (!editForm || editForm.id !== currentCourse.id || !dirty) loadForm(currentCourse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCourse?.id, currentCourse?.updatedAt]);
  // Closing or reloading the tab with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const confirmLeave = () => !dirty || window.confirm('Khóa học có thay đổi chưa lưu. Bỏ các thay đổi này?');

  // A course on sale keeps its approved price unless the user may set prices (server enforces it too).
  const priceLocked = currentCourse?.status === 'published' && !canPrice;
  // Instructors managed on the "Giảng viên" page: the only ones a course can be linked to (saved by id).
  const [staffInstructors, setStaffInstructors] = useState<Instructor[] | null>(null);
  useEffect(() => {
    if (!isBackendEnabled()) return;
    api
      .get<Paginated<Instructor> | Instructor[]>('/staff/instructors/?pageSize=200')
      .then((res) => setStaffInstructors(Array.isArray(res) ? res : res.results))
      .catch(() => setStaffInstructors(null));
  }, []);

  /** Open a course just saved on the server (it has its server id now). */
  const openSaved = (saved: Course | undefined, text: string) => {
    if (!saved) return;
    loadForm(saved);
    setSelectedCourseId(saved.id);
    setActiveSubTab('info');
    navigate(`/catalog/courses?id=${encodeURIComponent(saved.id)}&subtab=info`);
    flash(true, text);
  };

  // A new course is a blank draft: the readiness checklist says what to fill in before review.
  const handleCreateNewCourse = async () => {
    if (busy) return;
    const stamp = Date.now();
    const draft = {
      slug: `khoa-hoc-moi-${stamp}`,
      title: 'Khóa học mới',
      deliveryFormat: 'online_external_lms',
      price: 0,
      originalPrice: 0
    } as Course;
    setBusy('create');
    const saved = await onAddCourse(draft);
    setBusy('');
    openSaved(saved, 'Đã tạo khóa học nháp. Điền các mục còn thiếu trong danh sách kiểm tra rồi gửi duyệt.');
  };

  if (!isDetailView) {
    return (
      <CourseListView
        courses={courses}
        classes={classes.rows}
        creating={busy === 'create'}
        onCreateCourse={canEdit ? handleCreateNewCourse : undefined}
        onOpenCourse={(courseId) => {
          setSelectedCourseId(courseId);
          navigate(`/catalog/courses?id=${encodeURIComponent(courseId)}&subtab=info`);
        }}
      />
    );
  }

  if (!editForm) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu khóa học...</div>;
  }

  const syllabus: Module[] = editForm.syllabus || [];
  const setSyllabus = (next: Module[]) => setEditForm({ ...editForm, syllabus: next });
  const lessonCount = syllabus.reduce((n, m) => n + (m.lessons?.length || 0), 0);
  const instructors = editForm.instructors || [];

  const handleSaveAll = async () => {
    if (!editForm || busy) return;
    const videoId = extractYouTubeId(editForm.youtubeVideoId || '');
    const payload = {
      ...editForm,
      title: editForm.title.trim(),
      youtubeVideoId: videoId,
      youtubeTrialUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
      // The API links instructors by id (their profiles are edited on the "Giảng viên" page).
      instructorIds: instructors.map((i) => i.id),
      objectives: (editForm.objectives || []).map((o) => o.trim()).filter(Boolean),
      guarantees: (editForm.guarantees || []).map((g) => g.trim()).filter(Boolean)
    } as Course & { instructorIds: string[] };
    if (!payload.title) {
      flash(false, 'Khóa học cần có tên.');
      return;
    }
    setBusy('save');
    const saved = await onUpdateCourse(payload);
    setBusy('');
    if (!saved) {
      flash(false, 'Chưa lưu được. Sửa theo thông báo lỗi rồi lưu lại – các thay đổi vẫn còn trên form.');
      return;
    }
    loadForm(saved);
    flash(true, saved.status === 'published' ? 'Đã lưu – trang khóa học trên website đã cập nhật.' : 'Đã lưu.');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  // A copy of the course as a new draft (its classes, learners and reviews stay with the original).
  const handleDuplicateCourse = async () => {
    if (busy || !confirmLeave()) return;
    const stamp = Date.now();
    const { id: _id, status: _status, ...content } = formOf(currentCourse);
    const copy = {
      ...content,
      slug: `${editForm.slug}-ban-sao-${stamp}`.slice(0, 200),
      title: `${currentCourse.title} (Bản sao)`,
      instructorIds: (currentCourse.instructors || []).map((i) => i.id)
    } as unknown as Course;
    setBusy('copy');
    const saved = await onAddCourse(copy);
    setBusy('');
    openSaved(saved, 'Đã tạo bản sao (nháp). Bản sao không mang theo lớp, học viên và đánh giá.');
  };

  const handleDeleteCurrentCourse = async () => {
    if (busy) return;
    if (!window.confirm(`Xóa hẳn khóa học "${currentCourse.title}"? Không hoàn tác được.\n\nKhóa đã có lớp hoặc học viên thì không xóa được – hãy dùng "Ngừng bán".`)) return;
    setBusy('delete');
    const ok = await onDeleteCourse(currentCourse.id);
    setBusy('');
    if (ok) navigate('/catalog/courses');
  };

  const categoryOptions = withCurrent(CATEGORIES, editForm.category, courses.map((c) => c.category));
  const levelOptions = withCurrent(LEVELS, editForm.level);
  const btn = 'px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Unsaved changes: save from anywhere on the page (the top bar scrolls away). In <body>: an animated
          (transformed) ancestor would pin a fixed bar to itself instead of the screen. */}
      {dirty && canEdit && createPortal(
        <div data-unsaved-bar className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-40 flex items-center justify-between gap-3 bg-slate-900 text-white rounded-2xl shadow-lg px-4 py-3 text-xs">
          <span className="font-bold">Có thay đổi chưa lưu</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.confirm('Bỏ mọi thay đổi chưa lưu của khóa này?') && loadForm(currentCourse)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer">Hoàn tác</button>
            <button type="button" onClick={handleSaveAll} disabled={!!busy}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 1. TOP BAR: the course, switching course, its actions and the save button */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => confirmLeave() && navigate('/catalog/courses')} className={`${btn} bg-slate-100 hover:bg-slate-200 text-slate-700`}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">
                {dirty ? <span className="text-amber-700 font-bold">Có thay đổi chưa lưu</span> : 'Khóa học đang sửa'}
              </div>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  if (!confirmLeave()) return;
                  const courseId = e.target.value;
                  setSelectedCourseId(courseId);
                  navigate(`/catalog/courses?id=${encodeURIComponent(courseId)}&subtab=${activeSubTab}`);
                }}
                className="max-w-full sm:max-w-md text-base sm:text-lg font-bold text-slate-900 bg-transparent border-0 p-0 pr-6 focus:outline-none focus:ring-0 cursor-pointer truncate"
                aria-label="Chọn khóa học đang chỉnh sửa"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} [{STATUS_LABEL[c.status || 'draft']}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onPreviewCourse && (
              <button type="button" onClick={() => onPreviewCourse(editForm)} className={`${btn} bg-slate-100 hover:bg-slate-200 text-slate-700`}>
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Xem trước</span>
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={handleDuplicateCourse} disabled={!!busy} className={`${btn} bg-slate-100 hover:bg-slate-200 text-slate-700`} title="Tạo bản sao nháp của khóa này">
                {busy === 'copy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">Nhân bản</span>
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={handleDeleteCurrentCourse} disabled={!!busy} className={`${btn} bg-red-50 hover:bg-red-100 text-red-600`} title="Xóa khóa học này" aria-label="Xóa khóa học">
                {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={handleSaveAll} disabled={!!busy || !dirty} className={`${btn} px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs`}>
                {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{dirty ? 'Lưu thay đổi' : 'Đã lưu'}</span>
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div role="status" className={`p-3 border rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn ${notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {notice.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      {/* Journey step 1: readiness, review & publish, preview, Moodle template, history */}
      {currentCourse && isBackendEnabled() && (
        <CoursePublishingPanel course={currentCourse} onChanged={() => onReload?.()} />
      )}

      {/* Journey step 2: the classes (admission campaigns) of the course */}
      {currentCourse && isBackendEnabled() && (
        <CourseClassesPanel course={currentCourse} courses={courses} rows={classes.rows} error={classes.error} onReload={classes.reload} />
      )}

      {/* 2. SUB-TABS NAVIGATION (6 DEDICATED SECTIONS) */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            type="button"
            onClick={() => setActiveSubTab('info')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'info'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Thông tin & học phí</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('youtube')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'youtube'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Play className="w-4 h-4 text-red-500 fill-current" />
            <span>2. Video học thử</span>
            {editForm.youtubeVideoId && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('instructors')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'instructors'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Giảng viên ({instructors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('modules')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'modules'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. Đề cương ({lessonCount} bài)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'reviews'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-current" />
            <span>5. Đánh giá</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('guarantees')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'guarantees'
                ? 'bg-[#0073C1] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>6. Cam kết</span>
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MAIN FORM COLUMN (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ======================================================== */}
          {/* SUB-TAB 1: GIỚI THIỆU & THÔNG TIN CƠ BẢN */}
          {/* ======================================================== */}
          {activeSubTab === 'info' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0073C1]" />
                  <span>Thông Tin Định Danh & Giới Thiệu Khóa Học</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các thông số xuất hiện trên đầu trang chi tiết, thẻ khóa học trang chủ và học phí.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Course Title */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Tên khóa học *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900"
                    placeholder="VD: Quan hệ Khách hàng cá nhân"
                  />
                </div>

                {/* Subtitle / Tóm tắt ngắn */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Tiêu đề phụ tóm tắt (Hiển thị ngay dưới tiêu đề) *</label>
                  <input
                    type="text"
                    value={editForm.subtitle}
                    onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="VD: Nghiệp vụ cốt lõi thẩm định tín dụng cá nhân..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Danh mục đào tạo *</label>
                  <select
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                  >
                    <option value="">– Chọn danh mục –</option>
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trình độ khóa học *</label>
                  <select
                    value={editForm.level || ''}
                    onChange={(e) => setEditForm({ ...editForm, level: e.target.value as Course['level'] })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                  >
                    <option value="">– Chọn trình độ –</option>
                    {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Delivery Format */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hình thức đào tạo *</label>
                  <select
                    value={editForm.deliveryFormat || 'online_external_lms'}
                    onChange={(e) => setEditForm({ ...editForm, deliveryFormat: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 text-[#0073C1]"
                  >
                    <option value="online_external_lms">Online qua LMS (không cần mở lớp)</option>
                    <option value="offline">Trực tiếp (học theo lớp)</option>
                    <option value="hybrid">Kết hợp online + trực tiếp (học theo lớp)</option>
                  </select>
                  {(editForm.deliveryFormat === 'offline' || editForm.deliveryFormat === 'hybrid') && (
                    <p className="text-[11px] text-slate-500 mt-1">Học theo lớp: cần ít nhất 1 lớp đang tuyển (mục Lớp tuyển sinh) để mở bán.</p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thời lượng đào tạo *</label>
                  <input
                    type="text"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="VD: 45 giờ học thực chiến"
                  />
                </div>

                {/* Tuition Fee (Price) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Học phí (VND) *{priceLocked && <span className="font-normal text-slate-500"> – khóa đang bán, đổi giá cần quyền Định giá</span>}</label>
                  <input
                    type="number"
                    disabled={priceLocked}
                    title={priceLocked ? 'Khóa đang bán: đổi giá cần quyền Định giá' : ''}
                    min={0}
                    value={editForm.price ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, price: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giá niêm yết (gạch ngang khi khuyến mãi)</label>
                  <input
                    type="number"
                    disabled={priceLocked}
                    min={0}
                    value={editForm.originalPrice ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, originalPrice: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-600"
                  />
                </div>

                {/* Promotion end: without it the website shows only the selling price */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Khuyến mãi đến hết ngày</label>
                  <input
                    type="date"
                    disabled={priceLocked}
                    value={viDateToIso(editForm.saleEndsOn) || ''}
                    onChange={(e) => setEditForm({ ...editForm, saleEndsOn: e.target.value || null })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Giá gạch ngang chỉ hiện trong thời gian khuyến mãi và giảm tối đa 50%. Để trống: website chỉ hiện học phí.
                  </p>
                </div>

                {/* Graduation rule */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chuyên cần tối thiểu để cấp chứng chỉ (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.minAttendanceRate ?? 80}
                    onChange={(e) => setEditForm({ ...editForm, minAttendanceRate: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Áp dụng khi đợt học có điểm danh trên Moodle; 0 = không yêu cầu.</p>
                </div>

                {/* Installment plan */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trả góp (số kỳ)</label>
                  <select
                    disabled={priceLocked}
                    value={editForm.installmentCount || 1}
                    onChange={(e) => setEditForm({ ...editForm, installmentCount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  >
                    {[1, 2, 3, 4, 6].map((n) => (
                      <option key={n} value={n}>{n === 1 ? 'Không trả góp' : `${n} kỳ (kỳ đầu mở khóa học)`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Khoảng cách giữa các kỳ (ngày)</label>
                  <input
                    type="number"
                    min={7}
                    max={180}
                    disabled={priceLocked || (editForm.installmentCount || 1) <= 1}
                    value={editForm.installmentIntervalDays || 30}
                    onChange={(e) => setEditForm({ ...editForm, installmentIntervalDays: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl disabled:bg-slate-50"
                  />
                </div>

                {/* Location text */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Địa điểm / Địa chỉ đào tạo</label>
                  <input
                    type="text"
                    value={editForm.locationText || ''}
                    onChange={(e) => setEditForm({ ...editForm, locationText: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                    placeholder="VD: 54A Nguyễn Chí Thanh, Hà Nội · hoặc: Học trên LMS"
                  />
                </div>

                {/* Overview / Giới thiệu khóa học */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Giới thiệu chi tiết khóa học (Overview / Giới thiệu chuyên sâu) *
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.overview || editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, overview: e.target.value, description: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed text-xs"
                    placeholder="Khóa học dành cho ai, học xong làm được gì, học như thế nào (tối thiểu 200 ký tự)…"
                  />
                </div>

                {/* Thumbnail: upload or link */}
                <div className="sm:col-span-2">
                  <ImageUploadField
                    label="Ảnh bìa khóa học *"
                    value={editForm.thumbnail || ''}
                    onChange={(url) => setEditForm({ ...editForm, thumbnail: url })}
                    hint="Ảnh ngang 16:9, tối đa 5 MB."
                    previewClassName="w-32 h-[72px] object-cover rounded-xl border border-slate-200"
                  />
                </div>

                {/* Learning Objectives List */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Học xong, học viên làm được gì ({editForm.objectives?.length || 0}, nên có ≥ 3)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentObjs = editForm.objectives || [];
                        setEditForm({ ...editForm, objectives: [...currentObjs, ''] });
                      }}
                      className="text-[11px] text-[#0073C1] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm mục tiêu</span>
                    </button>
                  </div>

                  {(editForm.objectives || []).map((obj, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => {
                          const updated = [...(editForm.objectives || [])];
                          updated[idx] = e.target.value;
                          setEditForm({ ...editForm, objectives: updated });
                        }}
                        placeholder="VD: Tự thẩm định một hồ sơ vay cá nhân"
                        className="w-full p-2 border border-slate-300 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editForm.objectives || []).filter((_, i) => i !== idx);
                          setEditForm({ ...editForm, objectives: updated });
                        }}
                        aria-label="Xóa mục tiêu"
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 2: NHÚNG YOUTUBE & VIDEO HỌC THỬ */}
          {/* ======================================================== */}
          {activeSubTab === 'youtube' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-red-600 text-white">
                    <Play className="w-4 h-4 fill-current" />
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    Cấu Hình Nhúng Video YouTube Học Thử (Embedded Player)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Video này được nhúng trực tiếp trên đầu trang chi tiết khóa học để học viên xem bài giảng mẫu trước khi đăng ký tư vấn.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Link hoặc ID video YouTube
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.youtubeVideoId || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsedId = extractYouTubeId(raw);
                        setEditForm({
                          ...editForm,
                          youtubeVideoId: parsedId,
                          youtubeTrialUrl: parsedId ? `https://www.youtube.com/watch?v=${parsedId}` : ''
                        });
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Dán link YouTube (watch, youtu.be, shorts) hoặc ID 11 ký tự"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Không bắt buộc. Để trống nếu chưa có video học thử của chính khóa này.
                  </p>
                </div>

                {/* Live Embedded Preview Player */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-600" />
                      <span>Trình Phát Video Trực Tiếp (Test Xem Thử Trong CMS)</span>
                    </span>
                    <span className="text-slate-400 font-normal text-[11px]">
                      ID hiện tại: <code className="text-red-600 font-bold">{editForm.youtubeVideoId || 'Chưa cấu hình'}</code>
                    </span>
                  </div>

                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
                    {editForm.youtubeVideoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${editForm.youtubeVideoId}?rel=0&modestbranding=1`}
                        title="YouTube preview player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs p-4">
                        <Play className="w-8 h-8 text-slate-600 mb-2" />
                        <span>Chưa có YouTube ID. Hãy nhập ID ở trên để xem trước video.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1.5 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Lưu ý khi nhúng video YouTube:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] leading-relaxed">
                    <li>Video trên kênh YouTube của viện cần đặt ở chế độ <strong>Công khai (Public)</strong> hoặc <strong>Không công khai (Unlisted)</strong>.</li>
                    <li>Đảm bảo trong YouTube Studio đã bật tùy chọn <em>"Cho phép nhúng (Allow embedding)"</em>.</li>
                    <li>Học viên bấm vào video trên trang chi tiết có thể xem trước hoàn toàn miễn phí mà không cần đăng nhập.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 3: GIẢNG VIÊN (chọn từ trang Giảng viên) */}
          {/* ======================================================== */}
          {activeSubTab === 'instructors' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Giảng viên của khóa ({instructors.length})</span>
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    Chọn từ danh sách giảng viên. Hồ sơ (ảnh, chức danh, tiểu sử) sửa ở trang Giảng viên, dùng chung cho mọi khóa.
                  </p>
                </div>
                <button type="button" onClick={() => confirmLeave() && navigate('/catalog/instructors')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold flex items-center gap-1 cursor-pointer shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Trang Giảng viên</span>
                </button>
              </div>

              {instructors.length === 0 && (
                <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">Chưa gán giảng viên – cần ít nhất 1 người để gửi duyệt.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {instructors.map((inst, idx) => (
                  <div key={inst.id} className="p-3 rounded-2xl border border-slate-200 flex items-start gap-3">
                    {inst.avatar ? (
                      <img src={inst.avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <span className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold shrink-0">{inst.name?.[0] || '?'}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900">{idx === 0 && <span className="text-[10px] text-[#0073C1] mr-1">CHÍNH</span>}{inst.name}</div>
                      <div className="text-slate-500 line-clamp-2">{inst.title}</div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {idx > 0 && (
                        <button type="button" title="Đặt làm giảng viên chính (hiện đầu tiên)"
                          onClick={() => setEditForm({ ...editForm, instructors: [inst, ...instructors.filter((i) => i.id !== inst.id)] })}
                          className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-600 cursor-pointer">Lên đầu</button>
                      )}
                      <button type="button" aria-label={`Bỏ ${inst.name} khỏi khóa`}
                        onClick={() => setEditForm({ ...editForm, instructors: instructors.filter((i) => i.id !== inst.id) })}
                        className="px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 text-[11px] font-bold cursor-pointer flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Bỏ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Thêm giảng viên vào khóa</span>
                <div className="flex flex-wrap gap-2">
                  {staffInstructors === null && <span className="text-slate-500">Đang tải danh sách…</span>}
                  {staffInstructors?.length === 0 && <span className="text-slate-500">Chưa có giảng viên nào – thêm tại trang Giảng viên.</span>}
                  {(staffInstructors || [])
                    .filter((s) => !instructors.some((i) => i.id === s.id))
                    .map((s) => (
                      <button key={s.id} type="button" onClick={() => setEditForm({ ...editForm, instructors: [...instructors, s] })}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#0073C1] rounded-xl font-semibold flex items-center gap-2 cursor-pointer">
                        {s.avatar && <img src={s.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />}
                        <span>{s.name}</span>
                        {s.status === 'on_leave' && <span className="text-[10px] text-amber-700">(tạm nghỉ)</span>}
                        <Plus className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 4: ĐỀ CƯƠNG (syllabus) */}
          {/* ======================================================== */}
          {activeSubTab === 'modules' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0073C1]" />
                    <span>Đề cương: {syllabus.length} học phần · {lessonCount} bài</span>
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    Hiện trên trang khóa học. Bài đánh dấu “Học thử” mở cho mọi người; nội dung học thật nằm trên Moodle (có thể lấy đề cương từ khóa mẫu Moodle).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const stamp = Date.now();
                    setSyllabus([
                      ...syllabus,
                      { id: `mod-${stamp}`, title: `Học phần ${syllabus.length + 1}`, order: syllabus.length + 1, duration: '', description: '',
                        lessons: [{ id: `les-${stamp}`, title: `Bài ${syllabus.length + 1}.1`, duration: '', type: 'video', isFreePreview: false }] }
                    ]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm học phần</span>
                </button>
              </div>

              {syllabus.length === 0 && <p className="text-slate-500">Chưa có học phần nào. Cần ít nhất 3 bài để gửi duyệt.</p>}
              <div className="space-y-4">
                {syllabus.map((mod, modIdx) => {
                  const setModule = (patch: Partial<Module>) => setSyllabus(syllabus.map((m, i) => (i === modIdx ? { ...m, ...patch } : m)));
                  const lessons = mod.lessons || [];
                  const setLesson = (lesIdx: number, patch: Partial<Lesson>) =>
                    setModule({ lessons: lessons.map((l, i) => (i === lesIdx ? { ...l, ...patch } : l)) });
                  const move = (to: number) => {
                    const next = [...syllabus];
                    next.splice(to, 0, ...next.splice(modIdx, 1));
                    setSyllabus(next.map((m, i) => ({ ...m, order: i + 1 })));
                  };
                  return (
                    <div key={mod.id || modIdx} className="border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-[#0073C1] text-white flex items-center justify-center font-bold shrink-0">{modIdx + 1}</span>
                          <input type="text" value={mod.title} onChange={(e) => setModule({ title: e.target.value })} aria-label="Tên học phần"
                            className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white" placeholder="Tên học phần" />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input type="text" value={mod.duration || ''} onChange={(e) => setModule({ duration: e.target.value })}
                            placeholder="VD: 3 giờ" aria-label="Thời lượng học phần" className="w-24 p-1.5 border border-slate-300 rounded-lg text-slate-600 bg-white text-[11px]" />
                          <button type="button" disabled={modIdx === 0} onClick={() => move(modIdx - 1)} title="Lên trên" className="px-1.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-30 cursor-pointer">↑</button>
                          <button type="button" disabled={modIdx === syllabus.length - 1} onClick={() => move(modIdx + 1)} title="Xuống dưới" className="px-1.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-30 cursor-pointer">↓</button>
                          <button type="button" title="Xóa học phần" aria-label="Xóa học phần"
                            onClick={() => (!lessons.length || window.confirm(`Xóa học phần "${mod.title}" và ${lessons.length} bài trong đó?`)) && setSyllabus(syllabus.filter((_, i) => i !== modIdx))}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pl-2">
                        {lessons.map((les, lesIdx) => (
                          <div key={les.id || lesIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-xl bg-white border border-slate-200">
                            <div className="flex items-center gap-2 flex-1">
                              <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <input type="text" value={les.title} onChange={(e) => setLesson(lesIdx, { title: e.target.value })} aria-label="Tên bài"
                                className="w-full p-1 border border-transparent hover:border-slate-200 focus:border-blue-400 rounded" />
                            </div>
                            <div className="flex items-center gap-2 shrink-0 text-[11px]">
                              <select value={les.type || 'video'} onChange={(e) => setLesson(lesIdx, { type: e.target.value as Lesson['type'] })} aria-label="Loại bài" className="p-1 border border-slate-200 rounded bg-white">
                                {LESSON_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                              <input type="text" value={les.duration || ''} onChange={(e) => setLesson(lesIdx, { duration: e.target.value })} placeholder="20 phút" aria-label="Thời lượng bài"
                                className="w-20 p-1 border border-slate-200 rounded text-slate-500 text-center" />
                              <label className="flex items-center gap-1 cursor-pointer font-bold text-emerald-700">
                                <input type="checkbox" checked={!!les.isFreePreview} onChange={(e) => setLesson(lesIdx, { isFreePreview: e.target.checked })} />
                                <span>Học thử</span>
                              </label>
                              <button type="button" aria-label="Xóa bài" onClick={() => setModule({ lessons: lessons.filter((_, i) => i !== lesIdx) })} className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button type="button"
                          onClick={() => setModule({ lessons: [...lessons, { id: `les-${Date.now()}`, title: `Bài ${modIdx + 1}.${lessons.length + 1}`, duration: '', type: 'video', isFreePreview: false }] })}
                          className="text-[#0073C1] font-bold hover:underline flex items-center gap-1 cursor-pointer">
                          <Plus className="w-3 h-3" /> Thêm bài
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 5: REVIEW & ĐÁNH GIÁ CỰU HỌC VIÊN */}
          {/* ======================================================== */}
          {activeSubTab === 'reviews' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-3 text-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-current" />
                <span>Đánh giá & số học viên trên trang khóa học</span>
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Điểm đánh giá, số lượt đánh giá và số học viên được hệ thống tự tính: chỉ đánh giá do học viên đã học viết
                từ tài khoản và đã được duyệt, chỉ học viên đã được mở quyền học. Không nhập tay để trang khóa học luôn
                đúng sự thật.
              </p>
              <button
                type="button"
                onClick={() => navigate('/content/reviews')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold cursor-pointer"
              >
                Duyệt đánh giá của học viên
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 6: CAM KẾT & QUYỀN LỢI */}
          {/* ======================================================== */}
          {activeSubTab === 'guarantees' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Cam kết & quyền lợi của khóa</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hiện trên trang khóa học. Chỉ ghi điều viện cam kết bằng văn bản (hợp đồng, thỏa thuận với đối tác).
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {(editForm.guarantees || []).length === 0 && <p className="text-slate-500">Chưa có cam kết nào (không bắt buộc).</p>}
                {(editForm.guarantees || []).map((g, gIdx) => (
                  <div key={gIdx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                    <input
                      type="text"
                      value={g}
                      onChange={(e) => {
                        const updated = [...(editForm.guarantees || [])];
                        updated[gIdx] = e.target.value;
                        setEditForm({ ...editForm, guarantees: updated });
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (editForm.guarantees || []).filter((_, i) => i !== gIdx);
                        setEditForm({ ...editForm, guarantees: updated });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const current = editForm.guarantees || [];
                    setEditForm({ ...editForm, guarantees: [...current, ''] });
                  }}
                  className="text-[#0073C1] font-bold text-xs hover:underline flex items-center gap-1 pt-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm cam kết mới</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT PREVIEW & SUMMARY CARD (4 COLS) */}
        <div className="lg:col-span-4 sticky top-24 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Thẻ Tóm Tắt Khóa Học
              </span>
              {editForm.category && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0073C1] text-[10px] font-bold truncate max-w-[60%]">{editForm.category}</span>
              )}
            </div>

            {/* Thumbnail */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden relative shadow-xs bg-slate-100">
              {editForm.thumbnail ? (
                <img src={editForm.thumbnail} alt={editForm.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400">Chưa có ảnh bìa</div>
              )}
              {editForm.youtubeVideoId && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                {editForm.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {editForm.subtitle}
              </p>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Học phí</div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {formatVND(editForm.price)}
                  </div>
                </div>

                {editForm.originalPrice > editForm.price && !!editForm.saleEndsOn && (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 line-through font-mono block">
                      {formatVND(editForm.originalPrice)}
                    </span>
                    <span className="text-[10px] text-red-600 font-bold">
                      Tiết kiệm {formatVND(editForm.originalPrice - editForm.price)}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Specs */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Trình độ:</span>
                  <span className="font-bold text-slate-800">{editForm.level || '–'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thời lượng:</span>
                  <span className="font-bold text-slate-800">{editForm.duration || '–'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Đề cương:</span>
                  <span className="font-bold text-slate-800">{syllabus.length} học phần · {lessonCount} bài</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Video học thử:</span>
                  <span className="font-bold text-slate-800">{editForm.youtubeVideoId ? 'Có' : 'Chưa có'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Giảng viên:</span>
                  <span className="font-bold text-[#0073C1] truncate max-w-[60%]">{instructors.length ? instructors.map((i) => i.name).join(', ') : 'Chưa gán'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Đánh giá đã duyệt:</span>
                  <span className="font-bold text-amber-600">{currentCourse.reviewsCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Save CTA */}
            {canEdit && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!!busy || !dirty}
                className="w-full py-2.5 px-4 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{dirty ? 'Lưu thay đổi' : 'Không có thay đổi'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
