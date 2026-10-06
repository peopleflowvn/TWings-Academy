import React, { useState } from 'react';
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
  GraduationCap, 
  Building2, 
  ShieldCheck, 
  QrCode,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Order } from '../types';
import { api, ApiError, isBackendEnabled } from '../lib/api';
import type { CheckoutPrefill } from './CourseraCheckoutModal';

interface RegistrationModalProps {
  course?: Course | null;
  allCourses: Course[];
  onClose: () => void;
  onSubmitSuccess: (newOrder: Order) => void;
  onOpenVietQR?: (course: Course, prefill?: CheckoutPrefill) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  course,
  allCourses,
  onClose,
  onSubmitSuccess,
  onOpenVietQR,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [area, setArea] = useState('Hà Nội');
  const [selectedCourseId, setSelectedCourseId] = useState(course?.id || allCourses[0]?.id || '');
  const [educationLevel, setEducationLevel] = useState('Đại học');
  const [major, setMajor] = useState('Tài chính - Ngân hàng');
  const [consultNote, setConsultNote] = useState('');
  const [preferredAction, setPreferredAction] = useState<'consult' | 'vietqr'>('consult');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const targetCourse = allCourses.find((c) => c.id === selectedCourseId) || course || allCourses[0];

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ và tên';
    if (!email.trim() || !email.includes('@')) errs.email = 'Vui lòng nhập email hợp lệ';
    if (!phone.trim() || phone.length < 9) errs.phone = 'Vui lòng nhập số điện thoại chính xác';
    if (birthDate.trim() && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(birthDate.trim())) errs.birthDate = 'Ngày sinh theo dạng dd/mm/yyyy';
    if (!area) errs.area = 'Vui lòng chọn khu vực';
    if (!privacyConsent) errs.privacyConsent = 'Vui lòng đồng ý với chính sách xử lý dữ liệu cá nhân';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    // "Giữ chỗ qua VietQR": the checkout modal creates the (single) order server-side.
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

    // Local copy for the in-browser CRM demo; in live mode the server record is authoritative.
    const newOrder: Order = {
      id: registrationCode,
      orderCode: registrationCode,
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
      amount: targetCourse.price,
      originalAmount: targetCourse.originalPrice,
      status: 'pending',
      paymentMethod: 'transfer',
      createdAt: new Date().toISOString(),
      registrationCode,
      customerName: fullName,
      birthDate,
      customerPhone: phone,
      customerEmail: email,
      area,
      educationLevel,
      major,
      source: 'Website Form Tư vấn',
      registeredAt: new Date().toLocaleString('vi-VN'),
      consultNeed: consultNote || 'Tư vấn lộ trình học và hỗ trợ kết nối việc làm',
      interestedCourse: targetCourse.title,
      studyArea: area,
      crmStatus: '1. Mới',
      enrolledCourseName: targetCourse.title,
      consultDetail: consultNote ? `Ghi chú học viên: ${consultNote}` : 'Đăng ký tư vấn từ form website.',
      tuitionFee: targetCourse.price,
      totalReceivable: targetCourse.price,
      paidAmountL1: 0,
      paymentStatusDetail: 'Chưa thanh toán'
    };

