import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, ChevronRight, Clock, LayoutGrid, Plus, Search, Table as TableIcon, Users } from 'lucide-react';
import { Course } from '../../types';
import { formatDate } from '../../lib/commerce';
import { rank } from '../../lib/search';
import type { IntakeRow } from '../../admin/pages/IntakesPage';

interface CourseListViewProps {
  courses: Course[];
  /** Every class (null while loading): what each course is recruiting for. */
  classes?: IntakeRow[] | null;
  onOpenCourse: (courseId: string) => void;
  onCreateCourse: () => void;
}

const statusLabel: Record<string, string> = {
  draft: 'Nháp', review: 'Chờ duyệt', published: 'Đang bán', archived: 'Ngừng bán'
};

const statusClass: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  review: 'bg-amber-50 text-amber-800 border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border-rose-200'
};

const vnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

const JOINABLE = ['opening', 'upcoming'];
interface ClassSummary {
  recruiting: number;
  total: number;
  nextStart: string | null;
}
/** Courses taught in classes must have one recruiting before they can be sold. */
const byClass = (course: Course) => course.deliveryFormat === 'offline' || course.deliveryFormat === 'hybrid';

const ClassesLine: React.FC<{ course: Course; summary?: ClassSummary; loading: boolean }> = ({ course, summary, loading }) => {
  if (loading) return <span className="text-slate-400">Đang tải lớp…</span>;
  if (summary?.recruiting) {
    return (
      <span className="text-emerald-700 font-bold">
        {summary.recruiting} lớp đang tuyển{summary.nextStart ? ` · KG ${formatDate(summary.nextStart)}` : ''}
      </span>
    );
  }
  return (
    <span className={byClass(course) && course.status !== 'archived' ? 'text-amber-700 font-bold' : 'text-slate-400'}>
      {byClass(course) ? 'Chưa có lớp đang tuyển' : 'Học online, không cần lớp'}
    </span>
  );
};

/** Catalogue landing view. Editing is deliberately one click deeper, like CRM campaigns → pipeline. */
export const CourseListView: React.FC<CourseListViewProps> = ({ courses, classes, onOpenCourse, onCreateCourse }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [view, setView] = useState<'card' | 'table'>('card');

  const categories = useMemo(
    () => Array.from(new Set(courses.map((course) => course.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [courses]
  );
  const filtered = useMemo(() => {
    const list = courses.filter((course) =>
      (status === 'all' || (course.status || 'draft') === status) &&
      (category === 'all' || course.category === category)
    );
    // Accent-insensitive, best match first.
    return rank(list, query, (course) => [
      { text: course.title, weight: 3 },
      { text: course.category, weight: 2 },
      { text: [course.subtitle, course.level].join(' '), weight: 1 }
    ]);
  }, [courses, query, status, category]);
  const summaries = useMemo(() => {
    const today = new Date().toLocaleDateString('sv'); // yyyy-mm-dd, local time
    const out: Record<string, ClassSummary> = {};
    for (const r of classes || []) {
      const s = (out[r.courseId] ||= { recruiting: 0, total: 0, nextStart: null });
      s.total += 1;
      if (JOINABLE.includes(r.status)) {
        s.recruiting += 1;
        if (r.startDate && r.startDate >= today && (!s.nextStart || r.startDate < s.nextStart)) s.nextStart = r.startDate;
      }
    }
    return out;
  }, [classes]);
  const loadingClasses = classes === null;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Danh mục khóa học</span>
            </h2>
            <p className="text-xs text-slate-500">Tra cứu và chọn khóa học trước khi chỉnh sửa nội dung, giá bán hoặc cấu hình xuất bản.</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button type="button" onClick={() => setView('card')} className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'card' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
                <LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">Lưới thẻ</span>
              </button>
              <button type="button" onClick={() => setView('table')} className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
                <TableIcon className="w-4 h-4" /><span className="hidden sm:inline">Bảng</span>
              </button>
            </div>
            <button type="button" onClick={onCreateCourse} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" />Tạo khóa học mới
            </button>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, danh mục, trình độ (gõ không dấu được)..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-2.5 flex-wrap">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"><option value="all">Mọi trạng thái</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"><option value="all">Mọi danh mục</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 text-xs text-slate-500"><BookOpen className="w-4 h-4 text-indigo-600" />Hiển thị <strong>{filtered.length}</strong> / <strong>{courses.length}</strong> khóa học</div>
      {view === 'card' ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{filtered.map((course) => <button type="button" key={course.id} onClick={() => onOpenCourse(course.id)} className="group text-left bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all overflow-hidden">
        <img src={course.thumbnail} alt="" className="w-full h-36 object-cover bg-slate-100" />
        <div className="p-4 space-y-3"><div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusClass[course.status || 'draft']}`}>{statusLabel[course.status || 'draft']}</span>{course.category && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate">{course.category}</span>}</div>
          <div><h3 className="font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-2">{course.title}</h3><p className="mt-1 text-xs text-slate-500 line-clamp-2">{course.subtitle}</p></div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{course.duration}</span><span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{course.learnersCount || 0} học viên</span></div>
          {classes !== undefined && <div className="flex items-center gap-1.5 text-xs"><CalendarDays className="w-3.5 h-3.5 text-slate-400" /><ClassesLine course={course} summary={summaries[course.id]} loading={loadingClasses} /></div>}
        </div><div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between"><span className="font-mono font-bold text-slate-900">{vnd(course.price)}</span><span className="text-xs font-bold text-indigo-600 flex items-center gap-1">Quản lý <ChevronRight className="w-4 h-4" /></span></div>
      </button>)}</div> : <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]"><th className="p-3.5 pl-5">Khóa học</th><th className="p-3.5">Danh mục</th><th className="p-3.5">Học phí</th><th className="p-3.5">Thời lượng</th>{classes !== undefined && <th className="p-3.5">Lớp</th>}<th className="p-3.5">Trạng thái</th><th className="p-3.5 pr-5 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((course) => <tr key={course.id} onClick={() => onOpenCourse(course.id)} className="cursor-pointer hover:bg-indigo-50/40"><td className="p-3.5 pl-5"><div className="font-bold text-slate-900">{course.title}</div><div className="mt-0.5 text-slate-400 line-clamp-1">{course.level}</div></td><td className="p-3.5 text-slate-600">{course.category}</td><td className="p-3.5 font-mono font-bold text-slate-800">{vnd(course.price)}</td><td className="p-3.5 text-slate-600">{course.duration}</td>{classes !== undefined && <td className="p-3.5 whitespace-nowrap"><ClassesLine course={course} summary={summaries[course.id]} loading={loadingClasses} /></td>}<td className="p-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusClass[course.status || 'draft']}`}>{statusLabel[course.status || 'draft']}</span></td><td className="p-3.5 pr-5 text-right"><span className="font-bold text-indigo-600">Quản lý →</span></td></tr>)}</tbody></table></div>}
      {!filtered.length && <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">Không tìm thấy khóa học phù hợp.</div>}
    </div>
  );
};
