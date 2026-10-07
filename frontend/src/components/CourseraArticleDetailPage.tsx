import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Eye, 
  Share2, 
  BookOpen, 
  Check, 
  Sparkles, 
  ArrowRight,
  Globe,
  Tag,
  Facebook,
  Linkedin,
  Clock
} from 'lucide-react';
import { ShareButtons } from './ShareButtons';
import { MarkdownContent } from './MarkdownContent';
import { Article, Course } from '../types';
import { routePath } from '../lib/routes';

interface CourseraArticleDetailPageProps {
  article: Article;
  allCourses: Course[];
  onBackToArticles: () => void;
  onSelectCourse: (course: Course) => void;
  onOpenConsultation: () => void;
}

export const CourseraArticleDetailPage: React.FC<CourseraArticleDetailPageProps> = ({
  article,
  allCourses,
  onBackToArticles,
  onSelectCourse,
  onOpenConsultation,
}) => {

  // Find relevant courses matching the article's category or keywords
  const relevantCourses = allCourses.filter((c) => {
    return (
      c.category.toLowerCase().includes(article.category.toLowerCase()) ||
      article.tags.some((t) => c.title.toLowerCase().includes(t.toLowerCase())) ||
      c.title.toLowerCase().includes(article.focusKeyword.toLowerCase())
    );
  }).slice(0, 3);

  const fallbackCourses = relevantCourses.length > 0 ? relevantCourses : allCourses.slice(0, 3);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* 1. Breadcrumbs & Header Bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 text-xs">
          <a
            href={routePath('articles')}
            onClick={(e) => {
              e.preventDefault();
              onBackToArticles();
            }}
            className="flex items-center gap-1.5 text-slate-600 hover:text-[#0073C1] font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Danh sách Tin tức</span>
          </a>

          <ShareButtons title={article.title} />
        </div>
      </div>

      {/* 2. Main Article Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Article Meta Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-[#0073C1] text-xs font-bold rounded-full border border-blue-200">
              {article.category}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-mono font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Điểm SEO On-Page: {article.seoScore}/100</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-1 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <User className="w-4 h-4 text-blue-600" />
                <span>{article.author}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{article.publishedAt}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>5 phút đọc</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-slate-500">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>{article.viewsCount.toLocaleString()} lượt xem</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100 max-h-[460px]">
          <img fetchPriority="high"
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Lead Excerpt Box */}
        <div className="p-5 sm:p-6 bg-blue-50/80 rounded-2xl border-l-4 border-[#0073C1] text-xs sm:text-sm text-slate-800 font-medium leading-relaxed italic">
          "{article.excerpt}"
        </div>

        {/* Article Full Content (Rich Markdown typography) */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-2xs">
          <MarkdownContent content={article.content} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Thẻ từ khóa:</span>
          </span>
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium cursor-pointer transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 3. DEDICATED SECTION: "Khóa Học Đề Xuất Phù Hợp Cho Bạn" */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0073C1] text-xs font-bold mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>NÂNG CAO NĂNG LỰC THỰC CHIẾN</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Khóa Học Đề Xuất Phù Hợp Với Bài Viết Này
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Được bảo trợ chuyên môn bởi MSB Bank, ROX Group và học viện TWings Academy.
              </p>
            </div>

            <button
              onClick={onOpenConsultation}
              className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#D94F04] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              Đăng ký tư vấn ngay
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fallbackCourses.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between p-4 group space-y-3"
              >
                <div className="space-y-2">
                  <div className="h-32 rounded-xl overflow-hidden bg-slate-200 relative">
                    <img loading="lazy" decoding="async"
                      src={c.thumbnail}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      {c.level}
                    </span>
                  </div>

                  <h3
                    onClick={() => onSelectCourse(c)}
                    className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#0073C1] transition-colors cursor-pointer line-clamp-2"
                  >
                    {c.title}
                  </h3>

                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    {c.partner?.name || 'TWINGS ACADEMY'}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="font-mono font-bold text-xs text-slate-900">
                    {formatVND(c.price)}
                  </div>
                  <a
                    href={routePath('course-detail', c.slug)}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectCourse(c);
                    }}
                    className="text-xs font-bold text-[#0073C1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem khóa</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