    onSubmitSuccess(newOrder);
    setSubmitted(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6">
        {/* Header */}
        <div className="bg-[#0073C1] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>TWINGS ACADEMY · ĐÀO TẠO THỰC CHIẾN</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              ĐĂNG KÝ TƯ VẤN KHÓA HỌC
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Gửi Đăng Ký Thành Công!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Cảm ơn <strong>{fullName}</strong>. Ban đào tạo & Cố vấn nghề nghiệp sẽ liên hệ với bạn qua SĐT <strong>{phone}</strong> trong vòng 15 phút.
              </p>
              {targetCourse.deliveryFormat === 'online_external_lms' && (
                <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 text-xs text-purple-900 text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Lưu ý về hình thức học Online:</span>
                  </div>
                  <p className="text-[11px] text-purple-700">
                    Khóa học này được tổ chức trên nền tảng LMS chuyên biệt. Ban đào tạo sẽ làm việc riêng với bạn để cấp tài khoản và hướng dẫn học 1-1.
                  </p>
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#0073C1] text-white text-xs font-bold rounded-xl hover:bg-[#005FA0] transition-colors cursor-pointer"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Course selection preview & notice */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Khóa học quan tâm
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-[#0073C1]"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} — {formatVND(c.price)} ({c.deliveryFormat === 'offline' ? 'Học trực tiếp' : c.deliveryFormat === 'hybrid' ? 'Học kết hợp' : 'Online LMS riêng'})
                    </option>
                  ))}
                </select>

                {/* Delivery Format Alert Banner */}
                {targetCourse.deliveryFormat === 'online_external_lms' ? (
                  <div className="p-2.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Khóa học Online:</strong> Vận hành trên nền tảng LMS chuyên biệt. Ban đào tạo sẽ làm việc riêng và cấp tài khoản LMS cho bạn sau khi xác nhận đăng ký.
                    </span>
                  </div>
                ) : targetCourse.deliveryFormat === 'offline' ? (
                  <div className="p-2.5 bg-orange-50 text-orange-900 border border-orange-200 rounded-xl text-[11px] flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Khóa học Trực tiếp:</strong> Đào tạo tại Tòa nhà ROX Tower (54A Nguyễn Chí Thanh, Hà Nội) & Hội trường Ngân hàng MSB.
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Input 1: Họ và tên * (Image 3) */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và tên *"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.fullName ? 'border-red-500' : 'border-slate-300 focus:border-[#0073C1]'
                    }`}
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                {errors.fullName && <div className="text-[11px] text-red-500">{errors.fullName}</div>}
              </div>

              {/* Input 2: Email * (Image 3) */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email *"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.email ? 'border-red-500' : 'border-slate-300 focus:border-[#0073C1]'
                    }`}
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                {errors.email && <div className="text-[11px] text-red-500">{errors.email}</div>}
              </div>

              {/* Input 3: Số điện thoại * (Image 3) */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Số điện thoại *"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.phone ? 'border-red-500' : 'border-slate-300 focus:border-[#0073C1]'
                    }`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                {errors.phone && <div className="text-[11px] text-red-500">{errors.phone}</div>}
              </div>

              {/* Input 4: Ngày sinh * (dd/mm/yyyy) (Image 3) */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="Ngày sinh – không bắt buộc (dd/mm/yyyy)"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                      errors.birthDate ? 'border-red-500' : 'border-slate-300 focus:border-[#0073C1]'
                    }`}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                {errors.birthDate && <div className="text-[11px] text-red-500">{errors.birthDate}</div>}
              </div>

              {/* Input 5: Khu vực * (Image 3 dropdown) */}
              <div className="space-y-1">
                <div className="relative">
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#0073C1] appearance-none"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                    <option value="Khu vực khác / Online">Khu vực khác / Online</option>
                  </select>
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Action preference selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Bạn muốn tiếp tục theo cách nào?
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label
                    onClick={() => setPreferredAction('consult')}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-1 cursor-pointer transition-colors ${
                      preferredAction === 'consult'
                        ? 'border-[#0073C1] bg-blue-50/70 text-[#0073C1] font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>💬 Nhận tư vấn 1-1</span>
                    <span className="text-[10px] font-normal text-slate-500">Cố vấn giải đáp lộ trình & chính sách</span>
                  </label>

                  <label
                    onClick={() => setPreferredAction('vietqr')}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-1 cursor-pointer transition-colors ${
                      preferredAction === 'vietqr'
                        ? 'border-[#0073C1] bg-blue-50/70 text-[#0073C1] font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>⚡ Giữ chỗ qua VietQR</span>
                    <span className="text-[10px] font-normal text-slate-500">Quét mã ngân hàng tự động</span>
                  </label>
                </div>
              </div>

              {/* Honeypot: hidden from people, filled in by bots */}
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

              <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Tôi đồng ý để TWings Academy xử lý dữ liệu cá nhân đã cung cấp nhằm tư vấn, xét tuyển và ghi danh
                  khóa học theo{' '}<a href="/chinh-sach-bao-mat" target="_blank" rel="noopener" className="text-[#0056D2] underline">Chính sách bảo mật</a>. Tôi có thể yêu cầu xem, sửa hoặc xóa dữ liệu bất kỳ lúc nào.
                </span>
              </label>
              {errors.privacyConsent && <p className="text-[11px] text-red-600">{errors.privacyConsent}</p>}
              {serverError && <p className="text-xs text-red-600 font-medium">{serverError}</p>}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="disabled:opacity-60 w-full py-3 px-4 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <Send className="w-4 h-4" />
                <span>
                  {preferredAction === 'vietqr' ? 'Xác Nhận & Mở Mã VietQR' : 'Gửi Yêu Cầu Tư Vấn Khóa Học'}
                </span>
              </button>

              <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cam kết bảo mật thông tin cá nhân theo quy chuẩn quốc tế</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
