import React, { useState } from 'react';
import { 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  FileText, 
  Headphones, 
  HelpCircle, 
  Layers, 
  Star, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Course, Lesson } from '../types';

interface CourseDetailModalProps {
  course: Course;
  isEnrolled: boolean;
  onClose: () => void;
  onEnroll: (course: Course) => void;
  onStartLesson: (course: Course, lesson: Lesson) => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  isEnrolled,
  onClose,
  onEnroll,
  onStartLesson,
}) => {
  const chapters = course.chapters || course.syllabus || [];
  const instructor = course.instructor || course.instructors?.[0] || {
    id: 'inst-1',
    name: course.partner?.name || 'Giảng viên chuyên gia',
    title: 'Chuyên gia đào tạo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Chuyên gia nhiều năm kinh nghiệm đào tạo thực chiến và phát triển năng lực nghề nghiệp.',
    credential: course.partner?.name || 'Giảng viên chứng nhận quốc tế'
  };
  const highlights = course.highlights || course.skills || ['Chương trình học thực tế theo chuẩn quốc tế', 'Dự án thực hành chuyên sâu', 'Chứng chỉ uy tín'];
  const objectives = course.objectives || course.learningObjectives || ['Nắm vững kiến thức nền tảng và nâng cao', 'Ứng dụng thực tiễn ngay vào công việc'];
  const studentsCount = course.studentsCount ?? 12500;

  const [openChapterIds, setOpenChapterIds] = useState<string[]>(
    chapters.map((c) => c.id)
  );

  const toggleChapter = (id: string) => {
    setOpenChapterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const getLessonIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'video':
        return <Play className="w-3.5 h-3.5 text-blue-600" />;
      case 'audio_listening':
        return <Headphones className="w-3.5 h-3.5 text-amber-600" />;
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-purple-600" />;
      case 'pdf_material':
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case 'flashcard':
        return <Layers className="w-3.5 h-3.5 text-rose-600" />;
    }
  };

  const getLessonTypeText = (type: Lesson['type']) => {
    switch (type) {
      case 'video':
        return 'Video HD';
      case 'audio_listening':
        return 'Luyện Nghe';
      case 'quiz':
        return 'Trắc Nghiệm';
      case 'pdf_material':
        return 'Tài Liệu PDF';
      case 'flashcard':
        return 'Flashcard';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Course Visual banner */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-[#0050D8] to-[#00388A] text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3 text-xs text-amber-300 font-semibold tracking-wide">
              <span>{course.category}</span>
              <span>·</span>
              <span>Cấp bậc: {course.level}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              {course.title}
            </h2>

            <p className="text-slate-200 text-sm leading-relaxed">
              {course.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 border-t border-white/15">
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {course.rating.toFixed(2)} ({course.reviewsCount} đánh giá)
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-300" />
                {course.duration}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-300" />
                {course.lessonsCount ?? chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} bài học
              </span>
              <span>·</span>
              <span>{studentsCount.toLocaleString()} học viên đã đăng ký</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
          {/* Highlights & Objectives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#0F294D] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Điểm Nổi Bật Của Khóa Học
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#0F294D] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Chuẩn Đầu Ra Cam Kết
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Curriculum Syllabus (Moodle-like chapter hierarchy) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F294D]">
                Giáo Trình Đào Tạo Chuẩn Moodle LMS ({chapters.length} Chương)
              </h3>
              <span className="text-xs text-slate-500">
                Bao gồm Video HD, Listening Test, Quizzes & Flashcards
              </span>
            </div>

            <div className="space-y-3">
              {chapters.map((chapter) => {
                const isOpen = openChapterIds.includes(chapter.id);
                return (
                  <div
                    key={chapter.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                  >
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full px-5 py-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-sm text-[#0F294D] flex items-center gap-2">
                        <span>{chapter.title}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({chapter.lessons.length} bài học)
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="divide-y divide-slate-100 px-3">
                        {chapter.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="py-3 px-3 flex items-center justify-between hover:bg-slate-50 rounded-lg transition-colors gap-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                {getLessonIcon(lesson.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-900 truncate">
                                  {lesson.title}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>{getLessonTypeText(lesson.type)}</span>
                                  <span>·</span>
                                  <span>{lesson.duration}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {lesson.isFreePreview && (
                                <button
                                  onClick={() => onStartLesson(course, lesson)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                  Học Thử Miễn Phí
                                </button>
                              )}
                              {isEnrolled && (
                                <button
                                  onClick={() => onStartLesson(course, lesson)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                                >
                                  Học Bài Này
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructor Bio */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
            <h3 className="text-sm font-bold text-[#0F294D] uppercase tracking-wider">
              Giảng Viên Đồng Hành Cùng Bạn
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <img
                src={instructor.avatar}
                alt={instructor.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-900">
                  {instructor.name}
                </div>
                <div className="text-xs font-semibold text-amber-700">
                  {instructor.credential || instructor.title}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  {instructor.bio}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer Action Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Học phí trọn gói & Học liệu không giới hạn:</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#0F294D] font-mono tabular-nums">
                {formatVND(course.price)}
              </span>
              <span className="text-xs text-slate-400 line-through font-mono tabular-nums">
                {formatVND(course.originalPrice)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {isEnrolled ? (
              <button
                onClick={() => {
                  onClose();
                  if (chapters[0]?.lessons[0]) {
                    onStartLesson(course, chapters[0].lessons[0]);
                  }
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Vào Phòng Học LMS Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onEnroll(course)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Đăng Ký & Thanh Toán Tự Động VietQR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
