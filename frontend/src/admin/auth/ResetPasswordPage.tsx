import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  X
} from 'lucide-react';
import { api, ApiError, resetCsrfToken } from '../../lib/api';
import { evaluatePassword } from './passwordStrength';

interface ResetPasswordPageProps {
  initialUid?: string;
  initialToken?: string;
  onResetSuccess: (notice: string) => void;
  onRequestNewLink: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  initialUid = '',
  initialToken = '',
  onResetSuccess,
  onRequestNewLink
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const evaluation = useMemo(
    () => evaluatePassword(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  );

  const tokenAvailable = Boolean(initialUid && initialToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tokenAvailable) {
      setError('Liên kết đặt lại mật khẩu thiếu mã xác thực hợp lệ.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    if (newPassword.length < 12) {
      setError('Mật khẩu phải có tối thiểu 12 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ detail: string }>('/auth/password/reset/confirm/', {
        uid: initialUid,
        token: initialToken,
        newPassword
      });

      resetCsrfToken();
      onResetSuccess(res.detail || 'Đặt mật khẩu mới thành công. Hãy đăng nhập lại.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc đã được sử dụng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!tokenAvailable) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-300 text-xs font-bold border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Liên kết không hợp lệ</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Không tìm thấy mã xác thực</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Liên kết đặt lại mật khẩu có thể đã bị cắt bớt hoặc thiếu mã bảo mật. Vui lòng yêu cầu một liên kết mới từ trang quên mật khẩu.
          </p>
        </div>

        <button
          type="button"
          onClick={onRequestNewLink}
          className="w-full py-3.5 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <span>Yêu cầu liên kết mới</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
      {/* Title & Badge */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-bold border border-blue-500/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bảo vệ tài khoản</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Đặt mật khẩu mới</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Thiết lập mật khẩu mới an toàn cho tài khoản cán bộ của bạn.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <label htmlFor="reset-new-password" className="block text-xs font-bold text-slate-300">
            Mật khẩu mới (tối thiểu 12 ký tự)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="reset-new-password"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#0073C1]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Strength Meter Bar */}
        {newPassword && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Độ an toàn mật khẩu:</span>
              <span className={`font-bold ${evaluation.score >= 3 ? 'text-emerald-400' : evaluation.score === 2 ? 'text-amber-400' : 'text-red-400'}`}>
                {evaluation.label}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-full flex-1 rounded-full transition-colors ${
                    evaluation.score >= step ? evaluation.color : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="reset-confirm-password" className="block text-xs font-bold text-slate-300">
            Nhập lại mật khẩu mới
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="reset-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#0073C1]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Checklist rules */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Yêu cầu bảo mật:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {evaluation.rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-1.5 ${
                  rule.valid ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {rule.valid ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 shrink-0 opacity-40" />
                )}
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || evaluation.score < 2}
          className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#0056D2] to-[#0073C1] hover:from-[#00419E] hover:to-[#005fb3] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu mật khẩu…</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Lưu mật khẩu mới & Đăng nhập</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
