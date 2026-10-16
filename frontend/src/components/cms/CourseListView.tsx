import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Clock, LayoutGrid, Search, Table as TableIcon, Users } from 'lucide-react';
import { Course } from '../../types';

interface CourseListViewProps {
  courses: Course[];
  onOpenCourse: (courseId: string) => void;
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

/** Catalogue landing view. Editing is deliberately one click deeper, like CRM campaigns → pipeline. */
export const CourseListView: React.FC<CourseListViewProps> = ({ courses, onOpenCourse }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [view, setView] = useState<'card' | 'table'>('card');

  const categories = useMemo(
    () => Array.from(new Set(courses.map((course) => course.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [courses]
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) =>
      (!needle || [course.title, course.subtitle, course.category, course.level].some((value) => value?.toLowerCase().includes(needle))) &&
      (status === 'all' || (course.status || 'draft') === status) &&
      (category === 'all' || course.category === category)
    );
  }, [courses, query, status, category]);

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
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 self-start md:self-auto">
            <button type="button" onClick={() => setView('card')} className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'card' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
              <LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">Lưới thẻ</span>
            </button>
            <button type="button" onClick={() => setView('table')} className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
              <TableIcon className="w-4 h-4" /><span className="hidden sm:inline">Bảng</span>
            </button>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, danh mục hoặc trình độ..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-2.5 flex-wrap">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"><option value="all">Mọi trạng thái</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"><option value="all">Mọi danh mục</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 text-xs text-slate-500"><BookOpen className="w-4 h-4 text-indigo-600" />Hiển thị <strong>{filtered.length}</strong> / <strong>{courses.length}</strong> khóa học</div>
      {view === 'card' ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{filtered.map((course) => <button type="button" key={course.id} onClick={() => onOpenCourse(course.id)} className="group text-left bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all overflow-hidden">
        <img src={course.thumbnail} alt="" className="w-full h-36 object-cover bg-slate-100" />
        <div className="p-4 space-y-3"><div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusClass[course.status || 'draft']}`}>{statusLabel[course.status || 'draft']}</span><span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate">{course.category}</span></div>
          <div><h3 className="font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-2">{course.title}</h3><p className="mt-1 text-xs text-slate-500 line-clamp-2">{course.subtitle}</p></div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{course.duration}</span><span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{course.learnersCount || 0} học viên</span></div>
        </div><div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between"><span className="font-mono font-bold text-slate-900">{vnd(course.price)}</span><span className="text-xs font-bold text-indigo-600 flex items-center gap-1">Quản lý <ChevronRight className="w-4 h-4" /></span></div>
      </button>)}</div> : <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]"><th className="p-3.5 pl-5">Khóa học</th><th className="p-3.5">Danh mục</th><th className="p-3.5">Học phí</th><th className="p-3.5">Thời lượng</th><th className="p-3.5">Trạng thái</th><th className="p-3.5 pr-5 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((course) => <tr key={course.id} onClick={() => onOpenCourse(course.id)} className="cursor-pointer hover:bg-indigo-50/40"><td className="p-3.5 pl-5"><div className="font-bold text-slate-900">{course.title}</div><div className="mt-0.5 text-slate-400 line-clamp-1">{course.level}</div></td><td className="p-3.5 text-slate-600">{course.category}</td><td className="p-3.5 font-mono font-bold text-slate-800">{vnd(course.price)}</td><td className="p-3.5 text-slate-600">{course.duration}</td><td className="p-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusClass[course.status || 'draft']}`}>{statusLabel[course.status || 'draft']}</span></td><td className="p-3.5 pr-5 text-right"><span className="font-bold text-indigo-600">Quản lý →</span></td></tr>)}</tbody></table></div>}
      {!filtered.length && <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">Không tìm thấy khóa học phù hợp.</div>}
    </div>
  );
};
