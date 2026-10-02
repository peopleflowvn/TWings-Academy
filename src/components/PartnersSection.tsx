import React from 'react';
import { PartnerItem } from '../types';

interface PartnersSectionProps {
  title: string;
  partners: PartnerItem[];
}

export const PartnersSection: React.FC<PartnersSectionProps> = ({
  title,
  partners,
}) => {
  return (
    <section className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0050D8] tracking-wider uppercase inline-block pb-2 border-b-2 border-blue-400">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16 pt-4">
          {/* MSB Brand Badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#EA580C] text-white font-black text-xl flex items-center justify-center shadow-md">
              M
            </div>
            <div className="text-left">
              <div className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                MSB
              </div>
              <div className="text-[11px] font-medium text-slate-500 italic mt-0.5">
                cùng vươn tầm
              </div>
            </div>
          </div>

          {/* ROX Group Brand Badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              ROX
            </div>
            <div className="text-left">
              <div className="text-2xl font-black tracking-widest text-[#E65100] leading-none">
                ROX
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase">
                Tập đoàn ROX
              </div>
            </div>
          </div>

          {/* TNTalent Brand Badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#DC2626] text-white font-black text-lg flex items-center justify-center shadow-md">
              TN
            </div>
            <div className="text-left">
              <div className="text-2xl font-black tracking-tight text-[#DC2626] leading-none">
                TNTalent
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                Giải pháp nhân sự chiến lược
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
