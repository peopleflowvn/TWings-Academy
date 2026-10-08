import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  Receipt,
  ShieldCheck,
  Users
} from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBackToHome?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBackToHome }) => {
  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-[#0073C1] selection:text-white">
      {/* Left Column: Brand Showcase & Enterprise Features (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-gradient-to-br from-[#07152B] via-[#0D2B5B] to-[#0A3D78] p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-slate-800/80">
        {/* Subtle decorative glow circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0073C1]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all border border-white/10 mb-8 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ TWings</span>
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00388A] via-[#0050D8] to-[#0099FF] text-white flex items-center justify-center font-black text-base shadow-lg shadow-blue-500/20 border border-white/20">
              TW
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>TWINGS</span>
                <span className="text-[#38BDF8]">ACADEMY</span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200/80">
                Hệ thống Quản trị & Vận hành Nội bộ
              </div>
            </div>
          </div>
        </div>

        {/* Center Content: Platform Highlights */}
        <div className="relative z-10 py-10 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              TWings Staff Portal 2.0
            </div>
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight">
              Không gian quản trị tập trung cho Đào tạo & Tuyển sinh thực chiến
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              Đồng bộ dữ liệu CRM, lớp học LMS Moodle, dòng tiền học phí và hỗ trợ học viên mọi lúc mọi nơi trên một nền tảng thống nhất.
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-blue-500/20 text-[#38BDF8] shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tuyển sinh & Quản lý Khách hàng (CRM)</div>
                <div className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                  Chăm sóc lead, đặt lịch tư vấn, theo dõi tỉ lệ chuyển đổi và quản lý hồ sơ đăng ký.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Đào tạo & Đồng bộ LMS Moodle</div>
                <div className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                  Tự động cấp tài khoản, ghi danh học viên, cập nhật tiến độ và cấp chứng chỉ số.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tài chính & Thanh toán Tự động</div>
                <div className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                  Đối soát giao dịch VietQR, quản lý trả góp học phí và xuất hóa đơn minh bạch.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Xác thực HttpOnly Cookie & RBAC</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">TLS 1.3 Encrypted</span>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-slate-950 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00388A] to-[#0073C1] text-white flex items-center justify-center font-black text-xs">
              TW
            </div>
            <span className="font-extrabold text-sm text-white">TWINGS ACADEMY</span>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ</span>
          </button>
        </div>

        {/* Center Wrapper */}
        <div className="my-auto w-full max-w-md mx-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="pt-8 text-center text-xs text-slate-400 space-y-1">
          <div>© {new Date().getFullYear()} TWings Academy. Hệ thống dành cho nhân sự được cấp quyền.</div>
          <div className="text-[11px] text-slate-500">
            Cần cấp tài khoản hoặc hỗ trợ kỹ thuật? Liên hệ ban Quản trị Hệ thống.
          </div>
        </div>
      </div>
    </div>
  );
};
