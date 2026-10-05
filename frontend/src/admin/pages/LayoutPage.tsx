import React from 'react';
import { CMSSectionsConfig } from '../../types';

/** Turn homepage sections on/off (moved unchanged from the old CMS shell). */
export const LayoutPage: React.FC<{
  sectionsState: CMSSectionsConfig;
  handleToggleSection: (key: keyof CMSSectionsConfig) => void;
}> = ({ sectionsState, handleToggleSection }) => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bật / Tắt Các Khối Trên Trang Chủ</h2>
          <p className="text-xs text-slate-500 mt-1">Ẩn hoặc hiện các section theo nhu cầu vận hành.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { key: 'hero', name: 'Hero Carousel Banners (Cuộn Ngang)' },
          { key: 'partners', name: 'Thanh Logo Đối Tác Doanh Nghiệp' },
          { key: 'bestsellers', name: 'Kệ Khóa Học Bán Chạy Nhất' },
          { key: 'recommended', name: 'Kệ Khóa Học Được Đề Xuất' },
          { key: 'newReleases', name: 'Kệ Khóa Học Mới Ra Mắt' },
          { key: 'mostUseful', name: 'Kệ Khóa Học Hữu Ích Nhất' },
          { key: 'courseraPlus', name: 'Gói Đào Tạo Doanh Nghiệp & Hội Viên' },
          { key: 'testimonials', name: 'Cảm Nhận Học Viên & Việc Làm' },
          { key: 'faq', name: 'Câu Hỏi Thường Gặp (FAQ)' },
        ].map(({ key, name }) => {
          const isEnabled = (sectionsState as any)[key]?.enabled !== false;
          return (
            <div
              key={key}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between"
            >
              <span className="text-xs font-bold text-slate-800">{name}</span>
              <button
                type="button"
                onClick={() => handleToggleSection(key as any)}
                className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
);
