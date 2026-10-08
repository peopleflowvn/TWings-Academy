import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { api, ApiError, resetCsrfToken } from '../../lib/api';
import { AdminUser } from '../../types';
import { toAdminUser } from './LoginPage';

interface SessionLockscreenProps {
  user: AdminUser;
  onUnlock: (user: AdminUser) => void;
  onSwitchAccount: () => void;
}

export const SessionLockscreen: React.FC<SessionLockscreenProps> = ({
  user,
  onUnlock,
  onSwitchAccount
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me = await api.post<any>('/auth/login/', {
        email: user.email,
        password
      });
      resetCsrfToken();
      onUnlock(toAdminUser(me));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Mật khẩu không chính xác hoặc không kết nối được máy chủ.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-7 sm:p-8 shadow-2xl text-slate-100 space-y-6">
        {/* Avatar & User info */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-2xl mx-auto border-2 border-[#0073C1] shadow-lg shadow-blue-500/20 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{user.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{user.email}</p>
          </div>
        </div>

        {/* Timeout Explanation */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Phiên làm việc đã tạm dừng sau thời gian chờ bảo mật. Nhập lại mật khẩu để tiếp tục mà không làm mất dữ liệu hiện tại.
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="lock-password" className="block text-xs font-bold text-slate-300">
              Mật khẩu xác nhận
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="lock-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0073C1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-blue-500/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang mở khóa…</span>
              </>
            ) : (
              <>
                <span>Mở khóa phiên làm việc</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onSwitchAccount}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng nhập bằng tài khoản khác</span>
          </button>
        </div>
      </div>
    </div>
  );
};
