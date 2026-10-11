import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Menu, 
  X, 
  BookOpen,
  Newspaper,
  PhoneCall,
  Sparkles,
  GraduationCap,
  Home,
  Phone,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { useSiteLogo, useSiteSeo, phoneDigits, zaloLink } from '../lib/siteSeo';
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const logoUrl = useSiteLogo();
  const seo = useSiteSeo();
  const phone = phoneDigits(seo?.hotline);
  const zalo = zaloLink(seo?.zalo || seo?.hotline);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Real links (href = the page's URL: new tab, crawlers); a plain click is routed inside the SPA.
  const navClick = (view: Parameters<typeof onNavigate>[0], closeMenu = false) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (closeMenu) setMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Logo */}
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <a
            href={routePath('home')}
            onClick={navClick('home')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer focus:outline-none group text-left shrink-0"
            title="Trang Chủ TWings Academy"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="TWings Academy" className="h-8 sm:h-10 max-w-[140px] sm:max-w-[200px] object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#00388A] via-[#0050D8] to-[#0073C1] flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  TW
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
                    <span className="text-sm sm:text-lg font-black tracking-tight text-[#00388A] font-sans uppercase">
                      TWINGS
                    </span>
                    <span className="text-sm sm:text-lg font-black tracking-tight text-[#0073C1] font-sans uppercase">
                      ACADEMY
                    </span>
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 hidden sm:block">
                    Học Viện Thực Chiến
                  </div>
                </div>
              </>
            )}
          </a>
        </div>

        {/* Center: Search Bar (Desktop / Tablet) */}
        <div className="flex-1 max-w-md hidden md:block">
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
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-700 shrink-0">
          {/* Quick Search toggle icon on mobile */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-[#0073C1] hover:bg-slate-100 transition-colors"
            aria-label="Tìm kiếm khóa học"
            title="Tìm kiếm"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

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

          {/* Learners Portal - Hidden on mobile to avoid overcrowding, available in drawer and bottom bar */}
          <a
            href="/learn/"
            className="hidden sm:flex items-center gap-1.5 hover:text-[#0073C1] transition-colors"
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

          {/* Join / Catalog CTA button */}
          <a
            href={routePath('catalog')}
            onClick={navClick('catalog')}
            className="hidden xs:inline-flex px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            Khóa học
          </a>

          {/* Mobile Menu Hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Inline Search Bar (Toggled by Search icon on mobile) */}
      {mobileSearchOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200 p-3 animate-fadeIn">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMobileSearchOpen(false);
              onSearchSubmit();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Bạn muốn học gì? (VD: QHKH Doanh nghiệp...)"
              className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0073C1] shadow-2xs text-slate-800"
            />
            <button
              type="submit"
              className="absolute right-1.5 p-1.5 bg-[#0073C1] text-white rounded-lg transition-colors"
              title="Tìm kiếm"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Native-style Slide-Over Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fadeIn">
          {/* Backdrop Blur */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 right-0 max-w-[320px] w-full bg-white shadow-2xl flex flex-col justify-between z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00388A] to-[#0073C1] text-white flex items-center justify-center font-black text-xs">
                    TW
                  </div>
                  <span className="font-black text-sm text-[#00388A]">TWINGS ACADEMY</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                  aria-label="Đóng menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Search */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    onSearchSubmit();
                  }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm kiếm khóa học..."
                    className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0073C1]"
                  />
                  <button type="submit" className="absolute right-2 text-[#0073C1]">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Nav Links */}
              <nav className="p-3 space-y-1 text-sm font-semibold text-slate-700">
                <a
                  href={routePath('home')}
                  onClick={navClick('home', true)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    currentView === 'home' ? 'bg-blue-50 text-[#0073C1] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-[#0073C1]" />
                    <span>Trang Chủ</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </a>

                <a
                  href={routePath('catalog')}
                  onClick={navClick('catalog', true)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    currentView === 'catalog' ? 'bg-blue-50 text-[#0073C1] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-[#0073C1]" />
                    <span>Khóa Học & Chương Trình</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </a>

                <a
                  href={routePath('about')}
                  onClick={navClick('about', true)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    currentView === 'about' ? 'bg-blue-50 text-[#0073C1] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-[#0073C1]" />
                    <span>Về TWings Academy</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </a>

                <a
                  href={routePath('articles')}
                  onClick={navClick('articles', true)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    currentView === 'articles' ? 'bg-blue-50 text-[#0073C1] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Newspaper className="w-4 h-4 text-[#0073C1]" />
                    <span>Tin Tức & Cẩm Nang</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </a>

                <a
                  href="/learn/"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-blue-700 font-bold"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Cổng Học Viên (LMS)</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    Truy cập
                  </span>
                </a>
              </nav>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenConsultation();
                }}
                className="w-full py-3 px-4 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Đăng Ký Tư Vấn Khóa Học</span>
              </button>

              {(phone || zalo) && (
                <div className="flex items-center gap-2 pt-1">
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Gọi Hotline</span>
                    </a>
                  )}
                  {zalo && (
                    <a
                      href={zalo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chat Zalo</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

