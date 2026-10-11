import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Play, ExternalLink } from 'lucide-react';
import { HeroBannerItem } from '../types';

interface CourseraHeroBannersProps {
  banners: HeroBannerItem[];
  onExploreAI: () => void;
  onBrowseCatalog: () => void;
  onOpenConsultation: (bannerTitle?: string) => void;
  onOpenYouTubeTrial: (videoId: string, title: string) => void;
}

export const CourseraHeroBanners: React.FC<CourseraHeroBannersProps> = ({
  banners,
  onExploreAI,
  onBrowseCatalog,
  onOpenConsultation,
  onOpenYouTubeTrial,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
      
      const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : clientWidth * 0.85;
      const idx = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.max(0, Math.min(idx, banners.length - 1)));
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [banners]);

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
      // Scroll to anchor on page
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

  return (
    <section className="bg-slate-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        {/* Carousel Header with Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0073C1] animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chương trình nổi bật ({banners.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-1.5 sm:p-2 rounded-full border transition-all cursor-pointer ${
                canScrollLeft
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                  : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
              }`}
              title="Cuộn sang trái"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-1.5 sm:p-2 rounded-full border transition-all cursor-pointer ${
                canScrollRight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                  : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
              }`}
              title="Cuộn sang phải"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-3.5 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 pt-1 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0"
        >
          {banners.map((banner) => {
            // Mode 1: Full-Image Banner
            if (banner.displayType === 'image_only' && banner.fullBannerImageUrl) {
              return (
                <div
                  key={banner.id}
                  onClick={() => handleBannerAction(banner)}
                  className="min-w-[86vw] sm:min-w-[580px] lg:min-w-[620px] max-w-[360px] sm:max-w-none snap-start rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 relative group cursor-pointer border border-slate-200 bg-slate-900 shrink-0"
                >
                  <img
                    src={banner.fullBannerImageUrl}
                    alt={banner.title}
                    className="w-full h-[190px] sm:h-[260px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Subtle link overlay indicator */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4 sm:p-5">
                    <div className="flex items-center justify-between w-full text-white gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs sm:text-base drop-shadow-sm truncate">{banner.title}</h3>
                        {banner.subtitle && <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-1 drop-shadow-xs">{banner.subtitle}</p>}
                      </div>
                      <span className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-[11px] sm:text-xs font-bold flex items-center gap-1.5 border border-white/30 text-white shrink-0">
                        <span>{banner.buttonText || 'Khám phá'}</span>
                        <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Mode 2: Dynamic Typography Gradient Card Banner
            return (
              <div
                key={banner.id}
                className={`min-w-[86vw] sm:min-w-[580px] lg:min-w-[620px] max-w-[360px] sm:max-w-none snap-start bg-gradient-to-br ${banner.bgGradient} text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex flex-col justify-between shadow-md relative overflow-hidden group hover:shadow-xl transition-all duration-300 shrink-0`}
              >
                {/* Subtle ambient light */}
                <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center relative z-10">
                  {/* Left Text Zone */}
                  <div className="sm:col-span-7 space-y-2.5 sm:space-y-3.5">
                    {/* Partner Badges row */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                      {banner.partnerBadges.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                          style={{ color: badge.color }}
                        >
                          {badge.name}
                        </span>
                      ))}
                    </div>

                    <h2 className="text-base sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                      {banner.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-2">
                      {banner.subtitle}
                    </p>

                    <div className="pt-1 sm:pt-2">
                      {banner.buttonStyle === 'primary' ? (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-[#0056D2] hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer group-hover:scale-105 w-full sm:w-auto"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-blue-300 hover:text-blue-100 transition-colors cursor-pointer group-hover:underline"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Graphic cutout */}
                  <div className="sm:col-span-5 flex justify-center pt-1 sm:pt-0">
                    <div className="relative w-24 h-24 sm:w-40 sm:h-40">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-slate-900/60 group-hover:scale-105 transition-transform duration-500">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Floating Badges */}
                      {banner.floatingBadges.map((badge, fbIdx) => {
                        const posClass =
                          badge.position === 'top-left'
                            ? '-top-1.5 -left-1.5 sm:-top-2 sm:-left-2'
                            : badge.position === 'top-right'
                            ? '-top-1.5 -right-1.5 sm:-top-2 sm:-right-2'
                            : badge.position === 'bottom-left'
                            ? '-bottom-1.5 -left-1.5 sm:-bottom-2 sm:-left-2'
                            : '-bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2';

                        return (
                          <div
                            key={fbIdx}
                            className={`absolute ${posClass} bg-white text-slate-900 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-md flex items-center gap-1 border border-slate-200 select-none whitespace-nowrap`}
                          >
                            {badge.iconColor && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
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
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (scrollContainerRef.current) {
                  const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement | null;
                  const cardWidth = firstCard ? firstCard.offsetWidth + 16 : scrollContainerRef.current.clientWidth * 0.85;
                  scrollContainerRef.current.scrollTo({
                    left: idx * cardWidth,
                    behavior: 'smooth'
                  });
                }
              }}
              className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                activeIndex === idx ? 'w-5 sm:w-6 bg-[#0073C1]' : 'w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

