import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RotateCcw,
  Send
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface ForgotPasswordPageProps {
  onNavigateToLogin: (notice?: string) => void;
  defaultEmail?: string;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
  defaultEmail = ''
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post<{ detail: string }>('/auth/password/reset/', {
        email: email.trim()
      });
      setSentSuccess(true);
      setCountdown(60);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
      {/* Title & Badge */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Khôi phục tài khoản</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Quên mật khẩu?</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Nhập email công việc được cấp tại TWings. Hệ thống sẽ gửi một liên kết đặt lại mật khẩu an toàn đến hộp thư của bạn.
        </p>
      </div>

      {/* Success Notification */}
      {sentSuccess ? (
        <div className="space-y-5 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Đã gửi hướng dẫn khôi phục!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nếu địa chỉ <strong>{email}</strong> thuộc tài khoản nhân sự đang hoạt động, email chứa liên kết đặt lại mật khẩu đã được gửi đi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#38BDF8]" />
              <span>Hướng dẫn kiểm tra:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Liên kết có hiệu lực trong vòng <strong>1 giờ</strong> và chỉ sử dụng được <strong>1 lần</strong>.</li>
              <li>Vui lòng kiểm tra cả thư mục <strong>Spam / Thư rác</strong> nếu không thấy thư trong Hộp thư đến.</li>
              <li>Nếu bạn không yêu cầu, hãy yên tâm bỏ qua vì mật khẩu cũ vẫn được giữ nguyên.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={countdown > 0 || submitting}
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại email'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateToLogin('Vui lòng kiểm tra email để đặt lại mật khẩu.')}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#0073C1] hover:bg-[#005fa3] text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Về màn hình đăng nhập</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="forgot-email-input" className="block text-xs font-bold text-slate-300">
              Email công việc của bạn
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="forgot-email-input"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@twings.edu.vn"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#0073C1]/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#0056D2] to-[#0073C1] hover:from-[#00419E] hover:to-[#005fb3] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi liên kết…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi liên kết đặt lại mật khẩu</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onNavigateToLogin()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang đăng nhập</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
