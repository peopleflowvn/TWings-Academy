import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';
import { applySiteSeo } from './lib/siteSeo';
import { captureAttribution } from './lib/attribution';
import { PageLoader } from './components/PageLoader';

// The staff app (/app) and the program / learner-account pages are separate bundles: visitors of the
// homepage never download them.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const StorefrontApp = lazy(() => import('./storefront/StorefrontApp'));
const path = window.location.pathname;

// Quick redirect: send any root /login access to the staff portal at /app/login
if (path === '/login' || path === '/login/') {
  window.location.replace('/app/login' + window.location.search + window.location.hash);
}

const isAdmin = /^\/app(\/|$)/.test(path);
// The learner account & profile is unified at /learn/user/profile.php.
if (/^\/(learn\/)?tai-khoan(\/|$)/.test(path)) {
  window.location.replace('/learn/user/profile.php' + window.location.search + window.location.hash);
}

const isStorefront = /^\/(chuong-trinh|chinh-sach-bao-mat|dieu-khoan)(\/|$)/.test(path);

// Favicon and site identity from /app → Cài đặt SEO apply everywhere.
applySiteSeo();

// Capture attribution for public visitors submitting forms
if (!isAdmin) {
  captureAttribution(); // utm / ref / referrer of this visit, sent with a form the visitor submits
}

const adminLoading = (
  <PageLoader
    dark={true}
    message="Đang tải hệ thống Quản trị & Vận hành TWings..."
  />
);

const storefrontLoading = (
  <PageLoader
    dark={false}
    message="Đang tải nội dung TWings Academy..."
  />
);

createRoot(document.getElementById('root')!).render(
  isAdmin ? (
    <Suspense fallback={adminLoading}>
      <AdminApp />
    </Suspense>
  ) : isStorefront ? (
    <Suspense fallback={storefrontLoading}>
      <StorefrontApp />
    </Suspense>
  ) : (
    <App />
  )
);
