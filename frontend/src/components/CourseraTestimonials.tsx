import React, { useEffect, useState } from 'react';
import { Quote, TrendingUp, CheckCircle, Star } from 'lucide-react';
import { CMSSectionsConfig } from '../types';
import { api, isBackendEnabled } from '../lib/api';
import { Avatar } from './Avatar';

interface CourseraTestimonialsProps {
  config?: CMSSectionsConfig['testimonials'];
}

/** An approved review by a learner who took the course (GET /public/reviews/). */
interface LearnerReview {
  id: string;
  displayName: string;
  role: string;
  rating: number;
  comment: string;
  completed: boolean;
  courseTitle: string;
  courseSlug: string;
  date: string;
}

interface Card {
  id: string;
  name: string;
  role: string;
  avatar: string;
  quote: string;
  rating?: number;
  outcome?: string;
  link?: string;
}

/**
 * Home page "what learners say": the testimonials staff enter in /app (Nội dung trang chủ > Cảm nhận học
 * viên, from TWings' own surveys), then approved reviews written from learner accounts.
 */
export const CourseraTestimonials: React.FC<CourseraTestimonialsProps> = ({ config }) => {
  const [reviews, setReviews] = useState<LearnerReview[]>([]);

  useEffect(() => {
    if (!isBackendEnabled()) return;
    api
      .get<LearnerReview[]>('/public/reviews/')
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  const cards: Card[] = [
    ...(config?.items || [])
      .filter((t) => t.name.trim() && t.quote.trim())
      .map((t) => ({ id: t.id, name: t.name, role: t.role, avatar: t.avatar, quote: t.quote, outcome: t.outcome })),
    ...reviews.map((r) => ({
      id: r.id,
      name: r.displayName,
      role: r.role,
      avatar: '',
      quote: r.comment,
      rating: r.rating,
      outcome: `${r.completed ? 'Đã hoàn thành' : 'Học viên'} · ${r.courseTitle}`,
      link: `/khoa-hoc/${r.courseSlug}`,
    })),
  ].slice(0, 8);

  if (cards.length === 0) return null;

  const title = config?.title || 'Cảm nhận của học viên TWings Academy';

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50 py-10 sm:py-20 border-b border-[#E1E6EA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-[#0073C1] uppercase tracking-wider bg-[#D7F5FF] px-3 py-1 rounded-full border border-[#94D9FF] shadow-2xs">
            <TrendingUp className="w-3.5 h-3.5 text-[#0073C1]" />
            <span>Học viên nói gì</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#263060] tracking-tight leading-tight">
            {title}
          </h2>
          {config?.subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {config.subtitle}
            </p>
          )}
        </div>

        {/* Testimonials: Swipeable rail on mobile (< md), grid on tablet/desktop */}
        <div className="flex overflow-x-auto -mx-4 px-4 gap-4 pb-3 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:mx-0 md:px-0 md:gap-6">
          {cards.map((c) => (
            <div
              key={c.id}
              className="w-[82vw] max-w-[310px] shrink-0 snap-start md:w-auto md:shrink bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#E1E6EA] shadow-xs hover:shadow-xl hover:border-[#5FBEFF] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative select-none"
            >
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <Quote className="w-8 h-8 text-[#94D9FF]" />
                  {c.rating !== undefined && (
                    <div className="flex gap-1 items-center bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80" aria-label={`${c.rating}/5 sao`}>
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-black text-amber-700">{c.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic line-clamp-4">
                  “{c.quote}”
                </p>
              </div>

              <div className="pt-4 sm:pt-6 border-t border-slate-100 mt-4 sm:mt-6 space-y-3">
                {c.outcome && (
                  <a
                    href={c.link}
                    className={`bg-emerald-50 text-emerald-800 text-[10px] sm:text-[11px] font-bold p-2 sm:p-2.5 rounded-xl border border-emerald-200/80 flex items-start gap-1.5 transition-colors ${
                      c.link ? 'hover:bg-emerald-100' : 'pointer-events-none'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{c.outcome}</span>
                  </a>
                )}
                <div className="flex items-center gap-3">
                  <Avatar src={c.avatar} name={c.name} className="w-10 h-10 rounded-full border border-slate-200 shrink-0 shadow-2xs" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">{c.name}</div>
                    {c.role && <div className="text-[11px] text-slate-500 truncate">{c.role}</div>}
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
