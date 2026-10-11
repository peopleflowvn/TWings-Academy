import React from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { PartnerItem } from '../types';

interface CourseraPartnersBarProps {
  partners?: PartnerItem[];
  title?: string;
}

export const CourseraPartnersBar: React.FC<CourseraPartnersBarProps> = ({
  partners = [],
  title,
}) => {
  // Only the partners entered in /app (Đối tác): never a built-in sample list.
  const displayPartners = partners;
  if (displayPartners.length === 0) return null;

  return (
    <section className="bg-white py-5 sm:py-8 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <h2 className="text-center text-[11px] sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
          {title || (
            <>
              Đối tác chiến lược đào tạo & kết nối tuyển dụng cùng{' '}
              <span className="font-extrabold text-[#0073C1]">TWINGS ACADEMY</span>
            </>
          )}
        </h2>

        {/* Logos Container: Smooth horizontal swipe rail on mobile, centered wrap on desktop */}
        <div className="flex items-center sm:justify-center gap-2.5 sm:gap-8 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
          {displayPartners.map((p) => (
            <div
              key={p.id || p.name}
              onClick={() => {
                if (p.websiteUrl) window.open(p.websiteUrl, '_blank');
              }}
              className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-slate-50/80 sm:bg-transparent hover:bg-slate-50 border border-slate-200/80 sm:border-transparent hover:border-slate-200 transition-all shrink-0 select-none ${
                p.websiteUrl ? 'cursor-pointer group' : 'cursor-default'
              }`}
              title={p.slogan || p.name}
            >
              {p.logoUrl ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <img loading="lazy" decoding="async"
                    src={p.logoUrl}
                    alt={p.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-[#0073C1] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              )}

              <div className="text-left pr-1 sm:pr-0">
                <div
                  className="text-xs sm:text-sm font-black tracking-tight select-none leading-none group-hover:text-[#0073C1] transition-colors whitespace-nowrap"
                  style={{ color: p.logoColor || '#1e293b' }}
                >
                  {p.logoText || p.name}
                </div>
                {p.slogan && (
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium line-clamp-1 max-w-[120px] sm:max-w-[140px] mt-0.5">
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
