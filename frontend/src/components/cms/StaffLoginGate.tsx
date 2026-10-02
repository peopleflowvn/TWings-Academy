import React, { useEffect, useState } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { AdminUser, UserRole } from '../../types';
import { api, ApiError, resetCsrfToken } from '../../lib/api';

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

/**
 * Requires a real staff session (HttpOnly cookie) before rendering the CMS.
 * The UI only mirrors permissions; every API call is authorised again on the server.
 */
export const StaffLoginGate: React.FC<StaffLoginGateProps> = ({ onBackToHome, onAuthenticated, children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) onAuthenticated?.(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    api
      .get<MeResponse>('/auth/me/')
      .then((me) => setUser(toAdminUser(me)))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const me = await api.post<MeResponse>('/auth/login/', { email: email.trim(), password });
      resetCsrfToken(); // Django rotates the CSRF token on login
      setPassword('');
      setUser(toAdminUser(me));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không kết nối được máy chủ.');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-3xl w-full max-w-sm p-7 space-y-4 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0073C1]/10 text-[#0073C1] flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-base">TWings CMS</h1>
            <p className="text-[11px] text-slate-500">Đăng nhập dành cho nhân sự nội bộ</p>
          </div>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email công việc"
          autoComplete="username"
          required
          className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0073C1]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          autoComplete="current-password"
          required
          className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#0073C1]"
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-[#0073C1] hover:bg-[#005fa3] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Đăng nhập
        </button>

        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          Tài khoản tạm khóa 1 giờ sau 5 lần nhập sai. Phiên làm việc hết hạn sau 8 giờ.
        </p>
        <button type="button" onClick={onBackToHome} className="text-xs text-slate-500 hover:underline cursor-pointer">
          ← Về trang chủ
        </button>
      </form>
    </div>
  );
};
