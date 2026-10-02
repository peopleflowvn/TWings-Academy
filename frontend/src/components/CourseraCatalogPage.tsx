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
import { Course, CourseLevel, CourseType } from '../types';
import { CourseraCourseCard } from './CourseraCourseCard';

interface CourseraCatalogPageProps {
  courses: Course[];
  enrolledCourseIds: string[];
  initialSearchQuery?: string;
  initialCategory?: string;
  onSelectCourse: (course: Course) => void;
  onEnrollCourse: (course: Course) => void;
  onOpenYouTubeTrial?: (course: Course) => void;
}

export const CourseraCatalogPage: React.FC<CourseraCatalogPageProps> = ({
  courses,
  enrolledCourseIds,
  initialSearchQuery = '',
  initialCategory = 'Tất cả',
  onSelectCourse,
  onEnrollCourse,
  onOpenYouTubeTrial,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedLevel, setSelectedLevel] = useState<string>('Tất cả');
  const [selectedType, setSelectedType] = useState<string>('Tất cả');
  const [selectedFormat, setSelectedFormat] = useState<string>('Tất cả');
  const [selectedPartner, setSelectedPartner] = useState<string>('Tất cả');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price-asc' | 'price-desc'>('popular');
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

  const levels = ['Tất cả', 'Người mới bắt đầu', 'Trung cấp', 'Nâng cao'];
  const types = ['Tất cả', 'Chứng chỉ Chuyên môn', 'Chuyên ngành', 'Khóa học', 'Bằng cấp Trực tuyến'];
  const formats = [
    { id: 'Tất cả', label: 'Tất cả hình thức' },
    { id: 'offline', label: 'Trực tiếp (Offline)' },
    { id: 'hybrid', label: 'Kết hợp (Hybrid)' },
    { id: 'online_external_lms', label: 'Online (LMS riêng)' },
  ];

  // Filter & sort logic
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = course.title.toLowerCase().includes(q);
          const matchSub = course.subtitle.toLowerCase().includes(q);
          const matchPartner = course.partner?.name.toLowerCase().includes(q);
          const matchSkills = course.skills?.some((s) => s.toLowerCase().includes(q));
          if (!matchTitle && !matchSub && !matchPartner && !matchSkills) return false;
        }

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
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return b.reviewsCount - a.reviewsCount;
      });
  }, [courses, searchQuery, selectedCategory, selectedLevel, selectedType, selectedFormat, selectedPartner, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Tất cả');
    setSelectedLevel('Tất cả');
    setSelectedType('Tất cả');
    setSelectedFormat('Tất cả');
    setSelectedPartner('Tất cả');
    setSortBy('popular');
  };

  const hasActiveFilters =
    searchQuery ||
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
                Khám Phá Danh Mục Khóa Học & Chứng Chỉ
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tìm kiếm chương trình phù hợp từ Google, Stanford, IBM, DeepLearning.AI và hơn 350+ đối tác hàng đầu.
              </p>
            </div>

            {/* In-page search input */}
            <div className="w-full md:w-80 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kỹ năng, khóa học, đối tác..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:ring-2 focus:ring-blue-100 bg-white"
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
                    ? 'bg-[#0056D2] text-white border-[#0056D2] shadow-xs'
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
          <aside className="hidden lg:block lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#0056D2]" />
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

            {/* Filter 1: Product Type */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Loại Chương Trình
              </label>
              <div className="space-y-1.5">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      selectedType === type
                        ? 'bg-blue-50 text-[#0056D2] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{type}</span>
                    {selectedType === type && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2: Level */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Cấp Độ Người Học
              </label>
              <div className="space-y-1.5">
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      selectedLevel === lvl
                        ? 'bg-blue-50 text-[#0056D2] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lvl}</span>
                    {selectedLevel === lvl && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 3: Partner */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Đối Tác Đào Tạo
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {partners.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPartner(p)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      selectedPartner === p
                        ? 'bg-blue-50 text-[#0056D2] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{p}</span>
                    {selectedPartner === p && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Courses Grid */}
          <main className="lg:col-span-9 space-y-6">
            {/* Results bar & Sorting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs sm:text-sm font-semibold text-slate-700">
                Hiển thị <span className="font-bold text-[#0056D2]">{filteredCourses.length}</span> khóa học phù hợp
                {hasActiveFilters && <span className="text-slate-400"> (đã áp dụng bộ lọc)</span>}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sắp xếp theo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0056D2] cursor-pointer"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="rating">Đánh giá cao nhất</option>
                  <option value="price-asc">Học phí: Thấp đến Cao</option>
                  <option value="price-desc">Học phí: Cao đến Thấp</option>
                </select>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="lg:hidden p-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Lọc</span>
                </button>
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
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cấp độ</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    >
                      {levels.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Loại chương trình</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    >
                      {types.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredCourses.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bấm nút "Đặt lại bộ lọc" để khám phá thêm nhiều lựa chọn khác.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-5 py-2 bg-[#0056D2] hover:bg-[#00419E] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Đặt lại toàn bộ bộ lọc
                </button>
              </div>
            ) : (
              /* Grid of Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseraCourseCard
                    key={course.id}
                    course={course}
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
    </div>
  );
};
