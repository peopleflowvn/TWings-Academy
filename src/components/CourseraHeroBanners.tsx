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
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
      
      const cardWidth = clientWidth * 0.85;
      const idx = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(idx, banners.length - 1));
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [banners]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.85;
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
    <section className="bg-slate-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Carousel Header with Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0073C1] animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chương trình nổi bật ({banners.length} banner cuộn ngang)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollLeft
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                  : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
              }`}
              title="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollRight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                  : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
              }`}
              title="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pt-1 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {banners.map((banner, index) => {
            // Mode 1: Full-Image Banner (User: "Hero Carousel Banner cần có chế độ thay thế hoàn toàn bằng ảnh và ảnh này có thể hyperlink đến các mục trong trang hoặc đường link ngoài")
            if (banner.displayType === 'image_only' && banner.fullBannerImageUrl) {
              return (
                <div
                  key={banner.id}
                  onClick={() => handleBannerAction(banner)}
                  className="min-w-[88%] sm:min-w-[580px] lg:min-w-[620px] snap-center rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 relative group cursor-pointer border border-slate-200 bg-slate-900"
                >
                  <img
                    src={banner.fullBannerImageUrl}
                    alt={banner.title}
                    className="w-full h-[220px] sm:h-[260px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Subtle link overlay indicator */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity flex items-end p-5">
                    <div className="flex items-center justify-between w-full text-white">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base drop-shadow-sm">{banner.title}</h3>
                        {banner.subtitle && <p className="text-xs text-slate-200 line-clamp-1 drop-shadow-xs">{banner.subtitle}</p>}
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 border border-white/30 text-white shrink-0">
                        <span>{banner.buttonText || 'Khám phá'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
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
                className={`min-w-[88%] sm:min-w-[580px] lg:min-w-[620px] snap-center bg-gradient-to-br ${banner.bgGradient} text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-md relative overflow-hidden group hover:shadow-xl transition-all duration-300`}
              >
                {/* Subtle ambient light */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center relative z-10">
                  {/* Left Text Zone */}
                  <div className="sm:col-span-7 space-y-3.5">
                    {/* Partner Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {banner.partnerBadges.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                          style={{ color: badge.color }}
                        >
                          {badge.name}
                        </span>
                      ))}
                    </div>

                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                      {banner.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-2">
                      {banner.subtitle}
                    </p>

                    <div className="pt-2">
                      {banner.buttonStyle === 'primary' ? (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0056D2] hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer group-hover:scale-105"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBannerAction(banner)}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-300 hover:text-blue-100 transition-colors cursor-pointer group-hover:underline"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Circular Graphic cutout matching Image 1 */}
                  <div className="sm:col-span-5 flex justify-center">
                    <div className="relative w-36 h-36 sm:w-44 sm:h-44">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900/60 group-hover:scale-105 transition-transform duration-500">
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
                            ? '-top-2 -left-2'
                            : badge.position === 'top-right'
                            ? '-top-2 -right-2'
                            : badge.position === 'bottom-left'
                            ? '-bottom-2 -left-2'
                            : '-bottom-2 -right-2';

                        return (
                          <div
                            key={fbIdx}
                            className={`absolute ${posClass} bg-white text-slate-900 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-1.5 border border-slate-200 select-none`}
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
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (scrollContainerRef.current) {
                  const cardWidth = scrollContainerRef.current.clientWidth * 0.85;
                  scrollContainerRef.current.scrollTo({
                    left: idx * cardWidth,
                    behavior: 'smooth'
                  });
                }
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeIndex === idx ? 'w-6 bg-[#0073C1]' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
