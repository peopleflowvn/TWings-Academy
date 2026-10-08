import React, { useState } from 'react';
import { 
  Search, 
  Menu, 
  X, 
  BookOpen,
  Newspaper,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { useSiteLogo } from '../lib/siteSeo';
import { routePath } from '../lib/routes';

interface CourseraHeaderProps {
  currentView: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'about';
  onNavigate: (view: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'about') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  onOpenConsultation: () => void;
}

export const CourseraHeader: React.FC<CourseraHeaderProps> = ({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onOpenConsultation,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoUrl = useSiteLogo();
  // Real links (href = the page's URL: new tab, crawlers); a plain click is routed inside the SPA.
  const navClick = (view: Parameters<typeof onNavigate>[0], closeMenu = false) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (closeMenu) setMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left Section: Logo */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo Brand: TWINGS ACADEMY */}
          <a
            href={routePath('home')}
            onClick={navClick('home')}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left"
            title="Trang Chủ TWings Academy"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="TWings Academy" className="h-10 max-w-[200px] object-contain" />
            ) : (
            <>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00388A] via-[#0050D8] to-[#0073C1] flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
              TW
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base sm:text-lg font-black tracking-tight text-[#00388A] font-sans uppercase">
                  TWINGS
                </span>
                <span className="text-base sm:text-lg font-black tracking-tight text-[#0073C1] font-sans uppercase">
                  ACADEMY
                </span>
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 hidden sm:block">
                Học Viện Thực Chiến
              </div>
            </div>
            </>
            )}
          </a>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Bạn muốn học gì? (VD: QHKH Doanh nghiệp, AI, Python...)"
              className="w-full pl-4 pr-11 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-full focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 text-slate-800"
            />
            <button
              type="submit"
              className="absolute right-1.5 p-2 bg-[#0073C1] hover:bg-[#005FA0] text-white rounded-full transition-colors cursor-pointer"
              title="Tìm kiếm"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs font-semibold text-slate-700">
          <a
            href={routePath('catalog')}
            onClick={navClick('catalog')}
            className={`hidden lg:inline hover:text-[#0073C1] transition-colors cursor-pointer ${
              currentView === 'catalog' ? 'text-[#0073C1] font-bold' : ''
            }`}
          >
            Khóa học
          </a>

          <a
            href={routePath('about')}
            onClick={navClick('about')}
            className={`hidden lg:inline hover:text-[#0073C1] transition-colors cursor-pointer ${
              currentView === 'about' ? 'text-[#0073C1] font-bold' : ''
            }`}
          >
            Về chúng tôi
          </a>

          <a
            href={routePath('articles')}
            onClick={navClick('articles')}
            className={`hidden lg:flex items-center gap-1.5 hover:text-[#0073C1] transition-colors cursor-pointer ${
              currentView === 'articles' ? 'text-[#0073C1] font-bold' : ''
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Tin tức & Cẩm nang</span>
          </a>

          {/* Learners: one portal (Moodle courses + fees & documents at /learn/tai-khoan) */}
          <a
            href="/learn/"
            className="flex items-center gap-1.5 hover:text-[#0073C1] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Cổng học viên</span>
          </a>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Quick Consultation CTA */}
          <button
            onClick={onOpenConsultation}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 border border-[#0073C1] text-[#0073C1] hover:bg-blue-50/80 rounded-xl font-bold transition-colors cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Đăng ký tư vấn</span>
          </button>

          {/* Join for Free Button */}
          <a
            href={routePath('catalog')}
            onClick={navClick('catalog')}
            className="px-4 sm:px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            Xem khóa học
          </a>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 p-4 space-y-3 text-xs font-semibold">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onSearchSubmit();
            }}
            className="relative flex items-center mb-2"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Bạn muốn học gì?"
              className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-full text-xs"
            />
            <button type="submit" className="absolute right-2 text-[#0073C1]">
              <Search className="w-4 h-4" />
            </button>
          </form>

          <a
            href={routePath('home')}
            onClick={navClick('home', true)}
            className="block w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50"
          >
            Trang Chủ
          </a>
          <a
            href={routePath('catalog')}
            onClick={navClick('catalog', true)}
            className="block w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50 text-[#0073C1]"
          >
            Khóa Học & Chương Trình
          </a>
          <a
            href={routePath('about')}
            onClick={navClick('about', true)}
            className="block w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50"
          >
            Về Chúng Tôi
          </a>
          <a
            href={routePath('articles')}
            onClick={navClick('articles', true)}
            className="block w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50"
          >
            Tin Tức & Cẩm Nang Nghề Nghiệp
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenConsultation();
            }}
            className="block w-full text-left py-2 px-3 rounded-lg hover:bg-blue-50 text-[#0073C1] font-bold"
          >
            Đăng Ký Tư Vấn Khóa Học
          </button>
          <a href="/learn/" className="block w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50 text-blue-700 font-bold">
            Cổng Học Viên (LMS)
          </a>
        </div>
      )}
    </header>
  );
};
