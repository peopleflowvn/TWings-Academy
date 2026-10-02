import React from 'react';
import { Instructor } from '../types';

interface InstructorsSectionProps {
  title: string;
  instructors: Instructor[];
}

export const InstructorsSection: React.FC<InstructorsSectionProps> = ({
  title,
  instructors,
}) => {
  return (
    <section id="instructors-section" className="py-16 bg-[#0050D8] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase text-white drop-shadow-md">
            {title}
          </h2>
        </div>

        <div className="space-y-6">
          {instructors.map((inst) => (
            <div
              key={inst.id}
              className="bg-white text-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 border border-blue-200"
            >
              {/* Photo with Orange Corner Accent as shown in Screenshot 7 */}
              <div className="relative shrink-0">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-md bg-slate-100">
                  <img
                    src={inst.avatar}
                    alt={inst.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                {/* Orange accent ribbon on corner */}
                <div className="absolute -bottom-2 -right-2 w-12 h-6 bg-[#FF5722] rounded-br-xl -z-10" />
              </div>

              {/* Bio & Credentials */}
              <div className="space-y-2 text-left">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {inst.name}
                </h3>
                <div className="text-xs sm:text-sm font-semibold text-[#0050D8]">
                  {inst.title}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 text-justify">
                  {inst.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
