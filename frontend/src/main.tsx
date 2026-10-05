import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';

// The staff app (/app) is a separate bundle: visitors of the public site never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const isAdmin = /^\/app(\/|$)/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  isAdmin ? (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải…</div>}>
      <AdminApp />
    </Suspense>
  ) : (
    <App />
  )
);
