import React from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  ArrowRight, 
  Layers,
  Users,
  Briefcase,
  Award,
  PlayCircle
} from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface IntroSectionProps {
  introData?: CMSSectionsConfig['intro'];
  onScrollToSection: (sectionId: string) => void;
  /** Course count of each shelf shown on the page; a tile without its shelf is not shown. */
  shelfCounts?: Record<string, number>;
}

const TRUST_STATS = [
  {
    icon: Users,
    number: '5.000+',
    label: 'Học viên đã tốt nghiệp',
    subtext: 'Gia nhập các Ngân hàng lớn',
    color: 'text-[#0073C1]',
    glowBg: 'bg-blue-500/10',
    borderColor: 'border-blue-200/80',
    badgeColor: 'bg-blue-50 text-[#0073C1]',
  },
  {
    icon: Briefcase,
    number: '95%',
    label: 'Tỷ lệ có việc làm',
    subtext: 'Bảo lãnh & giới thiệu tại MSB',
    color: 'text-emerald-600',
    glowBg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-200/80',
    badgeColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Award,
    number: '100%',
    label: 'Giảng viên Giám đốc Khối',
    subtext: '20+ năm nghiệp vụ thực chiến',
    color: 'text-amber-600',
    glowBg: 'bg-amber-500/10',
    borderColor: 'border-amber-200/80',
    badgeColor: 'bg-amber-50 text-amber-700',
  },
  {
    icon: PlayCircle,
    number: 'Miễn phí',
    label: 'Học thử Video YouTube',
    subtext: 'Kiểm tra chất lượng trước khi mua',
    color: 'text-rose-600',
    glowBg: 'bg-rose-500/10',
    borderColor: 'border-rose-200/80',
    badgeColor: 'bg-rose-50 text-rose-700',
  },
];

export const IntroSection: React.FC<IntroSectionProps> = ({ introData, onScrollToSection, shelfCounts = {} }) => {
  const eyebrow = introData?.eyebrow || 'TWINGS ACADEMY';
  const headline = introData?.headline || 'NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI';
  const description = introData?.description || 'TWings Academy giúp bạn phát triển nhanh những năng lực thực tiễn, thích ứng với thị trường lao động không ngừng thay đổi và chủ động tiến xa trên hành trình sự nghiệp.';

  const categoryTiles = [
    {
      id: 'popular-shelf',
      badge: 'Bán chạy nhất',
      title: 'Khóa Học Nghiệp Vụ Bán Chạy',
      subtitle: 'Nghiệp vụ tín dụng, thẩm định CIC và kỹ năng quan hệ khách hàng cá nhân & SME.',
      coursesCount: '',
      icon: TrendingUp,
      accentColor: 'from-[#0073C1] to-[#0E6BBB]',
      tagColor: 'bg-[#D7F5FF] text-[#0073C1] border-[#94D9FF]',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'ai-shelf',
      badge: 'Xu hướng 2026',
      title: 'Đột Phá Công Nghệ & AI',
      subtitle: 'Khai mở Generative AI, AI Agents và tự động hóa quy trình nghiệp vụ ngân hàng hiện đại.',
      coursesCount: '',
      icon: Sparkles,
      accentColor: 'from-purple-600 to-[#0073C1]',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'certificates-shelf',
      badge: 'Bảo lãnh việc làm',
      title: 'Chứng Chỉ Nghề Nghiệp',
      subtitle: 'Chứng chỉ chính thức được ngân hàng đối tác MSB và các tổ chức tài chính ưu tiên tuyển dụng.',
      coursesCount: '',
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
      coursesCount: '',
      icon: GraduationCap,
      accentColor: 'from-amber-600 to-orange-600',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    }
  ];

  // Only tiles whose shelf is on the page, with its real number of courses.
  const tiles = categoryTiles
    .filter((t) => shelfCounts[t.id])
    .map((t) => ({ ...t, coursesCount: `${shelfCounts[t.id]} khóa học đang tuyển` }));

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50 py-10 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-[#E1E6EA] relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[380px] bg-[#D7F5FF]/50 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 relative z-10">
        {/* Section Heading */}
        <div className="text-center space-y-3 sm:space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/70 text-[#0073C1] text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#0073C1] animate-pulse" />
            <span>{eyebrow}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#1e293b] tracking-tight leading-tight">
            NÂNG TẦM NĂNG LỰC,{' '}
            <span className="whitespace-nowrap bg-gradient-to-r from-[#0073C1] via-[#0E6BBB] to-[#2C93E8] bg-clip-text text-transparent">
              KIẾN TẠO TƯƠNG LAI
            </span>
          </h2>

          <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>

          {/* 4 Trust & Metrics Stat Cards directly under the headline */}
          <div className="pt-4 sm:pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto text-left">
              {TRUST_STATS.map((stat, sIdx) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={sIdx}
                    className="bg-white hover:bg-white border border-slate-200/90 hover:border-sky-400/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 group cursor-default shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl ${stat.glowBg} ${stat.borderColor} border ${stat.color} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${stat.badgeColor} border border-current/20`}>
                        {stat.subtext.split(' ')[0] || 'Chứng thực'}
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1.5 group-hover:text-[#0073C1] transition-colors">
                        {stat.number}
                      </div>
                      <div className="text-sm font-bold text-slate-800 leading-snug">
                        {stat.label}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        {stat.subtext}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Swipe Hint */}
          {tiles.length > 1 && (
            <div className="sm:hidden pt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0073C1]">
              <span>Vuốt ngang để xem {tiles.length} nhóm chương trình</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* 4 Premium Category Cards */}
        {tiles.length > 1 && (
          <div className="flex overflow-x-auto -mx-4 px-4 gap-4 no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:mx-0 sm:px-0 sm:gap-6 pb-2">
            {tiles.map((tile) => {
              const IconComponent = tile.icon;
              return (
                <div
                  key={tile.id}
                  onClick={() => onScrollToSection(tile.id)}
                  className="w-[78vw] max-w-[290px] shrink-0 snap-start sm:w-auto sm:shrink group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E1E6EA] shadow-xs hover:shadow-2xl hover:shadow-[#0073C1]/10 hover:border-[#0073C1] transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1.5 select-none"
                >
                  {/* Image Banner */}
                  <div className="h-40 sm:h-48 overflow-hidden bg-slate-900 relative">
                    <img
                      src={tile.image}
                      alt={tile.title}
                      className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />

                    {/* Top Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border ${tile.tagColor}`}>
                        {tile.badge}
                      </span>
                    </div>

                    {/* Icon badge floating at bottom right */}
                    <div className="absolute bottom-3 right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 backdrop-blur-md text-[#263060] flex items-center justify-center shadow-md group-hover:bg-[#0073C1] group-hover:text-white transition-all duration-300">
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-[10px] sm:text-[11px] font-extrabold text-[#0073C1] uppercase tracking-wider">
                        {tile.coursesCount}
                      </div>
                      <h3 className="text-base font-extrabold text-[#263060] group-hover:text-[#0073C1] transition-colors leading-snug">
                        {tile.title}
                      </h3>
                      <p className="text-xs text-[#424242]/80 leading-relaxed line-clamp-2">
                        {tile.subtitle}
                      </p>
                    </div>

                    {/* Bottom Action Link */}
                    <div className="pt-2 border-t border-[#E1E6EA] flex items-center justify-between text-xs font-bold text-[#0073C1]">
                      <span>Xem các khóa học</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
