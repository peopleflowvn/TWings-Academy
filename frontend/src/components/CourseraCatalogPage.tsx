import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  X, 
  Sparkles, 
  Star, 
  GraduationCap, 
  BookOpen, 
  Check, 
  RotateCcw 
} from 'lucide-react';
import { canBuy, Intake, openIntakes, priceFor } from '../lib/selling';
import { Course, CourseLevel, CourseType } from '../types';
import { CourseraCourseCard } from './CourseraCourseCard';
import { ProgramsStrip } from './ProgramsStrip';
import { courseFields, rank } from '../lib/search';

interface CourseraCatalogPageProps {
  courses: Course[];
  enrolledCourseIds: string[];
  /** Shared with the header's search box (and ?q= in the address). */
  searchQuery: string;
  onSearchChange: (query: string) => void;
  initialCategory?: string;
  /** Show only the courses with a class recruiting now (/tuyen-sinh, "Xem tất cả" of the homepage strip). */
  initialRecruitingOnly?: boolean;
  onOpenConsultation: () => void;
  onSelectCourse: (course: Course) => void;
  onEnrollCourse: (course: Course, intakeName?: string) => void;
  onOpenYouTubeTrial?: (course: Course) => void;
}

/** Sort key: days to the next intake; open courses without intakes after, consultations last. */
const startKey = (course: Course) => {
  const next = openIntakes(course)[0];
  if (next) return next.startDate ? new Date(next.startDate).getTime() : 8e15;
  return canBuy(course) ? 9e15 : 9.5e15;
};

