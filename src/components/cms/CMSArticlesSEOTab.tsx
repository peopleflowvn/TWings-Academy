import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Globe, 
  Tag, 
  Calendar,
  Share2
} from 'lucide-react';
import { Article } from '../../types';
import { INITIAL_ARTICLES } from '../../data/courseraData';

export const CMSArticlesSEOTab: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State for Editing/Creating
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ngân Hàng & Tín Dụng');
  const [author, setAuthor] = useState('Ban Biên Tập TWINGS');
  const [featuredImage, setFeaturedImage] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [tags, setTags] = useState('NganHang, TinDung, TuyenDung');

  // Open editor
  const handleOpenEdit = (art: Article) => {
    setEditingArticle(art);
    setIsCreatingNew(false);
    setTitle(art.title);
    setSlug(art.slug);
    setExcerpt(art.excerpt);
    setContent(art.content);
    setCategory(art.category);
    setAuthor(art.author);
    setFeaturedImage(art.featuredImage);
    setFocusKeyword(art.focusKeyword);
    setMetaTitle(art.metaTitle || art.title);
    setMetaDescription(art.metaDescription || art.excerpt);
    setTags(art.tags.join(', '));
  };

  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    setEditingArticle(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCategory('Ngân Hàng & Tín Dụng');
    setAuthor('Ban Biên Tập TWINGS');
    setFeaturedImage('https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80');
    setFocusKeyword('');
    setMetaTitle('');
    setMetaDescription('');
    setTags('KhoaHoc, NganHang');
  };

  // SEO Evaluation Calculator
  const computeSEOScore = () => {
    const kw = focusKeyword.trim().toLowerCase();
    const effectiveTitle = metaTitle || title;
    const effectiveDesc = metaDescription || excerpt;

    const titleLengthPassed = effectiveTitle.length >= 40 && effectiveTitle.length <= 65;
    const metaDescLengthPassed = effectiveDesc.length >= 120 && effectiveDesc.length <= 165;
    const keywordInTitle = kw ? effectiveTitle.toLowerCase().includes(kw) : false;
    const keywordInMeta = kw ? effectiveDesc.toLowerCase().includes(kw) : false;
    const keywordInContent = kw ? content.toLowerCase().includes(kw) : false;

    // Word count & keyword density
    const words = content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const wordCountPassed = wordCount >= 300;

    const kwOccurrences = kw ? (content.toLowerCase().match(new RegExp(kw, 'g')) || []).length : 0;
    const density = wordCount > 0 ? Number(((kwOccurrences / wordCount) * 100).toFixed(1)) : 0;
    const densityPassed = density >= 0.8 && density <= 3.0;

    const hasHeadings = content.includes('##') || content.includes('<h3>') || content.includes('<h2>');
    const hasImage = Boolean(featuredImage.trim());

    let score = 0;
    if (titleLengthPassed) score += 15;
    if (metaDescLengthPassed) score += 15;
    if (keywordInTitle) score += 15;
    if (keywordInMeta) score += 15;
    if (keywordInContent) score += 15;
    if (wordCountPassed) score += 10;
    if (densityPassed) score += 5;
    if (hasHeadings) score += 5;
    if (hasImage) score += 5;

    return {
      score: Math.min(score, 100),
      checks: {
        titleLength: titleLengthPassed,
        metaDescLength: metaDescLengthPassed,
        keywordInTitle,
        keywordInMeta,
        keywordInContent,
        wordCountPassed,
        wordCount,
        density,
        densityPassed,
        hasHeadings,
        hasImage
      }
    };
  };

  const currentSEO = computeSEOScore();

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const finalSEO = computeSEOScore();

    const updatedArticle: Article = {
      id: editingArticle?.id || `art-${Date.now()}`,
      title,
      slug: finalSlug,
      excerpt,
      content,
      category,
      author,
      featuredImage: featuredImage || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      publishedAt: editingArticle?.publishedAt || new Date().toLocaleDateString('vi-VN'),
      status: 'published',
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      viewsCount: editingArticle?.viewsCount || 1,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      focusKeyword,
      canonicalUrl: `https://twings.edu.vn/tin-tuc/${finalSlug}`,
      seoScore: finalSEO.score,
      seoChecks: {
        titleLength: finalSEO.checks.titleLength,
        metaDescLength: finalSEO.checks.metaDescLength,
        keywordInTitle: finalSEO.checks.keywordInTitle,
        keywordInMeta: finalSEO.checks.keywordInMeta,
        keywordInContent: finalSEO.checks.keywordInContent,
        keywordDensity: finalSEO.checks.density,
        hasHeadings: finalSEO.checks.hasHeadings,
        hasFeaturedImage: finalSEO.checks.hasImage,
        contentWordCount: finalSEO.checks.wordCount,
        wordCountPassed: finalSEO.checks.wordCountPassed
      }
    };

    if (isCreatingNew) {
      setArticles([updatedArticle, ...articles]);
    } else {
      setArticles(articles.map((a) => (a.id === updatedArticle.id ? updatedArticle : a)));
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingArticle(null);
      setIsCreatingNew(false);
    }, 1200);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      setArticles(articles.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0073C1]" />
            <h2 className="text-lg font-bold text-slate-900">
              Quản Trị Bài Viết & Hệ Thống Chấm Điểm SEO Tự Động
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chế độ soạn thảo chuyên nghiệp, tính điểm SEO on-page từ 0-100 và mô phỏng hiển thị trên Google Search.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Bài Viết Mới</span>
        </button>
      </div>

      {/* Articles Table */}
      {!editingArticle && !isCreatingNew && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bài viết theo tiêu đề, danh mục..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Bài Viết</th>
                  <th className="p-3.5">Chuyên Mục</th>
                  <th className="p-3.5">Từ Khóa Chính</th>
                  <th className="p-3.5">Điểm SEO</th>
                  <th className="p-3.5">Lượt Đọc</th>
                  <th className="p-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles
                  .filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((art) => (
                    <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={art.featuredImage}
                            alt={art.title}
                            className="w-12 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 max-w-sm truncate">{art.title}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{art.author}</span>
                              <span>·</span>
                              <span>{art.publishedAt}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0073C1] font-bold text-[11px]">
                          {art.category}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-700 font-semibold">
                        "{art.focusKeyword}"
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border inline-flex items-center gap-1 ${
                          art.seoScore >= 80
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : art.seoScore >= 60
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          <span>{art.seoScore}/100</span>
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-700">
                        {art.viewsCount.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(art)}
                          className="p-1.5 hover:bg-blue-50 text-[#0073C1] rounded-lg transition-colors cursor-pointer"
                          title="Sửa & Chấm SEO"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(art.id)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor & Live SEO Evaluation Suite */}
      {(editingArticle || isCreatingNew) && (
        <form onSubmit={handleSaveArticle} className="space-y-6 animate-fadeIn">
          {/* Editor Header Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm sm:text-base">
                {isCreatingNew ? 'Soạn Thảo Bài Viết Mới' : `Chỉnh Sửa: ${title || 'Bài viết'}`}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingArticle(null);
                  setIsCreatingNew(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu & Đăng Bài</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Content Fields */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Tiêu đề bài viết (H1) *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!metaTitle) setMetaTitle(e.target.value);
                  }}
                  placeholder="VD: Cẩm Nang Chinh Phục Vị Trí QHKH Doanh Nghiệp MSB 2026"
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Đường dẫn Slug (URL thân thiện) *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="cam-nang-qhkh-doanh-nghiep-msb"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Chuyên mục *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50"
                  >
                    <option value="Ngân Hàng & Tín Dụng">Ngân Hàng & Tín Dụng</option>
                    <option value="Trí tuệ nhân tạo (AI)">Trí tuệ nhân tạo (AI)</option>
                    <option value="Khoa học dữ liệu">Khoa học dữ liệu</option>
                    <option value="Kinh doanh & Lãnh đạo">Kinh doanh & Lãnh đạo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Đoạn tóm tắt (Excerpt) *</label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Tóm tắt ngắn gọn nội dung cốt lõi của bài viết trong 1-2 câu..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Nội dung bài viết (Hỗ trợ tiêu đề ##, danh sách, đoạn văn) *</label>
                <textarea
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Soạn thảo nội dung bài viết chuyên sâu..."
                  className="w-full p-3 border border-slate-300 rounded-xl font-sans text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Ảnh đại diện bài viết (Thumbnail URL)</label>
                  <input
                    type="text"
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Thẻ Tags (cách nhau bởi dấu phẩy)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Live SEO Scoring Suite */}
            <div className="lg:col-span-4 space-y-6">
              {/* Score Gauge Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Điểm Số SEO On-Page</h4>
                  </div>
                  <span className={`text-2xl font-black font-mono ${
                    currentSEO.score >= 80 ? 'text-emerald-600' : currentSEO.score >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {currentSEO.score}/100
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      currentSEO.score >= 80 ? 'bg-emerald-500' : currentSEO.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${currentSEO.score}%` }}
                  />
                </div>

                {/* Focus Keyword Input */}
                <div className="pt-2">
                  <label className="font-bold text-slate-700 block mb-1 text-xs">Từ khóa chính SEO (Focus Keyword) *</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="VD: QHKH doanh nghiệp"
                    className="w-full p-2 border border-blue-300 bg-blue-50/40 rounded-xl font-bold text-xs text-blue-900"
                  />
                </div>

                {/* SEO Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Checklist Chuẩn SEO Google
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Độ dài tiêu đề (40-65 ký tự):</span>
                    {currentSEO.checks.titleLength ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt ({title.length})</span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {title.length} ký tự</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Từ khóa trong Tiêu đề (H1):</span>
                    {currentSEO.checks.keywordInTitle ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Có</span>
                    ) : (
                      <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Thiếu</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Từ khóa trong Meta Description:</span>
                    {currentSEO.checks.keywordInMeta ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Có</span>
                    ) : (
                      <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Thiếu</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Mật độ từ khóa ({currentSEO.checks.density}%):</span>
                    {currentSEO.checks.densityPassed ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Tối ưu</span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Chưa chuẩn</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Số lượng từ ({currentSEO.checks.wordCount} từ):</span>
                    {currentSEO.checks.wordCountPassed ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> &gt;300 từ</span>
                    ) : (
                      <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Còn ngắn</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Có thẻ tiêu đề con (H2/H3):</span>
                    {currentSEO.checks.hasHeadings ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Chưa có</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Google SERP Snippet Preview */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Google Snippet Preview</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-1">
                  <div className="text-[11px] text-slate-600 font-sans flex items-center gap-1 truncate">
                    <span>https://twings.edu.vn › tin-tuc › {slug || 'bai-viet-seo'}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer truncate">
                    {metaTitle || title || 'Tiêu đề hiển thị trên Google Search'}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {metaDescription || excerpt || 'Mô tả meta xuất hiện trên trang kết quả tìm kiếm của Google khi người dùng tra cứu từ khóa...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
