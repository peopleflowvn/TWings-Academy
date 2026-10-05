import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HeroBannerItem } from '../../types';

/** Homepage hero banners (moved unchanged from the old CMS shell; saved through /staff/banners/). */
export const BannersPage: React.FC<{
  bannersState: HeroBannerItem[];
  setBannersState: (next: HeroBannerItem[]) => void;
}> = ({ bannersState, setBannersState }) => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Quản Lý Banner Trang Chủ ({bannersState.length} Banner Cuộn Ngang)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hỗ trợ chế độ thay thế hoàn toàn bằng ảnh và gắn liên kết (hyperlink) nội bộ hoặc link ngoài theo yêu cầu.
          </p>
        </div>

        <button
          onClick={() => {
            const newB: HeroBannerItem = {
              id: `banner-${Date.now()}`,
              title: 'Banner Chương Trình Mới 2026',
              subtitle: 'Chắp cánh sự nghiệp ngân hàng thực chiến cùng TWings.',
              bgGradient: 'from-[#0048C8] via-[#0056D2] to-[#0073C1]',
              buttonText: 'Đăng Ký Ngay',
              buttonAction: 'consultation',
              buttonStyle: 'primary',
              displayType: 'image_only',
              fullBannerImageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
              partnerBadges: [{ name: 'MSB', color: 'text-orange-500' }],
              imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
              floatingBadges: [{ text: 'Khóa Học Mới', sub: 'Thực chiến 2026', position: 'top-left' }],
            };
            setBannersState([newB, ...bannersState]);
          }}
          className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Banner Mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bannersState.map((banner, idx) => (
          <div
            key={banner.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Slide #{idx + 1}
                </span>
                <button
                  onClick={() => {
                    setBannersState(bannersState.filter((b) => b.id !== banner.id));
                  }}
                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Xóa banner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Chế độ hiển thị banner
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name={`displayType-${banner.id}`}
                      checked={banner.displayType === 'image_only'}
                      onChange={() => {
                        setBannersState(
                          bannersState.map((b) =>
                            b.id === banner.id ? { ...b, displayType: 'image_only' } : b
                          )
                        );
                      }}
                      className="text-blue-600"
                    />
                    <span>Ảnh toàn phần (Full-bleed Image)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name={`displayType-${banner.id}`}
                      checked={banner.displayType !== 'image_only'}
                      onChange={() => {
                        setBannersState(
                          bannersState.map((b) =>
                            b.id === banner.id ? { ...b, displayType: 'card' } : b
                          )
                        );
                      }}
                      className="text-blue-600"
                    />
                    <span>Tiêu đề text + Badge nổi</span>
                  </label>
                </div>
              </div>

              {banner.displayType === 'image_only' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Link Ảnh Banner Toàn Phần (URL)
                  </label>
                  <input
                    type="text"
                    value={banner.fullBannerImageUrl || banner.imageUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBannersState(
                        bannersState.map((b) =>
                          b.id === banner.id ? { ...b, fullBannerImageUrl: val, imageUrl: val } : b
                        )
                      );
                    }}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                    placeholder="https://images.unsplash.com/..."
                  />

                  <div className="aspect-[16/6] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
                    <img
                      src={banner.fullBannerImageUrl || banner.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as any).src =
                          'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tiêu đề Banner
                    </label>
                    <input
                      type="text"
                      value={banner.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBannersState(
                          bannersState.map((b) => (b.id === banner.id ? { ...b, title: val } : b))
                        );
                      }}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mô tả phụ
                    </label>
                    <input
                      type="text"
                      value={banner.subtitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBannersState(
                          bannersState.map((b) => (b.id === banner.id ? { ...b, subtitle: val } : b))
                        );
                      }}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">
                  Gắn Hyperlink khi click banner (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={banner.linkUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBannersState(
                      bannersState.map((b) => (b.id === banner.id ? { ...b, linkUrl: val } : b))
                    );
                  }}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                  placeholder="#dang-ky hoặc https://..."
                />
                <p className="text-[11px] text-slate-400">
                  Người dùng click vào banner trên trang chủ sẽ tự động chuyển hướng đến link này.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
);
