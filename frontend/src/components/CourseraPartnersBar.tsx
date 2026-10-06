import React from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { PartnerItem } from '../types';
import { DEFAULT_PARTNERS } from '../data/courseraData';

interface CourseraPartnersBarProps {
  partners?: PartnerItem[];
  title?: string;
}

export const CourseraPartnersBar: React.FC<CourseraPartnersBarProps> = ({
  partners = DEFAULT_PARTNERS,
  title,
}) => {
  const displayPartners = partners && partners.length > 0 ? partners : DEFAULT_PARTNERS;

  return (
    <section className="bg-white py-8 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <h2 className="text-center text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
          {title || (
            <>
              Đối tác chiến lược đào tạo & kết nối tuyển dụng cùng{' '}
              <span className="font-extrabold text-[#0073C1]">TWINGS ACADEMY</span>
            </>
          )}
        </h2>

        {/* Real Logos Container */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {displayPartners.map((p) => (
            <div
              key={p.id || p.name}
              onClick={() => {
                if (p.websiteUrl) window.open(p.websiteUrl, '_blank');
              }}
              className={`flex items-center gap-2.5 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all ${
                p.websiteUrl ? 'cursor-pointer group' : 'cursor-default'
              }`}
              title={p.slogan || p.name}
            >
              {p.logoUrl ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <img loading="lazy" decoding="async"
                    src={p.logoUrl}
                    alt={p.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0073C1] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              )}

              <div className="text-left">
                <div
                  className="text-xs sm:text-sm font-black tracking-tight select-none leading-none group-hover:text-[#0073C1] transition-colors"
                  style={{ color: p.logoColor || '#1e293b' }}
                >
                  {p.logoText || p.name}
                </div>
                {p.slogan && (
                  <div className="text-[10px] text-slate-400 font-medium line-clamp-1 max-w-[140px]">
                    {p.slogan}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
