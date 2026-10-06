/**
 * Public pages outside the homepage app (separate bundle, loaded only on these paths):
 *   /chuong-trinh            programs (bundles of courses)
 *   /chuong-trinh/<slug>     one program + checkout (pay in full or in installments)
 *   /tai-khoan               learner account: orders, installments, courses, certificates
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Layers, Loader2, UserRound } from 'lucide-react';
import { isBackendEnabled } from '../lib/api';
import { commerceApi, formatVND, installmentPreview, Program } from '../lib/commerce';
import { CourseraCheckoutModal } from '../components/CourseraCheckoutModal';
import { AccountPage } from './AccountPage';
import { LegalPage } from './LegalPage';
import { FloatingContact } from '../components/FloatingContact';
import { applyPageMeta } from '../lib/siteSeo';
import { trackView } from '../lib/attribution';

const Shell: React.FC<{ active: 'programs' | 'account'; children: React.ReactNode }> = ({ active, children }) => {
  const link = (href: string, label: string, on: boolean) => (
    <a href={href} className={`px-3 py-2 rounded-xl text-sm font-bold ${on ? 'text-[#0056D2] bg-blue-50' : 'text-slate-600 hover:text-slate-900'}`}>
      {label}
    </a>
  );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5" title="Trang Chủ TWings Academy">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00388A] via-[#0050D8] to-[#0073C1] flex items-center justify-center text-white font-black text-sm">
              TW
            </div>
            <span className="hidden sm:inline text-lg font-black tracking-tight text-[#00388A] uppercase">
              TWings <span className="text-[#0073C1]">Academy</span>
            </span>
          </a>
          <nav className="flex items-center gap-1">
            {link('/khoa-hoc', 'Khóa học', active === 'programs')}
            <a href="/learn/" className="ml-1 px-3 py-2 rounded-xl text-sm font-bold bg-[#0056D2] text-white hover:bg-[#00419E]">
              Vào học
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
      <FloatingContact />
      <footer className="border-t border-slate-200 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap gap-4 justify-between">
          <span>© TWings Academy</span>
          <span className="flex gap-4">
            <a href="/khoa-hoc" className="hover:text-slate-800">Khóa học & chương trình</a>
            <a href="/tai-khoan" className="hover:text-slate-800">Tài khoản học viên</a>
            <a href="/dieu-khoan" className="hover:text-slate-800">Điều khoản</a>
            <a href="/chinh-sach-bao-mat" className="hover:text-slate-800">Chính sách bảo mật</a>
          </span>
        </div>
      </footer>
    </div>
  );
};

const Loading = () => (
  <div className="py-20 flex justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
);

const ProgramsList: React.FC = () => {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title = 'Chương trình đào tạo | TWings Academy';
    commerceApi.publicPrograms().then(setPrograms).catch((e: Error) => setError(e.message));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Chương trình đào tạo</h1>
        <p className="text-sm text-slate-600 mt-1">Lộ trình nhiều khóa học, học phí trọn gói tiết kiệm hơn, có thể trả góp.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!programs && !error && <Loading />}
      {programs?.length === 0 && <p className="text-sm text-slate-500">Chưa có chương trình nào được mở.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {programs?.map((p) => (
          <a key={p.id} href={`/chuong-trinh/${p.slug}`}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            {p.thumbnail ? (
              <img src={p.thumbnail} alt={p.title} className="h-40 w-full object-cover" />
            ) : (
              <div className="h-40 bg-gradient-to-tr from-[#00388A] to-[#0073C1] flex items-center justify-center">
                <Layers className="w-10 h-10 text-white/80" />
              </div>
            )}
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="text-[11px] font-bold text-[#0056D2] uppercase">Chương trình · {p.courses.length} khóa học</div>
              <h2 className="font-bold text-slate-900">{p.title}</h2>
              <p className="text-xs text-slate-600 line-clamp-2">{p.subtitle}</p>
              <div className="mt-auto pt-2 flex items-end justify-between">
                <div>
                  <div className="text-lg font-black text-slate-900">{formatVND(p.price)}</div>
                  {p.coursesTotalPrice > p.price && (
                    <div className="text-[11px] text-emerald-700 font-bold">Tiết kiệm {formatVND(p.coursesTotalPrice - p.price)}</div>
                  )}
                </div>
                {p.installmentCount > 1 && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    Trả góp {p.installmentCount} kỳ
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const ProgramDetail: React.FC<{ slug: string }> = ({ slug }) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    commerceApi
      .publicProgram(slug)
      .then((p) => {
        setProgram(p);
        document.title = `${p.title} | TWings Academy`;
      })
      .catch(() => setError('Không tìm thấy chương trình.'));
  }, [slug]);

  if (error) return <p className="text-sm text-slate-600">{error} <a href="/chuong-trinh" className="text-[#0056D2] font-bold">Xem các chương trình</a></p>;
  if (!program) return <Loading />;
  const firstInstallment = installmentPreview(program.price, program.installmentCount)[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <a href="/khoa-hoc" className="text-xs font-bold text-[#0056D2]">← Khóa học & chương trình</a>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{program.title}</h1>
        {program.subtitle && <p className="text-slate-600">{program.subtitle}</p>}
        {program.description && <p className="text-sm text-slate-700 whitespace-pre-line">{program.description}</p>}
        {program.highlights.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {program.highlights.map((h) => (
              <li key={h} className="bg-white border border-slate-200 rounded-xl p-3">✓ {h}</li>
            ))}
          </ul>
        )}
        <div className="space-y-3">
          <h2 className="font-bold text-slate-900">Các khóa học trong chương trình</h2>
          {program.courses.map((c, i) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 items-center">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0056D2] font-black flex items-center justify-center shrink-0">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-500">{[c.level, c.duration].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="text-xs text-slate-400 line-through shrink-0">{formatVND(c.price)}</div>
            </div>
          ))}
        </div>
      </div>
      <aside className="lg:sticky lg:top-24 h-fit bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="text-3xl font-black text-slate-900">{formatVND(program.price)}</div>
        {program.coursesTotalPrice > program.price && (
          <div className="text-sm">
            <span className="line-through text-slate-400">{formatVND(program.coursesTotalPrice)}</span>{' '}
            <span className="text-emerald-700 font-bold">tiết kiệm {formatVND(program.coursesTotalPrice - program.price)}</span>
          </div>
        )}
        {program.installmentCount > 1 && (
          <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Hoặc trả góp <strong>{program.installmentCount} kỳ</strong>, mỗi {program.installmentIntervalDays} ngày – kỳ đầu{' '}
            <strong>{formatVND(firstInstallment)}</strong> và vào học ngay.
          </div>
        )}
        <button type="button" onClick={() => setBuying(true)} disabled={!isBackendEnabled()}
          className="w-full py-3 rounded-xl bg-[#0056D2] hover:bg-[#00419E] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
          Đăng ký chương trình <ArrowRight className="w-4 h-4" />
        </button>
        <ul className="text-xs text-slate-600 space-y-1.5">
          <li className="flex gap-2"><BookOpen className="w-4 h-4 text-[#0056D2]" /> Mở tất cả {program.courses.length} khóa trên TWings LMS</li>
          <li className="flex gap-2"><UserRound className="w-4 h-4 text-[#0056D2]" /> Theo dõi học phí, tiến độ, chứng chỉ trong Tài khoản</li>
        </ul>
      </aside>
      {buying && (
        <CourseraCheckoutModal program={program} onClose={() => setBuying(false)} onPaymentSuccess={() => undefined} />
      )}
    </div>
  );
};

export default function StorefrontApp() {
  const path = window.location.pathname.replace(/\/+$/, '');
  // Canonical, description and share tags (bots get the same from the server).
  useEffect(() => {
    applyPageMeta(path || '/');
    trackView(path || '/');
  }, [path]);
  const programMatch = path.match(/^\/chuong-trinh\/([a-z0-9-]+)$/i);
  if (path === '/tai-khoan') {
    return <Shell active="account"><AccountPage /></Shell>;
  }
  if (path === '/chinh-sach-bao-mat' || path === '/dieu-khoan') {
    return <Shell active="account"><LegalPage kind={path === '/dieu-khoan' ? 'terms' : 'privacy'} /></Shell>;
  }
  return (
    <Shell active="programs">{programMatch ? <ProgramDetail slug={programMatch[1]} /> : <ProgramsList />}</Shell>
  );
}
