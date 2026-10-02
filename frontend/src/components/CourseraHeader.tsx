import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  Menu, 
  X, 
  BookOpen, 
  LayoutDashboard,
  Newspaper,
  PhoneCall,
  Sparkles
} from 'lucide-react';

interface CourseraHeaderProps {
  currentView: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'cms';
  onNavigate: (view: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'cms') => void;
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
  const [exploreMenuOpen, setExploreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories = [
    'Ngân Hàng & Tín Dụng',
    'Trí tuệ nhân tạo (AI)',
    'Khoa học dữ liệu',
    'Khoa học máy tính',
    'Kinh doanh & Quản lý',
    'Quản lý dự án'
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left Section: Logo & Explore Dropdown */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo Brand: TWINGS ACADEMY */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left"
            title="Trang Chủ TWings Academy"
          >
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
          </button>

          {/* "Khám phá" Dropdown Button */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setExploreMenuOpen(!exploreMenuOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0073C1] bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <span>Khám phá</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exploreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {exploreMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-fadeIn">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                  Chủ đề hàng đầu
                </div>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setExploreMenuOpen(false);
                      onSearchChange(cat);
                      onNavigate('catalog');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:text-[#0073C1] hover:bg-blue-50/60 rounded-lg transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setExploreMenuOpen(false);
                      onNavigate('catalog');
                    }}
                    className="w-full text-center px-3 py-1.5 text-xs font-bold text-[#0073C1] hover:underline"
                  >
                    Xem tất cả khóa học →
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <button
            onClick={() => onNavigate('catalog')}
            className={`hidden lg:inline hover:text-[#0073C1] transition-colors cursor-pointer ${
              currentView === 'catalog' ? 'text-[#0073C1] font-bold' : ''
            }`}
          >
            Khóa học
          </button>

          <button
            onClick={() => onNavigate('articles')}
            className={`hidden lg:flex items-center gap-1.5 hover:text-[#0073C1] transition-colors cursor-pointer ${
              currentView === 'articles' ? 'text-[#0073C1] font-bold' : ''
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Tin tức & SEO</span>
          </button>

          <button
            onClick={() => onNavigate('cms')}
            className={`flex items-center gap-1.5 hover:text-[#0073C1] transition-colors cursor-pointer ${
              currentView === 'cms' ? 'text-[#0073C1] font-bold' : ''
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
            <span>CMS Quản trị & CRM</span>
          </button>

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
          <button
            onClick={() => onNavigate('catalog')}
            className="px-4 sm:px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            Xem khóa học
          </button>

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

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('home');
            }}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50"
          >
            Trang Chủ
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('catalog');
            }}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50 text-[#0073C1]"
          >
            Khám Phá Tất Cả Khóa Học
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('articles');
            }}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50"
          >
            Tin Tức & Cẩm Nang Nghề Nghiệp
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenConsultation();
            }}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-blue-50 text-[#0073C1] font-bold"
          >
            Đăng Ký Tư Vấn Khóa Học
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('cms');
            }}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-50 text-slate-800 font-bold"
          >
            Hệ Thống CMS Quản Trị & CRM
          </button>
        </div>
      )}
    </header>
  );
};
