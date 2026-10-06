import React, { useState } from 'react';
import { 
  Search, 
  Tag, 
  Calendar, 
  Eye, 
  User, 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Globe
} from 'lucide-react';
import { Article, Course } from '../types';

interface CourseraArticlesPageProps {
  articles: Article[];
  courses: Course[];
  onSelectArticle: (article: Article) => void;
  onSelectCourse: (course: Course) => void;
  onOpenConsultation: () => void;
}

export const CourseraArticlesPage: React.FC<CourseraArticlesPageProps> = ({
  articles,
  courses,
  onSelectArticle,
  onSelectCourse,
  onOpenConsultation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  const categories = ['Tất cả', ...Array.from(new Set(articles.map((a) => a.category)))];

  const filteredArticles = articles.filter((art) => {
    const matchesSearch = 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'Tất cả' || art.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticle = articles[0];

  return (
    <div className="bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0073C1] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>TRI THỨC & CẨM NANG THỰC CHIẾN 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tin Tức, Phân Tích Nghiệp Vụ & Cẩm Nang Nghề Nghiệp
          </h1>
          <p className="text-sm text-slate-600">
            Cập nhật xu hướng ngân hàng thương mại, kỹ năng tín dụng doanh nghiệp, ứng dụng AI thực tế và bí quyết chinh phục nhà tuyển dụng từ các chuyên gia MSB & TWings Academy.
          </p>
        </div>

        {/* Featured Hero Article (Professional Banking Image & Standalone Click) */}
        {featuredArticle && !searchQuery && selectedCategory === 'Tất cả' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div 
                onClick={() => onSelectArticle(featuredArticle)}
                className="lg:col-span-7 h-72 lg:h-auto relative overflow-hidden bg-slate-100 cursor-pointer group"
              >
                <img loading="lazy" decoding="async"
                  src={featuredArticle.featuredImage || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80'}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-[#0073C1] text-white text-xs font-bold rounded-full shadow-md">
                  {featuredArticle.category}
                </span>
                <span className="absolute bottom-4 left-4 px-3 py-1 bg-black/75 backdrop-blur-md text-white text-[11px] font-mono rounded-xl flex items-center gap-1.5 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Điểm SEO: {featuredArticle.seoScore}/100</span>
                </span>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      {featuredArticle.author}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {featuredArticle.publishedAt}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {featuredArticle.viewsCount.toLocaleString()} lượt đọc
                    </span>
                  </div>

                  <h2 
                    onClick={() => onSelectArticle(featuredArticle)}
                    className="text-xl sm:text-2xl font-black text-slate-900 hover:text-[#0073C1] transition-colors cursor-pointer leading-snug"
                  >
                    {featuredArticle.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {featuredArticle.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onSelectArticle(featuredArticle)}
                    className="flex items-center gap-2 text-xs font-bold text-[#0073C1] hover:underline cursor-pointer group"
                  >
                    <span>Đọc toàn bộ bài viết</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={onOpenConsultation}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0073C1] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Tư vấn lộ trình học
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#0073C1] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài viết, từ khóa..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-lg transition-all overflow-hidden flex flex-col group"
            >
              <div 
                className="h-48 relative overflow-hidden bg-slate-100 cursor-pointer"
                onClick={() => onSelectArticle(art)}
              >
                <img loading="lazy" decoding="async"
                  src={art.featuredImage}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#0073C1] text-white text-[10px] font-bold rounded-full">
                  {art.category}
                </span>
                <span className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono rounded">
                  SEO {art.seoScore}/100
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{art.author}</span>
                    <span>·</span>
                    <span>{art.publishedAt}</span>
                  </div>

                  <h3
                    onClick={() => onSelectArticle(art)}
                    className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#0073C1] transition-colors cursor-pointer line-clamp-2"
                  >
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{art.viewsCount.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => onSelectArticle(art)}
                    className="text-[#0073C1] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Đọc bài viết</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <Globe className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base text-slate-800">Không tìm thấy bài viết phù hợp</h3>
            <p className="text-xs text-slate-500">Thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục khác.</p>
          </div>
        )}
      </div>
    </div>
  );
};