export const CourseraCatalogPage: React.FC<CourseraCatalogPageProps> = ({
  courses,
  enrolledCourseIds,
  searchQuery,
  onSearchChange: setSearchQuery,
  initialCategory = 'Tất cả',
  initialRecruitingOnly = false,
  onOpenConsultation,
  onSelectCourse,
  onEnrollCourse,
  onOpenYouTubeTrial,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedLevel, setSelectedLevel] = useState<string>('Tất cả');
  const [selectedType, setSelectedType] = useState<string>('Tất cả');
  const [selectedFormat, setSelectedFormat] = useState<string>('Tất cả');
  const [selectedPartner, setSelectedPartner] = useState<string>('Tất cả');
  const [recruitingOnly, setRecruitingOnly] = useState(initialRecruitingOnly);
  const [sortBy, setSortBy] = useState<'start' | 'price-asc' | 'price-desc'>('start');
  // Classes taking registrations now: the classes /app lists "Trên website".
  const recruitingCount = useMemo(() => courses.reduce((n, c) => n + openIntakes(c).length, 0), [courses]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract unique categories & partners
  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['Tất cả', ...Array.from(set)];
  }, [courses]);

  const partners = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.partner?.name) set.add(c.partner.name);
    });
    return ['Tất cả', ...Array.from(set)];
  }, [courses]);

  // Filters only offer values the catalogue has (no option that always gives zero results).
  const distinct = (values: (string | undefined)[]) => ['Tất cả', ...Array.from(new Set(values.filter((v): v is string => !!v)))];
  const levels = useMemo(() => distinct(courses.map((c) => c.level)), [courses]);
  const types = useMemo(() => distinct(courses.map((c) => c.type)), [courses]);
  const FORMAT_LABEL: Record<string, string> = {
    offline: 'Trực tiếp (Offline)',
    hybrid: 'Kết hợp (Hybrid)',
    online_external_lms: 'Online (LMS riêng)'
  };
  const formats = useMemo(() => distinct(courses.map((c) => c.deliveryFormat)), [courses]);
  const groups = [
    { key: 'type', label: 'Loại chương trình', options: types, value: selectedType, set: setSelectedType, show: (v: string) => v },
    { key: 'level', label: 'Cấp độ', options: levels, value: selectedLevel, set: setSelectedLevel, show: (v: string) => v },
    {
      key: 'format',
      label: 'Hình thức học',
      options: formats,
      value: selectedFormat,
      set: setSelectedFormat,
      show: (v: string) => (v === 'Tất cả' ? v : FORMAT_LABEL[v] || v)
    },
    { key: 'partner', label: 'Đối tác đào tạo', options: partners, value: selectedPartner, set: setSelectedPartner, show: (v: string) => v }
  ].filter((g) => g.options.length > 2); // a single value is not a choice

  // Filter & sort logic
  const filteredCourses = useMemo(() => {
    const sorted = courses
      .filter((course) => {
        if (recruitingOnly && !openIntakes(course).length) return false;

        // Category filter
        if (selectedCategory !== 'Tất cả' && course.category !== selectedCategory) {
          return false;
        }

        // Level filter
        if (selectedLevel !== 'Tất cả' && course.level !== selectedLevel) {
          return false;
        }

        // Type filter
        if (selectedType !== 'Tất cả' && course.type !== selectedType) {
          return false;
        }

        // Format filter
        if (selectedFormat !== 'Tất cả' && course.deliveryFormat !== selectedFormat) {
          return false;
        }

        // Partner filter
        if (selectedPartner !== 'Tất cả' && course.partner?.name !== selectedPartner) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return priceFor(a, openIntakes(a)[0]) - priceFor(b, openIntakes(b)[0]);
        if (sortBy === 'price-desc') return priceFor(b, openIntakes(b)[0]) - priceFor(a, openIntakes(a)[0]);
        // Soonest intake first; courses open now before those without an intake.
        return startKey(a) - startKey(b);
      });
    // A search ranks by relevance (the chosen order breaks ties): see lib/search.
    return searchQuery.trim() ? rank(sorted, searchQuery, courseFields) : sorted;
  }, [courses, searchQuery, recruitingOnly, selectedCategory, selectedLevel, selectedType, selectedFormat, selectedPartner, sortBy]);

  // One card per course, or, filtered to recruiting, one card per class (named as in /app).
  const cards = useMemo(() => {
    if (!recruitingOnly) return filteredCourses.map((course) => ({ course, intake: undefined as Intake | undefined }));
    const rows = filteredCourses.flatMap((course) => openIntakes(course).map((intake) => ({ course, intake: intake as Intake | undefined })));
    if (searchQuery.trim() || sortBy !== 'start') return rows; // relevance / price order of the courses
    const start = (i?: Intake) => (i?.startDate ? new Date(i.startDate).getTime() : 8e15);
    return [...rows].sort((a, b) => start(a.intake) - start(b.intake));
  }, [filteredCourses, recruitingOnly, searchQuery, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Tất cả');
    setSelectedLevel('Tất cả');
    setSelectedType('Tất cả');
    setSelectedFormat('Tất cả');
    setSelectedPartner('Tất cả');
    setRecruitingOnly(false);
    setSortBy('start');
  };

  const hasActiveFilters =
    searchQuery ||
    recruitingOnly ||
    selectedCategory !== 'Tất cả' ||
    selectedLevel !== 'Tất cả' ||
    selectedType !== 'Tất cả' ||
    selectedFormat !== 'Tất cả' ||
    selectedPartner !== 'Tất cả';

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Top Banner / Search bar */}
      <div className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Khóa Học & Chương Trình Đào Tạo
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Khóa học thực chiến và chương trình trọn gói theo lộ trình nghề nghiệp, có lịch khai giảng và hỗ trợ trả góp.
              </p>
            </div>

            {/* In-page search input */}
            <div className="w-full md:w-80 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khóa học: QHKH, tín dụng, giao dịch viên…"
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#D7F5FF] bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-[#0073C1] text-white border-[#0073C1] shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Left Filter Sidebar + Right Course Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Filter (Desktop) */}
          {groups.length > 0 && (
          <aside className="hidden lg:block lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#0073C1]" />
                <span>Bộ Lọc Khóa Học</span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {groups.map((g, i) => (
              <div key={g.key} className={`space-y-2.5 ${i ? 'pt-4 border-t border-slate-100' : ''}`}>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">{g.label}</label>
                <div className="space-y-1.5">
                  {g.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => g.set(opt)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        g.value === opt ? 'bg-[#D7F5FF] text-[#0073C1] font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{g.show(opt)}</span>
                      {g.value === opt && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>
          )}

          {/* Right Courses Grid */}
          <main className={`${groups.length > 0 ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-6`}>
            {/* Results bar & Sorting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {recruitingCount > 0 && (
                  <button
                    type="button"
                    aria-pressed={recruitingOnly}
                    onClick={() => setRecruitingOnly(!recruitingOnly)}
                    title="Các lớp đang nhận đăng ký"
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      recruitingOnly ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${recruitingOnly ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
                    Đang tuyển sinh
                    <span className={recruitingOnly ? 'text-emerald-100' : 'text-emerald-600'}>{recruitingCount}</span>
                    {recruitingOnly && <X className="w-3.5 h-3.5" />}
                  </button>
                )}
                <span className="text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="font-bold text-[#0073C1]">{cards.length}</span> {recruitingOnly ? 'lớp đang tuyển' : 'khóa học phù hợp'}
                  {hasActiveFilters && (
                    <button type="button" onClick={resetFilters} className="ml-2 text-[11px] font-bold text-slate-400 hover:text-red-600 hover:underline cursor-pointer">
                      Bỏ lọc
                    </button>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs font-medium text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0073C1] cursor-pointer"
                >
                  <option value="start">Khai giảng sớm nhất</option>
                  <option value="price-asc">Học phí: Thấp đến Cao</option>
                  <option value="price-desc">Học phí: Cao đến Thấp</option>
                </select>

                {/* Mobile Filter Button */}
                {groups.length > 0 && <button
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="lg:hidden p-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Lọc</span>
                </button>}
              </div>
            </div>

            {/* Mobile Filter Sheet */}
            {mobileFilterOpen && (
              <div className="lg:hidden bg-white p-5 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Bộ lọc tìm kiếm</span>
                  <button onClick={() => setMobileFilterOpen(false)} className="text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {groups.map((g) => (
                    <div key={g.key}>
                      <label className="font-bold text-slate-700 block mb-1">{g.label}</label>
                      <select value={g.value} onChange={(e) => g.set(e.target.value)} className="w-full p-2 border rounded-lg">
                        {g.options.map((opt) => (
                          <option key={opt} value={opt}>{g.show(opt)}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {cards.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery.trim() ? `Chưa có khóa học nào cho “${searchQuery.trim()}”` : 'Không có khóa học nào với bộ lọc này'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Thử từ khóa ngắn hơn (VD: “tín dụng”, “QHKH”, “giao dịch viên”), bỏ bớt bộ lọc, hoặc để lại thông tin để tư vấn viên gợi ý lộ trình phù hợp.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={resetFilters}
                    className="px-5 py-2 border border-slate-300 hover:border-[#0073C1] text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Xem tất cả khóa học
                  </button>
                  <button
                    onClick={onOpenConsultation}
                    className="px-5 py-2 bg-[#0073C1] hover:bg-[#2C93E8] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Nhận tư vấn lộ trình
                  </button>
                </div>
              </div>
            ) : (
              /* Grid of Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {cards.map(({ course, intake }) => (
                  <CourseraCourseCard
                    key={`${course.id}:${intake?.name || ''}`}
                    course={course}
                    intake={intake}
                    onSelectCourse={onSelectCourse}
                    onEnrollCourse={onEnrollCourse}
                    isEnrolled={enrolledCourseIds.includes(course.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* After the courses: the programs (bundles). Recruiting classes are the "Đang tuyển sinh" filter. */}
      <ProgramsStrip />
    </div>
  );
};
