import React from 'react';
import { Quote, TrendingUp, CheckCircle, Star } from 'lucide-react';
import { TESTIMONIALS } from '../data/courseraData';

export const CourseraTestimonials: React.FC = () => {
  return (
    <section className="bg-slate-50 py-12 sm:py-16 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Kết Quả Sự Nghiệp Thực Tế</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Từ cộng đồng học viên Coursera toàn cầu
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            <span className="font-bold text-[#0056D2]">77% người học</span> báo cáo đạt được lợi ích sự nghiệp rõ ràng: được thăng chức, tăng lương hoặc chuyển sang vai trò công nghệ mới.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div className="space-y-4">
                <Quote className="w-8 h-8 text-blue-200/80" />
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  {t.quote}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 space-y-3">
                <div className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold p-2.5 rounded-lg border border-emerald-100 flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t.outcome}</span>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    loading="lazy"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
