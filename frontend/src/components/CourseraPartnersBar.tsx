import React from 'react';
import { Building2, ExternalLink, Handshake, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { PartnerItem } from '../types';
import { isBackendEnabled } from '../lib/api';

interface CourseraPartnersBarProps {
  partners?: PartnerItem[];
  title?: string;
}

const DEFAULT_PARTNERS: PartnerItem[] = [
  {
    id: 'p-msb',
    name: 'MSB Bank',
    logoText: 'MSB',
    logoColor: '#EA580C',
    themeColor: '#EA580C',
    logoUrl: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=300&q=80',
    slogan: 'Ngân hàng TMCP Hàng Hải Việt Nam',
    tag: 'Bảo lãnh tuyển dụng',
    type: 'company',
    websiteUrl: 'https://www.msb.com.vn',
  },
  {
    id: 'p-rox',
    name: 'ROX Group',
    logoText: 'ROX GROUP',
    logoColor: '#E65100',
    themeColor: '#E65100',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80',
    slogan: 'Tập đoàn Đầu tư & Phát triển Đa ngành',
    tag: 'Đối tác chiến lược',
    type: 'company',
    websiteUrl: 'https://roxgroup.vn',
  },
  {
    id: 'p-tntalent',
    name: 'TNTalent',
    logoText: 'TNTALENT',
    logoColor: '#DC2626',
    themeColor: '#DC2626',
    logoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=300&q=80',
    slogan: 'Giải pháp Nhân sự & Thu hút Nhân tài',
    tag: 'Cung ứng nhân sự',
    type: 'company',
    websiteUrl: 'https://tntalent.vn',
  },
  {
    id: 'p-mbbank',
    name: 'MB Bank',
    logoText: 'MB BANK',
    logoColor: '#0048C8',
    themeColor: '#0048C8',
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80',
    slogan: 'Ngân hàng TMCP Quân Đội',
    tag: 'Đối tác tuyển dụng',
    type: 'company',
    websiteUrl: 'https://www.mbbank.com.vn',
  },
];

export const CourseraPartnersBar: React.FC<CourseraPartnersBarProps> = ({
  partners = [],
  title,
}) => {
  const activePartners = partners.filter((p: any) => p.is_active !== false);
  // The bundled list only styles known partners (and fills the local demo); live, the partners staff list.
  const basePartners = activePartners.length > 0 || isBackendEnabled() ? activePartners : DEFAULT_PARTNERS;

  // Enrich items with default tags/logos if cms items don't provide them yet
  const displayPartners = basePartners.map((p) => {
    const matched = DEFAULT_PARTNERS.find(
      (d) => d.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(d.name.toLowerCase())
    );
    return {
      ...matched,
      ...p,
      tag: p.tag || matched?.tag || 'Đối tác chiến lược',
      logoUrl: p.logoUrl || matched?.logoUrl,
      websiteUrl: p.websiteUrl || matched?.websiteUrl,
      slogan: p.slogan || matched?.slogan,
      logoText: p.logoText || matched?.logoText || p.name,
      themeColor: p.themeColor || matched?.themeColor || '#0073C1',
    };
  });

  if (displayPartners.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-white via-sky-50/20 to-slate-50/40 py-8 sm:py-12 border-b border-slate-200/80 relative overflow-hidden">
      {/* Background ambient glow circles */}
      <div className="absolute top-0 left-1/4 w-72 sm:w-[420px] h-72 sm:h-[420px] bg-sky-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 sm:w-[420px] h-72 sm:h-[420px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 sm:space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 border border-sky-200/80 text-[#0073C1] text-[11px] font-black uppercase tracking-wider shadow-2xs">
            <Handshake className="w-3.5 h-3.5 text-[#0073C1]" />
            <span>Mạng Lưới Đối Tác Doanh Nghiệp</span>
          </div>

          <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight leading-snug">
            {title || (
              <>
                Đồng hành đào tạo & Bảo lãnh tuyển dụng cùng các{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0073C1] via-[#0E6BBB] to-[#2C93E8]">
                  Ngân hàng & Tập đoàn hàng đầu
                </span>
              </>
            )}
          </h2>
        </div>

        {/* Logos & Partners Cards Grid - 2 cols on mobile, 4 cols on lg */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto">
          {displayPartners.map((p) => {
            const hasWebsite = Boolean(p.websiteUrl);

            return (
              <div
                key={p.id || p.name}
                onClick={() => {
                  if (hasWebsite && p.websiteUrl) {
                    window.open(p.websiteUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`group relative flex flex-col justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 hover:border-sky-400/80 shadow-xs hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300 select-none ${
                  hasWebsite ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'
                }`}
                title={p.name}
              >
                {/* Header of Card (Tag & External Icon) */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0073C1] border border-sky-100 group-hover:bg-[#0073C1] group-hover:text-white transition-colors truncate max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-white shrink-0" />
                    <span className="truncate">{p.tag}</span>
                  </span>

                  {hasWebsite && (
                    <span className="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded text-slate-400 group-hover:text-[#0073C1] transition-colors shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Center: Brand Logo Box */}
                <div className="py-1 flex flex-col items-center justify-center text-center">
                  <div className="h-11 sm:h-13 w-full flex items-center justify-center px-2 py-1 rounded-lg sm:rounded-xl bg-slate-50/70 border border-slate-100 group-hover:bg-white group-hover:border-sky-100 transition-all">
                    {p.logoUrl ? (
                      <img 
                        loading="lazy" 
                        decoding="async"
                        src={p.logoUrl}
                        alt={p.name}
                        className="max-h-8 sm:max-h-9 max-w-full object-contain filter group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-[#0073C1]" />
                    )}
                  </div>

                  {/* Brand Name Typography */}
                  <div className="mt-2">
                    <span
                      className="text-xs sm:text-sm font-black tracking-tight group-hover:text-[#0073C1] transition-colors truncate block"
                      style={{ color: p.logoColor || p.themeColor || '#0f172a' }}
                    >
                      {p.logoText || p.name}
                    </span>
                  </div>

                  {/* Short subtitle / slogan - 1 line */}
                  {p.slogan && (
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 leading-snug line-clamp-1" title={p.slogan}>
                      {p.slogan}
                    </p>
                  )}
                </div>

                {/* Bottom micro highlight */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-semibold text-slate-400 group-hover:text-[#0073C1] transition-colors">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">Xác thực bởi TWings</span>
                  </span>
                  {hasWebsite && (
                    <ExternalLink className="w-3 h-3 sm:hidden text-slate-400 group-hover:text-[#0073C1]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

