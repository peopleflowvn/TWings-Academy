import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';

// The staff app (/app) and the program / learner-account pages are separate bundles: visitors of the
// homepage never download them.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const StorefrontApp = lazy(() => import('./storefront/StorefrontApp'));
const path = window.location.pathname;
const isAdmin = /^\/app(\/|$)/.test(path);
const isStorefront = /^\/(chuong-trinh|tai-khoan)(\/|$)/.test(path);

const loading = <div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải…</div>;

createRoot(document.getElementById('root')!).render(
  isAdmin ? (
    <Suspense fallback={loading}>
      <AdminApp />
    </Suspense>
  ) : isStorefront ? (
    <Suspense fallback={loading}>
      <StorefrontApp />
    </Suspense>
  ) : (
    <App />
  )
);
