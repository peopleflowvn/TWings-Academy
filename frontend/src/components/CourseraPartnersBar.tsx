import React from 'react';
import { Building2, ExternalLink, Handshake, ShieldCheck, Sparkles } from 'lucide-react';
import { PartnerItem } from '../types';

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
    logoUrl: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=200&q=80',
    slogan: 'Ngân hàng TMCP Hàng Hải',
    tag: 'Bảo lãnh việc làm',
    type: 'company',
    websiteUrl: 'https://www.msb.com.vn',
  },
  {
    id: 'p-rox',
    name: 'ROX Group',
    logoText: 'ROX GROUP',
    logoColor: '#E65100',
    themeColor: '#E65100',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    slogan: 'Tập đoàn Đầu tư & Phát triển',
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
    logoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=200&q=80',
    slogan: 'Giải pháp Nhân sự Chiến lược',
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
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&q=80',
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
  const basePartners = activePartners.length > 0 ? activePartners : DEFAULT_PARTNERS;

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
    <section className="bg-gradient-to-b from-white via-sky-50/20 to-slate-50/40 py-10 sm:py-14 border-b border-slate-200/70 relative overflow-hidden">
      {/* Background ambient glow circles */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-sky-200/80 text-[#0073C1] text-xs font-black uppercase tracking-wider shadow-2xs">
            <Handshake className="w-3.5 h-3.5 text-[#0073C1]" />
            <span>Mạng Lưới Đối Tác Doanh Nghiệp</span>
          </div>

          <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight leading-snug">
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

        {/* Logos & Partners Cards Grid: 3 or 4 columns gracefully centered */}
        <div className="flex flex-wrap items-stretch justify-center gap-4 max-w-5xl mx-auto">
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
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-sky-400/60 shadow-xs hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300 group select-none w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)] ${
                  hasWebsite ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'
                }`}
                title={p.slogan || p.name}
              >
                {/* Brand Logo Box */}
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 bg-slate-50/80 p-2 shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 group-hover:bg-white group-hover:border-sky-100 transition-all duration-300">
                  {p.logoUrl ? (
                    <img 
                      loading="lazy" 
                      decoding="async"
                      src={p.logoUrl}
                      alt={p.name}
                      className="w-full h-full object-contain filter group-hover:contrast-105 transition-all"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-[#0073C1]" />
                  )}
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-sm font-black tracking-tight whitespace-nowrap group-hover:text-[#0073C1] transition-colors"
                      style={{ color: p.logoColor || p.themeColor || '#0f172a' }}
                    >
                      {p.logoText || p.name}
                    </span>

                    {hasWebsite && (
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0073C1] opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                    )}
                  </div>

                  {p.slogan && (
                    <div className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5" title={p.slogan}>
                      {p.slogan}
                    </div>
                  )}

                  {p.tag && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0073C1] border border-blue-100/80 group-hover:bg-blue-100/80 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{p.tag}</span>
                      </span>
                    </div>
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

