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
  const displayPartners = partners;
  if (displayPartners.length === 0) return null;

  return (
    <section className="bg-white py-6 sm:py-9 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <h2 className="text-center text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">
          {title || (
            <>
              Đối tác chiến lược đào tạo & kết nối tuyển dụng cùng{' '}
              <span className="font-extrabold text-[#0050D8]">TWINGS ACADEMY</span>
            </>
          )}
        </h2>

        {/* Logos Container: Smooth horizontal swipe rail on mobile, centered wrap on desktop */}
        <div className="flex items-center sm:justify-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
          {displayPartners.map((p) => (
            <div
              key={p.id || p.name}
              onClick={() => {
                if (p.websiteUrl) window.open(p.websiteUrl, '_blank');
              }}
              className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 hover:border-blue-300 transition-all shrink-0 select-none shadow-2xs hover:shadow-sm ${
                p.websiteUrl ? 'cursor-pointer group' : 'cursor-default'
              }`}
              title={p.slogan || p.name}
            >
              {p.logoUrl ? (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
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
                </div>
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-[#0050D8] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              )}

              <div className="text-left pr-1.5 sm:pr-2">
                <div
                  className="text-xs sm:text-sm font-extrabold tracking-tight select-none leading-none group-hover:text-[#0050D8] transition-colors whitespace-nowrap"
                  style={{ color: p.logoColor || '#1e293b' }}
                >
                  {p.logoText || p.name}
                </div>
                {p.slogan && (
                  <div className="text-[10px] text-slate-500 font-medium line-clamp-1 max-w-[130px] sm:max-w-[160px] mt-1">
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
