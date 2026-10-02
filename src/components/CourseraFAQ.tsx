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
    <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Giải Đáp Thắc Mắc</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {displayItems.map((item) => {
            const isOpen = openIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-colors"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#0056D2]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 bg-slate-50/50">
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
