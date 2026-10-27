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
  Star,
  Cpu,
  Terminal,
  BookmarkCheck
} from 'lucide-react';
import { HeroBannerItem } from '../types';
import { HERO_BANNERS } from '../data/courseraData';
import { ThreeHeroBackground } from './ThreeHeroBackground';

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
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : clientWidth * 0.5;
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
        const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
        const cardWidth = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.5;
        const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
        
        // If reached end, loop back to start
        if (scrollContainerRef.current.scrollLeft >= maxScroll - 20) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainerRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered, displayBanners.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
      const scrollAmount = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.5;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBanner = (idx: number) => {
    if (scrollContainerRef.current) {
      const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.5;
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
      className="bg-gradient-to-b from-[#161F45] via-[#101735] to-[#0A0E22] text-white pt-2.5 sm:pt-4 pb-6 sm:pb-8 px-3 sm:px-6 lg:px-8 relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Interactive Cyber Wave Canvas in Background */}
      <ThreeHeroBackground />

      {/* Soft gradient bridge from header */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-radial from-[#0073C1]/25 via-[#2C93E8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[350px] bg-[#5FBEFF]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-[450px] h-[300px] bg-[#0073C1]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto space-y-3 sm:space-y-4 relative z-10">
        {/* Scrollable Horizontal Track of Banners (Always 2 banners visible on desktop/laptop >= md) */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-2.5 sm:gap-4 lg:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0"
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
                  className="w-[88vw] sm:w-[calc(50%-10px)] lg:w-[calc(50%-10px)] min-w-[280px] sm:min-w-[calc(50%-10px)] snap-start rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 relative group cursor-pointer border border-white/15 bg-slate-900 shrink-0 select-none flex flex-col justify-between"
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
                    className="w-full h-[180px] sm:h-[220px] lg:h-[250px] xl:h-[270px] object-cover group-hover:scale-[1.015] transition-transform duration-700"
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

            // Mode 2: Dynamic Typography Gradient Card Banner (5 Aesthetic Templates matching Hero & Three.js canvas)
            const template = banner.cardTemplate || 'modern_split';
            const bgGrad = banner.bgGradient || 'from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]';
            const facultyImg = banner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
            const tag1 = banner.floatingBadges?.[0]?.text || 'Cố vấn 1-1 cùng Giám đốc Khối MSB';
            const tag2 = banner.floatingBadges?.[1]?.text || 'Cam kết kết nối & bảo lãnh tuyển dụng';
            const partners = banner.partnerBadges && banner.partnerBadges.length > 0 
              ? banner.partnerBadges 
              : [{ name: 'TWINGS ACADEMY' }, { name: 'ĐỐI TÁC MSB BANK' }];

            // -------------------------------------------------------------
            // -------------------------------------------------------------
            // TEMPLATE 1: CYBER GLOW (Futuristic Tech, AI & Neon Aesthetics)
            // -------------------------------------------------------------
            if (template === 'cyber_glow') {
              return (
                <div
                  key={banner.id || index}
                  className={`w-[88vw] sm:w-full md:w-[calc(50%-8px)] min-w-[280px] md:min-w-[calc(50%-8px)] snap-start bg-gradient-to-br ${bgGrad} text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 flex flex-col justify-between shadow-[0_12px_45px_rgba(0,115,193,0.35)] relative overflow-hidden group border border-cyan-400/40 hover:border-cyan-300 ring-1 ring-cyan-400/25 transition-all duration-300 shrink-0 backdrop-blur-2xl`}
                >
                  {/* Glass Specular Reflections */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/45 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />

                  {/* Cyber Grid Background lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-80" />
                  
                  {/* Neon Glow Auras merging with ThreeJS canvas */}
                  <div className="absolute -top-16 -right-16 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-400/30 transition-colors duration-700" />
                  <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center relative z-10">
                    {/* Left Column */}
                    <div className="sm:col-span-8 space-y-2 sm:space-y-2.5">
                      {/* Cyber Telemetry Status Chip */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/85 backdrop-blur-md border border-cyan-400/50 text-cyan-300 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>SYS: AI FRONTIER</span>
                        </span>
                        {partners.slice(0, 2).map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider"
                          >
                            <Zap className="w-2.5 h-2.5 text-cyan-400" />
                            <span>{p.name}</span>
                          </span>
                        ))}
                      </div>

                      {/* Neon Cyber Headline */}
                      <h2 className="text-sm sm:text-base lg:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-white to-sky-200 leading-[1.25] drop-shadow-md line-clamp-2">
                        {banner.title}
                      </h2>

                      {banner.subtitle && (
                        <p className="text-[11px] sm:text-xs text-cyan-100/90 leading-relaxed font-mono line-clamp-2">
                          {banner.subtitle}
                        </p>
                      )}

                      {/* Code-styled Cyber Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-mono text-cyan-200">
                        <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-400/35 rounded-lg px-2 py-1 backdrop-blur-md shadow-xs max-w-full">
                          <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">// {tag1}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-400/35 rounded-lg px-2 py-1 backdrop-blur-md shadow-xs max-w-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">// {tag2}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#0073C1] via-[#0284C7] to-[#00A3FF] hover:brightness-110 text-white font-extrabold rounded-xl text-xs shadow-lg hover:shadow-cyan-400/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <span>{banner.buttonText || 'Khám phá AI'}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>

                        <button
                          onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 rounded-xl text-xs font-bold backdrop-blur-md border border-cyan-400/40 hover:border-cyan-300 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm min-h-[38px]"
                        >
                          <Play className="w-3 h-3 text-rose-400 fill-rose-400" />
                          <span>Học thử 0đ</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Cyber Holographic Frame */}
                    <div className="sm:col-span-4 flex justify-end">
                      <div className="relative w-full max-w-[130px] sm:max-w-[160px] lg:max-w-[190px] bg-gradient-to-b from-cyan-950/60 via-slate-900/70 to-slate-950/80 backdrop-blur-xl border border-cyan-400/40 rounded-xl p-2 sm:p-2.5 shadow-xl transition-transform duration-500 hover:scale-[1.02] ring-1 ring-cyan-400/20">
                        {/* Ambient Aura */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl blur-lg opacity-30 -z-10" />

                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-cyan-400/30 shadow-md bg-slate-900 mb-1.5">
                          <img
                            src={facultyImg}
                            alt={banner.title}
                            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                          
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-400/50 text-[8px] sm:text-[9px] font-mono font-bold text-cyan-300 flex items-center gap-1 shadow-md">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            <span>MSB</span>
                          </span>

                          <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/30 text-[8px] sm:text-[9px] font-mono font-bold text-cyan-200 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                            <span>AI MENTOR</span>
                          </div>
                        </div>

                        <div className="space-y-0.5 text-left">
                          <div className="text-[9px] font-mono font-bold uppercase text-cyan-400 truncate">
                            Giám Đốc Khối MSB
                          </div>
                          <div className="text-[10px] text-cyan-100/70 font-mono leading-tight line-clamp-1">
                            Mô hình hóa dữ liệu & Quant
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // -------------------------------------------------------------
            // TEMPLATE 2: FLOATING SHOWCASE (Spotlight Faculty & Mentors)
            // -------------------------------------------------------------
            if (template === 'floating_showcase') {
              return (
                <div
                  key={banner.id || index}
                  className={`w-[88vw] sm:w-full md:w-[calc(50%-8px)] min-w-[280px] md:min-w-[calc(50%-8px)] snap-start bg-gradient-to-br ${bgGrad} text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 flex flex-col justify-between shadow-[0_12px_45px_rgba(245,158,11,0.25)] relative overflow-hidden group border border-amber-400/35 hover:border-amber-300 ring-1 ring-amber-400/20 transition-all duration-300 shrink-0 backdrop-blur-2xl`}
                >
                  {/* Glass Specular Reflections */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/45 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

                  {/* Ambient Halo Behind Right Column */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-6 sm:right-16 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-500/25 via-purple-500/20 to-[#5FBEFF]/25 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center relative z-10">
                    {/* Left Column */}
                    <div className="sm:col-span-8 space-y-2 sm:space-y-2.5">
                      {/* Masterclass Badge */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs">
                          <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                          <span>MASTERCLASS</span>
                        </span>
                        {partners.slice(0, 2).map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#5FBEFF] text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider"
                          >
                            <span>{p.name}</span>
                          </span>
                        ))}
                      </div>

                      {/* Headline with golden/cyan contrast */}
                      <h2 className="text-sm sm:text-base lg:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-200 leading-[1.25] drop-shadow-md line-clamp-2">
                        {banner.title}
                      </h2>

                      {banner.subtitle && (
                        <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-medium line-clamp-2">
                          {banner.subtitle}
                        </p>
                      )}

                      {/* Mentorship Highlights */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-2 py-1 backdrop-blur-md shadow-xs max-w-full">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <span className="truncate">{tag1}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-2 py-1 backdrop-blur-md shadow-xs max-w-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{tag2}</span>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#FF6B35] via-[#EA580C] to-[#C23010] hover:from-[#FF7A47] hover:to-[#B02808] text-white font-extrabold rounded-xl text-xs shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <span>{banner.buttonText || 'Đăng ký tư vấn'}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>

                        <button
                          onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/25 hover:border-white/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm min-h-[38px]"
                        >
                          <Play className="w-3 h-3 text-rose-400 fill-rose-400" />
                          <span>Học thử 0đ</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Spotlight Portrait with Floating Badges */}
                    <div className="sm:col-span-4 flex justify-end">
                      <div className="relative w-20 h-20 sm:w-26 sm:h-26 lg:w-32 lg:h-32">
                        {/* Glowing Circular Halo */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-[#0073C1] animate-pulse blur-md opacity-70" />
                        
                        {/* Circular Portrait Frame */}
                        <div className="relative w-full h-full rounded-full overflow-hidden border-2 sm:border-3 border-white/90 shadow-xl bg-slate-900 ring-2 ring-amber-400/40">
                          <img
                            src={facultyImg}
                            alt={banner.title}
                            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                        </div>

                        {/* Floating Badge Top-Left */}
                        <div className="absolute -top-1 -left-1 sm:-top-1.5 sm:-left-1.5 bg-slate-950/90 backdrop-blur-md border border-amber-400/50 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold text-amber-300 shadow-lg flex items-center gap-1">
                          <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-amber-300 text-amber-300" />
                          <span>MSB Lead</span>
                        </div>

                        {/* Floating Badge Bottom-Right */}
                        <div className="absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-1.5 bg-slate-950/90 backdrop-blur-md border border-emerald-400/50 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold text-emerald-300 shadow-lg flex items-center gap-1">
                          <ShieldCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-400" />
                          <span>Bảo lãnh</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // -------------------------------------------------------------
            // TEMPLATE 3: MINIMAL EDITORIAL (Refined Academic Luxury)
            // -------------------------------------------------------------
            if (template === 'minimal_editorial') {
              return (
                <div
                  key={banner.id || index}
                  className={`w-[88vw] sm:w-full md:w-[calc(50%-8px)] min-w-[280px] md:min-w-[calc(50%-8px)] snap-start bg-gradient-to-br ${bgGrad} text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 flex flex-col justify-between shadow-[0_12px_45px_rgba(0,115,193,0.25)] relative overflow-hidden group border border-white/20 hover:border-white/35 ring-1 ring-white/10 transition-all duration-300 shrink-0 backdrop-blur-2xl`}
                >
                  {/* Glass Specular Reflections */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/45 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
                  <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center relative z-10">
                    {/* Left Column with Vertical Accent Line */}
                    <div className="sm:col-span-8 border-l-2 border-[#5FBEFF]/90 pl-2.5 sm:pl-4 space-y-2 sm:space-y-2.5">
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest uppercase text-[#5FBEFF] flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3 h-3 text-[#5FBEFF] shrink-0" />
                        <span>TWINGS ACADEMY // EXECUTIVE</span>
                      </div>

                      <h2 className="text-sm sm:text-base lg:text-xl font-extrabold tracking-tight text-white leading-[1.25] line-clamp-2">
                        {banner.title}
                      </h2>

                      {banner.subtitle && (
                        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-normal line-clamp-2">
                          {banner.subtitle}
                        </p>
                      )}

                      {/* Editorial Minimalist Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-[9px] sm:text-[10px] text-slate-200 font-medium backdrop-blur-md truncate max-w-full">
                          ✦ {tag1}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-[9px] sm:text-[10px] text-slate-200 font-medium backdrop-blur-md truncate max-w-full">
                          ✦ {tag2}
                        </span>
                      </div>

                      {/* Minimalist Action Buttons */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <span>{banner.buttonText || 'Khám phá ngay'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-md border border-white/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <Play className="w-3 h-3 text-rose-400 fill-rose-400" />
                          <span>Học thử 0đ</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Clean Editorial Framed Photo */}
                    <div className="sm:col-span-4 flex justify-end">
                      <div className="relative w-full max-w-[120px] sm:max-w-[150px] lg:max-w-[170px] rounded-xl overflow-hidden border border-white/25 shadow-xl bg-slate-900 group-hover:border-white/45 transition-colors ring-1 ring-white/10">
                        <div className="aspect-[4/4] overflow-hidden">
                          <img
                            src={facultyImg}
                            alt={banner.title}
                            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-1.5 sm:p-2 bg-slate-950/85 backdrop-blur-md border-t border-white/15 text-center space-y-0.5">
                          <div className="text-[10px] sm:text-[11px] font-bold text-white truncate">Chuyên Gia MSB</div>
                          <div className="text-[8px] sm:text-[9px] text-slate-400 truncate">Thực chiến & Cố vấn</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // -------------------------------------------------------------
            // TEMPLATE 4: BADGE HIGHLIGHT (100% Career Guarantee & Trust)
            // -------------------------------------------------------------
            if (template === 'badge_highlight') {
              return (
                <div
                  key={banner.id || index}
                  className={`w-[88vw] sm:w-full md:w-[calc(50%-8px)] min-w-[280px] md:min-w-[calc(50%-8px)] snap-start bg-gradient-to-br ${bgGrad} text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 flex flex-col justify-between shadow-[0_12px_45px_rgba(16,185,129,0.25)] relative overflow-hidden group border border-emerald-400/40 hover:border-emerald-300 ring-1 ring-emerald-500/25 transition-all duration-300 shrink-0 backdrop-blur-2xl`}
                >
                  {/* Glass Specular Reflections */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/45 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent pointer-events-none" />

                  {/* Ambient Glow Aura */}
                  <div className="absolute -top-16 -right-16 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/30 transition-colors duration-700" />
                  <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center relative z-10">
                    {/* Left Column */}
                    <div className="sm:col-span-8 space-y-2 sm:space-y-2.5">
                      {/* Career Guarantee Header Stamp */}
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/85 backdrop-blur-md border border-emerald-400/50 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm truncate max-w-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">BẢO LÃNH ĐẦU RA 100% — MSB BANK</span>
                      </div>

                      <h2 className="text-sm sm:text-base lg:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-white to-emerald-200 leading-[1.25] drop-shadow-md line-clamp-2">
                        {banner.title}
                      </h2>

                      {banner.subtitle && (
                        <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-medium line-clamp-2">
                          {banner.subtitle}
                        </p>
                      )}

                      {/* 2-point Checklist Grid */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-400/35 rounded-lg px-2 py-1 backdrop-blur-md shadow-xs max-w-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">Phỏng vấn trực tiếp tại MSB</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-400/35 rounded-lg px-2 py-1 backdrop-blur-md shadow-xs max-w-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{tag1}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#FF6B35] via-[#EA580C] to-[#C23010] hover:from-[#FF7A47] hover:to-[#B02808] text-white font-extrabold rounded-xl text-xs shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <span>{banner.buttonText || 'Đăng ký tư vấn'}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>

                        <button
                          onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/25 hover:border-white/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm min-h-[38px]"
                        >
                          <Play className="w-3 h-3 text-rose-400 fill-rose-400" />
                          <span>Học thử 0đ</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Verification Card with Official Seal */}
                    <div className="sm:col-span-4 flex justify-end">
                      <div className="relative w-full max-w-[130px] sm:max-w-[160px] lg:max-w-[190px] bg-gradient-to-b from-emerald-950/70 via-slate-900/75 to-slate-950/85 backdrop-blur-xl border border-emerald-400/40 rounded-xl p-2 sm:p-2.5 shadow-xl transition-transform duration-500 hover:scale-[1.02] ring-1 ring-emerald-400/25">
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-emerald-400/35 shadow-md bg-slate-900 mb-1.5">
                          <img
                            src={facultyImg}
                            alt={banner.title}
                            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />

                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-emerald-950/90 backdrop-blur-md border border-emerald-400/50 text-[8px] sm:text-[9px] font-bold text-emerald-300 flex items-center gap-1 shadow-md">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                            <span>MSB</span>
                          </span>

                          <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-emerald-400/30 text-[8px] sm:text-[9px] font-bold text-emerald-300 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                            <span>100% VIỆC LÀM</span>
                          </div>
                        </div>

                        <div className="space-y-0.5 text-left">
                          <div className="text-[9px] font-extrabold uppercase text-emerald-400 truncate flex items-center gap-1">
                            <BookmarkCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span className="truncate">HỢP ĐỒNG BẢO LÃNH</span>
                          </div>
                          <div className="text-xs font-extrabold text-white truncate">
                            Khảo thí & MSB
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // -------------------------------------------------------------
            // TEMPLATE 5: MODERN SPLIT (Default Executive Split)
            // -------------------------------------------------------------
            return (
              <div
                key={banner.id || index}
                className={`w-[88vw] sm:w-full md:w-[calc(50%-8px)] min-w-[280px] md:min-w-[calc(50%-8px)] snap-start bg-gradient-to-br ${bgGrad} text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 flex flex-col justify-between shadow-[0_12px_45px_rgba(0,115,193,0.3)] relative overflow-hidden group border border-white/25 hover:border-[#5FBEFF]/60 ring-1 ring-white/10 transition-all duration-300 shrink-0 backdrop-blur-2xl`}
              >
                {/* Glass Specular Reflections */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/45 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#5FBEFF]/70 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#0073C1]/30 to-transparent pointer-events-none" />

                {/* Glow lights merging with ThreeJS canvas */}
                <div className="absolute -top-16 -right-16 w-80 h-80 bg-[#5FBEFF]/20 rounded-full blur-3xl pointer-events-none group-hover:bg-[#5FBEFF]/30 transition-colors duration-700" />
                <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[#0073C1]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center relative z-10">
                  {/* Left Content Column */}
                  <div className="sm:col-span-8 space-y-2 sm:space-y-2.5">
                    {/* Partner Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EA580C]/20 border border-[#EA580C]/40 text-[#FFA07A] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                        <span>TUYỂN SINH KHÓA MỚI</span>
                      </span>
                      {partners.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#5FBEFF] text-[10px] font-extrabold uppercase tracking-wider shadow-xs"
                        >
                          <span>{badge.name}</span>
                        </span>
                      ))}
                    </div>

                    {/* Headline with vibrant gradient highlights */}
                    <h2 className="text-sm sm:text-base lg:text-xl font-black tracking-tight text-white leading-[1.25] drop-shadow-md line-clamp-2">
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
                      <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-medium line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}

                    {/* Value-add highlights (Taglines) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-200">
                      <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 backdrop-blur-md shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-[#5FBEFF] shrink-0" />
                        <span className="truncate">{tag1}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 backdrop-blur-md shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{tag2}</span>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      {banner.buttonStyle === 'primary' ? (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#FF6B35] via-[#EA580C] to-[#C23010] hover:from-[#FF7A47] hover:to-[#B02808] text-white font-extrabold rounded-lg text-xs shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <span>{banner.buttonText || 'Đăng ký tư vấn'}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-[#0073C1] to-[#2C93E8] hover:brightness-110 text-white font-extrabold rounded-lg text-xs shadow-lg hover:shadow-cyan-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[38px]"
                        >
                          <span>{banner.buttonText || 'Khám phá ngay'}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenYouTubeTrial('sal78ACtGTc', banner.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold backdrop-blur-md border border-white/25 hover:border-white/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-xs min-h-[38px]"
                        title="Xem thử video bài giảng miễn phí trên YouTube"
                      >
                        <Play className="w-3 h-3 text-rose-400 fill-rose-400" />
                        <span>Học thử 0đ</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Graphic Column: Prestigious Faculty Profile Showcase Card */}
                  <div className="sm:col-span-4 flex justify-end">
                    <div className="relative w-full max-w-[130px] sm:max-w-[160px] lg:max-w-[170px] bg-gradient-to-b from-white/15 via-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/25 rounded-xl p-2 sm:p-2.5 shadow-xl shadow-blue-950/60 transition-transform duration-500 hover:scale-[1.02] ring-1 ring-white/15">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#0073C1] to-[#5FBEFF] rounded-xl blur-lg opacity-30 -z-10" />

                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-white/20 shadow-md bg-slate-900 mb-1.5">
                        <img
                          src={facultyImg}
                          alt={banner.title}
                          className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-white/25 text-[9px] font-extrabold text-[#5FBEFF] flex items-center gap-0.5 shadow-xs">
                          <span className="w-1 h-1 rounded-full bg-[#EA580C]" />
                          <span>MSB</span>
                        </span>

                        <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/15 text-[9px] font-bold text-amber-300">
                          <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                          <span>4.9★</span>
                        </div>
                      </div>

                      <div className="space-y-0.5 text-left">
                        <div className="text-[9px] font-extrabold tracking-wider uppercase text-[#5FBEFF]">
                          Giảng Viên Chuyên Gia
                        </div>
                        <div className="text-xs font-extrabold text-white line-clamp-1">
                          Giám Đốc Khối MSB
                        </div>
                        <div className="text-[10px] text-slate-300 font-medium leading-snug line-clamp-1">
                          Đào tạo trực tiếp Hội sở
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
        <div className="pt-3.5 sm:pt-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-3 mb-2.5">
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

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {QUICK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0073C1] to-[#0E6BBB] text-white border-[#5FBEFF] shadow-lg shadow-[#0073C1]/30 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:border-white/25 backdrop-blur-md'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#5FBEFF]'}`} />
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
