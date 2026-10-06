import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';
import { applySiteSeo } from './lib/siteSeo';
import { captureAttribution } from './lib/attribution';

// The staff app (/app) and the program / learner-account pages are separate bundles: visitors of the
// homepage never download them.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const StorefrontApp = lazy(() => import('./storefront/StorefrontApp'));
const path = window.location.pathname;
const isAdmin = /^\/app(\/|$)/.test(path);
const isStorefront = /^\/(chuong-trinh|tai-khoan|chinh-sach-bao-mat|dieu-khoan)(\/|$)/.test(path);

// Favicon, logo, default title/description from /app → Cài đặt SEO (not for the staff app).
if (!isAdmin) {
  applySiteSeo();
  captureAttribution(); // utm / ref / referrer of this visit, sent with a form the visitor submits
}

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
