import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminUser } from '../../types';
import { api, resetCsrfToken, SESSION_EXPIRED_EVENT } from '../../lib/api';
import { AuthLayout } from '../../admin/auth/AuthLayout';
import { LoginPage, toAdminUser } from '../../admin/auth/LoginPage';
import { ForgotPasswordPage } from '../../admin/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../admin/auth/ResetPasswordPage';
import { SessionLockscreen } from '../../admin/auth/SessionLockscreen';
import { ChangePasswordModal } from '../../admin/auth/ChangePasswordModal';
import { currentAppPath, currentAppSearch, navigate, useAppPath } from '../../admin/router';

export { ChangePasswordModal as ChangePasswordDialog };

interface StaffLoginGateProps {
  onBackToHome: () => void;
  onAuthenticated?: (user: AdminUser) => void;
  children: (user: AdminUser, logout: () => void) => React.ReactNode;
}

/** Reset link arrives as /app/#reset=<uid>.<token> or with search params. */
const readResetLink = (): { uid: string; token: string } | null => {
  const hashMatch = window.location.hash.match(/^#reset=([^.]+)\.(.+)$/);
  if (hashMatch) {
    return { uid: hashMatch[1], token: hashMatch[2] };
  }
  const search = new URLSearchParams(window.location.search);
  const uid = search.get('uid');
  const token = search.get('token');
  if (uid && token) {
    return { uid, token };
  }
  return null;
};

export const StaffLoginGate: React.FC<StaffLoginGateProps> = ({
  onBackToHome,
  onAuthenticated,
  children
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [lockedUser, setLockedUser] = useState<AdminUser | null>(null);
  const [resetToken, setResetToken] = useState<{ uid: string; token: string } | null>(readResetLink);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  const path = useAppPath();

  // Clear hash immediately so one-time reset tokens are not saved in browser history or referrer headers
  useEffect(() => {
    if (window.location.hash.startsWith('#reset=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Initial session check
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<any>('/auth/me/')
      .then((me) => {
        if (cancelled) return;
        // If arrived via reset link, show reset password even if an old session exists
        if (!resetToken) {
          const admin = toAdminUser(me);
          setUser(admin);
          onAuthenticated?.(admin);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle session expired event (401 from any API call while using the app)
  useEffect(() => {
    const onExpired = () => {
      resetCsrfToken();
      setUser((current) => {
        if (current) {
          // Keep current user info for lock screen modal rather than kicking to empty screen
          setLockedUser(current);
          setErrorNotice('Phiên làm việc đã hết hạn. Vui lòng mở khóa để tiếp tục.');
        }
        return null;
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/');
    } finally {
      resetCsrfToken();
      setUser(null);
      setLockedUser(null);
      navigate('/login');
    }
  }, []);

  const handleLoginSuccess = (authenticatedUser: AdminUser) => {
    setUser(authenticatedUser);
    setLockedUser(null);
    onAuthenticated?.(authenticatedUser);

    // Check redirect target
    const search = currentAppSearch();
    const redirectTarget = search.get('redirect');
    if (redirectTarget) {
      const decoded = decodeURIComponent(redirectTarget);
      // Ensure target is relative or starts with /app
      if (decoded.startsWith('/app/')) {
        navigate(decoded.slice(4)); // remove /app prefix for router
        return;
      }
      if (decoded.startsWith('/')) {
        navigate(decoded);
        return;
      }
    }
    navigate('/');
  };

  const handleUnlock = (authenticatedUser: AdminUser) => {
    setUser(authenticatedUser);
    setLockedUser(null);
    setErrorNotice('');
  };

  const handleSwitchAccount = () => {
    setLockedUser(null);
    setUser(null);
    navigate('/login');
  };

  // If user is authenticated, ensure they are not lingering on /login or /reset-password
  useEffect(() => {
    if (user && !lockedUser) {
      if (path === '/login' || path === '/forgot-password' || path === '/reset-password') {
        const search = currentAppSearch();
        const redirectTarget = search.get('redirect');
        if (redirectTarget) {
          const decoded = decodeURIComponent(redirectTarget);
          if (decoded.startsWith('/app/')) {
            navigate(decoded.slice(4));
            return;
          }
          if (decoded.startsWith('/')) {
            navigate(decoded);
            return;
          }
        }
        navigate('/');
      }
    }
  }, [user, lockedUser, path]);

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0073C1]" />
        <span className="text-xs font-semibold">Đang kiểm tra phiên làm việc…</span>
      </div>
    );
  }

  // Active Authenticated Session
  if (user && !lockedUser) {
    return <>{children(user, logout)}</>;
  }

  // Session Lockscreen Overlay if user was active when 401 occurred
  if (lockedUser) {
    return (
      <>
        {/* Render last workspace in background if possible */}
        <SessionLockscreen
          user={lockedUser}
          onUnlock={handleUnlock}
          onSwitchAccount={handleSwitchAccount}
        />
      </>
    );
  }

  // If not logged in and user accesses a protected path (e.g. /sales/crm),
  // update the address bar to show /app/login?redirect=...
  if (path !== '/login' && path !== '/forgot-password' && path !== '/reset-password' && !resetToken) {
    if (path !== '/') {
      const currentFull = window.location.pathname + window.location.search;
      const redirectQuery = `?redirect=${encodeURIComponent(currentFull)}`;
      window.history.replaceState(null, '', `/app/login${redirectQuery}`);
    }
  }

  // Unauthenticated Auth Flow Views
  return (
    <AuthLayout onBackToHome={onBackToHome}>
      {resetToken || path === '/reset-password' ? (
        <ResetPasswordPage
          initialUid={resetToken?.uid}
          initialToken={resetToken?.token}
          onResetSuccess={(msg) => {
            setResetToken(null);
            setNotice(msg);
            navigate('/login');
          }}
          onRequestNewLink={() => {
            setResetToken(null);
            navigate('/forgot-password');
          }}
        />
      ) : path === '/forgot-password' ? (
        <ForgotPasswordPage
          onNavigateToLogin={(msg) => {
            if (msg) setNotice(msg);
            navigate('/login');
          }}
        />
      ) : (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateToForgot={() => {
            setNotice('');
            setErrorNotice('');
            navigate('/forgot-password');
          }}
          notice={notice}
          errorNotice={errorNotice}
        />
      )}
    </AuthLayout>
  );
};
