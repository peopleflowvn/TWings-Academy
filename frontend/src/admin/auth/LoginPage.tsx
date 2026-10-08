import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { api, ApiError, resetCsrfToken } from '../../lib/api';
import { AdminUser, UserRole } from '../../types';

interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone: string;
  status: 'active' | 'suspended';
  permissions: string[];
  lastLogin: string | null;
}

const initialsAvatar = (name: string) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .replace(/[^\p{L}\p{N}]/gu, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#0D2B5B"/><text x="50%" y="54%" font-family="sans-serif" font-size="26" fill="#fff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const toAdminUser = (me: MeResponse): AdminUser => ({
  id: me.id,
  name: me.name,
  email: me.email,
  role: me.role,
  avatar: me.avatar || initialsAvatar(me.name),
  phone: me.phone,
  status: me.status,
  lastActive: me.lastLogin || '',
  permissions: me.permissions
});

interface LoginPageProps {
  onLoginSuccess: (user: AdminUser) => void;
  onNavigateToForgot: () => void;
  initialEmail?: string;
  notice?: string;
  errorNotice?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToForgot,
  initialEmail = '',
  notice = '',
  errorNotice = ''
}) => {
  const [email, setEmail] = useState(() => {
    if (initialEmail) return initialEmail;
    try {
      return localStorage.getItem('twings_staff_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return !!localStorage.getItem('twings_staff_remembered_email');
    } catch {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(errorNotice);
  const [successNotice, setSuccessNotice] = useState(notice);

  useEffect(() => {
    if (errorNotice) setError(errorNotice);
  }, [errorNotice]);

  useEffect(() => {
    if (notice) setSuccessNotice(notice);
  }, [notice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');
    setSubmitting(true);

    try {
      const cleanEmail = email.trim();
      const me = await api.post<MeResponse>('/auth/login/', {
        email: cleanEmail,
        password
      });

      // Django rotates CSRF token on login
      resetCsrfToken();

      try {
        if (rememberEmail) {
          localStorage.setItem('twings_staff_remembered_email', cleanEmail);
        } else {
          localStorage.removeItem('twings_staff_remembered_email');
        }
      } catch {
        // ignore local storage restrictions
      }

      onLoginSuccess(toAdminUser(me));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không kết nối được máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
      {/* Title & Badge */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0073C1]/15 text-[#38BDF8] text-xs font-bold border border-[#0073C1]/30">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Cổng Nhân Sự & Giảng Viên</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Đăng nhập tài khoản</h2>
        <p className="text-xs text-slate-400">
          Nhập thông tin tài khoản được cấp bởi TWings để truy cập bảng điều khiển.
        </p>
      </div>

      {/* Success Notice */}
      {successNotice && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="font-medium">{successNotice}</div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="staff-email-input" className="block text-xs font-bold text-slate-300">
            Email công việc
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="staff-email-input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@twings.edu.vn"
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#0073C1]/20 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="staff-password-input" className="block text-xs font-bold text-slate-300">
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={onNavigateToForgot}
              className="text-xs font-semibold text-[#38BDF8] hover:text-white transition-colors cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="staff-password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#0073C1]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Email */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-[#0073C1] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-slate-300">Ghi nhớ email đăng nhập</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#0056D2] to-[#0073C1] hover:from-[#00419E] hover:to-[#005fb3] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang kiểm tra thông tin…</span>
            </>
          ) : (
            <>
              <span>Đăng nhập vào /app</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Hint */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          Tài khoản sẽ tự động tạm khóa 1 giờ sau 5 lần nhập sai liên tiếp để phòng ngừa rò rỉ dữ liệu.
        </span>
      </div>

      {/* Learner Link */}
      <div className="pt-2 border-t border-slate-800 text-center">
        <a
          href="/tai-khoan"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <GraduationCap className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Bạn là học viên tìm khóa học?</span>
          <span className="text-[#38BDF8] font-bold underline">Vào cổng Học viên</span>
        </a>
      </div>
    </div>
  );
};
