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
  CheckCircle2,
  Star
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
    color: 'text-[#5FBEFF]',
    glowBg: 'bg-[#0073C1]/20',
    borderColor: 'border-[#5FBEFF]/30',
  },
  {
    icon: Briefcase,
    number: '95%',
    label: 'Tỷ lệ có việc làm',
    subtext: 'Bảo lãnh & giới thiệu tại MSB',
    color: 'text-emerald-400',
    glowBg: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/30',
  },
  {
    icon: Award,
    number: '100%',
    label: 'Giảng viên Giám đốc Khối',
    subtext: '20+ năm nghiệp vụ thực chiến',
    color: 'text-amber-400',
    glowBg: 'bg-amber-500/20',
    borderColor: 'border-amber-400/30',
  },
  {
    icon: PlayCircle,
    number: 'Miễn phí',
    label: 'Học thử Video YouTube',
    subtext: 'Kiểm tra chất lượng trước khi mua',
    color: 'text-rose-400',
    glowBg: 'bg-rose-500/20',
    borderColor: 'border-rose-400/30',
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
      className="bg-gradient-to-b from-[#161F45] via-[#101735] to-[#0A0E22] text-white pt-3 sm:pt-5 pb-10 sm:pb-14 px-3 sm:px-6 lg:px-8 relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Soft gradient bridge from header */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-radial from-[#0073C1]/30 via-[#2C93E8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[350px] bg-[#5FBEFF]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-[450px] h-[300px] bg-[#0073C1]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Scrollable Horizontal Track of Banners */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0"
        >
          {displayBanners.map((banner, index) => {
            // Mode 1: Full-Image Banner with Hyperlink Support
            if (banner.displayType === 'image_only' && (banner.fullBannerImageUrl || banner.imageUrl)) {
              const img = banner.fullBannerImageUrl || banner.imageUrl;
              const hasOverlayText = !!(banner.showOverlayText && banner.title && banner.title !== 'Banner' && banner.title.trim().length > 0);
              const hasOverlayButton = !!(banner.showOverlayButton && banner.buttonText && banner.buttonText.trim().length > 0);
              const hasOverlay = hasOverlayText || hasOverlayButton;

              return (
                <div
                  key={banner.id || index}
                  onClick={() => handleBannerAction(banner)}
                  className="w-full min-w-full snap-start rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 relative group cursor-pointer border border-white/15 bg-slate-900 shrink-0 select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBannerAction(banner);
                    }
                  }}
                  title={banner.linkUrl ? `Đi tới: ${banner.linkUrl}` : banner.title}
                >
                  <img
                    src={img}
                    alt={banner.title || 'TWings Banner'}
                    className="w-full h-[220px] sm:h-[340px] lg:h-[420px] object-cover group-hover:scale-[1.015] transition-transform duration-700"
                  />
                  {/* Subtle hyperlink indicator on hover if linkUrl exists */}
                  {banner.linkUrl && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                      <span>Mở liên kết</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {/* Optional title & button overlay only if explicitly enabled in CMS */}
                  {hasOverlay && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent p-4 sm:p-6 flex items-end justify-between gap-4">
                      {hasOverlayText ? (
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-base sm:text-xl lg:text-2xl text-white drop-shadow-md truncate">
                            {banner.title}
                          </h3>
                          {banner.subtitle && (
                            <p className="text-xs sm:text-sm text-slate-300 line-clamp-1">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div />
                      )}
                      {hasOverlayButton && (
                        <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0073C1] to-[#2C93E8] text-xs sm:text-sm font-bold flex items-center gap-1.5 text-white shadow-lg shrink-0 group-hover:brightness-110">
                          <span>{banner.buttonText}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Mode 2: Dynamic Typography Gradient Card Banner (Glassmorphism & EdTech Styling)
            return (
              <div
                key={banner.id || index}
                className={`w-full min-w-full snap-start bg-gradient-to-br ${banner.bgGradient || 'from-[#1A2656] via-[#0E5496] to-[#0073C1]'} text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden group border border-white/20 hover:border-[#5FBEFF]/50 transition-all duration-300 shrink-0`}
              >
                {/* Glow lights */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#5FBEFF]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0073C1]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center relative z-10">
                  {/* Left Content Column */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-5">
                    {/* Partner Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {banner.partnerBadges && banner.partnerBadges.length > 0 ? (
                        banner.partnerBadges.map((badge, bIdx) => (
                          <span
                            key={bIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#5FBEFF] text-xs font-extrabold uppercase tracking-wider shadow-xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-[#5FBEFF] animate-pulse" />
                            <span>{badge.name}</span>
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#5FBEFF] text-xs font-extrabold uppercase tracking-wider shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-[#5FBEFF] animate-pulse" />
                            <span>TWINGS ACADEMY</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EA580C]/20 backdrop-blur-md border border-[#EA580C]/40 text-[#FFA07A] text-xs font-extrabold uppercase tracking-wider shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                            <span>ĐỐI TÁC MSB BANK</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Headline with vibrant gradient highlights */}
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] drop-shadow-md">
                      {banner.title.includes('Ngân hàng') ? (
                        <>
                          {banner.title.split('Ngân hàng')[0]}
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5FBEFF] via-[#BEE7FF] to-white">
                            Ngân hàng
                          </span>
                          {banner.title.split('Ngân hàng')[1]}
                        </>
                      ) : (
                        banner.title
                      )}
                    </h2>

                    {banner.subtitle && (
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-medium">
                        {banner.subtitle}
                      </p>
                    )}

                    {/* Value-add highlights (Taglines) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs sm:text-sm font-semibold text-slate-200">
                      {banner.floatingBadges && banner.floatingBadges.length > 0 ? (
                        banner.floatingBadges.map((badge, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 backdrop-blur-md"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 ${
                                bIdx % 2 === 0 ? 'text-[#5FBEFF]' : 'text-emerald-400'
                              }`}
                            />
                            <span>{badge.text}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 backdrop-blur-md">
                            <CheckCircle2 className="w-4 h-4 text-[#5FBEFF] shrink-0" />
                            <span>Cố vấn 1-1 cùng Giám đốc Khối MSB</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 backdrop-blur-md">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Cam kết kết nối & bảo lãnh tuyển dụng</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action buttons row */}
                    <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                      {banner.buttonStyle === 'primary' ? (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 bg-gradient-to-r from-[#FF6B35] via-[#EA580C] to-[#C23010] hover:from-[#FF7A47] hover:to-[#B02808] text-white font-extrabold rounded-xl text-sm sm:text-base shadow-xl hover:shadow-orange-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <span>{banner.buttonText || 'Đăng ký tư vấn trực tiếp'}</span>
                          <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 bg-gradient-to-r from-[#0073C1] to-[#2C93E8] hover:brightness-110 text-white font-extrabold rounded-xl text-sm sm:text-base shadow-xl hover:shadow-cyan-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <span>{banner.buttonText || 'Khám phá ngay'}</span>
                          <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                        className="inline-flex items-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm sm:text-base font-bold backdrop-blur-md border border-white/25 hover:border-white/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                        title="Xem thử video bài giảng miễn phí trên YouTube"
                      >
                        <Play className="w-4 h-4 text-rose-400 fill-rose-400" />
                        <span>Học thử 0đ</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Graphic Column: Prestigious Faculty Profile Showcase Card */}
                  <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end pt-4 lg:pt-0">
                    <div className="relative w-full max-w-[320px] sm:max-w-[340px] bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl border border-white/25 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-blue-950/60 transition-transform duration-500 hover:scale-[1.02]">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#0073C1] to-[#5FBEFF] rounded-3xl blur-xl opacity-30 -z-10" />

                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/20 shadow-lg bg-slate-900 mb-3.5">
                        <img
                          src={banner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                          alt={banner.title}
                          className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-[11px] font-extrabold text-[#5FBEFF] flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                          <span>MSB Bank</span>
                        </span>

                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-300">
                          <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                          <span>4.9 / 5 (1.500+ học viên)</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-left">
                        <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#5FBEFF]">
                          Đội Ngũ Giảng Viên Thực Chiến
                        </div>
                        <div className="text-base font-extrabold text-white">
                          Giám Đốc Khối & Chuyên Gia MSB
                        </div>
                        <div className="text-xs text-slate-300 font-medium leading-relaxed">
                          Đào tạo trực tiếp tại Hội sở, đánh giá năng lực và bảo lãnh tiếp nhận việc làm.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unified Slideshow Navigation Bar: Prev, Indicator Dots, Slide Counter & Next */}
        <div className="flex items-center justify-center pt-1 sm:pt-2">
          <div className="inline-flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 shadow-xl">
            {/* Prev Button */}
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-1 sm:p-1.5 rounded-full transition-all cursor-pointer ${
                canScrollLeft
                  ? 'text-white hover:bg-white/20 active:scale-95'
                  : 'text-slate-500 cursor-not-allowed opacity-30'
              }`}
              title="Chương trình trước"
              aria-label="Chương trình trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToBanner(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx 
                      ? 'w-7 bg-[#5FBEFF] shadow-xs shadow-[#5FBEFF]/60' 
                      : 'w-2 bg-white/25 hover:bg-white/45'
                  }`}
                  title={`Chuyển tới slide ${idx + 1}`}
                  aria-label={`Chuyển tới slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Slide Counter */}
            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 tracking-wider select-none pl-2.5 border-l border-white/20">
              {String(activeIndex + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(displayBanners.length).padStart(2, '0')}
            </span>

            {/* Next Button */}
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-1 sm:p-1.5 rounded-full transition-all cursor-pointer ${
                canScrollRight
                  ? 'text-white hover:bg-white/20 active:scale-95'
                  : 'text-slate-500 cursor-not-allowed opacity-30'
              }`}
              title="Chương trình tiếp theo"
              aria-label="Chương trình tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>



        {/* Quick Category Navigation Rail */}
        <div className="pt-6 sm:pt-8 border-t border-white/10">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5FBEFF]" />
              <span>Khám phá nhanh danh mục khóa học</span>
            </span>
            <button
              onClick={onBrowseCatalog}
              className="text-xs font-bold text-[#5FBEFF] hover:text-[#94D9FF] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Xem toàn bộ danh mục</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {QUICK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0073C1] to-[#0E6BBB] text-white border-[#5FBEFF] shadow-lg shadow-[#0073C1]/30 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:border-white/25 backdrop-blur-md'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#5FBEFF]'}`} />
                  <span>{cat.label}</span>
                  {cat.badge && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                      isActive ? 'bg-[#263060] text-[#D7F5FF]' : 'bg-[#0073C1]/40 text-[#D7F5FF] border border-[#5FBEFF]/30'
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
