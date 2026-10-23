import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Cpu,
  Layers
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { ThreeCanvasLogin } from './ThreeCanvasLogin';

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
    <div className="min-h-screen bg-[#060B18] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-[#0073C1] selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows for whole page */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#0073C1]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#5FBEFF]/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Left Column: 3D Interactive Brand Showcase & Enterprise Features (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 min-h-screen bg-gradient-to-b from-[#071329]/90 via-[#0A1F3D]/80 to-[#040C1A]/95 p-10 xl:p-14 flex-col justify-between relative overflow-hidden border-r border-slate-800/80 shadow-2xl">
        {/* Three.js 3D Interactive Canvas in background */}
        <ThreeCanvasLogin />

        {/* Ambient lighting overlays */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0073C1]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-[#38BDF8]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <BrandLogo dark={true} size="lg" subtitle="Hệ thống Quản trị & Vận hành Nội bộ" />

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md px-3.5 py-2 rounded-xl transition-all border border-white/10 hover:border-sky-400/30 cursor-pointer shadow-sm group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Về trang chủ</span>
          </button>
        </div>

        {/* Center Content: Platform Highlights with Frosted Glass */}
        <div className="relative z-10 py-6 my-auto space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-600/20 border border-sky-400/30 text-sky-300 text-xs font-semibold backdrop-blur-md shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TWings Staff Portal 2.0</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/30 text-white font-bold ml-1">Live 3D</span>
            </div>

            <h1 className="text-2xl xl:text-3xl font-extrabold text-white leading-snug tracking-tight">
              Không gian quản trị tập trung cho{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5FBEFF] via-[#38BDF8] to-[#60A5FA]">
                Đào tạo & Tuyển sinh thực chiến
              </span>
            </h1>

            <p className="text-xs xl:text-sm text-slate-300 leading-relaxed max-w-md">
              Hệ thống tự động hóa đồng bộ CRM, lớp học LMS Moodle, dòng tiền học phí và dữ liệu sinh viên trong một nền tảng vận hành tập trung.
            </p>
          </div>

          {/* Frosted Feature Cards */}
          <div className="space-y-3 max-w-md">
            <div className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-sky-400/30 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-sky-500/10">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/30 to-sky-500/10 text-sky-400 shrink-0 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">Tuyển sinh & Quản lý Khách hàng (CRM)</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Chăm sóc lead, đặt lịch tư vấn, theo dõi tỉ lệ chuyển đổi và quản lý hồ sơ đăng ký khóa học.
                </div>
              </div>
            </div>

            <div className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-indigo-400/30 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-indigo-500/10">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10 text-indigo-300 shrink-0 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Đào tạo & Đồng bộ LMS Moodle</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Tự động cấp tài khoản học viên, mở bài giảng, ghi danh và cấp chứng chỉ số bảo mật.
                </div>
              </div>
            </div>

            <div className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-emerald-400/30 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-emerald-500/10">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 text-emerald-300 shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Tài chính & Thanh toán Tự động</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Đối soát giao dịch VietQR, quản lý trả góp học phí và xuất hóa đơn điện tử minh bạch.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">Xác thực HttpOnly Cookie & RBAC Staff</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
            TLS 1.3 / AES-256
          </span>
        </div>
      </div>

      {/* Right Column: Form Container with Enhanced Atmosphere */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#070D1D]/90 backdrop-blur-md overflow-y-auto relative z-10">
        {/* Ambient subtle spot for right side */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-slate-800/80">
          <BrandLogo dark={true} size="sm" />
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
        <div className="my-auto w-full max-w-md mx-auto relative z-10">
          {children}
        </div>

        {/* Footer */}
        <div className="pt-8 text-center text-xs text-slate-400 space-y-1 relative z-10">
          <div>© {new Date().getFullYear()} TWings Academy. Hệ thống dành riêng cho nhân sự được phân quyền.</div>
          <div className="text-[11px] text-slate-500">
            Cần cấp tài khoản hoặc hỗ trợ kỹ thuật? Liên hệ ban Quản trị Hệ thống TWings.
          </div>
        </div>
      </div>
    </div>
  );
};

