import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Play, 
  ExternalLink,
  Users,
  Briefcase,
  Award,
  PlayCircle,
  ShieldCheck,
  GraduationCap,
  Zap,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { HeroBannerItem } from '../types';
import { HERO_BANNERS } from '../data/courseraData';

interface CourseraHeroBannersProps {
  banners: HeroBannerItem[];
  onExploreAI: () => void;
  onBrowseCatalog: () => void;
  onOpenConsultation: (bannerTitle?: string) => void;
  onOpenYouTubeTrial: (videoId: string, title: string) => void;
  onScrollToShelf?: (shelfId: string) => void;
}

const QUICK_CATEGORIES = [
  { id: 'popular', label: 'Khóa học Bán chạy', shelfId: 'popular-shelf', icon: TrendingUp, badge: 'Hot' },
  { id: 'ai', label: 'Đột phá AI & Tech', shelfId: 'ai-shelf', icon: Zap, badge: '2026' },
  { id: 'certificates', label: 'Chứng chỉ Chuyên môn', shelfId: 'certificates-shelf', icon: ShieldCheck },
  { id: 'degrees', label: 'Bằng cấp Cử nhân & Thạc sĩ', shelfId: 'degrees-shelf', icon: GraduationCap },
];

const TRUST_STATS = [
  {
    icon: Users,
    number: '5.000+',
    label: 'Học viên đã tốt nghiệp',
    subtext: 'Gia nhập các Ngân hàng lớn',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    icon: Briefcase,
    number: '95%',
    label: 'Tỷ lệ có việc làm',
    subtext: 'Bảo lãnh & giới thiệu tại MSB',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
  },
  {
    icon: Award,
    number: '100%',
    label: 'Giảng viên Giám đốc Khối',
    subtext: '20+ năm nghiệp vụ thực chiến',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
  },
  {
    icon: PlayCircle,
    number: 'Miễn phí',
    label: 'Học thử Video YouTube',
    subtext: 'Kiểm tra chất lượng trước khi mua',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
  },
];

