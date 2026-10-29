import React, { useState } from 'react';
import { Avatar } from './Avatar';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  BookOpen, 
  Share2, 
  Award, 
  Send,
  Building2,
  Calendar,
  Phone,
  Mail,
  User,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { ShareButtons } from './ShareButtons';
import { CourseBuyBar, CourseBuyBox } from './CourseBuyBox';
import type { CheckoutPrefill } from './CourseraCheckoutModal';
import { chosenIntake } from '../lib/selling';
import { Course, Module, Lesson, Order, Instructor, CourseReview } from '../types';
import { api, ApiError, isBackendEnabled } from '../lib/api';
import { getAttribution } from '../lib/attribution';

interface CourseraCourseDetailPageProps {
  course: Course;
  isEnrolled: boolean;
  onBack: () => void;
  onEnrollCourse: (course: Course) => void;
  onStartLesson: (course: Course, lesson: Lesson) => void;
  onNavigateClassroom: (course: Course) => void;
  onQuickRegisterSuccess?: (newOrder: Order) => void;
  /** Pay now by VietQR (checkout modal), prefilled with what the visitor typed. */
  onCheckout?: (course: Course, prefill: CheckoutPrefill) => void;
}

export const CourseraCourseDetailPage: React.FC<CourseraCourseDetailPageProps> = ({
  course,
  isEnrolled,
  onBack,
  onEnrollCourse,
  onStartLesson,
  onNavigateClassroom,
  onQuickRegisterSuccess,
  onCheckout,
}) => {
  const chapters = course.chapters || course.syllabus || [];
  // Only real data: no placeholder instructor, sample reviews or generic objectives.
  const instructorList: Instructor[] = (course.instructors && course.instructors.length > 0)
    ? course.instructors
    : (course.instructor ? [course.instructor] : []);
  const reviewsList: CourseReview[] = course.reviews || [];
  const reviewAverage = reviewsList.length
    ? reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsList.length
    : 0;
  const objectives = (course.objectives?.length ? course.objectives : course.learningObjectives) || [];
  const upcoming = course.upcomingCohorts || [];
  const [openModuleIds, setOpenModuleIds] = useState<string[]>(
    chapters.map((m) => m.id)
  );

  const toggleModule = (id: string) => {
    setOpenModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* 1. Header Banner & Breadcrumbs */}
      <div className="bg-[#263060] text-white pt-6 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-blue-200">
            <button
              onClick={onBack}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Khóa học</span>
            </button>
            <span>/</span>
            {course.category && (
              <>
                <span className="text-blue-300">{course.category}</span>
                <span>/</span>
              </>
            )}
            <span className="text-white font-semibold truncate max-w-xs sm:max-w-md">{course.title}</span>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-xs font-black tracking-tight font-sans text-amber-300">
                {course.partner?.name || 'TWINGS ACADEMY'}
              </span>
              <span className="text-[10px] text-blue-200">· Đối tác đào tạo thực chiến</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight max-w-4xl">
              {course.title}
            </h1>

            <p className="text-xs sm:text-sm text-blue-100 max-w-3xl leading-relaxed">
              {course.subtitle}
            </p>

            <ShareButtons title={course.title} tone="dark" />

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200 pt-1">
              {reviewsList.length > 0 && (
                <>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{reviewAverage.toFixed(1)}</span>
                    <span className="text-blue-300 font-normal">({reviewsList.length} đánh giá)</span>
                  </span>
                  <span>·</span>
                </>
              )}
              {course.duration && (
                <>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </span>
                  <span>·</span>
                </>
              )}
              <span className="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-400/40 text-blue-200 font-medium">
                {course.level}
              </span>
              {course.deliveryFormat === 'online_external_lms' && (
                <span className="px-2.5 py-0.5 rounded bg-purple-900/80 border border-purple-400/40 text-purple-200 font-bold">
                  Online qua LMS chuyên biệt
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Body Layout (User: "trang con chi tiết khóa học cần chia thành 2 cột, cột bên phải hiện ra luôn chỗ ĐĂNG KÝ TƯ VẤN KHÓA HỌC hiện luôn ra ngoài luôn ghim bên phải chứ không cần chờ bấm nút đăng ký") */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN (8 COLS): Syllabus, Objectives, Instructor, Video Trial */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* YouTube Video Sample Trial Embed */}
            {course.youtubeVideoId && (
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md border border-slate-800">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-red-600 text-white">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <span className="font-bold">Xem thử bài giảng</span>
                </div>
                <span className="text-slate-400 text-[11px]">Học thử miễn phí</span>
              </div>
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${course.youtubeVideoId}?rel=0&modestbranding=1`}
                  title={course.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
            )}

            {/* 1. Giới thiệu tổng quan khóa học */}
            {(course.overview || course.description || course.subtitle) && (
              <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0073C1]" />
                  <span>Giới thiệu khóa học & Mục tiêu nghề nghiệp</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {course.overview || course.description || course.subtitle}
                </p>
                {course.locationText && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <MapPin className="w-4 h-4 text-[#0073C1] shrink-0" />
                    <span><strong>Địa điểm đào tạo:</strong> {course.locationText}</span>
                  </div>
                )}
              </section>
            )}

            {/* 2. What you'll learn */}
            {objectives.length > 0 && (
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Nội dung cốt lõi bạn sẽ đạt được</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* 3. Detailed Curriculum Syllabus (only when there is one) */}
            {chapters.length > 0 && (
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Lộ trình đào tạo ({chapters.length} Học phần · {totalLessons} bài học)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Học liệu chuẩn hóa gồm bài giảng video thực tế, tài liệu phân tích nghiệp vụ ngân hàng và bài kiểm tra trắc nghiệm.
                  </p>
                </div>
                <div className="text-xs text-slate-600 font-medium whitespace-nowrap">
                  Thời lượng: {course.duration}
                </div>
              </div>

              <div className="space-y-3">
                {chapters.map((mod, modIdx) => {
                  const isOpen = openModuleIds.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white"
                    >
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#D7F5FF] text-[#0073C1] font-bold text-xs flex items-center justify-center shrink-0">
                            {modIdx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                              {mod.title}
                            </h3>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{mod.lessons.length} bài học</span>
                              <span>·</span>
                              <span>{mod.duration || '2-3 giờ học'}</span>
                            </div>
                          </div>
                        </div>

                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="p-4 pt-1 bg-slate-50/60 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                          {mod.lessons.map((les) => (
                            <div
                              key={les.id}
                              className="py-2.5 flex items-center justify-between gap-2 hover:bg-white px-2 rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="text-slate-700 font-medium truncate">
                                  {les.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {les.duration}
                                </span>
                                {les.isFreePreview && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    Học thử
                                  </span>
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
            </section>
            )}

            {/* 4. Đội ngũ Giảng viên thực chiến (Multi-Instructor Team) */}
            {instructorList.length > 0 && (
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Đội ngũ Giảng viên & Chuyên gia Thực chiến ({instructorList.length})</span>
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                {instructorList.map((inst, idx) => (
                  <div
                    key={inst.id || idx}
                    className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all"
                  >
                    <Avatar
                      src={inst.avatar}
                      name={inst.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 shadow-xs shrink-0"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{inst.name}</h3>
                        {inst.credential && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D7F5FF] text-[#0073C1] font-bold">
                            {inst.credential}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#0073C1] font-semibold">{inst.title}</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">{inst.bio}</p>
                      
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-mono">
                        {inst.yearsOfExperience ? <span>{inst.yearsOfExperience} năm kinh nghiệm</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* 5. ⭐ ĐÁNH GIÁ & REVIEW TỪ CỰU HỌC VIÊN (only real reviews) */}
            {reviewsList.length > 0 && (
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-current" />
                    <span>Review & Đánh Giá Của Cựu Học Viên ({reviewsList.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Cảm nhận của học viên đã học khóa này</p>
                </div>

                {/* Rating score badge */}
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl shrink-0">
                  <div className="text-2xl font-black text-amber-600 font-mono">
                    {reviewAverage.toFixed(1)}
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                      {reviewsList.length} đánh giá
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-amber-400">
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{rev.date}</span>
                      </div>

                      <p className="text-xs text-slate-700 italic leading-relaxed">
                        "{rev.comment}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <Avatar
                        src={rev.avatar}
                        name={rev.studentName}
                        className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">{rev.studentName}</span>
                          {rev.verifiedStudent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5" title="Học viên đã hoàn thành khóa">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>Xác thực</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{rev.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            )}

            {/* 6. Fees & payment: what a buyer asks before paying */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0073C1]" />
                <span>Học phí & đăng ký</span>
              </h2>
              {[
                {
                  q: 'Thanh toán thế nào?',
                  a: `Chuyển khoản qua mã VietQR (mọi app ngân hàng). Hệ thống tự xác nhận khi tiền về và gửi biên nhận qua email.${
                    (course.installmentCount || 1) > 1 ? ` Có thể trả góp ${course.installmentCount} kỳ, đóng kỳ đầu là vào học.` : ''
                  }`
                },
                {
                  q: 'Sau khi đăng ký, chỗ học được giữ bao lâu?',
                  a: 'Chỗ học và học phí được giữ trong thời gian chờ chuyển khoản (ghi rõ trên màn hình thanh toán và trong email). Quá hạn chưa chuyển, đơn tự hủy để nhường chỗ.'
                },
                {
                  q: 'Sau khi thanh toán thì sao?',
                  a: 'Hệ thống tự tạo tài khoản trên TWings LMS và gửi email hướng dẫn vào học. Khóa học theo đợt: bạn được xếp vào lớp của đợt khai giảng đã chọn. Lịch học, học phí và chứng chỉ xem trong Tài khoản học viên.'
                },
                {
                  q: 'Công ty cần xuất hóa đơn?',
                  a: 'Chọn "Xuất hóa đơn VAT cho công ty" ở bước thanh toán và nhập thông tin công ty.'
                },
                {
                  q: 'Đổi đợt học hoặc hoàn học phí?',
                  a: 'Theo Điều khoản dịch vụ của TWings Academy; tư vấn viên hỗ trợ đổi đợt khi lớp còn chỗ.'
                }
              ].map((f) => (
                <details key={f.q} className="group border border-slate-200 rounded-2xl px-4 py-3 open:bg-slate-50/60">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-bold text-slate-900">
                    {f.q}
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {f.a}
                    {f.q.startsWith('Đổi') && (
                      <>
                        {' '}
                        <a href="/dieu-khoan" target="_blank" rel="noopener" className="text-[#0073C1] underline">Xem điều khoản</a>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </section>
          </div>

          {/* RIGHT COLUMN (sticky on desktop): price, intake, "Đăng ký học", consultation */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
            <CourseBuyBox
              key={course.id}
              course={course}
              onCheckout={(c, prefill) => (onCheckout ? onCheckout(c, prefill) : onEnrollCourse(c))}
              onConsultSent={onQuickRegisterSuccess}
            />
          </div>

        </div>
      </div>

      <CourseBuyBar course={course} onBuy={() => (onCheckout ? onCheckout(course, { intakeName: chosenIntake(course)?.name }) : onEnrollCourse(course))} />
    </div>
  );
};
