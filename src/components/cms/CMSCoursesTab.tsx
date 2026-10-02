import React, { useState, useEffect } from 'react';
import {
  BookOpen,
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
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Sparkles,
  Users,
  ShieldCheck,
  Check,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Module, Lesson, Instructor, CourseReview } from '../../types';
import { REAL_INSTRUCTORS, DEFAULT_COURSE_REVIEWS } from '../../data/coursesData';

interface CMSCoursesTabProps {
  courses: Course[];
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse: (updatedCourse: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onPreviewCourse?: (course: Course) => void;
}

export const CMSCoursesTab: React.FC<CMSCoursesTabProps> = ({
  courses,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onPreviewCourse,
}) => {
  // Currently selected course to edit
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'youtube' | 'instructors' | 'modules' | 'reviews' | 'guarantees'>('info');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Editable buffer for the selected course
  const currentCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const [editForm, setEditForm] = useState<Course | null>(null);

  // Sync edit form whenever selected course changes
  useEffect(() => {
    if (currentCourse) {
      setEditForm(JSON.parse(JSON.stringify(currentCourse)));
    }
  }, [selectedCourseId, courses.length]);

  if (!editForm) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang tải dữ liệu khóa học...
      </div>
    );
  }

  // Format VND currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  // Helper to extract YouTube ID from any link or raw ID
  const extractYouTubeId = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    // Check if raw 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    // Match watch?v=ID or youtu.be/ID or embed/ID
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : trimmed;
  };

  // Handle saving the edited course
  const handleSaveAll = () => {
    if (!editForm) return;

    // Standardize instructors & reviews
    const cleaned: Course = {
      ...editForm,
      youtubeVideoId: extractYouTubeId(editForm.youtubeVideoId || ''),
      youtubeTrialUrl: editForm.youtubeVideoId 
        ? `https://www.youtube.com/watch?v=${extractYouTubeId(editForm.youtubeVideoId)}`
        : editForm.youtubeTrialUrl,
      instructor: editForm.instructors?.[0] || editForm.instructor || REAL_INSTRUCTORS[0],
    };

    onUpdateCourse(cleaned);
    setSaveSuccessMsg(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Handle creating a new course
  const handleCreateNewCourse = () => {
    const newId = `course-new-${Date.now()}`;
    const newCourse: Course = {
      id: newId,
      slug: `khoa-hoc-moi-${Date.now()}`,
      title: 'Khóa Học Nghiệp Vụ Mới 2026',
      subtitle: 'Chương trình đào tạo thực chiến kết nối cơ hội việc làm tại Ngân hàng MSB & ROX Group.',
      overview: 'Khóa học được thiết kế chuyên sâu, học viên được cấp tài khoản học trên hệ thống LMS chuyên biệt của viện đào tạo và kèm cặp 1-1 cùng chuyên gia ngân hàng.',
      category: 'Ngân Hàng & Tín Dụng',
      level: 'Chuyên viên Mới (Fresher)',
      deliveryFormat: 'online_external_lms',
      locationText: 'Hệ thống LMS chuyên biệt + Cố vấn 1-1 trực tiếp tại ROX Tower',
      price: 6990000,
      originalPrice: 8900000,
      rating: 5.0,
      reviewsCount: 45,
      studentsCount: 320,
      duration: '40 giờ học thực chiến',
      lessonsCount: 24,
      badgeType: 'new',
      thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      youtubeVideoId: 'sal78ACtGTc',
      youtubeTrialUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc',
      instructor: REAL_INSTRUCTORS[0],
      instructors: [REAL_INSTRUCTORS[0], REAL_INSTRUCTORS[1]],
      reviews: DEFAULT_COURSE_REVIEWS,
      guarantees: [
        'Bảo lãnh thực tập & phỏng vấn tuyển dụng tại MSB',
        'Cấp tài khoản LMS chuyên biệt kèm 1-1 cùng Giám đốc Khối',
        'Chứng chỉ nghiệp vụ chuẩn ngân hàng thương mại'
      ],
      objectives: [
        'Làm chủ quy trình thẩm định và xử lý hồ sơ tín dụng thực tế',
        'Tự tin vượt qua kỳ phỏng vấn tuyển dụng ngân hàng',
        'Xây dựng thương hiệu cá nhân uy tín của chuyên viên ngân hàng'
      ],
      chapters: [
        {
          id: `mod-${Date.now()}-1`,
          title: 'Học phần 1: Tổng quan Nghiệp vụ & Khung Năng lực Cốt Lõi',
          order: 1,
          duration: '10 giờ',
          description: 'Nền tảng kiến thức và chân dung chuyên viên ngân hàng chuẩn mực.',
          lessons: [
            {
              id: `les-${Date.now()}-1`,
              title: 'Bài 1.1: Giới thiệu khóa học & Phương pháp học tập trên LMS',
              duration: '20 phút',
              type: 'video',
              isFreePreview: true
            },
            {
              id: `les-${Date.now()}-2`,
              title: 'Bài 1.2: Thực hành xử lý tình huống thực tế cùng Chuyên gia',
              duration: '35 phút',
              type: 'video',
              isFreePreview: false
            }
          ]
        }
      ]
    };

    onAddCourse(newCourse);
    setSelectedCourseId(newId);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Handle duplicating current course
  const handleDuplicateCourse = () => {
    if (!editForm) return;
    const dupId = `course-copy-${Date.now()}`;
    const duplicated: Course = {
      ...JSON.parse(JSON.stringify(editForm)),
      id: dupId,
      slug: `${editForm.slug}-copy`,
      title: `${editForm.title} (Bản sao)`,
    };
    onAddCourse(duplicated);
    setSelectedCourseId(dupId);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Handle deleting current course
  const handleDeleteCurrentCourse = () => {
    if (courses.length <= 1) {
      alert('Hệ thống cần duy trì ít nhất 1 khóa học trong danh mục.');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${editForm.title}"?`)) {
      const nextCourse = courses.find((c) => c.id !== editForm.id);
      onDeleteCourse(editForm.id);
      if (nextCourse) {
        setSelectedCourseId(nextCourse.id);
      }
    }
  };

  // Filtered course list for selector
  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* 1. TOP HEADER & COURSE SELECTOR BAR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-100 text-[#0073C1]">
                <BookOpen className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Chỉnh Sửa Khóa Học & Nhúng YouTube Chuyên Nghiệp
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Quản lý toàn bộ thông tin hiển thị trên <strong>Trang Chi Tiết Khóa Học</strong>: Giới thiệu khóa học, nhúng video YouTube học thử, đội ngũ giảng viên MSB, lộ trình module bài học, thời lượng và review cựu học viên.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {onPreviewCourse && (
              <button
                type="button"
                onClick={() => onPreviewCourse(editForm)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Xem thử trang chi tiết với dữ liệu hiện tại"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Xem Trang Khách Xem</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateNewCourse}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0073C1] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Khóa Học Mới</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicateCourse}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Nhân bản khóa học này"
            >
              <Copy className="w-4 h-4" />
              <span>Nhân Bản</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteCurrentCourse}
              className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Xóa khóa học này"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Xóa</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer ml-auto"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </div>

        {/* Course Switcher Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm khóa học cần chỉnh sửa..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="md:col-span-8 flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 shrink-0">Chọn khóa học đang sửa:</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full p-2 border border-blue-300 rounded-xl bg-blue-50/50 text-xs font-bold text-slate-900 cursor-pointer focus:bg-white focus:border-[#0073C1]"
            >
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — [{c.category}] · {formatVND(c.price)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notification Toast */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã lưu thành công toàn bộ thông tin khóa học "{editForm.title}"! Trang chi tiết đã được cập nhật ngay lập tức.</span>
          </div>
        )}
      </div>

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
            <span>1. Giới Thiệu & Thông Tin Cơ Bản</span>
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
            <span>2. Nhúng YouTube & Video Học Thử</span>
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
            <span>3. Đội Ngũ Giảng Viên ({editForm.instructors?.length || 1})</span>
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
            <span>4. Các Module & Lộ Trình ({editForm.chapters?.length || 0})</span>
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
            <span>5. Review Cựu Học Viên ({editForm.reviews?.length || 0})</span>
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
            <span>6. Cam Kết & Quyền Lợi</span>
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
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                  >
                    <option value="Ngân Hàng & Tín Dụng">Ngân Hàng & Tín Dụng</option>
                    <option value="Quản Trị & Lãnh Đạo (OKR/MBO)">Quản Trị & Lãnh Đạo (OKR/MBO)</option>
                    <option value="Tư Duy & Đột Phá">Tư Duy & Đột Phá</option>
                    <option value="Trí tuệ nhân tạo (AI)">Trí tuệ nhân tạo (AI)</option>
                    <option value="Dữ Liệu & Phân Tích">Dữ Liệu & Phân Tích</option>
                    <option value="Chứng chỉ Chuyên môn">Chứng chỉ Chuyên môn</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trình độ khóa học *</label>
                  <select
                    value={editForm.level}
                    onChange={(e) => setEditForm({ ...editForm, level: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                  >
                    <option value="Chuyên viên Mới (Fresher)">Chuyên viên Mới (Fresher)</option>
                    <option value="Chuyên viên Chính">Chuyên viên Chính</option>
                    <option value="Quản lý / Trưởng nhóm">Quản lý / Trưởng nhóm</option>
                    <option value="Tất cả cấp bậc">Tất cả cấp bậc</option>
                    <option value="Mới bắt đầu">Mới bắt đầu</option>
                    <option value="Nâng cao">Nâng cao</option>
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
                    <option value="online_external_lms">Online qua LMS chuyên biệt (Cấp tài khoản & kèm 1-1)</option>
                    <option value="offline">Trực tiếp tại Trung tâm (Tòa ROX Tower 54A Nguyễn Chí Thanh)</option>
                    <option value="hybrid">Hybrid (Học LMS + Workshop thực địa tại Ngân hàng)</option>
                  </select>
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
                  <label className="font-bold text-slate-700 block mb-1">Học phí ưu đãi (VND) *</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Học phí niêm yết gốc (Gạch chân) *</label>
                  <input
                    type="number"
                    value={editForm.originalPrice}
                    onChange={(e) => setEditForm({ ...editForm, originalPrice: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-600"
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
                    placeholder="VD: Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội & Hệ thống LMS"
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
                    placeholder="Mô tả mục tiêu khóa học, các giá trị thực chiến, đội ngũ MSB dẫn dắt..."
                  />
                </div>

                {/* Thumbnail Image URL */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Link Ảnh Bìa Khóa Học (Thumbnail URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editForm.thumbnail}
                      onChange={(e) => setEditForm({ ...editForm, thumbnail: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px]"
                    />
                    <img
                      src={editForm.thumbnail}
                      alt="Thumbnail preview"
                      className="w-12 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                    />
                  </div>
                </div>

                {/* Learning Objectives List */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Mục tiêu cốt lõi bạn sẽ đạt được ({editForm.objectives?.length || 0})</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentObjs = editForm.objectives || [];
                        setEditForm({ ...editForm, objectives: [...currentObjs, 'Mục tiêu thực chiến mới...'] });
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
                        className="w-full p-2 border border-slate-300 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editForm.objectives || []).filter((_, i) => i !== idx);
                          setEditForm({ ...editForm, objectives: updated });
                        }}
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
                    YouTube Video ID hoặc Link YouTube đầy đủ *
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
                          youtubeTrialUrl: `https://www.youtube.com/watch?v=${parsedId}`
                        });
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="VD: sal78ACtGTc hoặc https://www.youtube.com/watch?v=sal78ACtGTc"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // Quick reset to MSB demo video
                        setEditForm({
                          ...editForm,
                          youtubeVideoId: 'sal78ACtGTc',
                          youtubeTrialUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc'
                        });
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold shrink-0 cursor-pointer"
                      title="Sử dụng video MSB mẫu chuẩn"
                    >
                      Dùng Video Mẫu
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hệ thống tự động bóc tách ID (11 ký tự) kể cả khi bạn dán link URL đầy đủ.
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
          {/* SUB-TAB 3: ĐỘI NGŨ GIẢNG VIÊN THỰC CHIẾN */}
          {/* ======================================================== */}
          {activeSubTab === 'instructors' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Quản Lý Đội Ngũ Giảng Viên Phụ Trách ({editForm.instructors?.length || 1})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thêm và chỉnh sửa thông tin các Giám đốc Khối, Giám đốc Vùng giảng dạy khóa học này.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Add new instructor blank
                      const newInst: Instructor = {
                        id: `inst-${Date.now()}`,
                        name: 'Chuyên gia MSB mới',
                        title: 'Giám đốc Vùng / Trưởng phòng Nghiệp vụ',
                        credential: '15+ năm KN Ngân hàng',
                        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
                        bio: 'Chuyên gia có nhiều năm kinh nghiệm quản trị và đào tạo nghiệp vụ tín dụng thực chiến tại hệ thống ngân hàng.',
                        rating: 5.0,
                        studentsCount: 2000
                      };
                      const current = editForm.instructors || (editForm.instructor ? [editForm.instructor] : []);
                      setEditForm({ ...editForm, instructors: [...current, newInst] });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0073C1] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Giảng Viên</span>
                  </button>
                </div>
              </div>

              {/* Quick Pick from MSB standard instructors */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Chọn nhanh giảng viên tiêu biểu MSB để thêm vào khóa:
                </span>
                <div className="flex flex-wrap gap-2">
                  {REAL_INSTRUCTORS.map((realInst) => (
                    <button
                      key={realInst.id}
                      type="button"
                      onClick={() => {
                        const current = editForm.instructors || (editForm.instructor ? [editForm.instructor] : []);
                        if (!current.some((i) => i.id === realInst.id)) {
                          setEditForm({ ...editForm, instructors: [...current, realInst] });
                        }
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#0073C1] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <img src={realInst.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                      <span>{realInst.name} ({realInst.title.split(' ')[0]})</span>
                      <Plus className="w-3 h-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* List of instructors in this course */}
              <div className="space-y-5">
                {(editForm.instructors || (editForm.instructor ? [editForm.instructor] : [])).map((inst, idx) => (
                  <div
                    key={inst.id || idx}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-4 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#0073C1] text-white flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{inst.name}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const current = editForm.instructors || (editForm.instructor ? [editForm.instructor] : []);
                          if (current.length <= 1) {
                            alert('Khóa học cần có ít nhất 1 giảng viên chính.');
                            return;
                          }
                          const updated = current.filter((_, i) => i !== idx);
                          setEditForm({ ...editForm, instructors: updated, instructor: updated[0] });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Họ và tên giảng viên *</label>
                        <input
                          type="text"
                          value={inst.name}
                          onChange={(e) => {
                            const current = [...(editForm.instructors || [inst])];
                            current[idx] = { ...current[idx], name: e.target.value };
                            setEditForm({ ...editForm, instructors: current });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Chức danh / Vị trí *</label>
                        <input
                          type="text"
                          value={inst.title}
                          onChange={(e) => {
                            const current = [...(editForm.instructors || [inst])];
                            current[idx] = { ...current[idx], title: e.target.value };
                            setEditForm({ ...editForm, instructors: current });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Huy hiệu chứng chỉ / Thâm niên</label>
                        <input
                          type="text"
                          value={inst.credential || ''}
                          onChange={(e) => {
                            const current = [...(editForm.instructors || [inst])];
                            current[idx] = { ...current[idx], credential: e.target.value };
                            setEditForm({ ...editForm, instructors: current });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl"
                          placeholder="VD: 25+ năm KN Ngân hàng"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Link Ảnh Avatar</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={inst.avatar}
                            onChange={(e) => {
                              const current = [...(editForm.instructors || [inst])];
                              current[idx] = { ...current[idx], avatar: e.target.value };
                              setEditForm({ ...editForm, instructors: current });
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                          />
                          <img src={inst.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 block mb-1">Tiểu sử chuyên môn & kinh nghiệm (Bio) *</label>
                        <textarea
                          rows={3}
                          value={inst.bio}
                          onChange={(e) => {
                            const current = [...(editForm.instructors || [inst])];
                            current[idx] = { ...current[idx], bio: e.target.value };
                            setEditForm({ ...editForm, instructors: current });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl leading-relaxed text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 4: CÁC MODULE & LỘ TRÌNH ĐÀO TẠO */}
          {/* ======================================================== */}
          {activeSubTab === 'modules' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0073C1]" />
                    <span>Lộ Trình Các Module & Danh Sách Bài Học ({editForm.chapters?.length || 0} Module)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quản lý các học phần, bài giảng video, bài tập và gắn huy hiệu "Học thử miễn phí".
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentMods = editForm.chapters || [];
                    const newMod: Module = {
                      id: `mod-${Date.now()}`,
                      title: `Chương ${currentMods.length + 1}: Học phần chuyên sâu mới`,
                      order: currentMods.length + 1,
                      duration: '8 giờ học',
                      description: 'Nội dung thực hành và xử lý hồ sơ tín dụng nghiệp vụ.',
                      lessons: [
                        {
                          id: `les-${Date.now()}-1`,
                          title: 'Bài 1: Giới thiệu nghiệp vụ thực hành',
                          duration: '25 phút',
                          type: 'video',
                          isFreePreview: true
                        }
                      ]
                    };
                    setEditForm({ ...editForm, chapters: [...currentMods, newMod] });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0073C1] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Module Mới</span>
                </button>
              </div>

              {/* Modules Accordion List */}
              <div className="space-y-4">
                {(editForm.chapters || []).map((mod, modIdx) => (
                  <div
                    key={mod.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 shadow-2xs text-xs space-y-3 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-full bg-[#0073C1] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {modIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) => {
                            const updatedMods = [...(editForm.chapters || [])];
                            updatedMods[modIdx] = { ...updatedMods[modIdx], title: e.target.value };
                            setEditForm({ ...editForm, chapters: updatedMods });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                          placeholder="Tiêu đề Module..."
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="text"
                          value={mod.duration || ''}
                          onChange={(e) => {
                            const updatedMods = [...(editForm.chapters || [])];
                            updatedMods[modIdx] = { ...updatedMods[modIdx], duration: e.target.value };
                            setEditForm({ ...editForm, chapters: updatedMods });
                          }}
                          placeholder="VD: 3 giờ học"
                          className="w-24 p-1.5 border border-slate-300 rounded-lg text-slate-600 bg-white text-[11px]"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const updatedMods = (editForm.chapters || []).filter((_, i) => i !== modIdx);
                            setEditForm({ ...editForm, chapters: updatedMods });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                          title="Xóa module"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Module lessons list */}
                    <div className="space-y-2 pt-1 pl-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>Danh sách bài học trong module ({mod.lessons.length}):</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedMods = [...(editForm.chapters || [])];
                            const currentLessons = updatedMods[modIdx].lessons;
                            updatedMods[modIdx].lessons = [
                              ...currentLessons,
                              {
                                id: `les-${Date.now()}`,
                                title: `Bài ${modIdx + 1}.${currentLessons.length + 1}: Bài giảng nghiệp vụ mới`,
                                duration: '20 phút',
                                type: 'video',
                                isFreePreview: false
                              }
                            ];
                            setEditForm({ ...editForm, chapters: updatedMods });
                          }}
                          className="text-[#0073C1] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm bài học</span>
                        </button>
                      </div>

                      {mod.lessons.map((les, lesIdx) => (
                        <div
                          key={les.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <input
                              type="text"
                              value={les.title}
                              onChange={(e) => {
                                const updatedMods = [...(editForm.chapters || [])];
                                updatedMods[modIdx].lessons[lesIdx].title = e.target.value;
                                setEditForm({ ...editForm, chapters: updatedMods });
                              }}
                              className="w-full p-1 text-xs border border-transparent hover:border-slate-200 focus:border-blue-400 rounded"
                            />
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-[11px]">
                            <input
                              type="text"
                              value={les.duration}
                              onChange={(e) => {
                                const updatedMods = [...(editForm.chapters || [])];
                                updatedMods[modIdx].lessons[lesIdx].duration = e.target.value;
                                setEditForm({ ...editForm, chapters: updatedMods });
                              }}
                              className="w-20 p-1 border border-slate-200 rounded font-mono text-slate-500 text-center"
                            />

                            <label className="flex items-center gap-1 cursor-pointer font-bold text-emerald-700">
                              <input
                                type="checkbox"
                                checked={!!les.isFreePreview}
                                onChange={(e) => {
                                  const updatedMods = [...(editForm.chapters || [])];
                                  updatedMods[modIdx].lessons[lesIdx].isFreePreview = e.target.checked;
                                  setEditForm({ ...editForm, chapters: updatedMods });
                                }}
                                className="rounded text-emerald-600"
                              />
                              <span>Học thử</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                const updatedMods = [...(editForm.chapters || [])];
                                updatedMods[modIdx].lessons = updatedMods[modIdx].lessons.filter((_, i) => i !== lesIdx);
                                setEditForm({ ...editForm, chapters: updatedMods });
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 5: REVIEW & ĐÁNH GIÁ CỰU HỌC VIÊN */}
          {/* ======================================================== */}
          {activeSubTab === 'reviews' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span>Quản Lý Review & Đánh Giá Cựu Học Viên ({editForm.reviews?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Xuất hiện trực tiếp trong phần đánh giá trang chi tiết để tạo uy tín & tăng tỷ lệ chuyển đổi đăng ký.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentReviews = editForm.reviews || [];
                    const newRev: CourseReview = {
                      id: `rev-${Date.now()}`,
                      studentName: 'Học viên TWings mới',
                      role: 'Chuyên viên Tín dụng - MSB',
                      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
                      rating: 5,
                      date: new Date().toLocaleDateString('vi-VN'),
                      comment: 'Chương trình đào tạo rất thực tế, giúp em tự tin xử lý hồ sơ ngay trong tháng đầu làm việc tại ngân hàng.',
                      verifiedStudent: true
                    };
                    setEditForm({ ...editForm, reviews: [...currentReviews, newRev] });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Review Mới</span>
                </button>
              </div>

              {/* Reviews list */}
              <div className="space-y-4">
                {(editForm.reviews || []).map((rev, rIdx) => (
                  <div
                    key={rev.id || rIdx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rev.studentName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({rev.date})</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editForm.reviews || []).filter((_, i) => i !== rIdx);
                          setEditForm({ ...editForm, reviews: updated });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tên cựu học viên *</label>
                        <input
                          type="text"
                          value={rev.studentName}
                          onChange={(e) => {
                            const updated = [...(editForm.reviews || [])];
                            updated[rIdx].studentName = e.target.value;
                            setEditForm({ ...editForm, reviews: updated });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Vị trí & Nơi công tác hiện tại *</label>
                        <input
                          type="text"
                          value={rev.role}
                          onChange={(e) => {
                            const updated = [...(editForm.reviews || [])];
                            updated[rIdx].role = e.target.value;
                            setEditForm({ ...editForm, reviews: updated });
                          }}
                          placeholder="VD: Chuyên viên Tín dụng SME - MSB"
                          className="w-full p-2 border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Link Ảnh Avatar</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={rev.avatar}
                            onChange={(e) => {
                              const updated = [...(editForm.reviews || [])];
                              updated[rIdx].avatar = e.target.value;
                              setEditForm({ ...editForm, reviews: updated });
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                          />
                          <img src={rev.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Số sao đánh giá (1-5)</label>
                          <select
                            value={rev.rating || 5}
                            onChange={(e) => {
                              const updated = [...(editForm.reviews || [])];
                              updated[rIdx].rating = Number(e.target.value);
                              setEditForm({ ...editForm, reviews: updated });
                            }}
                            className="p-2 border border-slate-300 rounded-xl font-bold"
                          >
                            <option value={5}>⭐⭐⭐⭐⭐ 5 Sao (Tuyệt vời)</option>
                            <option value={4}>⭐⭐⭐⭐ 4 Sao (Rất tốt)</option>
                            <option value={3}>⭐⭐⭐ 3 Sao (Khá)</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-700 mt-4">
                          <input
                            type="checkbox"
                            checked={!!rev.verifiedStudent}
                            onChange={(e) => {
                              const updated = [...(editForm.reviews || [])];
                              updated[rIdx].verifiedStudent = e.target.checked;
                              setEditForm({ ...editForm, reviews: updated });
                            }}
                            className="rounded text-emerald-600"
                          />
                          <span>Học viên đã tốt nghiệp / Xác thực</span>
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 block mb-1">Nội dung review / chia sẻ trải nghiệm *</label>
                        <textarea
                          rows={2}
                          value={rev.comment}
                          onChange={(e) => {
                            const updated = [...(editForm.reviews || [])];
                            updated[rIdx].comment = e.target.value;
                            setEditForm({ ...editForm, reviews: updated });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-xl leading-relaxed text-xs italic"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                  <span>Cam Kết Đầu Ra, Quyền Lợi & Bảo Lãnh MSB</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các tiêu chuẩn độc quyền của TWings Academy giúp học viên yên tâm đăng ký.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {(editForm.guarantees || [
                  'Bảo lãnh cơ hội thực tập & tuyển dụng tại MSB',
                  'Chứng nhận hoàn thành có giá trị trong hồ sơ nhân sự',
                  'Cố vấn 1-1 cùng Giám đốc Khối ngân hàng',
                  'Cấp tài khoản cá nhân trên hệ thống LMS chuyên biệt'
                ]).map((g, gIdx) => (
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
                    setEditForm({ ...editForm, guarantees: [...current, 'Cam kết đầu ra mới...'] });
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
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0073C1] text-[10px] font-bold">
                {editForm.category}
              </span>
            </div>

            {/* Thumbnail */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden relative shadow-xs">
              <img
                src={editForm.thumbnail}
                alt={editForm.title}
                className="w-full h-full object-cover"
              />
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
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Học phí ưu đãi</div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {formatVND(editForm.price)}
                  </div>
                </div>

                {editForm.originalPrice > editForm.price && (
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
                  <span className="font-bold text-slate-800">{editForm.level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thời lượng:</span>
                  <span className="font-bold text-slate-800">{editForm.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Module bài học:</span>
                  <span className="font-bold text-slate-800">{editForm.chapters?.length || 0} học phần</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>YouTube ID:</span>
                  <span className="font-mono text-red-600 font-bold">{editForm.youtubeVideoId || 'Chưa có'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Giảng viên:</span>
                  <span className="font-bold text-[#0073C1]">{editForm.instructors?.[0]?.name || editForm.instructor?.name || 'Giảng viên MSB'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Đánh giá cựu học viên:</span>
                  <span className="font-bold text-amber-600">{editForm.reviews?.length || 0} phản hồi</span>
                </div>
              </div>
            </div>

            {/* Save CTA */}
            <button
              type="button"
              onClick={handleSaveAll}
              className="w-full py-2.5 px-4 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Toàn Bộ Thay Đổi Khóa Học</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
