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
import confetti from 'canvas-confetti';
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
  onCheckout?: (course: Course, prefill: { customerName?: string; customerEmail?: string; customerPhone?: string }) => void;
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

  // Embedded Registration Form State (PDF page 1)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [area, setArea] = useState('Hà Nội');
  const [cohortName, setCohortName] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [serverError, setServerError] = useState('');
  const [consultNote, setConsultNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const toggleModule = (id: string) => {
    setOpenModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ và tên';
    if (!email.trim() || !email.includes('@')) errs.email = 'Vui lòng nhập email hợp lệ';
    if (!phone.trim() || phone.length < 9) errs.phone = 'Vui lòng nhập số điện thoại chính xác';
    if (birthDate.trim() && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(birthDate.trim())) errs.birthDate = 'Ngày sinh theo dạng dd/mm/yyyy';
    if (!privacyConsent) errs.privacyConsent = 'Vui lòng đồng ý với chính sách xử lý dữ liệu cá nhân';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEmbeddedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validateForm()) return;

    let registrationCode = `REG-${Date.now().toString(36).toUpperCase()}`;
    if (isBackendEnabled()) {
      setIsSubmitting(true);
      try {
        const res = await api.post<{ registrationCode: string }>('/public/registrations/', {
          courseId: course.id,
          customerName: fullName.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          birthDate: birthDate.trim() || null,
          area,
          batchCohort: cohortName,
          consultNeed: consultNote,
          source: 'Form Chi Tiết Khóa Học',
          privacyConsent,
          attribution: getAttribution(),
          website: honeypot
        });
        registrationCode = res.registrationCode;
      } catch (err) {
        setServerError(err instanceof ApiError ? err.message : 'Không gửi được đăng ký, vui lòng thử lại.');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const newOrder: Order = {
      id: registrationCode,
      orderCode: registrationCode,
      courseId: course.id,
      courseTitle: course.title,
      amount: course.price,
      originalAmount: course.originalPrice,
      status: 'pending',
      paymentMethod: 'vietqr',
      createdAt: new Date().toISOString(),
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      crmStatus: '1. Mới'
    } as Order;
    setRegisteredSuccess(true);
    onQuickRegisterSuccess?.(newOrder);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* 1. Header Banner & Breadcrumbs */}
      <div className="bg-[#00255A] text-white pt-6 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
            <span className="text-blue-300">{course.category}</span>
            <span>/</span>
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
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{course.duration}</span>
              </span>
              <span>·</span>
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
                  <span className="font-bold">Trải Nghiệm Bài Giảng Mẫu (YouTube Embed)</span>
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

            {/* 3. Detailed Curriculum Syllabus */}
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
                          <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0073C1] font-bold text-xs flex items-center justify-center shrink-0">
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
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-[#0073C1] font-bold">
                            {inst.credential}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#0073C1] font-semibold">{inst.title}</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">{inst.bio}</p>
                      
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-mono">
                        {inst.yearsOfExperience ? <span>{inst.yearsOfExperience} năm kinh nghiệm</span> : null}
                        {inst.studentsCount ? <span>{inst.studentsCount.toLocaleString('vi-VN')}+ học viên đã theo học</span> : null}
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

            {/* 6. Notice regarding LMS delivery */}
            <div className="bg-purple-50 p-5 rounded-3xl border border-purple-200 text-xs text-purple-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Quy trình đào tạo & bàn giao tài khoản học tập:</span>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                Sau khi thanh toán (hoặc đóng kỳ trả góp đầu), hệ thống tự tạo tài khoản trên TWings LMS và gửi email hướng dẫn vào học. Với khóa học theo đợt, bạn được xếp vào lớp của đợt khai giảng đã chọn. Lịch học, học phí và chứng chỉ luôn xem được trong Tài khoản học viên.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN (4-5 COLS, STICKY): DIRECT "ĐĂNG KÝ TƯ VẤN KHÓA HỌC" FORM */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-6">
            <div className="bg-white rounded-3xl border-2 border-[#0073C1] shadow-xl overflow-hidden">
              {/* Form Header (Matching PDF Page 1) */}
              <div className="bg-gradient-to-r from-[#0056D2] to-[#0073C1] text-white p-5 space-y-1 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  TWINGS ACADEMY
                </span>
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  ĐĂNG KÝ TƯ VẤN KHÓA HỌC
                </h3>
                <p className="text-[11px] text-blue-100">
                  Nhận lộ trình thực chiến & ưu đãi học phí độc quyền
                </p>
              </div>

              {/* Form Body */}
              <div className="p-5 sm:p-6">
                {registeredSuccess ? (
                  <div className="text-center py-6 space-y-3 animate-fadeIn">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">
                      Đăng Ký Thành Công!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cảm ơn <strong>{fullName}</strong>. Ban tuyển sinh TWings Academy sẽ liên hệ qua SĐT <strong>{phone}</strong> trong giờ làm việc để tư vấn chi tiết khóa học.
                    </p>
                    <button
                      onClick={() => setRegisteredSuccess(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Đăng ký khóa khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEmbeddedSubmit} className="space-y-3.5 text-xs">
                    {/* Course Pricing preview */}
                    <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Học phí trọn gói</div>
                        <div className="text-lg font-black text-slate-900 font-mono">{formatVND(course.price)}</div>
                      </div>
                      {course.originalPrice > course.price && (
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 line-through font-mono block">
                            {formatVND(course.originalPrice)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                            Tiết kiệm {formatVND(course.originalPrice - course.price)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Họ và tên *</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên đầy đủ"
                        className={`w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs ${
                          formErrors.fullName ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {formErrors.fullName && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.fullName}</p>}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className={`w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs ${
                          formErrors.email ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {formErrors.email && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số điện thoại *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="VD: 0988112233"
                        className={`w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs font-mono ${
                          formErrors.phone ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {formErrors.phone && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.phone}</p>}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ngày sinh (không bắt buộc, dd/mm/yyyy)</label>
                      <input
                        type="text"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        placeholder="15/08/2004"
                        className={`w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-xs ${
                          formErrors.birthDate ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {formErrors.birthDate && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.birthDate}</p>}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Khu vực *</label>
                      <select
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold"
                      >
                        <option value="Hà Nội">Hà Nội (Trụ sở ROX Tower, 54A Nguyễn Chí Thanh)</option>
                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                        <option value="Online LMS">Online qua hệ thống LMS riêng</option>
                      </select>
                    </div>

                    {upcoming.length > 0 && (
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Đợt khai giảng mong muốn</label>
                        <select
                          value={cohortName}
                          onChange={(e) => setCohortName(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold"
                        >
                          <option value="">Chưa chọn – cần tư vấn</option>
                          {upcoming.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}{c.startDate ? ` – ${new Date(`${c.startDate}T00:00:00`).toLocaleDateString('vi-VN')}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Khóa học quan tâm *</label>
                      <input
                        type="text"
                        disabled
                        value={course.title}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nhu cầu / Nguyện vọng nghề nghiệp</label>
                      <textarea
                        rows={2}
                        value={consultNote}
                        onChange={(e) => setConsultNote(e.target.value)}
                        placeholder="VD: Muốn học buổi tối, cần tư vấn trả góp..."
                        className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-xs"
                      />
                    </div>

                    {/* Honeypot: hidden from people, filled in by bots */}
                    <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

                    <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} className="mt-0.5" />
                      <span>
                        Tôi đồng ý để TWings Academy xử lý dữ liệu cá nhân nhằm tư vấn và ghi danh theo{' '}
                        <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener" className="text-[#0073C1] underline">Chính sách bảo mật</a>.
                      </span>
                    </label>
                    {formErrors.privacyConsent && <p className="text-[10px] text-red-500 -mt-2">{formErrors.privacyConsent}</p>}
                    {serverError && <p className="text-[11px] text-red-600 font-semibold">{serverError}</p>}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 bg-[#EA580C] hover:bg-[#D94F04] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Đang gửi thông tin...' : 'Gửi thông tin đăng ký'}</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onCheckout
                            ? onCheckout(course, { customerName: fullName, customerEmail: email, customerPhone: phone })
                            : onEnrollCourse(course)
                        }
                        className="text-[11px] text-[#0073C1] font-bold hover:underline cursor-pointer"
                      >
                        Hoặc thanh toán ngay bằng VietQR →
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Upcoming intakes */}
            {upcoming.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0073C1]" /> Lịch khai giảng
                </div>
                {upcoming.map((c) => (
                  <div key={c.name} className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-slate-500">
                        {c.startDate ? new Date(`${c.startDate}T00:00:00`).toLocaleDateString('vi-VN') : 'Sắp công bố ngày'}
                        {c.location ? ` · ${c.location}` : ''}
                      </div>
                      {c.scheduleText && <div className="text-slate-500">{c.scheduleText}</div>}
                      {c.earlyBirdDeadline && c.price !== undefined && c.price < course.price && (
                        <div className="text-emerald-700 font-bold">
                          Ưu đãi đăng ký sớm {formatVND(c.price)} tới {new Date(`${c.earlyBirdDeadline}T00:00:00`).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 font-bold ${c.seatsLeft <= 5 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {c.status === 'opening' ? (c.seatsLeft > 0 ? `Còn ${c.seatsLeft} chỗ` : 'Hết chỗ') : 'Sắp mở'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* What the course itself guarantees (edited per course in /app) */}
            {(course.guarantees?.length ?? 0) > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3 text-xs text-slate-600">
                {course.guarantees!.map((g) => (
                  <div key={g} className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#0073C1] shrink-0" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
