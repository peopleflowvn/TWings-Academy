import React from 'react';
import { TrendingUp, Sparkles, ShieldCheck, GraduationCap, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface IntroSectionProps {
  introData?: CMSSectionsConfig['intro'];
  onScrollToSection: (sectionId: string) => void;
}

export const IntroSection: React.FC<IntroSectionProps> = ({ introData, onScrollToSection }) => {
  const eyebrow = introData?.eyebrow || 'TWINGS ACADEMY';
  const headline = introData?.headline || 'NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI';
  const description = introData?.description || 'TWings Academy giúp bạn phát triển nhanh những năng lực thực tiễn, thích ứng với thị trường lao động không ngừng thay đổi và chủ động tiến xa trên hành trình sự nghiệp.';

  const categoryTiles = [
    {
      id: 'popular-shelf',
      badge: 'Bán chạy nhất',
      title: 'Khóa Học Bán Chạy Nhất',
      subtitle: 'Nghiệp vụ tín dụng, thẩm định CIC và kỹ năng quan hệ khách hàng cá nhân & SME.',
      coursesCount: '12+ khóa học',
      icon: TrendingUp,
      accentColor: 'from-blue-600 to-indigo-600',
      tagColor: 'bg-blue-50 text-[#0073C1] border-blue-200',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'ai-shelf',
      badge: 'Xu hướng 2026',
      title: 'Đột Phá Công Nghệ & AI',
      subtitle: 'Khai mở Generative AI, AI Agents và tự động hóa quy trình nghiệp vụ ngân hàng hiện đại.',
      coursesCount: '8+ chương trình',
      icon: Sparkles,
      accentColor: 'from-purple-600 to-blue-600',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'certificates-shelf',
      badge: 'Bảo lãnh việc làm',
      title: 'Chứng Chỉ Nghề Nghiệp',
      subtitle: 'Chứng chỉ chính thức được ngân hàng đối tác MSB và các tổ chức tài chính ưu tiên tuyển dụng.',
      coursesCount: '15+ chứng chỉ',
      icon: ShieldCheck,
      accentColor: 'from-emerald-600 to-teal-600',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'degrees-shelf',
      badge: 'Lộ trình chuyên sâu',
      title: 'Bằng Cấp & Nâng Cao',
      subtitle: 'Lộ trình chuẩn hóa theo khung năng lực quản trị từ cấp Chuyên viên đến Giám đốc Chi nhánh.',
      coursesCount: '6+ lộ trình',
      icon: GraduationCap,
      accentColor: 'from-amber-600 to-orange-600',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    }
  ];

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50 py-10 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 relative z-10">
        {/* Section Heading */}
        <div className="text-center space-y-2.5 sm:space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-0.5 sm:py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#0073C1] text-[11px] sm:text-xs font-extrabold uppercase tracking-widest shadow-2xs">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0073C1] animate-pulse" />
            <span>{eyebrow}</span>
          </div>

          <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            NÂNG TẦM NĂNG LỰC,{' '}
            <span className="bg-gradient-to-r from-[#00388A] via-[#0050D8] to-[#0073C1] bg-clip-text text-transparent">
              KIẾN TẠO TƯƠNG LAI
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>

          {/* Mobile Swipe Hint */}
          <div className="sm:hidden pt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#0073C1]">
            <span>Vuốt ngang để xem 4 lộ trình</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 4 Premium Category Cards: Swipeable rail on mobile, Grid on tablet/desktop */}
        <div className="flex overflow-x-auto -mx-4 px-4 gap-3.5 no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:mx-0 sm:px-0 sm:gap-6 pb-2">
          {categoryTiles.map((tile) => {
            const IconComponent = tile.icon;
            return (
              <div
                key={tile.id}
                onClick={() => onScrollToSection(tile.id)}
                className="w-[76vw] max-w-[280px] shrink-0 snap-start sm:w-auto sm:shrink group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl hover:border-[#0073C1] transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1.5 select-none"
              >
                {/* Image Banner */}
                <div className="h-36 sm:h-48 overflow-hidden bg-slate-100 relative">
                  <img
                    src={tile.image}
                    alt={tile.title}
                    className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Gradient shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />

                  {/* Top Badge */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
                    <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border ${tile.tagColor}`}>
                      {tile.badge}
                    </span>
                  </div>

                  {/* Icon badge floating at bottom right */}
                  <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/90 backdrop-blur-md text-slate-900 flex items-center justify-center shadow-md group-hover:bg-[#0073C1] group-hover:text-white transition-all duration-300">
                    <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono">
                      {tile.coursesCount}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0073C1] transition-colors leading-snug">
                      {tile.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {tile.subtitle}
                    </p>
                  </div>

                  {/* Bottom Action Link */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#0073C1]">
                    <span>Khám phá danh mục</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1.5 text-[#0073C1]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
