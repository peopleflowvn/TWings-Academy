import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { AdminUser, UserRole } from '../../types';
import { api, ApiError, resetCsrfToken, SESSION_EXPIRED_EVENT } from '../../lib/api';

/** Shape of GET /auth/me/ and POST /auth/login/ (camelCased by the API). */
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

/** Local SVG avatar: no staff names are sent to third-party avatar services. */
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

const toAdminUser = (me: MeResponse): AdminUser => ({
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

interface StaffLoginGateProps {
  onBackToHome: () => void;
  /** Called once a session is established (initial check or fresh login). */
  onAuthenticated?: (user: AdminUser) => void;
  children: (user: AdminUser, logout: () => void) => React.ReactNode;
}

type Mode = 'login' | 'forgot' | 'reset';

/** Reset links arrive as /app/#reset=<uid>.<token>; the fragment keeps the token out of server logs. */
const readResetLink = (): { uid: string; token: string } | null => {
  const m = window.location.hash.match(/^#reset=([^.]+)\.(.+)$/);
  return m ? { uid: m[1], token: m[2] } : null;
};

const errorText = (err: unknown) => (err instanceof ApiError ? err.message : 'Không kết nối được máy chủ.');

const inputClass =
  'w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-[#0073C1]/20';

/** Password input with a show/hide toggle. */
const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
}> = ({ id, label, value, onChange, autoComplete, minLength }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

/**
 * Requires a real staff session (HttpOnly cookie) before rendering the CMS.
 * The UI only mirrors permissions; every API call is authorised again on the server.
 */
export const StaffLoginGate: React.FC<StaffLoginGateProps> = ({ onBackToHome, onAuthenticated, children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [resetLink] = useState(readResetLink);
  const [mode, setMode] = useState<Mode>(resetLink ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) onAuthenticated?.(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Drop the one-time token from the address bar (and browser history) straight away.
    if (resetLink) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    api
      .get<MeResponse>('/auth/me/')
      .then((me) => {
        // Opening a reset link while signed in still shows the reset form.
        if (!resetLink) setUser(toAdminUser(me));
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any 401 while working means the 8-hour session ran out (or was ended by a password change).
  useEffect(() => {
    const onExpired = () => {
      resetCsrfToken();
      setUser((current) => {
        if (current) {
          setMode('login');
          setEmail(current.email);
          setError('');
          setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
        }
        return null;
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const run = async (action: () => Promise<void>) => {
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const me = await api.post<MeResponse>('/auth/login/', { email: email.trim(), password });
      resetCsrfToken(); // Django rotates the CSRF token on login
      setPassword('');
      setUser(toAdminUser(me));
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await api.post<{ detail: string }>('/auth/password/reset/', { email: email.trim() });
      setMode('login');
      setNotice(res.detail);
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Hai mật khẩu nhập lại không khớp.');
      return;
    }
    run(async () => {
      const res = await api.post<{ detail: string }>('/auth/password/reset/confirm/', {
        uid: resetLink?.uid,
        token: resetLink?.token,
        newPassword
      });
      resetCsrfToken();
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
      setNotice(res.detail);
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } finally {
      resetCsrfToken();
      setUser(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  if (user) return <>{children(user, logout)}</>;

  const titles: Record<Mode, [string, string]> = {
    login: ['TWings CMS', 'Đăng nhập dành cho nhân sự nội bộ'],
    forgot: ['Quên mật khẩu', 'Nhận liên kết đặt lại qua email công việc'],
    reset: ['Đặt mật khẩu mới', 'Tối thiểu 12 ký tự, không dùng mật khẩu phổ biến']
  };
  const onSubmit = mode === 'login' ? handleLogin : mode === 'forgot' ? handleForgot : handleReset;
  const submitLabel = mode === 'login' ? 'Đăng nhập' : mode === 'forgot' ? 'Gửi liên kết đặt lại' : 'Lưu mật khẩu mới';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-3xl w-full max-w-sm p-7 space-y-4 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0073C1]/10 text-[#0073C1] flex items-center justify-center">
            {mode === 'login' ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-base">{titles[mode][0]}</h1>
            <p className="text-[11px] text-slate-500">{titles[mode][1]}</p>
          </div>
        </div>

        {notice && (
          <p role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
            {notice}
          </p>
        )}

        {mode !== 'reset' && (
          <div>
            <label htmlFor="staff-email" className="block text-xs font-bold text-slate-700 mb-1">
              Email công việc
            </label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              className={inputClass}
            />
          </div>
        )}

        {mode === 'login' && (
          <PasswordField
            id="staff-password"
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        )}

        {mode === 'reset' && (
          <>
            <PasswordField
              id="staff-new-password"
              label="Mật khẩu mới"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={12}
            />
            <PasswordField
              id="staff-confirm-password"
              label="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={12}
            />
          </>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 font-medium">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-[#0073C1] hover:bg-[#005fa3] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>

        {mode === 'login' ? (
          <button
            type="button"
            onClick={() => switchMode('forgot')}
            className="text-xs text-[#0073C1] hover:underline cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="text-xs text-[#0073C1] hover:underline cursor-pointer"
          >
            ← Quay lại đăng nhập
          </button>
        )}

        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          Tài khoản tạm khóa 1 giờ sau 5 lần nhập sai. Phiên làm việc hết hạn sau 8 giờ.
        </p>
        <button type="button" onClick={onBackToHome} className="block text-xs text-slate-500 hover:underline cursor-pointer">
          ← Về trang chủ
        </button>
      </form>
    </div>
  );
};

/** Self-service password change for the signed-in staff member (other sessions are signed out). */
export const ChangePasswordDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('Hai mật khẩu nhập lại không khớp.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/password/change/', { currentPassword: current, newPassword: next });
      resetCsrfToken();
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
      >
        <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#0073C1]" /> Đổi mật khẩu
        </h2>
        {done ? (
          <p role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
            Đã đổi mật khẩu. Các phiên đăng nhập trên thiết bị khác đã bị đăng xuất.
          </p>
        ) : (
          <>
            <PasswordField
              id="pw-current"
              label="Mật khẩu hiện tại"
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
            />
            <PasswordField
              id="pw-new"
              label="Mật khẩu mới (tối thiểu 12 ký tự)"
              value={next}
              onChange={setNext}
              autoComplete="new-password"
              minLength={12}
            />
            <PasswordField
              id="pw-confirm"
              label="Nhập lại mật khẩu mới"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              minLength={12}
            />
            {error && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {error}
              </p>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {done ? 'Đóng' : 'Hủy'}
          </button>
          {!done && (
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#0073C1] hover:bg-[#005fa3] disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lưu mật khẩu
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
