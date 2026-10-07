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
 * viên, from TWings' own surveys), then approved reviews written from learner accounts. No built-in
 * samples: the section is hidden while both are empty.
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
    <section className="bg-slate-50 py-12 sm:py-16 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Học viên nói gì</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
          {config?.subtitle && <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{config.subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div className="space-y-4">
                <Quote className="w-8 h-8 text-blue-200/80" />
                {c.rating !== undefined && (
                  <div className="flex gap-0.5" aria-label={`${c.rating}/5 sao`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < c.rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-700 leading-relaxed italic">“{c.quote}”</p>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 space-y-3">
                {c.outcome && (
                  <a
                    href={c.link}
                    className={`bg-emerald-50 text-emerald-800 text-[11px] font-semibold p-2.5 rounded-lg border border-emerald-100 flex items-start gap-1.5 ${
                      c.link ? 'hover:bg-emerald-100' : 'pointer-events-none'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{c.outcome}</span>
                  </a>
                )}
                <div className="flex items-center gap-3">
                  <Avatar src={c.avatar} name={c.name} className="w-10 h-10 rounded-full border border-slate-200 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{c.name}</div>
                    {c.role && <div className="text-[11px] text-slate-500">{c.role}</div>}
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
