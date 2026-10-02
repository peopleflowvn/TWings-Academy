import React, { useState } from 'react';
import { 
  CreditCard, 
  Send, 
  CheckCircle2, 
  Sparkles,
  Building2,
  Calendar,
  Phone,
  Mail,
  User,
  GraduationCap
} from 'lucide-react';
import { Course } from '../types';

interface BannerHeroProps {
  courses: Course[];
  onRegisterSubmit: (formData: any) => void;
}

export const BannerHero: React.FC<BannerHeroProps> = ({
  courses,
  onRegisterSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [region, setRegion] = useState('Hà Nội');
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.title || 'Quan hệ Khách hàng cá nhân');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;
    onRegisterSubmit({
      fullName,
      email,
      phone,
      birthDate,
      region,
      selectedCourse,
      submittedAt: new Date().toISOString()
    });
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <section className="relative overflow-hidden bg-[#0050D8] text-white py-12 lg:py-16">
      {/* Background radial soft lights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: White Floating Registration Card (Screenshot 1) */}
          <div className="lg:col-span-5">
            <div className="bg-white text-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 border border-blue-100 relative">
              {/* Graphic icon top left */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0050D8] flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-7 h-7 text-[#0050D8]" />
                </div>
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  ★ Tư Vấn 1:1 Miễn Phí
                </span>
              </div>

              <h2 className="text-lg font-black text-[#0050D8] uppercase tracking-tight text-center mb-4">
                ĐĂNG KÝ TƯ VẤN KHÓA HỌC
              </h2>

              {isSubmitted ? (
                <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-bold text-emerald-800">
                    Gửi Thông Tin Thành Công!
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Cố vấn học thuật Twings Academy sẽ liên hệ tới số điện thoại <strong>{phone}</strong> trong vòng 15 phút.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Họ và tên *"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0050D8] focus:ring-1 focus:ring-[#0050D8] transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0050D8] focus:ring-1 focus:ring-[#0050D8] transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="Số điện thoại *"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0050D8] focus:ring-1 focus:ring-[#0050D8] transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Ngày sinh * (dd/mm/yyyy)"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0050D8] focus:ring-1 focus:ring-[#0050D8] transition-all"
                    />
                  </div>

                  <div>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:border-[#0050D8] focus:ring-1 focus:ring-[#0050D8] bg-white transition-all"
                    >
                      <option value="Hà Nội">Khu vực: Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">Khu vực: TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Khu vực: Đà Nẵng</option>
                      <option value="Miền Bắc (Tỉnh thành khác)">Khu vực: Miền Bắc (Tỉnh khác)</option>
                      <option value="Miền Nam (Tỉnh thành khác)">Khu vực: Miền Nam (Tỉnh khác)</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-700 focus:outline-none focus:border-[#0050D8] focus:ring-1 focus:ring-[#0050D8] bg-white transition-all truncate"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.title}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Gửi thông tin đăng ký</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Hero Visual & Typography matching Screenshot 1 */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-end text-center lg:text-right space-y-4">
            {/* Visual Graphic Title */}
            <div className="space-y-1">
              <div className="text-xl sm:text-2xl font-black tracking-wider text-white drop-shadow-md">
                Cùng <span className="text-amber-300 font-extrabold">TWINGS ACADEMY</span>
              </div>
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-amber-400 drop-shadow-lg italic font-sans">
                Chắp cánh
              </div>
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-2xl">
                SỰ NGHIỆP
              </div>
              <div className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-widest text-white drop-shadow-2xl bg-gradient-to-b from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                NGÂN HÀNG
              </div>
            </div>

            {/* Visual Composition: 3 students & cards */}
            <div className="relative w-full max-w-lg mt-4 pt-6">
              {/* Floating Glowing Bank Credit Card */}
              <div className="absolute -top-4 left-6 z-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl p-3 shadow-2xl border border-white/30 text-left text-white transform -rotate-6 animate-pulse">
                <div className="flex items-center justify-between gap-4 text-[9px] font-mono mb-2">
                  <span>BANK DEBIT</span>
                  <CreditCard className="w-4 h-4 text-amber-300" />
                </div>
                <div className="text-[10px] font-mono tracking-widest">•••• •••• •••• 9988</div>
                <div className="text-[8px] text-cyan-200 mt-1 uppercase font-semibold">MSB PARTNER</div>
              </div>

              {/* 3 Cheerful Students Photo Representation */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 bg-gradient-to-t from-blue-900 to-transparent">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80"
                  alt="Học viên Twings Academy"
                  className="w-full h-64 sm:h-72 object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0050D8] via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-4 right-4 text-center">
                  <span className="text-xs font-bold text-amber-300 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                    Học Viện Tiên Phong Đào Tạo Nghiệp Vụ Thực Chiến
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
