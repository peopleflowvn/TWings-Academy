import React, { useState } from 'react';
import { 
  GraduationCap, 
  PlayCircle, 
  LayoutDashboard, 
  BookOpen,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'classroom' | 'cms';
  onNavigate: (view: 'home' | 'classroom' | 'cms') => void;
  onOpenRegisterForm: () => void;
  enrolledCoursesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenRegisterForm,
  enrolledCoursesCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    if (currentView !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0050D8] text-white shadow-md border-b border-blue-600/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Logo: TWINGS ACADEMY as shown in Screenshot 1 */}
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black tracking-wider text-white">
                TW
              </span>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-amber-300 absolute -top-3 left-1/2 -translate-x-1/2" />
                <span className="text-2xl font-black tracking-wider text-white">
                  I
                </span>
              </div>
              <span className="text-2xl font-black tracking-wider text-white">
                NGS
              </span>
            </div>
            <span className="text-[9px] tracking-[0.25em] text-blue-200 font-semibold uppercase -mt-1">
              ACADEMY
            </span>
          </div>
        </button>

        {/* Desktop Navigation links matching Screenshot 1 */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-white/95">
          <button
            onClick={() => handleLinkClick('#about-twings')}
            className="hover:text-amber-300 transition-colors cursor-pointer"
          >
            Về TWings
          </button>

          <button
            onClick={() => handleLinkClick('#courses-section')}
            className="hover:text-amber-300 transition-colors cursor-pointer"
          >
            Khóa học tại TWings
          </button>

          <button
            onClick={() => handleLinkClick('#why-twings')}
            className="hover:text-amber-300 transition-colors cursor-pointer"
          >
            Tại sao lựa chọn TWings
          </button>

          <button
            onClick={() => handleLinkClick('#instructors-section')}
            className="hover:text-amber-300 transition-colors cursor-pointer"
          >
            Đội ngũ giảng viên
          </button>

          <button
            onClick={() => onNavigate('classroom')}
            className={`flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer ${
              currentView === 'classroom' ? 'text-amber-300 font-bold underline' : ''
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
            LMS Moodle
          </button>

          <button
            onClick={() => onNavigate('cms')}
            className={`flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer ${
              currentView === 'cms' ? 'text-amber-300 font-bold underline' : ''
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            CMS Quản Trị
          </button>
        </nav>

        {/* Right CTA Button & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {currentView === 'classroom' ? (
            <button
              onClick={() => onNavigate('home')}
              className="px-4 py-2 bg-white text-[#0050D8] font-bold text-xs rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Về Trang Chủ</span>
            </button>
          ) : (
            <button
              onClick={onOpenRegisterForm}
              className="px-5 sm:px-6 py-2.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
            >
              ĐĂNG KÝ NGAY
            </button>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white hover:bg-blue-700/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Mở Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0042B3] border-t border-blue-600 px-4 py-4 space-y-3 text-sm font-semibold animate-fadeIn">
          <button
            onClick={() => handleLinkClick('#about-twings')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Về TWings
          </button>
          <button
            onClick={() => handleLinkClick('#courses-section')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Khóa học tại TWings
          </button>
          <button
            onClick={() => handleLinkClick('#why-twings')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tại sao lựa chọn TWings
          </button>
          <button
            onClick={() => handleLinkClick('#instructors-section')}
            className="w-full text-left py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Đội ngũ giảng viên
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('classroom');
            }}
            className="w-full text-left py-2 px-3 rounded-lg bg-blue-700/60 text-amber-300 flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4 text-amber-400" />
            LMS Moodle Phòng Học
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('cms');
            }}
            className="w-full text-left py-2 px-3 rounded-lg bg-blue-700/60 text-amber-300 flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4 text-amber-400" />
            CMS Quản Trị Hệ Thống
          </button>
        </div>
      )}
    </header>
  );
};
