import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Send, 
  Sparkles, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  ArrowRight,
  BookOpen,
  ChevronDown,
  GraduationCap,
  MessageSquare,
  Copy,
  CheckCheck,
  PhoneCall,
  MessageCircle,
  QrCode,
  Laptop
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Order } from '../types';
import { api, ApiError, isBackendEnabled } from '../lib/api';
import { getAttribution } from '../lib/attribution';
import { BrandLogo } from './BrandLogo';
import { useSiteSeo, phoneDigits, zaloLink } from '../lib/siteSeo';
import type { CheckoutPrefill } from './CourseraCheckoutModal';

interface RegistrationModalProps {
  course?: Course | null;
  allCourses: Course[];
  onClose: () => void;
  onSubmitSuccess: (newOrder: Order) => void;
  onOpenVietQR?: (course: Course, prefill?: CheckoutPrefill) => void;
}

const QUICK_TOPICS = [
  { id: 'schedule', label: 'Lịch khai giảng gần nhất' },
  { id: 'tuition', label: 'Học phí & trả góp 0%' },
  { id: 'career', label: 'Lộ trình việc làm tại MSB' },
  { id: 'scholarship', label: 'Ưu đãi & học bổng' },
  { id: 'trial', label: 'Học thử bài giảng online' }
];

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  course,
  allCourses,
  onClose,
  onSubmitSuccess,
  onOpenVietQR,
}) => {
  const seo = useSiteSeo();
  const hotlineText = seo?.hotline || '1900 633 898';
  const hotlineNum = phoneDigits(hotlineText) || '1900633898';
  const zaloUrl = zaloLink(seo?.zalo || seo?.hotline) || 'https://zalo.me/twingsacademy';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [area, setArea] = useState('Hà Nội');
  const [selectedCourseId, setSelectedCourseId] = useState(course?.id || allCourses[0]?.id || '');
  const [educationLevel, setEducationLevel] = useState('Đại học');
  const [major, setMajor] = useState('Tài chính - Ngân hàng');
  const [consultNote, setConsultNote] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [preferredAction, setPreferredAction] = useState<'consult' | 'vietqr'>('consult');
  const [submitted, setSubmitted] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showExtendedFields, setShowExtendedFields] = useState(false);

  const targetCourse = allCourses.find((c) => c.id === selectedCourseId) || course || allCourses[0];

  // Prevent background scroll and support ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const handleToggleTopic = (topicLabel: string) => {
    let updatedTopics: string[];
    if (selectedTopics.includes(topicLabel)) {
      updatedTopics = selectedTopics.filter((t) => t !== topicLabel);
    } else {
      updatedTopics = [...selectedTopics, topicLabel];
    }
    setSelectedTopics(updatedTopics);

    // Sync into note
    if (updatedTopics.length > 0) {
      setConsultNote((prev) => {
        const customPart = prev.replace(/^Quan tâm: [^.]+\.?\s*/i, '').trim();
        const topicPart = `Quan tâm: ${updatedTopics.join(', ')}.`;
        return customPart ? `${topicPart} ${customPart}` : topicPart;
      });
    } else {
      setConsultNote((prev) => prev.replace(/^Quan tâm: [^.]+\.?\s*/i, '').trim());
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim().replace(/[\s.-]/g, '');
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errs.fullName = 'Vui lòng nhập họ và tên';
    } else if (trimmedName.length < 2) {
      errs.fullName = 'Họ và tên tối thiểu 2 ký tự';
    }

    if (!trimmedPhone) {
      errs.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(trimmedPhone)) {
      errs.phone = 'Số điện thoại chưa đúng định dạng (VD: 0912 345 678)';
    }

    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập email liên hệ';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Địa chỉ email không hợp lệ (VD: name@gmail.com)';
    }

    if (birthDate.trim() && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(birthDate.trim())) {
      errs.birthDate = 'Ngày sinh theo định dạng ngày/tháng/năm (dd/mm/yyyy)';
    }

    if (!area) {
      errs.area = 'Vui lòng chọn khu vực học tập';
    }

    if (!privacyConsent) {
      errs.privacyConsent = 'Vui lòng đồng ý với chính sách xử lý dữ liệu cá nhân';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    // "Giữ chỗ qua VietQR": the checkout modal creates the order server-side
    if (preferredAction === 'vietqr' && onOpenVietQR) {
      onClose();
      onOpenVietQR(targetCourse, { customerName: fullName, customerEmail: email, customerPhone: phone });
      return;
    }

    let registrationCode = `REG-${Date.now().toString(36).toUpperCase()}`;
    if (isBackendEnabled()) {
      setSubmitting(true);
      try {
        const res = await api.post<{ registrationCode: string }>('/public/registrations/', {
          courseId: targetCourse.id,
          customerName: fullName.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          birthDate: birthDate.trim() || null,
          area,
          educationLevel,
          major,
          consultNeed: consultNote,
          source: 'Website Form Tư vấn',
          privacyConsent,
          attribution: getAttribution(),
          website: honeypot
        });
        registrationCode = res.registrationCode;
      } catch (err) {
        setServerError(err instanceof ApiError ? err.message : 'Không gửi được đăng ký, vui lòng thử lại.');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    const newOrder: Order = {
      id: registrationCode,
      orderCode: registrationCode,
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
      amount: targetCourse.price,
      status: 'pending',
      paymentMethod: 'transfer',
      createdAt: new Date().toISOString(),
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      consultNeed: consultNote,
      crmStatus: '1. Mới'
    };

    setSubmittedCode(registrationCode);
    onSubmitSuccess(newOrder);
    setSubmitted(true);
    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.55 }
    });
  };

  const handleCopyCode = () => {
    if (!submittedCode) return;
    navigator.clipboard.writeText(submittedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#182046]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-consult-title"
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#E1E6EA] overflow-hidden relative my-auto max-h-[92vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 1. Brand Identity Header - Unified with TWings Homepage Hero Standard */}
        <div className="relative bg-gradient-to-r from-[#182046] via-[#263060] to-[#0073C1] text-white p-5 sm:p-7 shrink-0 overflow-hidden border-b border-white/10">
          {/* Subtle Ambient Decorative Glows */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#5FBEFF]/20 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-[#0073C1]/25 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2">
              {/* Brand Top Bar with BrandLogo & Guideline Pill */}
              <div className="flex flex-wrap items-center gap-2.5">
                <BrandLogo dark size="sm" className="hidden sm:flex" />
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-black uppercase tracking-wider text-[#5FBEFF] shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>TWINGS ACADEMY · ĐÀO TẠO THỰC CHIẾN</span>
                </div>
              </div>

              {/* Title & Trust Subtitle */}
              <h2 id="modal-consult-title" className="text-xl sm:text-2xl lg:text-[26px] font-black tracking-tight text-white drop-shadow-xs">
                ĐĂNG KÝ TƯ VẤN KHÓA HỌC
              </h2>
              <p className="text-xs sm:text-[13px] text-[#D7F5FF] leading-relaxed max-w-xl">
                Cố vấn chuyên môn TWings & Ngân hàng MSB sẽ liên hệ trực tiếp, tư vấn định hướng lộ trình & chính sách học phí tối ưu trong vòng 15 phút.
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/15 hover:rotate-90 active:scale-95"
              aria-label="Đóng biểu mẫu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">
          {submitted ? (
            /* Success State View */
            <div className="text-center py-4 space-y-6 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-[#0073C1] text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-50">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-2.5 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D7F5FF] border border-[#94D9FF] text-[#0073C1] text-xs font-mono font-bold shadow-xs">
                  <span>Mã hồ sơ: {submittedCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="hover:text-[#263060] transition-colors p-0.5 rounded cursor-pointer"
                    title="Sao chép mã hồ sơ"
                  >
                    {copiedCode ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <h3 className="text-2xl font-black text-[#263060]">
                  Gửi Đăng Ký Thành Công!
                </h3>
                <p className="text-xs sm:text-sm text-[#424242] leading-relaxed">
                  Cảm ơn bạn <strong>{fullName}</strong> đã quan tâm tới chương trình đào tạo của TWings Academy. Chuyên viên cố vấn sẽ liên hệ qua SĐT <strong className="text-[#0073C1]">{phone}</strong> trong vòng 15 phút làm việc.
                </p>
              </div>

              {/* Registered Course Highlight Pill */}
              <div className="p-3.5 bg-slate-50 border border-[#E1E6EA] rounded-2xl max-w-lg mx-auto text-left flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-2 rounded-xl bg-[#0073C1] text-white shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Khóa học đăng ký</div>
                    <div className="text-xs sm:text-sm font-bold text-[#263060] truncate">{targetCourse.title}</div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-[#0073C1] shrink-0 font-mono">
                  {formatVND(targetCourse.price)}
                </div>
              </div>

              {/* 3-Step Next Timeline */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border border-[#E1E6EA] rounded-2xl p-4 sm:p-5 text-left space-y-3 max-w-lg mx-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-[#263060] flex items-center gap-1.5 pb-2 border-b border-[#E1E6EA]">
                  <Clock className="w-4 h-4 text-[#0073C1]" />
                  <span>Quy trình tiếp nhận & xếp lớp</span>
                </div>
                <div className="space-y-3 text-xs text-[#424242]">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0073C1] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Hệ thống ghi nhận hồ sơ và gửi email xác nhận tức thì tới <strong className="text-[#263060]">{email}</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0073C1] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Chuyên viên gọi điện trao đổi lộ trình thực chiến, lịch khai giảng và chính sách hỗ trợ trả góp 0%.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0073C1] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Bàn giao tài khoản cổng học viên TWings LMS và tài liệu thực hành chính thức.</span>
                  </div>
                </div>
              </div>

              {/* Fast Direct Contact Channels */}
              <div className="p-4 bg-[#D7F5FF]/40 border border-[#94D9FF] rounded-2xl max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[#263060]">Cần hỗ trợ gấp hoặc xếp lớp sớm?</div>
                  <div className="text-[11px] text-slate-600">Đội ngũ tuyển sinh trực tuyến 8h00 - 21h30 hằng ngày</div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <a
                    href={`tel:${hotlineNum}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#263060] hover:bg-[#1E2750] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
                    <span>{hotlineText}</span>
                  </a>
                  <a
                    href={zaloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0073C1] hover:bg-[#0E6BBB] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Zalo</span>
                  </a>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3 bg-[#263060] hover:bg-[#1E2750] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            /* Form Input View */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              
              {/* Highlight Card: Selected Course */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D7F5FF]/30 via-white to-slate-50/60 border border-[#E1E6EA] hover:border-[#94D9FF] transition-all space-y-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#0073C1] text-white shadow-xs">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#0073C1]">
                      Khóa học bạn đang quan tâm
                    </span>
                  </div>
                  
                  {allCourses.length > 1 && (
                    <div className="relative">
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="text-xs font-bold text-[#0073C1] bg-white border border-[#94D9FF] rounded-lg px-2.5 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D7F5FF] appearance-none transition-all shadow-2xs"
                        title="Đổi khóa học cần tư vấn"
                      >
                        {allCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#0073C1] absolute right-2 top-2.5 pointer-events-none" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="text-sm sm:text-base font-black text-[#263060] leading-snug">
                    {targetCourse.title}
                  </div>
                  <div className="text-sm sm:text-base font-black text-[#0073C1] shrink-0 font-mono">
                    {formatVND(targetCourse.price)}
                  </div>
                </div>

                {/* Delivery format tag & location */}
                {targetCourse.deliveryFormat === 'online_external_lms' ? (
                  <div className="p-2.5 bg-sky-50 text-[#0073C1] border border-sky-200 rounded-xl text-[11px] flex items-start gap-2">
                    <Laptop className="w-4 h-4 text-[#0073C1] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>Hình thức Online:</strong> Học qua nền tảng TWings LMS chuyên biệt. Ban đào tạo sẽ bàn giao tài khoản và cố vấn bài tập thực chiến 1-1.
                    </span>
                  </div>
                ) : targetCourse.deliveryFormat === 'offline' ? (
                  <div className="p-2.5 bg-orange-50 text-orange-950 border border-orange-200 rounded-xl text-[11px] flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>Đào tạo Trực tiếp:</strong> Tại Tòa nhà ROX Tower (54A Nguyễn Chí Thanh, Hà Nội) & Hội trường Ngân hàng MSB.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[11px] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0073C1] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>Chương trình chuẩn:</strong> Cam kết sát thực tế, hỗ trợ chứng nhận và giới thiệu cơ hội việc làm sau tốt nghiệp.
                    </span>
                  </div>
                )}
              </div>

              {/* Input Fields: 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Họ và tên * */}
                <div className="space-y-1">
                  <label htmlFor="reg-fullname" className="text-xs font-bold text-[#263060] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Họ và tên</span>
                      <span className="text-[#EA580C]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-fullname"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                      }}
                      placeholder="Nguyễn Văn A"
                      className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl bg-white text-[#424242] focus:outline-none focus:ring-4 focus:ring-[#D7F5FF] transition-all shadow-2xs ${
                        errors.fullName ? 'border-red-500 bg-red-50/30' : 'border-[#BBC1C4] focus:border-[#0073C1]'
                      }`}
                    />
                    <User className="w-4 h-4 text-[#0073C1] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {errors.fullName && <div className="text-[11px] text-red-500 font-medium">{errors.fullName}</div>}
                </div>

                {/* 2. Số điện thoại * */}
                <div className="space-y-1">
                  <label htmlFor="reg-phone" className="text-xs font-bold text-[#263060] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Số điện thoại</span>
                      <span className="text-[#EA580C]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="0912 345 678"
                      className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl bg-white text-[#424242] focus:outline-none focus:ring-4 focus:ring-[#D7F5FF] transition-all shadow-2xs ${
                        errors.phone ? 'border-red-500 bg-red-50/30' : 'border-[#BBC1C4] focus:border-[#0073C1]'
                      }`}
                    />
                    <Phone className="w-4 h-4 text-[#0073C1] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {errors.phone && <div className="text-[11px] text-red-500 font-medium">{errors.phone}</div>}
                </div>

                {/* 3. Email * */}
                <div className="space-y-1">
                  <label htmlFor="reg-email" className="text-xs font-bold text-[#263060] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Email liên hệ</span>
                      <span className="text-[#EA580C]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="name@example.com"
                      className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl bg-white text-[#424242] focus:outline-none focus:ring-4 focus:ring-[#D7F5FF] transition-all shadow-2xs ${
                        errors.email ? 'border-red-500 bg-red-50/30' : 'border-[#BBC1C4] focus:border-[#0073C1]'
                      }`}
                    />
                    <Mail className="w-4 h-4 text-[#0073C1] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {errors.email && <div className="text-[11px] text-red-500 font-medium">{errors.email}</div>}
                </div>

                {/* 4. Khu vực đào tạo * */}
                <div className="space-y-1">
                  <label htmlFor="reg-area" className="text-xs font-bold text-[#263060] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Khu vực của bạn</span>
                      <span className="text-[#EA580C]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      id="reg-area"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-[#BBC1C4] rounded-xl bg-white text-[#424242] focus:outline-none focus:border-[#0073C1] focus:ring-4 focus:ring-[#D7F5FF] appearance-none cursor-pointer transition-all shadow-2xs"
                    >
                      <option value="Hà Nội">Hà Nội (Hội sở ROX Tower & MSB)</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Toàn quốc / Online LMS">Toàn quốc / Học Online LMS</option>
                    </select>
                    <MapPin className="w-4 h-4 text-[#0073C1] absolute left-3 top-3 pointer-events-none" />
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Quick Consultation Chips: 1-Tap Mobile Optimization */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-[#263060] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#0073C1]" />
                  <span>Chủ đề bạn quan tâm nhất (chọn nhanh 1 chạm):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.label);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleToggleTopic(topic.label)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-[#0073C1] border-[#0073C1] text-white font-bold shadow-xs' 
                            : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700 font-medium'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{topic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Optional Guidance Information */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowExtendedFields(!showExtendedFields)}
                  className="text-xs font-bold text-[#0073C1] hover:text-[#2C93E8] flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{showExtendedFields ? 'Ẩn bớt thông tin bổ sung' : '+ Thêm thông tin học vấn & định hướng để nhận tư vấn chuyên sâu hơn'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExtendedFields ? 'rotate-180' : ''}`} />
                </button>

                {showExtendedFields && (
                  <div className="mt-3 p-4 bg-slate-50/80 border border-[#E1E6EA] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Năm sinh hoặc Ngày sinh</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          placeholder="dd/mm/yyyy hoặc năm sinh"
                          className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#D7F5FF]"
                        />
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                      </div>
                      {errors.birthDate && <div className="text-[10px] text-red-500">{errors.birthDate}</div>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Trình độ & Đối tượng</label>
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#D7F5FF]"
                      >
                        <option value="Đại học">Sinh viên Đại học / Cao đẳng</option>
                        <option value="Đã tốt nghiệp">Cử nhân vừa tốt nghiệp</option>
                        <option value="Đã đi làm trong ngành">Đang làm trong ngành Ngân hàng - Tài chính</option>
                        <option value="Chuyển ngành">Người chuyển ngành sang Tài chính</option>
                        <option value="Doanh nghiệp">Doanh nghiệp cử đi học</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Ghi chú hoặc câu hỏi cụ thể cho Cố vấn:</label>
                      <div className="relative">
                        <textarea
                          rows={2}
                          value={consultNote}
                          onChange={(e) => setConsultNote(e.target.value)}
                          placeholder="Ví dụ: Tôi muốn thi tuyển vị trí QHKH Doanh nghiệp MSB, cần hỗ trợ lộ trình ôn tập và chứng nhận sau khóa..."
                          className="w-full p-2.5 pl-8 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#D7F5FF] leading-relaxed"
                        />
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Preference Selector: 2 Contrast Paths */}
              <div className="pt-2 border-t border-[#E1E6EA] space-y-2">
                <label className="text-xs font-bold text-[#263060] block">
                  Bạn muốn tiếp tục theo cách nào?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div
                    onClick={() => setPreferredAction('consult')}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      preferredAction === 'consult'
                        ? 'border-[#0073C1] bg-[#D7F5FF]/40 text-[#263060] shadow-xs ring-2 ring-[#0073C1]/20'
                        : 'border-[#E1E6EA] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      preferredAction === 'consult' ? 'bg-[#0073C1] text-white' : 'border border-slate-300'
                    }`}>
                      {preferredAction === 'consult' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-bold text-[#263060] flex items-center gap-1.5">
                        <span>💬 Nhận tư vấn 1-1 chuyên sâu</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#0073C1]/10 text-[#0073C1] font-bold">Khuyên dùng</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Cố vấn TWings gọi điện trao đổi lộ trình & chính sách ưu đãi học phí (Miễn phí)
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setPreferredAction('vietqr')}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      preferredAction === 'vietqr'
                        ? 'border-[#0073C1] bg-[#D7F5FF]/40 text-[#263060] shadow-xs ring-2 ring-[#0073C1]/20'
                        : 'border-[#E1E6EA] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      preferredAction === 'vietqr' ? 'bg-[#0073C1] text-white' : 'border border-slate-300'
                    }`}>
                      {preferredAction === 'vietqr' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-bold text-[#263060] flex items-center gap-1.5">
                        <span>⚡ Giữ chỗ ngay qua VietQR</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold">Nhanh nhất</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Mở mã VietQR tự động để hoàn tất đăng ký và giữ suất học sớm
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Honeypot hidden input */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {/* Privacy Consent Checkbox */}
              <div className="space-y-1 pt-1">
                <label className="flex items-start gap-2.5 text-[11px] text-[#424242] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => {
                      setPrivacyConsent(e.target.checked);
                      if (errors.privacyConsent) setErrors((prev) => ({ ...prev, privacyConsent: '' }));
                    }}
                    className="mt-0.5 rounded text-[#0073C1] focus:ring-[#0073C1]"
                  />
                  <span className="leading-relaxed">
                    Tôi đồng ý để TWings Academy xử lý dữ liệu cá nhân đã cung cấp nhằm tư vấn, định hướng nghề nghiệp và ghi danh khóa học theo{' '}
                    <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener noreferrer" className="text-[#0073C1] font-bold underline hover:text-[#2C93E8]">
                      Chính sách bảo mật
                    </a> (tuân thủ Nghị định 13/2023/NĐ-CP). Tôi có thể yêu cầu tra cứu, chỉnh sửa hoặc hủy thông tin bất kỳ lúc nào.
                  </span>
                </label>
                {errors.privacyConsent && <p className="text-[11px] text-red-600 font-medium">{errors.privacyConsent}</p>}
                {serverError && <p className="text-xs text-red-600 font-semibold">{serverError}</p>}
              </div>

              {/* Submit CTA Button with Homepage Standard Warm Gradient */}
              <button
                type="submit"
                disabled={submitting}
                className="disabled:opacity-60 w-full py-3.5 px-6 bg-gradient-to-r from-[#FF6B35] via-[#EA580C] to-[#C23010] hover:from-[#EA580C] hover:to-[#C23010] text-white font-extrabold text-sm sm:text-base rounded-2xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi thông tin đăng ký...</span>
                  </span>
                ) : (
                  <>
                    {preferredAction === 'vietqr' ? <QrCode className="w-5 h-5" /> : <Send className="w-4 h-4" />}
                    <span>
                      {preferredAction === 'vietqr' ? 'Xác Nhận & Mở Mã VietQR Giữ Chỗ' : 'Gửi Yêu Cầu Tư Vấn Khóa Học (Miễn Phí)'}
                    </span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Trust Badges Strip */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
                <div className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Bảo mật thông tin</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0073C1] shrink-0" />
                  <span className="truncate">Phản hồi 15 phút</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Chuyên gia MSB</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
