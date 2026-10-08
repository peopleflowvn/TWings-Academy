import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  X
} from 'lucide-react';
import { api, ApiError, resetCsrfToken } from '../../lib/api';
import { evaluatePassword } from './passwordStrength';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const evaluation = useMemo(
    () => evaluatePassword(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Hai mật khẩu nhập lại không khớp.');
      return;
    }

    if (newPassword.length < 12) {
      setError('Mật khẩu mới phải có tối thiểu 12 ký tự.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password/change/', {
        currentPassword,
        newPassword
      });
      resetCsrfToken();
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không đổi được mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-[#38BDF8] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Đổi mật khẩu tài khoản</h2>
              <p className="text-[11px] text-slate-400">Cập nhật mật khẩu bảo vệ tài khoản nội bộ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 py-2 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">Đã đổi mật khẩu thành công!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Mật khẩu mới đã được áp dụng. Tất cả các phiên làm việc trên các thiết bị khác đã được tự động đăng xuất để bảo đảm an toàn.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Security Notice */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Khi đổi mật khẩu thành công, tài khoản này sẽ được duy trì trên trình duyệt hiện tại và tự động đăng xuất ở tất cả thiết bị khác.
              </span>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Password */}
            <div className="space-y-1">
              <label htmlFor="pw-current" className="block text-xs font-bold text-slate-300">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="pw-current"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#0073C1]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label htmlFor="pw-next" className="block text-xs font-bold text-slate-300">
                Mật khẩu mới (tối thiểu 12 ký tự)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="pw-next"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#0073C1]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Strength Meter Bar */}
            {newPassword && (
              <div className="space-y-1 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Độ an toàn:</span>
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
            <div className="space-y-1">
              <label htmlFor="pw-confirm" className="block text-xs font-bold text-slate-300">
                Nhập lại mật khẩu mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="pw-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#0073C1]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 gap-1 text-[10px]">
              {evaluation.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-1 ${
                    rule.valid ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {rule.valid ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-40" />}
                  <span className="truncate">{rule.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || evaluation.score < 2}
                className="px-5 py-2 bg-[#0073C1] hover:bg-[#005fa3] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Lưu mật khẩu</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
