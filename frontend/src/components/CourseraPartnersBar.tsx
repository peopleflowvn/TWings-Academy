import React from 'react';
import { Building2, ExternalLink, ShieldCheck } from 'lucide-react';
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
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    slogan: 'Tập đoàn Đầu tư & Phát triển Bất động sản, Dịch vụ',
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
    slogan: 'Tư vấn & Cung ứng Giải pháp Nhân sự Chiến lược',
    tag: 'Kết nối việc làm',
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
    tag: 'Đối tác ngân hàng',
    type: 'company',
    websiteUrl: 'https://www.mbbank.com.vn',
  },
];

export const CourseraPartnersBar: React.FC<CourseraPartnersBarProps> = ({
  partners = [],
  title,
}) => {
  // Use provided partners if available, otherwise high-converting default partners
  const activePartners = partners.filter((p: any) => p.is_active !== false);
  const displayPartners = activePartners.length > 0 ? activePartners : DEFAULT_PARTNERS;

  if (displayPartners.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-white via-slate-50/60 to-white py-8 sm:py-12 border-b border-slate-200/80 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[180px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-7 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[#0073C1] text-xs font-extrabold uppercase tracking-widest shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0073C1]" />
            <span>Mạng Lưới Đối Tác & Bảo Lãnh Tuyển Dụng</span>
          </span>

          <h2 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight">
            {title || (
              <>
                Đồng hành đào tạo cùng các Ngân hàng & Tập đoàn đối tác của{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0073C1] to-[#2C93E8]">
                  TWINGS ACADEMY
                </span>
              </>
            )}
          </h2>
        </div>

        {/* Logos Container: Smooth horizontal swipe on mobile, centered grid on desktop */}
        <div className="flex items-center sm:justify-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
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
                className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-[#0073C1]/50 transition-all shrink-0 select-none shadow-2xs hover:shadow-md hover:-translate-y-0.5 group duration-300 ${
                  hasWebsite ? 'cursor-pointer' : 'cursor-default'
                }`}
                title={p.slogan || p.name}
              >
                {/* Logo Box */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50 p-1.5 shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 group-hover:bg-white transition-all">
                  {p.logoUrl ? (
                    <img 
                      loading="lazy" 
                      decoding="async"
                      src={p.logoUrl}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-[#0073C1]" />
                  )}
                </div>

                {/* Text Details */}
                <div className="text-left pr-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap group-hover:text-[#0073C1] transition-colors leading-tight"
                      style={{ color: p.logoColor || p.themeColor || '#0f172a' }}
                    >
                      {p.logoText || p.name}
                    </span>

                    {p.tag && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#0073C1] border border-blue-100 hidden sm:inline-block leading-tight">
                        {p.tag}
                      </span>
                    )}

                    {hasWebsite && (
                      <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-[#0073C1] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>

                  {p.slogan && (
                    <div className="text-[11px] text-slate-500 font-medium line-clamp-1 max-w-[140px] sm:max-w-[190px] mt-0.5">
                      {p.slogan}
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