export const CourseraHeroBanners: React.FC<CourseraHeroBannersProps> = ({
  banners,
  onExploreAI,
  onBrowseCatalog,
  onOpenConsultation,
  onOpenYouTubeTrial,
  onScrollToShelf,
}) => {
  const displayBanners = banners && banners.length > 0 ? banners : HERO_BANNERS;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('popular');

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
      
      const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : clientWidth * 0.85;
      const idx = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.max(0, Math.min(idx, displayBanners.length - 1)));
    }
  }, [displayBanners.length]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  // Autoplay carousel every 6 seconds if not hovered
  useEffect(() => {
    if (isHovered || displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const nextIdx = (activeIndex + 1) % displayBanners.length;
        const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
        const cardWidth = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.85;
        scrollContainerRef.current.scrollTo({
          left: nextIdx * cardWidth,
          behavior: 'smooth'
        });
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeIndex, isHovered, displayBanners.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
      const scrollAmount = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.85;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBanner = (idx: number) => {
    if (scrollContainerRef.current) {
      const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.85;
      scrollContainerRef.current.scrollTo({
        left: idx * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleBannerAction = (banner: HeroBannerItem) => {
    if (banner.linkUrl) {
      if (banner.linkUrl.startsWith('http')) {
        window.open(banner.linkUrl, banner.targetBlank !== false ? '_blank' : '_self');
        return;
      }
      if (banner.linkUrl === '#dang-ky') {
        onOpenConsultation(banner.title);
        return;
      }
      if (banner.linkUrl === '#catalog' || banner.linkUrl === 'catalog') {
        onBrowseCatalog();
        return;
      }
      const el = document.querySelector(banner.linkUrl);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    switch (banner.buttonAction) {
      case 'explore_ai':
        onExploreAI();
        break;
      case 'browse_catalog':
        onBrowseCatalog();
        break;
      case 'consultation':
        onOpenConsultation(banner.title);
        break;
      case 'youtube_trial':
        onOpenYouTubeTrial('sal78ACtGTc', banner.title);
        break;
      case 'custom_link':
        if (banner.linkUrl) {
          window.open(banner.linkUrl, '_blank');
        } else {
          onBrowseCatalog();
        }
        break;
      default:
        onBrowseCatalog();
    }
  };

  const handleCategoryClick = (cat: typeof QUICK_CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    if (onScrollToShelf) {
      onScrollToShelf(cat.shelfId);
    } else {
      const el = document.getElementById(cat.shelfId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section 
      className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-4 sm:pt-8 pb-10 sm:pb-16 px-3 sm:px-6 lg:px-8 relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient decorative lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[250px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        {/* Top Header Badge & Navigation Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Chương trình Tuyển sinh & Khóa học 2026</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline-block">
              {String(activeIndex + 1).padStart(2, '0')} / {String(displayBanners.length).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`p-2 rounded-full border transition-all cursor-pointer backdrop-blur-md ${
                  canScrollLeft
                    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xs'
                    : 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed opacity-40'
                }`}
                title="Chương trình trước"
                aria-label="Chương trình trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`p-2 rounded-full border transition-all cursor-pointer backdrop-blur-md ${
                  canScrollRight
                    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xs'
                    : 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed opacity-40'
                }`}
                title="Chương trình tiếp theo"
                aria-label="Chương trình tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Horizontal Track of Banners */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0"
        >
          {displayBanners.map((banner, index) => {
            // Mode 1: Full-Image Banner
            if (banner.displayType === 'image_only' && banner.fullBannerImageUrl) {
              return (
                <div
                  key={banner.id || index}
                  onClick={() => handleBannerAction(banner)}
                  className="min-w-[88vw] sm:min-w-[620px] lg:min-w-[700px] snap-start rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 relative group cursor-pointer border border-white/15 bg-slate-900 shrink-0"
                >
                  <img
                    src={banner.fullBannerImageUrl}
                    alt={banner.title}
                    className="w-full h-[220px] sm:h-[300px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent flex items-end p-5 sm:p-6">
                    <div className="flex items-center justify-between w-full text-white gap-3">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-lg drop-shadow-sm truncate">{banner.title}</h3>
                        {banner.subtitle && <p className="text-xs sm:text-sm text-slate-300 line-clamp-1">{banner.subtitle}</p>}
                      </div>
                      <span className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0050D8] to-[#0073C1] hover:brightness-110 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg text-white shrink-0">
                        <span>{banner.buttonText || 'Khám phá ngay'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Mode 2: Dynamic Typography Gradient Card Banner (Glassmorphism & EdTech Styling)
            return (
              <div
                key={banner.id || index}
                className={`min-w-[88vw] sm:min-w-[620px] lg:min-w-[700px] snap-start bg-gradient-to-br ${banner.bgGradient || 'from-[#071938] via-[#0E2E66] to-[#0048A8]'} text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group border border-white/15 hover:border-blue-400/40 transition-all duration-300 shrink-0`}
              >
                {/* Glow lights */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-center relative z-10">
                  {/* Left Content Column */}
                  <div className="sm:col-span-7 space-y-3 sm:space-y-4">
                    {/* Partner Badges */}
                    {banner.partnerBadges && banner.partnerBadges.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {banner.partnerBadges.map((badge, bIdx) => (
                          <span
                            key={bIdx}
                            className="text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center gap-1 shadow-2xs"
                            style={{ color: badge.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.color }} />
                            <span>{badge.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-snug drop-shadow-sm">
                      {banner.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {banner.subtitle}
                    </p>

                    {/* Action buttons row */}
                    <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
                      {banner.buttonStyle === 'primary' ? (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer group-hover:scale-102"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer group-hover:scale-102"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold backdrop-blur-md border border-white/20 transition-colors cursor-pointer"
                        title="Xem thử video bài giảng miễn phí"
                      >
                        <Play className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                        <span>Học thử 0đ</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Graphic Column */}
                  <div className="sm:col-span-5 flex justify-center pt-2 sm:pt-0">
                    <div className="relative w-32 h-32 sm:w-48 sm:h-48">
                      {/* Glow frame */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                      
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900/80 group-hover:scale-105 transition-transform duration-500 relative">
                        <img
                          src={banner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Floating Badges */}
                      {banner.floatingBadges && banner.floatingBadges.map((badge, fbIdx) => {
                        const posClass =
                          badge.position === 'top-left'
                            ? '-top-2 -left-2 sm:-top-3 sm:-left-3'
                            : badge.position === 'top-right'
                            ? '-top-2 -right-2 sm:-top-3 sm:-right-3'
                            : badge.position === 'bottom-left'
                            ? '-bottom-2 -left-2 sm:-bottom-3 sm:-left-3'
                            : '-bottom-2 -right-2 sm:-bottom-3 sm:-right-3';

                        return (
                          <div
                            key={fbIdx}
                            className={`absolute ${posClass} bg-white/95 backdrop-blur-md text-slate-900 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold shadow-lg flex items-center gap-1.5 border border-white/40 select-none whitespace-nowrap`}
                          >
                            {badge.iconColor && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: badge.iconColor }}
                              />
                            )}
                            <span>{badge.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {displayBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToBanner(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeIndex === idx 
                  ? 'w-8 bg-cyan-400 shadow-xs shadow-cyan-400/50' 
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Chuyển tới slide ${idx + 1}`}
              aria-label={`Chuyển tới slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* 4 Trust & Metrics Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6">
          {TRUST_STATS.map((stat, sIdx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={sIdx}
                className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-2xl p-3.5 sm:p-4.5 flex items-center gap-3 hover:bg-slate-800/90 hover:border-slate-600 transition-all group"
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${stat.bgColor} ${stat.color} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-108 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-xl font-black text-white tracking-tight leading-none mb-1">
                    {stat.number}
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {stat.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {stat.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Category Navigation Rail */}
        <div className="pt-2 sm:pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Khám phá nhanh danh mục khóa học</span>
            </span>
            <button
              onClick={onBrowseCatalog}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem toàn bộ danh mục</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {QUICK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                  <span>{cat.label}</span>
                  {cat.badge && (
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                      isActive ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    }`}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
