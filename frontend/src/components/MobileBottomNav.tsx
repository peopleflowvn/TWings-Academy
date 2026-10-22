import React from 'react';
import { Home, GraduationCap, PhoneCall, Newspaper, BookOpen } from 'lucide-react';
import { routePath, View } from '../lib/routes';

interface MobileBottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onOpenConsultation: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenConsultation,
}) => {
  const navClick = (view: View) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (currentView === view && view === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onNavigate(view);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E1E6EA] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] print:hidden">
      <div className="grid grid-cols-5 items-center px-1 max-w-md mx-auto">
        {/* 1. Trang chu */}
        <a
          href={routePath('home')}
          onClick={navClick('home')}
          className={`flex flex-col items-center justify-center py-1 text-center transition-colors ${
            currentView === 'home' ? 'text-[#0073C1] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-4.5 h-4.5 ${currentView === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Trang chủ</span>
        </a>

        {/* 2. Khoa hoc */}
        <a
          href={routePath('catalog')}
          onClick={navClick('catalog')}
          className={`flex flex-col items-center justify-center py-1 text-center transition-colors ${
            currentView === 'catalog' ? 'text-[#0073C1] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className={`w-4.5 h-4.5 ${currentView === 'catalog' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Khóa học</span>
        </a>

        {/* 3. Center Highlight: Tu van */}
        <button
          onClick={onOpenConsultation}
          className="flex flex-col items-center justify-center -mt-3.5 group cursor-pointer"
          title="Đăng ký tư vấn miễn phí"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#263060] to-[#0073C1] text-white flex items-center justify-center shadow-lg shadow-[#0073C1]/30 group-active:scale-95 transition-transform">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-[10px] font-extrabold text-[#0073C1] mt-0.5 tracking-tight leading-none">
            Tư vấn
          </span>
        </button>

        {/* 4. Tin tuc */}
        <a
          href={routePath('articles')}
          onClick={navClick('articles')}
          className={`flex flex-col items-center justify-center py-1 text-center transition-colors ${
            currentView === 'articles' || currentView === 'article-detail' ? 'text-[#0073C1] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Newspaper className={`w-4.5 h-4.5 ${currentView === 'articles' || currentView === 'article-detail' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Tin tức</span>
        </a>

        {/* 5. Cong hoc vien LMS */}
        <a
          href="/learn/"
          className="flex flex-col items-center justify-center py-1 text-center text-slate-500 hover:text-[#0073C1] transition-colors"
        >
          <BookOpen className="w-4.5 h-4.5 text-[#0073C1] stroke-[1.8]" />
          <span className="text-[10px] mt-0.5 tracking-tight leading-none text-[#0073C1] font-semibold">LMS</span>
        </a>
      </div>
    </div>
  );
};
