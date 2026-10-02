import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  Download, 
  Printer, 
  Share2, 
  ExternalLink, 
  X, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Bookmark
} from 'lucide-react';
import { Course, Lesson } from '../types';

interface CourseraMyLearningPageProps {
  enrolledCourses: Course[];
  completedLessonIds: string[];
  onOpenClassroom: (course: Course) => void;
  onBrowseCourses: () => void;
}

export const CourseraMyLearningPage: React.FC<CourseraMyLearningPageProps> = ({
  enrolledCourses,
  completedLessonIds,
  onOpenClassroom,
  onBrowseCourses,
}) => {
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed' | 'saved'>('in_progress');
  const [viewingCertificateCourse, setViewingCertificateCourse] = useState<Course | null>(null);

  // Compute progress for each course
  const getCourseProgress = (course: Course) => {
    const chapters = course.chapters || course.syllabus || [];
    const allLessonIds = chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
    if (allLessonIds.length === 0) return 0;
    const completedCount = allLessonIds.filter((id) => completedLessonIds.includes(id)).length;
    return Math.round((completedCount / allLessonIds.length) * 100);
  };

  // Divide into in progress vs completed (or simulated completed if 100%)
  const inProgressCourses = enrolledCourses.filter((c) => getCourseProgress(c) < 100);
  const completedCourses = enrolledCourses.filter((c) => getCourseProgress(c) >= 100);

  // If user has no completed course yet, simulate eligibility for certificate on the first enrolled course for demo celebration!
  const certifiedCourses = completedCourses.length > 0 ? completedCourses : (enrolledCourses.length > 0 ? [enrolledCourses[0]] : []);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Top Banner */}
      <div className="bg-[#00255A] text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Bàn Học & Khóa Học Của Tôi
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">
                Theo dõi tiến độ học tập, tiếp tục bài học dang dở và xem chứng chỉ đã đạt được.
              </p>
            </div>

            <button
              onClick={onBrowseCourses}
              className="px-4 py-2 bg-white text-[#0056D2] font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              + Khám phá thêm khóa học
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10">
              <div className="text-[11px] text-blue-200">Đang học</div>
              <div className="text-xl font-black text-white font-mono">{enrolledCourses.length} khóa</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10">
              <div className="text-[11px] text-blue-200">Bài đã hoàn thành</div>
              <div className="text-xl font-black text-emerald-400 font-mono">{completedLessonIds.length} bài</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10">
              <div className="text-[11px] text-blue-200">Chứng chỉ đạt được</div>
              <div className="text-xl font-black text-amber-300 font-mono">{certifiedCourses.length} chứng chỉ</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10">
              <div className="text-[11px] text-blue-200">Chuỗi ngày học</div>
              <div className="text-xl font-black text-blue-200 font-mono">5 ngày liên tiếp 🔥</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-18 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 text-xs font-bold">
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'in_progress'
                ? 'border-[#0056D2] text-[#0056D2]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Đang học ({enrolledCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'border-[#0056D2] text-[#0056D2]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Chứng chỉ & Đã hoàn thành ({certifiedCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'border-[#0056D2] text-[#0056D2]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Khóa học đã lưu</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* TAB 1: In Progress */}
        {activeTab === 'in_progress' && (
          <div className="space-y-6">
            {enrolledCourses.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Bạn chưa đăng ký khóa học nào
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Khám phá các chứng chỉ nghề nghiệp hàng đầu từ Google, IBM, DeepLearning.AI và tham gia miễn phí ngay hôm nay.
                </p>
                <button
                  onClick={onBrowseCourses}
                  className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419E] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Khám phá khóa học ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => {
                  const progress = getCourseProgress(course);
                  const chapters = course.chapters || course.syllabus || [];
                  const firstLesson = chapters[0]?.lessons[0];

                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span className="text-[#0056D2]">{course.partner?.name}</span>
                          <span>{course.level}</span>
                        </div>

                        <div className="flex gap-4 items-start">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-20 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                              {course.title}
                            </h3>
                            <div className="text-[11px] text-slate-500 mt-1">
                              {chapters.length} chương · {chapters.reduce((a, b) => a + b.lessons.length, 0)} bài học
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">Tiến độ khóa học:</span>
                            <span className="font-bold text-[#0056D2] font-mono">{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button
                          onClick={() => setViewingCertificateCourse(course)}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Chứng chỉ</span>
                        </button>

                        <button
                          onClick={() => onOpenClassroom(course)}
                          className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419E] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Vào học tiếp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Completed & Certificates */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certifiedCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6"
                >
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                    <Award className="w-12 h-12 text-amber-600" />
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đã xác thực & Có hiệu lực
                    </span>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {course.title}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Cấp bởi <strong className="text-slate-800">{course.partner?.name}</strong> qua Coursera LMS
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <button
                        onClick={() => setViewingCertificateCourse(course)}
                        className="px-4 py-1.5 bg-[#0056D2] hover:bg-[#00419E] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Xem chứng chỉ</span>
                      </button>

                      <button
                        onClick={() => onOpenClassroom(course)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Ôn tập bài học
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Saved Courses */}
        {activeTab === 'saved' && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Danh sách khóa học đã lưu
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bạn có thể bấm biểu tượng lưu trên bất kỳ thẻ khóa học nào để xem lại và đăng ký sau.
            </p>
            <button
              onClick={onBrowseCourses}
              className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419E] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Khám phá danh mục
            </button>
          </div>
        )}
      </div>

      {/* Interactive Official Certificate Viewer Modal */}
      {viewingCertificateCourse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden relative space-y-6 p-6 sm:p-10 my-8">
            {/* Close button */}
            <button
              onClick={() => setViewingCertificateCourse(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Certificate Paper Border */}
            <div className="border-8 border-double border-[#00255A] p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-white via-slate-50/50 to-white text-center space-y-6 relative overflow-hidden shadow-inner">
              {/* Watermark logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                <span className="text-9xl font-black text-slate-900 font-serif">COURSERA</span>
              </div>

              {/* Certificate Top: Coursera Logo & Partner */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="text-2xl font-black tracking-tight text-[#0056D2] lowercase font-sans">
                  coursera
                </div>
                <div className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {viewingCertificateCourse.partner?.name || 'Authorized Partner'}
                </div>
              </div>

              {/* Certificate Headline */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  CHỨNG NHẬN CHÍNH THỨC
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
                  Chứng Chỉ Hoàn Thành Khóa Học
                </h2>
              </div>

              <div className="text-xs text-slate-500">Chứng nhận rằng:</div>

              {/* Learner Name */}
              <div className="text-2xl sm:text-3xl font-serif font-black text-[#00255A] tracking-wide border-b-2 border-slate-300 pb-2 max-w-md mx-auto">
                Học Viên Xuất Sắc Coursera
              </div>

              {/* Course Title */}
              <div className="space-y-1">
                <div className="text-xs text-slate-500">đã hoàn thành xuất sắc chương trình đào tạo trực tuyến:</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 max-w-lg mx-auto">
                  {viewingCertificateCourse.title}
                </div>
              </div>

              {/* Verification Stamp & Signatures */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-xs">
                <div className="space-y-1">
                  <div className="font-serif italic text-base text-slate-700">Andrew Ng / Jeff Maggioncalda</div>
                  <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-400 uppercase">
                    Giảng viên & Ban Giám đốc
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="w-14 h-14 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center shadow-xs">
                    <Award className="w-7 h-7 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">ID: COURSERA-VERIFIED-2026</span>
                </div>

                <div className="space-y-1 text-center sm:text-right">
                  <div className="text-xs font-mono font-bold text-slate-700">Ngày cấp: 01/10/2026</div>
                  <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-400 uppercase">
                    Xác thực tại coursera.org/verify
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Chứng chỉ có giá trị xác minh trên toàn cầu</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In chứng chỉ</span>
                </button>
                <button
                  onClick={() => alert('Đang tạo và tải xuống bản PDF độ nét cao...')}
                  className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
