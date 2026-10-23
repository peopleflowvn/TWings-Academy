import React, { useState, useRef } from 'react';
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
  UserCheck, 
  Upload, 
  Loader2, 
  Edit3, 
  X, 
  Save, 
  Check, 
  Eye, 
  HelpCircle,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { HeroBannerItem } from '../../types';
import { uploadImage } from '../../components/cms/ImageUploadField';

const GRADIENT_PRESETS = [
  { label: 'Xanh TWings', value: 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]', bg: 'bg-gradient-to-r from-[#0F294D] via-[#1E3A8A] to-[#0073C1]' },
  { label: 'Navy EdTech', value: 'from-[#071328] via-[#0E2042] to-[#0B1936]', bg: 'bg-gradient-to-r from-[#071328] via-[#0E2042] to-[#0B1936]' },
  { label: 'Cam Nổi Bật', value: 'from-[#1F2937] via-[#9A3412] to-[#EA580C]', bg: 'bg-gradient-to-r from-[#1F2937] via-[#9A3412] to-[#EA580C]' },
  { label: 'Tím Hiện Đại', value: 'from-[#1E1B4B] via-[#4338CA] to-[#6366F1]', bg: 'bg-gradient-to-r from-[#1E1B4B] via-[#4338CA] to-[#6366F1]' },
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

async function safeUploadFile(file: File): Promise<string> {
  try {
    return await uploadImage(file);
  } catch {
    // Resilient fallback for offline / mock testing: read local file as data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Quản lý banner Hero trang chủ TWings Academy.
 * - Có chế độ xem danh sách trực quan, sắp xếp thứ tự slideshow.
 * - Có chế độ Edit / Save riêng biệt (không tự động lưu ăn luôn khi đang gõ).
 * - Hỗ trợ upload ảnh trực tiếp từ máy cho cả Ảnh Chuyên Gia bên phải và Ảnh Banner Toàn Phần.
 */
export const BannersPage: React.FC<{
  bannersState: HeroBannerItem[];
  setBannersState: (next: HeroBannerItem[]) => void;
}> = ({ bannersState, setBannersState }) => {
  // Modal states
  const [editingBanner, setEditingBanner] = useState<HeroBannerItem | null>(null);
  const [isNewBanner, setIsNewBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'faculty' | 'buttons' | 'taglines'>('content');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload states
  const [isUploadingFull, setIsUploadingFull] = useState(false);
  const [isUploadingFaculty, setIsUploadingFaculty] = useState(false);
  const fullFileInputRef = useRef<HTMLInputElement>(null);
  const facultyFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...bannersState];
    const tmp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = tmp;
    setBannersState(next);
    showToast(`Đã chuyển Slide #${idx + 1} lên vị trí #${idx}`);
  };

  const moveDown = (idx: number) => {
    if (idx >= bannersState.length - 1) return;
    const next = [...bannersState];
    const tmp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = tmp;
    setBannersState(next);
    showToast(`Đã chuyển Slide #${idx + 1} xuống vị trí #${idx + 2}`);
  };

  const handleDelete = (id: string, idx: number) => {
    if (window.confirm(`Bạn có chắc muốn xóa Slide #${idx + 1}? Thao tác này không thể hoàn tác.`)) {
      setBannersState(bannersState.filter((b) => b.id !== id));
      showToast(`Đã xóa Slide #${idx + 1}`);
    }
  };

  const handleStartEdit = (banner: HeroBannerItem) => {
    // Clone banner into editing state so changes only apply on Save
    setEditingBanner(JSON.parse(JSON.stringify(banner)));
    setIsNewBanner(false);
    setActiveTab('content');
  };

  const handleStartNew = () => {
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
      showOverlayText: false,
      showOverlayButton: false,
      partnerBadges: [{ name: 'TWINGS ACADEMY' }, { name: 'ĐỐI TÁC MSB BANK' }],
      floatingBadges: [
        { text: 'Cố vấn 1-1 cùng Giám đốc Khối MSB', position: 'top-left' },
        { text: 'Cam kết kết nối & bảo lãnh tuyển dụng', position: 'bottom-right' }
      ]
    };
    setEditingBanner(newB);
    setIsNewBanner(true);
    setActiveTab('content');
  };

  const handleSaveEdit = () => {
    if (!editingBanner) return;

    if (isNewBanner) {
      setBannersState([editingBanner, ...bannersState]);
      showToast('Đã thêm banner mới thành công!');
    } else {
      setBannersState(bannersState.map((b) => (b.id === editingBanner.id ? editingBanner : b)));
      showToast('Đã lưu thay đổi banner thành công!');
    }
    setEditingBanner(null);
  };

  const handleCancelEdit = () => {
    setEditingBanner(null);
  };

  // Upload handlers
  const handleUploadFullBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingBanner) return;

    setIsUploadingFull(true);
    try {
      const url = await safeUploadFile(file);
      setEditingBanner({
        ...editingBanner,
        fullBannerImageUrl: url,
        imageUrl: url
      });
      showToast('Tải ảnh banner toàn phần thành công!');
    } catch {
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingFull(false);
    }
  };

  const handleUploadFacultyImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingBanner) return;

    setIsUploadingFaculty(true);
    try {
      const url = await safeUploadFile(file);
      setEditingBanner({
        ...editingBanner,
        imageUrl: url
      });
      showToast('Tải ảnh chuyên gia giảng viên thành công!');
    } catch {
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingFaculty(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              Quản Lý Banner Hero Trang Chủ
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0073C1] border border-blue-200">
              {bannersState.length} Slideshow
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Các banner chạy tự động dạng slides show tại đầu trang chủ. Hỗ trợ upload ảnh từ máy tính, chế độ chỉnh sửa & lưu an toàn, linh hoạt giữa <strong>Thẻ Card Động</strong> và <strong>Thay thế hoàn toàn bằng 1 ảnh hyperlink</strong>.
          </p>
        </div>

        <button
          onClick={handleStartNew}
          className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Banner Mới</span>
        </button>
      </div>

      {/* Overview Slides List */}
      <div className="space-y-4">
        {bannersState.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Chưa có banner nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Trang chủ đang sử dụng dữ liệu banner mặc định. Nhấn nút bên dưới để tạo banner tùy chỉnh đầu tiên.
            </p>
            <button
              onClick={handleStartNew}
              className="px-4 py-2 bg-[#0073C1] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Banner Đầu Tiên</span>
            </button>
          </div>
        )}

        {bannersState.map((banner, idx) => {
          const isImageOnly = banner.displayType === 'image_only';
          const partnerNames = banner.partnerBadges?.map((p) => p.name).join(' • ') || '';
          const tag1 = banner.floatingBadges?.[0]?.text;
          const tag2 = banner.floatingBadges?.[1]?.text;

          return (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Left: Slide Order & Visual Thumbnail Preview */}
                <div className="flex items-center gap-3.5 shrink-0">
                  {/* Order control arrows */}
                  <div className="flex flex-col gap-1 items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Di chuyển lên trước"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold text-slate-700">
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === bannersState.length - 1}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Di chuyển xuống sau"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Visual Mini Preview Container */}
                  <div className="relative w-36 sm:w-44 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 shadow-inner group/thumb">
                    {isImageOnly ? (
                      <img
                        src={banner.fullBannerImageUrl || banner.imageUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${banner.bgGradient || 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]'} p-2 flex items-center justify-between`}>
                        <div className="w-2/3 space-y-1">
                          <div className="w-full h-2 bg-white/40 rounded-full" />
                          <div className="w-4/5 h-1.5 bg-white/20 rounded-full" />
                        </div>
                        <img
                          src={banner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-white/30"
                        />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white">
                      {isImageOnly ? 'Ảnh Toàn Phần' : 'Thẻ Card'}
                    </span>
                  </div>
                </div>

                {/* Middle: Content summary */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isImageOnly
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isImageOnly ? 'Ảnh Toàn Phần (Hyperlink)' : 'Thẻ Card Nội Dung'}
                    </span>

                    {partnerNames && (
                      <span className="text-[11px] font-bold text-slate-500 truncate max-w-xs">
                        {partnerNames}
                      </span>
                    )}

                    {isImageOnly && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        banner.showOverlayText || banner.showOverlayButton
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {banner.showOverlayText && banner.showOverlayButton
                          ? 'Chữ & Nút: Bật'
                          : banner.showOverlayText
                          ? 'Chữ: Bật'
                          : banner.showOverlayButton
                          ? 'Nút: Bật'
                          : 'Ảnh thuần túy (Không đè chữ/nút)'}
                      </span>
                    )}

                    {banner.linkUrl && (
                      <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1 border border-blue-100">
                        <Link2 className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{banner.linkUrl}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    {banner.title || 'Chưa đặt tiêu đề'}
                  </h3>

                  {banner.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl font-medium">
                      {banner.subtitle}
                    </p>
                  )}

                  {!isImageOnly && (tag1 || tag2) && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 font-medium">
                      {tag1 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#0073C1]" />
                          <span>{tag1}</span>
                        </span>
                      )}
                      {tag2 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{tag2}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleStartEdit(banner)}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#0073C1] border border-blue-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa</span>
                  </button>

                  <button
                    onClick={() => handleDelete(banner.id, idx)}
                    className="p-2 text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                    title="Xóa slide này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDIT & SAVE (CHỈ LƯU KHI BẤM "LƯU THAY ĐỔI") */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-100 text-[#0073C1]">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isNewBanner ? 'Tạo Slide Banner Mới' : `Chỉnh Sửa Slide: ${editingBanner.title || 'Chưa đặt tên'}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mọi thay đổi chỉ có hiệu lực khi bạn nhấn <strong>"Lưu Thay Đổi"</strong> bên dưới.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Định dạng hiển thị Slide Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Định Dạng Hiển Thị Banner
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBanner({ ...editingBanner, displayType: 'card' })}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      editingBanner.displayType !== 'image_only'
                        ? 'border-[#0073C1] bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Layout className={`w-5 h-5 shrink-0 mt-0.5 ${editingBanner.displayType !== 'image_only' ? 'text-[#0073C1]' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Thẻ Card Động (Tiêu Chuẩn)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Quản lý tiêu đề, mô tả, ảnh giảng viên bên phải, nút bấm CTA và các gạch đầu dòng tagline.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingBanner({ ...editingBanner, displayType: 'image_only' })}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      editingBanner.displayType === 'image_only'
                        ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <ImageIcon className={`w-5 h-5 shrink-0 mt-0.5 ${editingBanner.displayType === 'image_only' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Thay Thế Hoàn Toàn Bằng 1 Ảnh</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Hiển thị 1 ảnh banner quảng cáo tràn viền, gắn hyperlink điều hướng khi click và chạy slideshow.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* CHẾ ĐỘ 1: THAY THẾ HOÀN TOÀN BẰNG 1 ẢNH (FULL IMAGE) */}
              {editingBanner.displayType === 'image_only' ? (
                <div className="space-y-6 bg-purple-50/30 p-5 rounded-2xl border border-purple-100">
                  {/* Upload Dropzone for Full Banner */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-600" />
                        <span>Ảnh Banner Toàn Phần (Cho Phép Tải File Từ Máy Hoặc Nhập URL)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => fullFileInputRef.current?.click()}
                        disabled={isUploadingFull}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isUploadingFull ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>Tải Ảnh Từ Máy Lên</span>
                      </button>
                    </div>

                    <input
                      ref={fullFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleUploadFullBanner}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingBanner.fullBannerImageUrl || editingBanner.imageUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingBanner({
                            ...editingBanner,
                            fullBannerImageUrl: val,
                            imageUrl: val
                          });
                        }}
                        className="flex-1 text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-mono shadow-2xs focus:border-purple-500 focus:outline-none"
                        placeholder="https://... hoặc bấm nút 'Tải Ảnh Từ Máy Lên'"
                      />
                    </div>

                    {/* Preset samples */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Hoặc chọn ảnh mẫu:</span>
                      {SAMPLE_FULL_BANNERS.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => setEditingBanner({
                            ...editingBanner,
                            fullBannerImageUrl: s.url,
                            imageUrl: s.url
                          })}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Preview */}
                    <div className="aspect-[16/6] rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 relative group shadow-inner mt-2">
                      <img
                        src={editingBanner.fullBannerImageUrl || editingBanner.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-white/20">
                        Khung xem trước tỷ lệ Hero
                      </div>
                      {editingBanner.linkUrl && (
                        <div className="absolute top-3 right-3 bg-purple-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Link: {editingBanner.linkUrl}</span>
                        </div>
                      )}

                      {/* Optional Overlay on Preview */}
                      {(editingBanner.showOverlayText || editingBanner.showOverlayButton) && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent p-4 flex items-end justify-between gap-3">
                          {editingBanner.showOverlayText ? (
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-white drop-shadow-md truncate">
                                {editingBanner.title || 'Tiêu đề banner'}
                              </h4>
                              {editingBanner.subtitle && (
                                <p className="text-[11px] text-slate-300 line-clamp-1">
                                  {editingBanner.subtitle}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div />
                          )}
                          {editingBanner.showOverlayButton && (
                            <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0073C1] to-[#2C93E8] text-xs font-bold text-white shadow-md shrink-0">
                              {editingBanner.buttonText || 'Nút bấm CTA'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hyperlink settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 border-t border-purple-200/60">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Đường Dẫn Hyperlink Khi Click Banner</span>
                      </label>
                      <input
                        type="text"
                        value={editingBanner.linkUrl || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-mono shadow-2xs focus:border-purple-500 focus:outline-none"
                        placeholder="#dang-ky, #catalog hoặc https://..."
                      />
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingBanner({ ...editingBanner, linkUrl: '#dang-ky' })}
                          className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                        >
                          + Gắn #dang-ky (Mở form tư vấn)
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setEditingBanner({ ...editingBanner, linkUrl: '#catalog' })}
                          className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                        >
                          + Gắn #catalog (Cuộn xem khóa học)
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-4 flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingBanner.targetBlank ?? false}
                          onChange={(e) => setEditingBanner({ ...editingBanner, targetBlank: e.target.checked })}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Mở trong tab mới (_blank)</span>
                      </label>
                    </div>
                  </div>

                  {/* Tên nội bộ nhận diện Banner */}
                  <div className="space-y-1.5 pt-3 border-t border-purple-200/60">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Tên / Tiêu Đề Banner (Quản lý trong CMS)</span>
                      <span className="text-[11px] font-normal text-slate-500">Dùng đặt tên slide</span>
                    </label>
                    <input
                      type="text"
                      value={editingBanner.title}
                      onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white shadow-2xs focus:border-purple-500 focus:outline-none"
                      placeholder="VD: Banner Chương Trình Tuyển Dụng Tháng 10..."
                    />
                  </div>

                  {/* Tùy chọn Bật/Tắt hiển thị Chữ và Nút bấm đè lên ảnh */}
                  <div className="pt-3 border-t border-purple-200/60 space-y-3.5">
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Lưu ý về thiết kế banner ảnh:</div>
                        <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          Nếu ảnh của bạn <strong>đã được thiết kế sẵn chữ và nút bấm</strong> (từ Photoshop, Canva...), hãy <strong>tắt cả 2 tùy chọn</strong> bên dưới để ảnh hiển thị nguyên bản, không bị chữ đè lên trùng lặp.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Toggle 1: Chữ đè lên ảnh */}
                      <div className={`p-4 rounded-xl border transition-all ${editingBanner.showOverlayText ? 'bg-purple-50/60 border-purple-300 shadow-xs' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingBanner.showOverlayText ?? false}
                              onChange={(e) => setEditingBanner({ ...editingBanner, showOverlayText: e.target.checked })}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Hiển thị Chữ đè lên ảnh</span>
                          </label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${editingBanner.showOverlayText ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                            {editingBanner.showOverlayText ? 'Đang Bật' : 'Đang Tắt'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-6">
                          Hiển thị tiêu đề và phụ đề trên dải gradient chân ảnh.
                        </p>

                        {editingBanner.showOverlayText && (
                          <div className="mt-3 space-y-2 pt-3 border-t border-purple-200 pl-6">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">Dòng phụ đề (Subtitle):</label>
                              <input
                                type="text"
                                value={editingBanner.subtitle || ''}
                                onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                                placeholder="Dòng chữ mô tả đè lên ảnh..."
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toggle 2: Nút bấm CTA đè lên ảnh */}
                      <div className={`p-4 rounded-xl border transition-all ${editingBanner.showOverlayButton ? 'bg-purple-50/60 border-purple-300 shadow-xs' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingBanner.showOverlayButton ?? false}
                              onChange={(e) => setEditingBanner({ ...editingBanner, showOverlayButton: e.target.checked })}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Hiển thị Nút bấm CTA đè lên ảnh</span>
                          </label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${editingBanner.showOverlayButton ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                            {editingBanner.showOverlayButton ? 'Đang Bật' : 'Đang Tắt'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-6">
                          Hiển thị nút kêu gọi hành động ở góc phải dưới của banner.
                        </p>

                        {editingBanner.showOverlayButton && (
                          <div className="mt-3 space-y-2 pt-3 border-t border-purple-200 pl-6">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên nút bấm:</label>
                              <input
                                type="text"
                                value={editingBanner.buttonText || ''}
                                onChange={(e) => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                                placeholder="VD: Khám phá ngay, Đăng ký tư vấn..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CHẾ ĐỘ 2: THẺ CARD NỘI DUNG ĐỘNG */
                <div className="space-y-6">
                  {/* Tab Navigation inside Card mode */}
                  <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
                    {[
                      { id: 'content', label: '1. Nội Dung & Màu Nền', icon: Sparkles },
                      { id: 'faculty', label: '2. Ảnh Chuyên Gia Bên Phải', icon: UserCheck },
                      { id: 'buttons', label: '3. Nút Bấm & Hành Động', icon: ExternalLink },
                      { id: 'taglines', label: '4. Taglines & Đối Tác', icon: CheckCircle2 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                            isActive
                              ? 'border-[#0073C1] text-[#0073C1] bg-blue-50/50'
                              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB 1: Nội dung text & Nền */}
                  {activeTab === 'content' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Tiêu Đề Banner Chính
                        </label>
                        <input
                          type="text"
                          value={editingBanner.title}
                          onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                          className="w-full text-xs sm:text-sm font-bold p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                          placeholder="VD: Đột phá Sự nghiệp Ngân hàng Thực chiến"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Mô Tả Phụ / Giới Thiệu
                        </label>
                        <textarea
                          rows={3}
                          value={editingBanner.subtitle}
                          onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                          className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none leading-relaxed"
                          placeholder="VD: Đào tạo trực tiếp cùng Giám đốc Khối & Chuyên gia MSB. Cam kết kết nối việc làm và bảo lãnh tuyển dụng."
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                          <span>Màu Nền Gradient (Tailwind CSS)</span>
                          <span className="text-[11px] font-normal text-slate-400">Chọn mẫu nhanh:</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {GRADIENT_PRESETS.map((p, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setEditingBanner({ ...editingBanner, bgGradient: p.value })}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                editingBanner.bgGradient === p.value
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
                          value={editingBanner.bgGradient || 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]'}
                          onChange={(e) => setEditingBanner({ ...editingBanner, bgGradient: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Ảnh chuyên gia bên phải (Có UPLOAD từ máy) */}
                  {activeTab === 'faculty' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Tải Ảnh Giảng Viên / Chuyên Gia Lên
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Ảnh hiển thị tại góc phải của thẻ Hero card, đại diện cho đội ngũ chuyên gia giảng dạy.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => facultyFileInputRef.current?.click()}
                          disabled={isUploadingFaculty}
                          className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                        >
                          {isUploadingFaculty ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Tải Ảnh Từ Máy Lên</span>
                        </button>
                      </div>

                      <input
                        ref={facultyFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUploadFacultyImage}
                        className="hidden"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                        <div className="sm:col-span-8 space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Đường Dẫn Ảnh (URL)
                            </label>
                            <input
                              type="text"
                              value={editingBanner.imageUrl || ''}
                              onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                              placeholder="https://... hoặc tải ảnh từ máy"
                            />
                          </div>

                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                              Hoặc chọn ảnh mẫu:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {SAMPLE_FACULTY_IMAGES.map((s, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => setEditingBanner({ ...editingBanner, imageUrl: s.url })}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-blue-50 text-[#0073C1] border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail preview */}
                        <div className="sm:col-span-4 flex flex-col items-center">
                          <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-md relative group">
                            <img
                              src={editingBanner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                              alt="Faculty Preview"
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                (e.target as any).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                              <span className="text-[10px] text-white font-bold">
                                MSB Bank Chuyên Gia
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-1.5">
                            Ảnh hiển thị bên phải Hero Card
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Nút Bấm & Hành Động */}
                  {activeTab === 'buttons' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Tên Nút Bấm Chính
                          </label>
                          <input
                            type="text"
                            value={editingBanner.buttonText || ''}
                            onChange={(e) => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                            placeholder="VD: Đăng ký tư vấn trực tiếp"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Hành Động Khi Click
                          </label>
                          <select
                            value={editingBanner.buttonAction || 'consultation'}
                            onChange={(e) => setEditingBanner({ ...editingBanner, buttonAction: e.target.value as any })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white cursor-pointer"
                          >
                            <option value="consultation">Mở form Đăng ký tư vấn trực tiếp</option>
                            <option value="browse_catalog">Cuộn xem Danh mục khóa học</option>
                            <option value="youtube_trial">Xem video Học thử bài giảng</option>
                            <option value="custom_link">Mở liên kết tùy chọn (Hyperlink)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Phong Cách Màu Nút
                          </label>
                          <select
                            value={editingBanner.buttonStyle || 'primary'}
                            onChange={(e) => setEditingBanner({ ...editingBanner, buttonStyle: e.target.value as any })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white cursor-pointer"
                          >
                            <option value="primary">Màu Cam Nổi Bật (Khuyến nghị)</option>
                            <option value="link">Màu Xanh TWings Công Nghệ</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Đường Dẫn Hyperlink Khi Click (linkUrl)
                        </label>
                        <input
                          type="text"
                          value={editingBanner.linkUrl || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                          placeholder="#dang-ky, #catalog hoặc https://..."
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Sử dụng khi hành động là "Mở liên kết tùy chọn" hoặc người dùng click trực tiếp vào banner.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Taglines & Đối Tác */}
                  {activeTab === 'taglines' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Tagline Điểm Nhấn #1 (Gạch đầu dòng trái)
                          </label>
                          <input
                            type="text"
                            value={editingBanner.floatingBadges?.[0]?.text || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [
                                { text: val, position: 'top-left' as const },
                                editingBanner.floatingBadges?.[1] || { text: 'Cam kết kết nối & bảo lãnh tuyển dụng', position: 'bottom-right' as const }
                              ];
                              setEditingBanner({ ...editingBanner, floatingBadges: updated });
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
                            value={editingBanner.floatingBadges?.[1]?.text || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [
                                editingBanner.floatingBadges?.[0] || { text: 'Cố vấn 1-1 cùng Giám đốc Khối MSB', position: 'top-left' as const },
                                { text: val, position: 'bottom-right' as const }
                              ];
                              setEditingBanner({ ...editingBanner, floatingBadges: updated });
                            }}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                            placeholder="VD: Cam kết kết nối & bảo lãnh tuyển dụng"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Các Huy Hiệu Đối Tác Trên Cùng (Phân cách bằng dấu phẩy)
                        </label>
                        <input
                          type="text"
                          value={editingBanner.partnerBadges?.map((p) => p.name).join(', ') || ''}
                          onChange={(e) => {
                            const names = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                            setEditingBanner({ ...editingBanner, partnerBadges: names.map((name) => ({ name })) });
                          }}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                          placeholder="TWINGS ACADEMY, ĐỐI TÁC MSB BANK"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Mỗi tên đối tác sẽ hiển thị thành 1 huy hiệu viên thuốc nổi phía trên tiêu đề banner.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer (Nút Lưu Thay Đổi & Hủy Bỏ) */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 text-center sm:text-left">
                Nhấn <strong>"Lưu Thay Đổi"</strong> để áp dụng lên trang chủ hoặc <strong>"Hủy"</strong> để giữ nguyên slide cũ.
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
