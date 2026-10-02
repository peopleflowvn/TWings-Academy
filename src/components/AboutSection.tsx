import React from 'react';
import { Target, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface AboutSectionProps {
  aboutData: CMSSectionsConfig['about'];
}

export const AboutSection: React.FC<AboutSectionProps> = ({ aboutData }) => {
  return (
    <section id="about-twings" className="py-16 bg-[#0050D8] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left leading-relaxed text-xs sm:text-sm">
        {/* Header */}
        <div className="space-y-1">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            {aboutData.title}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            {aboutData.subtitle}
          </h2>
        </div>

        {/* Lead Text matching Screenshot 9 */}
        <div className="text-slate-100 whitespace-pre-line text-justify leading-relaxed">
          {aboutData.lead}
        </div>

        {/* Tầm nhìn matching Screenshot 9 */}
        <div className="space-y-2 pt-2 border-t border-blue-400/40">
          <h3 className="font-bold text-base text-amber-300">
            Tầm nhìn:
          </h3>
          <p className="text-slate-100 leading-relaxed text-justify">
            {aboutData.vision}
          </p>
        </div>

        {/* Sứ mệnh matching Screenshot 9 */}
        <div className="space-y-2 pt-2 border-t border-blue-400/40">
          <h3 className="font-bold text-base text-amber-300">
            Sứ mệnh:
          </h3>
          <ul className="space-y-2 text-slate-100">
            {aboutData.mission.map((m, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-300 font-bold">•</span>
                <span className="text-justify">{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Giá trị cốt lõi matching Screenshot 9 */}
        <div className="space-y-2 pt-2 border-t border-blue-400/40">
          <h3 className="font-bold text-base text-amber-300">
            Giá trị cốt lõi:
          </h3>
          <ul className="space-y-2 text-slate-100">
            {aboutData.coreValues.map((cv, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-300 font-bold">•</span>
                <span className="text-justify">{cv}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
