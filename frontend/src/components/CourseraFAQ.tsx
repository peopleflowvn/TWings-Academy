import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '../data/courseraData';
import { CMSSectionsConfig } from '../types';

interface CourseraFAQProps {
  config?: CMSSectionsConfig['faq'];
}

export const CourseraFAQ: React.FC<CourseraFAQProps> = ({ config }) => {
  const [openIds, setOpenIds] = useState<string[]>(['faq-1', 'faq-4']);

  const title = config?.title || 'Giải Đáp Thắc Mắc Thường Gặp (FAQ)';
  const subtitle = config?.subtitle || 'Mọi điều bạn cần biết về hình thức học LMS, cấp tài khoản riêng và cơ hội thực tập tại ngân hàng MSB.';
  const displayItems = config?.items && config.items.length > 0 ? config.items : FAQ_ITEMS;

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="bg-white py-10 sm:py-20 border-b border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-[#0050D8] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-[#0050D8]" />
            <span>Giải Đáp Thắc Mắc</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {displayItems.map((item) => {
            const isOpen = openIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isOpen 
                    ? 'border-blue-300 shadow-md bg-white' 
                    : 'border-slate-200/90 hover:border-slate-300 bg-white shadow-2xs'
                }`}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full px-5 py-4 sm:px-6 sm:py-4.5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                    {item.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-blue-50 text-[#0050D8]' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
