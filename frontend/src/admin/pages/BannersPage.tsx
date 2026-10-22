import React from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Image as ImageIcon, 
  Layout, 
  ExternalLink, 
  Sparkles, 
  Link2, 
  CheckCircle2, 
  Palette, 
  Eye, 
  SlidersHorizontal,
  UserCheck
} from 'lucide-react';
import { HeroBannerItem } from '../../types';

const GRADIENT_PRESETS = [
  { label: 'Xanh TWings', value: 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]' },
  { label: 'Navy EdTech', value: 'from-[#071328] via-[#0E2042] to-[#0B1936]' },
  { label: 'Cam Nổi Bật', value: 'from-[#1F2937] via-[#9A3412] to-[#EA580C]' },
  { label: 'Tím Hiện Đại', value: 'from-[#1E1B4B] via-[#4338CA] to-[#6366F1]' },
];

const SAMPLE_FACULTY_IMAGES = [
  { label: 'Chuyên Gia Nữ', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80' },
  { label: 'Chuyên Gia Nam', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Giảng Viên Trẻ', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' },
  { label: 'Giám Đốc Khối', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80' },
];

const SAMPLE_FULL_BANNERS = [
  { label: 'Chiến Dịch Ngân Hàng', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Công Nghệ AI EdTech', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Hội Thảo & Tuyển Sinh', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80' },
];

/**
 * Quản lý banner Hero trang chủ TWings Academy.
 * Hỗ trợ cả 2 chế độ:
 * 1. Thẻ Card Động: Tiêu đề, mô tả, ảnh chuyên gia bên phải, nút bấm, các tagline và partner badges.
 * 2. Thay thế hoàn toàn bằng 1 ảnh (Full-Bleed Image): Gắn hyperlink (nội bộ hoặc link ngoài) & chạy slideshow mượt mà.
 */
export const BannersPage: React.FC<{
  bannersState: HeroBannerItem[];
  setBannersState: (next: HeroBannerItem[]) => void;
}> = ({ bannersState, setBannersState }) => {

  const updateBanner = (id: string, patch: Partial<HeroBannerItem>) => {
    setBannersState(bannersState.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...bannersState];
    const tmp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = tmp;
    setBannersState(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= bannersState.length - 1) return;
    const next = [...bannersState];
    const tmp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = tmp;
    setBannersState(next);
  };

  const addNewBanner = () => {
    const newB: HeroBannerItem = {
      id: `banner-${Date.now()}`,
      title: 'Đột phá Sự nghiệp Ngân hàng Thực chiến',
      subtitle: 'Đào tạo trực tiếp cùng Giám đốc Khối & Chuyên gia MSB. Cam kết kết nối việc làm và bảo lãnh tuyển dụng.',
      bgGradient: 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]',
      buttonText: 'Đăng ký tư vấn trực tiếp',
      buttonAction: 'consultation',
      buttonStyle: 'primary',
      displayType: 'card',
      fullBannerImageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      linkUrl: '#dang-ky',
      targetBlank: false,
      partnerBadges: [{ name: 'TWINGS ACADEMY' }, { name: 'ĐỐI TÁC MSB BANK' }],
      floatingBadges: [
        { text: 'Cố vấn 1-1 cùng Giám đốc Khối MSB', position: 'top-left' },
        { text: 'Cam kết kết nối & bảo lãnh tuyển dụng', position: 'bottom-right' }
      ]
    };
    setBannersState([newB, ...bannersState]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Quản Lý Banner Hero Trang Chủ
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {bannersState.length} Slides
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tất cả banner hiển thị tại đầu trang chủ dưới dạng Slideshow cuộn tự động. Bạn có thể chọn hiển thị dạng <strong>Thẻ Card nội dung chuyên sâu</strong> (quản lý text, ảnh chuyên gia bên phải, nút bấm, tagline) hoặc <strong>Thay thế hoàn toàn bằng 1 ảnh hyperlink</strong>.
          </p>
        </div>

        <button
          onClick={addNewBanner}
          className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Slide Banner Mới</span>
        </button>
      </div>

      {/* Banner List */}
      <div className="space-y-6">
        {bannersState.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Chưa có banner nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Trang chủ đang sử dụng dữ liệu banner mặc định. Nhấn nút bên dưới để tạo banner tùy chỉnh đầu tiên.
            </p>
            <button
              onClick={addNewBanner}
              className="px-4 py-2 bg-[#0073C1] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Banner Đầu Tiên</span>
            </button>
          </div>
        )}

        {bannersState.map((banner, idx) => {
          const isImageOnly = banner.displayType === 'image_only';
          const partnerNames = banner.partnerBadges?.map((p) => p.name).join(', ') || '';
          const tag1 = banner.floatingBadges?.[0]?.text || '';
          const tag2 = banner.floatingBadges?.[1]?.text || '';

          return (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
            >
              {/* Card Header Bar */}
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-extrabold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                    Slide #{idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-xs sm:max-w-md">
                    {banner.title || 'Banner chưa đặt tiêu đề'}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isImageOnly
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isImageOnly ? 'Ảnh Toàn Phần (Full Image)' : 'Thẻ Card Nội Dung'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Chuyển lên trước"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === bannersState.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Chuyển xuống sau"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc muốn xóa Slide #${idx + 1}?`)) {
                        setBannersState(bannersState.filter((b) => b.id !== banner.id));
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer ml-1"
                    title="Xóa banner này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 space-y-6">
                {/* Mode Selector Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Định Dạng Hiển Thị Slide
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateBanner(banner.id, { displayType: 'card' })}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        !isImageOnly
                          ? 'border-[#0073C1] bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <Layout className={`w-5 h-5 shrink-0 mt-0.5 ${!isImageOnly ? 'text-[#0073C1]' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Thẻ Card Động (Tiêu Chuẩn)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Quản lý tiêu đề, mô tả, ảnh chuyên gia bên phải, nút bấm CTA và các bullet tagline.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateBanner(banner.id, { displayType: 'image_only' })}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isImageOnly
                          ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-2 ring-purple-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <ImageIcon className={`w-5 h-5 shrink-0 mt-0.5 ${isImageOnly ? 'text-purple-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Thay Thế Hoàn Toàn Bằng 1 Ảnh</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Hiển thị ảnh poster quảng cáo tràn viền, gắn hyperlink điều hướng khi click và chạy slideshow.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* MODE 1: IMAGE ONLY (THAY THẾ HOÀN TOÀN BẰNG 1 ẢNH) */}
                {isImageOnly ? (
                  <div className="space-y-5 bg-purple-50/30 p-5 rounded-2xl border border-purple-100">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-600" />
                        <span>Link Ảnh Banner Toàn Phần (URL)</span>
                      </label>
                      <input
                        type="text"
                        value={banner.fullBannerImageUrl || banner.imageUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateBanner(banner.id, { fullBannerImageUrl: val, imageUrl: val });
                        }}
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white font-mono shadow-2xs focus:border-purple-500 focus:outline-none"
                        placeholder="https://images.unsplash.com/... hoặc /banners/banner-01.jpg"
                      />

                      {/* Quick sample image buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500">Gợi ý ảnh mẫu:</span>
                        {SAMPLE_FULL_BANNERS.map((s, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => updateBanner(banner.id, { fullBannerImageUrl: s.url, imageUrl: s.url })}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      {/* Live Image Preview */}
                      <div className="mt-3 aspect-[16/6] rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 relative group shadow-inner">
                        <img
                          src={banner.fullBannerImageUrl || banner.imageUrl}
                          alt="Banner Preview"
                          className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                          onError={(e) => {
                            (e.target as any).src =
                              'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80';
                          }}
                        />
                        <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-white/20">
                          Xem trước tỷ lệ hiển thị Hero
                        </div>
                        {banner.linkUrl && (
                          <div className="absolute bottom-3 right-3 bg-purple-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Hyperlink: {banner.linkUrl}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hyperlink Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 border-t border-purple-200/60">
                      <div className="sm:col-span-8 space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>Hyperlink Khi Click Vào Banner</span>
                        </label>
                        <input
                          type="text"
                          value={banner.linkUrl || ''}
                          onChange={(e) => updateBanner(banner.id, { linkUrl: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-mono shadow-2xs focus:border-purple-500 focus:outline-none"
                          placeholder="#dang-ky, #catalog, hoặc https://twings.edu.vn/..."
                        />
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => updateBanner(banner.id, { linkUrl: '#dang-ky' })}
                            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                          >
                            + Điền #dang-ky (Mở form tư vấn)
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => updateBanner(banner.id, { linkUrl: '#catalog' })}
                            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                          >
                            + Điền #catalog (Cuộn xem khóa học)
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-4 flex items-center pt-5">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={banner.targetBlank ?? false}
                            onChange={(e) => updateBanner(banner.id, { targetBlank: e.target.checked })}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Mở trong tab mới (_blank)</span>
                        </label>
                      </div>
                    </div>

                    {/* Optional overlay labels */}
                    <div className="pt-3 border-t border-purple-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Tiêu Đề & Nút CTA Phủ Mờ Trên Ảnh (Tùy chọn)
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Nếu để trống tiêu đề, hệ thống sẽ hiển thị ảnh thuần túy không có chữ đè lên.
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={banner.title}
                          onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white shadow-2xs"
                          placeholder="Tiêu đề đè lên ảnh (nếu cần)"
                        />
                        <input
                          type="text"
                          value={banner.buttonText || ''}
                          onChange={(e) => updateBanner(banner.id, { buttonText: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white shadow-2xs"
                          placeholder="Tên nút CTA đè lên ảnh (VD: Khám phá ngay)"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODE 2: CARD DYNAMIC (THẺ CARD NỘI DUNG CHUYÊN SÂU) */
                  <div className="space-y-6">
                    {/* Phần 1: Nội dung text & Gradient nền */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          1. Nội Dung Text & Gradient Nền
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Tiêu Đề Banner Chính
                          </label>
                          <input
                            type="text"
                            value={banner.title}
                            onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                            className="w-full text-xs sm:text-sm font-semibold p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                            placeholder="VD: Đột phá Sự nghiệp Ngân hàng Thực chiến"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Mô Tả Phụ / Giới Thiệu Ngắn
                          </label>
                          <textarea
                            rows={2}
                            value={banner.subtitle}
                            onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                            placeholder="VD: Đào tạo trực tiếp cùng Giám đốc khối & Chuyên gia MSB..."
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                            <span>Màu Nền Gradient (Tailwind CSS)</span>
                            <span className="text-[11px] font-normal text-slate-400">Chọn mẫu nhanh bên dưới:</span>
                          </label>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {GRADIENT_PRESETS.map((p, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => updateBanner(banner.id, { bgGradient: p.value })}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  banner.bgGradient === p.value
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={banner.bgGradient || 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]'}
                            onChange={(e) => updateBanner(banner.id, { bgGradient: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phần 2: Ảnh chuyên gia bên phải */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          2. Ảnh Chuyên Gia / Giảng Viên Bên Phải
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                        <div className="sm:col-span-8 space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">
                            Link Ảnh Giảng Viên (URL)
                          </label>
                          <input
                            type="text"
                            value={banner.imageUrl || ''}
                            onChange={(e) => updateBanner(banner.id, { imageUrl: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                            placeholder="https://images.unsplash.com/... hoặc ảnh chuyên gia"
                          />

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] font-semibold text-slate-500">Mẫu ảnh giảng viên:</span>
                            {SAMPLE_FACULTY_IMAGES.map((s, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => updateBanner(banner.id, { imageUrl: s.url })}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="sm:col-span-4 flex justify-center">
                          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs relative">
                            <img
                              src={banner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                              alt="Faculty Preview"
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                (e.target as any).src =
                                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
                              }}
                            />
                            <span className="absolute bottom-1 inset-x-1 text-center bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold py-0.5 rounded">
                              Xem trước ảnh
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phần 3: Nút bấm & Hành động */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <ExternalLink className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          3. Cấu Hình Nút Bấm & Hành Động
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Tên Nút Bấm Chính
                          </label>
                          <input
                            type="text"
                            value={banner.buttonText || ''}
                            onChange={(e) => updateBanner(banner.id, { buttonText: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                            placeholder="VD: Đăng ký tư vấn trực tiếp"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Hành Động Khi Click
                          </label>
                          <select
                            value={banner.buttonAction || 'consultation'}
                            onChange={(e) => updateBanner(banner.id, { buttonAction: e.target.value as any })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white cursor-pointer"
                          >
                            <option value="consultation">Mở form Đăng ký tư vấn</option>
                            <option value="browse_catalog">Cuộn xem Danh mục khóa học</option>
                            <option value="youtube_trial">Xem video Học thử bài giảng</option>
                            <option value="custom_link">Mở liên kết tùy chọn (Hyperlink)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Màu Sắc Nút
                          </label>
                          <select
                            value={banner.buttonStyle || 'primary'}
                            onChange={(e) => updateBanner(banner.id, { buttonStyle: e.target.value as any })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white cursor-pointer"
                          >
                            <option value="primary">Màu Cam Nổi Bật (Khuyến nghị)</option>
                            <option value="link">Màu Xanh TWings Công Nghệ</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Đường Dẫn Hyperlink (linkUrl)
                        </label>
                        <input
                          type="text"
                          value={banner.linkUrl || ''}
                          onChange={(e) => updateBanner(banner.id, { linkUrl: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                          placeholder="#dang-ky, #catalog hoặc https://..."
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Sử dụng khi chọn loại hành động là "Mở liên kết tùy chọn" hoặc người dùng click trực tiếp vào banner.
                        </p>
                      </div>
                    </div>

                    {/* Phần 4: Các Taglines & Partner Badges */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          4. Taglines & Đối Tác (Partner Badges)
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Tagline Điểm Nhấn #1 (Gạch đầu dòng trái)
                          </label>
                          <input
                            type="text"
                            value={tag1}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [
                                { text: val, position: 'top-left' as const },
                                banner.floatingBadges?.[1] || { text: 'Cam kết kết nối & bảo lãnh tuyển dụng', position: 'bottom-right' as const }
                              ];
                              updateBanner(banner.id, { floatingBadges: updated });
                            }}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                            placeholder="VD: Cố vấn 1-1 cùng Giám đốc Khối MSB"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Tagline Điểm Nhấn #2 (Gạch đầu dòng phải)
                          </label>
                          <input
                            type="text"
                            value={tag2}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [
                                banner.floatingBadges?.[0] || { text: 'Cố vấn 1-1 cùng Giám đốc Khối MSB', position: 'top-left' as const },
                                { text: val, position: 'bottom-right' as const }
                              ];
                              updateBanner(banner.id, { floatingBadges: updated });
                            }}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                            placeholder="VD: Cam kết kết nối & bảo lãnh tuyển dụng"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Các Nhãn Đối Tác Trên Cùng (Phân cách bằng dấu phẩy)
                        </label>
                        <input
                          type="text"
                          value={partnerNames}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                            updateBanner(banner.id, { partnerBadges: names.map((name) => ({ name })) });
                          }}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                          placeholder="TWINGS ACADEMY, ĐỐI TÁC MSB BANK"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Mỗi tên đối tác sẽ hiển thị thành 1 huy hiệu viên thuốc nổi phía trên tiêu đề banner.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
