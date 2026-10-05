/**
 * Minimal router for the staff app at /app (History API, no dependency).
 * Paths are relative to /app: navigate('/sales/crm') -> /app/sales/crm.
 */
import { useEffect, useState } from 'react';

export const APP_BASE = '/app';
const EVENT = 'twings:navigate';

export function currentAppPath(): string {
  const path = window.location.pathname.replace(/\/+$/, '');
  const rest = path.startsWith(APP_BASE) ? path.slice(APP_BASE.length) : '';
  return rest || '/';
}

export function navigate(to: string, { replace = false } = {}): void {
  const target = `${APP_BASE}${to === '/' ? '' : to}`;
  if (target === window.location.pathname) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', target);
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo({ top: 0 });
}

export function useAppPath(): string {
  const [path, setPath] = useState(currentAppPath);
  useEffect(() => {
    const sync = () => setPath(currentAppPath());
    window.addEventListener('popstate', sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return path;
}

/** Anchor that navigates inside the app (keeps ctrl/cmd-click = new tab). */
export function linkProps(to: string) {
  return {
    href: `${APP_BASE}${to === '/' ? '' : to}`,
    onClick: (e: { preventDefault: () => void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number }) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    }
  };
}
