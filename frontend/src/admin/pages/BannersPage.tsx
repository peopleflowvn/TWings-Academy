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
  ArrowRight,
  Zap,
  ShieldCheck,
  Award,
  Star,
  Palette,
  RefreshCw,
  RotateCcw,
  Info
} from 'lucide-react';
import { HeroBannerItem, HeroBannerCardTemplate } from '../../types';
import { uploadImage } from '../../components/cms/ImageUploadField';
import { broadcastBannersUpdate, clearBannersCache } from '../../lib/bannerSync';

export const CARD_TEMPLATES: Array<{
  id: HeroBannerCardTemplate;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'modern_split',
    label: 'Executive Split (Tiêu Chuẩn)',
    badge: 'Mặc định',
    badgeColor: 'bg-blue-100 text-[#0073C1] border-blue-200',
    description: 'Bố cục 2 cột cân bằng: Cột trái nội dung & nút CTA, cột phải thẻ chuyên gia MSB với đánh giá sao.',
    icon: Layout,
  },
  {
    id: 'cyber_glow',
    label: 'Cyber Glow (Công Nghệ Cao)',
    badge: 'Hot AI & Tech',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    description: 'Viền phát sáng neon, lưới cyber tương lai kết nối ăn khớp với nền 3D Three.js.',
    icon: Zap,
  },
  {
    id: 'floating_showcase',
    label: 'Spotlight Giảng Viên (Chuyên Gia)',
    badge: 'Đội Ngũ Thực Chiến',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Chân dung chuyên gia lớn với vòng hào quang phát sáng tròn và huy hiệu thành tích bay lơ lửng.',
    icon: UserCheck,
  },
  {
    id: 'minimal_editorial',
    label: 'Minimal Editorial (Tối Giản Cao Cấp)',
    badge: 'Học Viện Cao Cấp',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Phong cách tạp chí học viện cao cấp, đường nét thanh lịch, vạch nhấn dọc tinh tế và khoáng đạt.',
    icon: Sparkles,
  },
  {
    id: 'badge_highlight',
    label: 'Bảo Lãnh & Cam Kết (Tuyển Dụng)',
    badge: 'Cam Kết Đầu Ra',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Con dấu bảo lãnh việc làm 100%, huy hiệu kiểm định MSB và lưới cam kết 4 điểm vững chắc.',
    icon: ShieldCheck,
  },
];

export const CARD_GRADIENT_PRESETS = [
  {
    id: 'twings_royal_navy',
    label: 'Xanh TWings Hoàng Gia',
    value: 'from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]',
    bg: 'bg-gradient-to-r from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]',
    description: 'Tone xanh thương hiệu chủ đạo, trang trọng và đáng tin cậy',
    tag: 'Thương Hiệu',
    tagColor: 'bg-blue-100 text-[#0073C1]',
  },
  {
    id: 'cyber_deep_space',
    label: 'Vũ Trụ Cyber Đêm',
    value: 'from-[#050D1A] via-[#0A1F3D] to-[#0284C7]',
    bg: 'bg-gradient-to-r from-[#050D1A] via-[#0A1F3D] to-[#0284C7]',
    description: 'Hòa quyện hoàn hảo với nền 3D Three.js và ánh sáng mạng',
    tag: 'Khuyên Dùng Hero',
    tagColor: 'bg-cyan-100 text-cyan-800',
  },
  {
    id: 'emerald_banking',
    label: 'Ngọc Lục Bảo Ngân Hàng',
    value: 'from-[#041D1A] via-[#064E3B] to-[#047857]',
    bg: 'bg-gradient-to-r from-[#041D1A] via-[#064E3B] to-[#047857]',
    description: 'Sắc xanh thịnh vượng, chuyên dùng cho đào tạo tài chính & ngân hàng',
    tag: 'Ngân Hàng',
    tagColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'sunset_executive',
    label: 'Hoàng Hôn Tinh Anh',
    value: 'from-[#1A1024] via-[#7C2D12] to-[#EA580C]',
    bg: 'bg-gradient-to-r from-[#1A1024] via-[#7C2D12] to-[#EA580C]',
    description: 'Tông cam nhiệt huyết, kích thích tỷ lệ click và đăng ký',
    tag: 'Chuyển Đổi Cao',
    tagColor: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'cosmic_indigo',
    label: 'Tím Vũ Trụ AI',
    value: 'from-[#110B29] via-[#31104E] to-[#4F46E5]',
    bg: 'bg-gradient-to-r from-[#110B29] via-[#31104E] to-[#4F46E5]',
    description: 'Sắc tím công nghệ AI & EdTech, đột phá và hiện đại',
    tag: 'Công Nghệ AI',
    tagColor: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'dark_titanium',
    label: 'Đen Titan Sang Trọng',
    value: 'from-[#090D16] via-[#111827] to-[#1E293B]',
    bg: 'bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E293B]',
    description: 'Tối giản huyền bí, tôn vinh hình ảnh và nội dung học thuật',
    tag: 'Sang Trọng',
    tagColor: 'bg-slate-200 text-slate-800',
  },
  {
    id: 'crimson_leadership',
    label: 'Đỏ Chu Sa Lãnh Đạo',
    value: 'from-[#180811] via-[#5C1123] to-[#B91C1C]',
    bg: 'bg-gradient-to-r from-[#180811] via-[#5C1123] to-[#B91C1C]',
    description: 'Sắc đỏ lãnh đạo quyết đoán, uy quyền và danh giá',
    tag: 'Lãnh Đạo',
    tagColor: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'arctic_frost',
    label: 'Băng Đăng Phát Sáng',
    value: 'from-[#071E3D] via-[#0E4A7D] to-[#0284C7]',
    bg: 'bg-gradient-to-r from-[#071E3D] via-[#0E4A7D] to-[#0284C7]',
    description: 'Tone băng đăng công nghệ, tươi sáng và hiện đại',
    tag: 'Tươi Sáng',
    tagColor: 'bg-sky-100 text-sky-800',
  },
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Live preview component for Card-mode banner editing in CMS
 */
const BannerCardLivePreview: React.FC<{ banner: HeroBannerItem }> = ({ banner }) => {
  const template = banner.cardTemplate || 'modern_split';
  const bgGrad = banner.bgGradient || 'from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]';
  const facultyImg = banner.imageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
  const tag1 = banner.floatingBadges?.[0]?.text || 'Cố vấn 1-1 cùng Giám đốc Khối MSB';
  const tag2 = banner.floatingBadges?.[1]?.text || 'Cam kết kết nối & bảo lãnh tuyển dụng';
  const partners = banner.partnerBadges && banner.partnerBadges.length > 0 
    ? banner.partnerBadges 
    : [{ name: 'TWINGS ACADEMY' }, { name: 'ĐỐI TÁC MSB BANK' }];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-[#0073C1]" />
          <span>Khung Xem Trước Trực Quan Thẻ Card (Live Preview Chuẩn Hero)</span>
        </label>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0073C1]">
          Template: {CARD_TEMPLATES.find(t => t.id === template)?.label || template}
        </span>
      </div>

      <div className={`w-full rounded-2xl bg-gradient-to-br ${bgGrad} text-white p-4 sm:p-6 shadow-xl relative overflow-hidden border border-white/20`}>
        {template === 'cyber_glow' ? (
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-mono text-[9px] font-bold">
                SYS: 2026 AI FRONTIER
              </span>
              {partners.map((p, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-cyan-200 text-[9px] font-bold">
                  {p.name}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 space-y-2">
                <h4 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-white">
                  {banner.title || 'Tiêu đề banner'}
                </h4>
                <p className="text-[11px] text-cyan-100/80 line-clamp-2 font-mono">
                  {banner.subtitle || 'Mô tả chương trình'}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-cyan-300">
                  <span className="bg-cyan-950/60 border border-cyan-400/30 px-2 py-1 rounded">// {tag1}</span>
                  <span className="bg-cyan-950/60 border border-cyan-400/30 px-2 py-1 rounded">// {tag2}</span>
                </div>
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-cyan-400/40 relative shadow-md">
                  <img src={facultyImg} alt="" className="w-full h-full object-cover object-top" />
                  <span className="absolute bottom-1 left-1 text-[8px] font-mono font-bold bg-slate-950/80 px-1 rounded text-cyan-300">
                    MSB MENTOR
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : template === 'floating_showcase' ? (
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-black">
                MASTERCLASS ĐỘC QUYỀN
              </span>
              {partners.map((p, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-[#5FBEFF] text-[9px] font-bold">
                  {p.name}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 space-y-2">
                <h4 className="text-base sm:text-lg font-black text-white">
                  {banner.title || 'Tiêu đề banner'}
                </h4>
                <p className="text-[11px] text-slate-200 line-clamp-2">
                  {banner.subtitle || 'Mô tả chương trình'}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-amber-300">
                  <span className="bg-white/10 px-2 py-1 rounded-lg">★ {tag1}</span>
                  <span className="bg-white/10 px-2 py-1 rounded-lg">★ {tag2}</span>
                </div>
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-amber-300 shadow-lg">
                  <img src={facultyImg} alt="" className="w-full h-full object-cover object-top" />
                </div>
              </div>
            </div>
          </div>
        ) : template === 'minimal_editorial' ? (
          <div className="relative z-10 border-l-2 border-[#5FBEFF] pl-4 space-y-2.5">
            <div className="text-[9px] font-mono font-bold tracking-widest uppercase text-[#5FBEFF]">
              TWINGS ACADEMY — STRATEGIC EXECUTIVE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 space-y-1.5">
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {banner.title || 'Tiêu đề banner'}
                </h4>
                <p className="text-[11px] text-slate-300 line-clamp-2">
                  {banner.subtitle || 'Mô tả chương trình'}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-200">
                  <span className="bg-white/10 px-2 py-0.5 rounded">✦ {tag1}</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded">✦ {tag2}</span>
                </div>
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <div className="w-20 h-24 rounded-lg overflow-hidden border border-white/20 shadow-md">
                  <img src={facultyImg} alt="" className="w-full h-full object-cover object-top" />
                </div>
              </div>
            </div>
          </div>
        ) : template === 'badge_highlight' ? (
          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BẢO LÃNH ĐẦU RA 100% — MSB BANK</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-white">
                  {banner.title || 'Tiêu đề banner'}
                </h4>
                <p className="text-[11px] text-slate-200 line-clamp-2">
                  {banner.subtitle || 'Mô tả chương trình'}
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-200">
                  <span className="bg-emerald-950/40 border border-emerald-400/30 px-2 py-0.5 rounded truncate">✓ Phỏng vấn tại MSB</span>
                  <span className="bg-emerald-950/40 border border-emerald-400/30 px-2 py-0.5 rounded truncate">✓ {tag1}</span>
                </div>
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-emerald-400/40 relative shadow-md">
                  <img src={facultyImg} alt="" className="w-full h-full object-cover object-top" />
                  <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-slate-950/90 px-1 rounded text-emerald-300">
                    MSB VERIFIED
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* modern_split (Default) */
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center gap-2">
              {partners.map((p, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-[#5FBEFF] text-[9px] font-bold uppercase">
                  {p.name}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-white">
                  {banner.title || 'Tiêu đề banner'}
                </h4>
                <p className="text-[11px] text-slate-200 line-clamp-2">
                  {banner.subtitle || 'Mô tả chương trình'}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-200">
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#5FBEFF]" />
                    <span>{tag1}</span>
                  </span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{tag2}</span>
                  </span>
                </div>
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/20 relative shadow-md">
                  <img src={facultyImg} alt="" className="w-full h-full object-cover object-top" />
                  <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-slate-950/80 px-1 rounded text-[#5FBEFF]">
                    MSB BANK
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2.5 mt-2.5 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-300">
            Hành động: {banner.buttonAction || 'consultation'} ({banner.linkUrl || '#dang-ky'})
          </span>
          <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white shadow-md ${
            banner.buttonStyle === 'primary' 
              ? 'bg-gradient-to-r from-[#FF6B35] to-[#EA580C]' 
              : 'bg-gradient-to-r from-[#0073C1] to-[#2C93E8]'
          }`}>
            {banner.buttonText || 'Đăng ký tư vấn'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const BannersPage: React.FC<{
  bannersState: HeroBannerItem[];
  setBannersState: (next: HeroBannerItem[]) => void;
  onSaveNow?: (next?: HeroBannerItem[]) => Promise<void>;
}> = ({ bannersState, setBannersState, onSaveNow }) => {
  const [editingBanner, setEditingBanner] = useState<HeroBannerItem | null>(null);
  const [isNewBanner, setIsNewBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'content' | 'faculty' | 'buttons' | 'taglines'>('templates');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isUploadingFull, setIsUploadingFull] = useState(false);
  const [isUploadingFaculty, setIsUploadingFaculty] = useState(false);
  const fullFileInputRef = useRef<HTMLInputElement>(null);
  const facultyFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const withSortOrders = (list: HeroBannerItem[]): HeroBannerItem[] =>
    list.map((item, idx) => ({ ...item, sortOrder: idx }));

  const moveUp = async (idx: number) => {
    if (idx <= 0) return;
    const next = [...bannersState];
    const tmp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = tmp;
    const ordered = withSortOrders(next);
    setBannersState(ordered);
    broadcastBannersUpdate(ordered);
    if (onSaveNow) {
      try {
        await onSaveNow(ordered);
      } catch (err) {
        console.error('Error saving reordered banners:', err);
      }
    }
    showToast(`Đã chuyển Slide #${idx + 1} lên vị trí #${idx} & đồng bộ ngay!`);
  };

  const moveDown = async (idx: number) => {
    if (idx >= bannersState.length - 1) return;
    const next = [...bannersState];
    const tmp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = tmp;
    const ordered = withSortOrders(next);
    setBannersState(ordered);
    broadcastBannersUpdate(ordered);
    if (onSaveNow) {
      try {
        await onSaveNow(ordered);
      } catch (err) {
        console.error('Error saving reordered banners:', err);
      }
    }
    showToast(`Đã chuyển Slide #${idx + 1} xuống vị trí #${idx + 2} & đồng bộ ngay!`);
  };

  const handleDelete = async (id: string, idx: number) => {
    if (window.confirm(`Bạn có chắc muốn xóa Slide #${idx + 1}? Thao tác này sẽ đồng bộ ngay ra trang chủ.`)) {
      const next = withSortOrders(bannersState.filter((b) => b.id !== id));
      setBannersState(next);
      broadcastBannersUpdate(next);
      if (onSaveNow) {
        try {
          await onSaveNow(next);
        } catch (err) {
          console.error('Error deleting banner:', err);
        }
      }
      showToast(`Đã xóa Slide #${idx + 1} & cập nhật trang chủ`);
    }
  };

  const handleStartEdit = (banner: HeroBannerItem) => {
    const clone = JSON.parse(JSON.stringify(banner));
    if (!clone.cardTemplate) clone.cardTemplate = 'modern_split';
    setEditingBanner(clone);
    setIsNewBanner(false);
    setActiveTab('templates');
  };

  const handleStartNew = () => {
    const newB: HeroBannerItem = {
      id: `banner-${Date.now()}`,
      title: 'Đột phá Sự nghiệp Ngân hàng Thực chiến',
      subtitle: 'Đào tạo trực tiếp cùng Giám đốc Khối & Chuyên gia MSB. Cam kết kết nối việc làm và bảo lãnh tuyển dụng.',
      bgGradient: 'from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]',
      cardTemplate: 'modern_split',
      sortOrder: 0,
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
    setActiveTab('templates');
  };

  const handleSaveEdit = async () => {
    if (!editingBanner) return;
    setIsSaving(true);
    let nextList: HeroBannerItem[];
    if (isNewBanner) {
      nextList = withSortOrders([editingBanner, ...bannersState]);
    } else {
      nextList = withSortOrders(bannersState.map((b) => (b.id === editingBanner.id ? editingBanner : b)));
    }
    setBannersState(nextList);
    // Instant real-time local and cross-tab broadcast
    broadcastBannersUpdate(nextList);

    // Immediate save to backend
    if (onSaveNow) {
      try {
        await onSaveNow(nextList);
      } catch (err) {
        console.error('Error saving banner to server:', err);
        setIsSaving(false);
        showToast('Có lỗi khi lưu lên máy chủ: ' + (err instanceof Error ? err.message : String(err)));
        return;
      }
    }
    setIsSaving(false);
    showToast(isNewBanner ? 'Đã thêm & đồng bộ banner ra trang chủ!' : 'Đã lưu & đồng bộ banner ra trang chủ thành công!');
    setEditingBanner(null);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const ordered = withSortOrders(bannersState);
    setBannersState(ordered);
    broadcastBannersUpdate(ordered);
    if (onSaveNow) {
      try {
        await onSaveNow(ordered);
      } catch (err) {
        console.error('Error in manual sync:', err);
      }
    }
    setIsSyncing(false);
    showToast('Đã đồng bộ tức thì toàn bộ banner ra ngoài trang chủ!');
  };

  const handleClearCacheAndSync = async () => {
    setIsSyncing(true);
    clearBannersCache();
    const ordered = withSortOrders(bannersState);
    setBannersState(ordered);
    broadcastBannersUpdate(ordered);
    if (onSaveNow) {
      try {
        await onSaveNow(ordered);
      } catch (err) {
        console.error('Error in clear cache sync:', err);
      }
    }
    setIsSyncing(false);
    showToast('Đã xóa sạch cookie/cache và làm mới toàn bộ banner!');
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              Quản Lý Banner Hero Trang Chủ
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0073C1] border border-blue-200">
              {bannersState.length} Slideshow
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đồng bộ tức thì
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Thay đổi tại đây sẽ được <strong>lưu vào database và đồng bộ tự động tức thì (real-time)</strong> ra trang chủ mà không cần chờ đợi. Nếu người dùng mở trang trước đó, cơ chế Broadcast & Cache-busting sẽ tự động đẩy nội dung mới nhất.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          {/* Clear Cache & Sync */}
          <button
            onClick={handleClearCacheAndSync}
            disabled={isSyncing}
            title="Xóa cookie và cache trình duyệt, ép tải lại banner mới nhất"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Xóa Cookie & Cache</span>
          </button>

          {/* Manual Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Đẩy dữ liệu banner hiện tại ra ngoài trang chủ ngay lập tức"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
          >
            <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Ngay'}</span>
          </button>

          {/* View Homepage Live */}
          <a
            href={`/?_t=${Date.now()}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở trang chủ với tham số làm mới tức thì"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Xem Trang Chủ</span>
          </a>

          {/* Add New Banner */}
          <button
            onClick={handleStartNew}
            className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md shrink-0 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Banner</span>
          </button>
        </div>
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
                      <div className={`w-full h-full bg-gradient-to-br ${banner.bgGradient || 'from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]'} p-2 flex items-center justify-between relative`}>
                        <div className="w-2/3 space-y-1">
                          <div className="w-full h-2 bg-white/40 rounded-full" />
                          <div className="w-4/5 h-1.5 bg-white/20 rounded-full" />
                          <div className="w-1/2 h-1 bg-white/20 rounded-full" />
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

                    {!isImageOnly && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0073C1] border border-blue-200">
                        Template: {CARD_TEMPLATES.find(t => t.id === (banner.cardTemplate || 'modern_split'))?.label.split('(')[0].trim() || 'Executive'}
                      </span>
                    )}

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
                  {/* Gợi Ý Kích Thước & Tỷ Lệ Chuẩn Cho Chế Độ Banner Ảnh */}
                  <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                        <Info className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Gợi Ý Kích Thước & Tỷ Lệ Chuẩn (Khuyên Dùng Cho Màn Hình 14" - 16")</span>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-300 shadow-2xs">
                        Tỷ Lệ Vàng ~3.8:1
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white/95 p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span>Kích thước tối ưu:</span>
                        </div>
                        <div className="text-purple-700 font-mono font-black text-sm tracking-tight">
                          1920 × 500 px
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Hoặc <strong>1440 × 380 px</strong>. Chiều cao thấp vừa vặn, không chiếm hết màn hình laptop 14 inch. Tối thiểu 1200 × 350 px.
                        </p>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>Vùng an toàn (Safe Zone):</span>
                        </div>
                        <div className="text-indigo-700 font-bold text-xs">
                          80% Trung tâm chiều rộng
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Đặt chữ, tiêu đề và logo trong khoảng 80% chính giữa để không bị che khuất khi co giãn trên laptop và điện thoại.
                        </p>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Định dạng & Dung lượng:</span>
                        </div>
                        <div className="text-emerald-700 font-bold text-xs">
                          WebP / JPG &lt; 500 KB
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Nén ảnh trước khi tải lên giúp trang chủ tải nhanh, mượt mà và tăng điểm SEO Core Web Vitals.
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-3.5 py-2 text-[11px] text-amber-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Mẹo thiết kế:</strong> Nếu ảnh banner của bạn đã có sẵn câu chữ, logo hoặc nút bấm CTA trong ảnh, hãy tắt hai tùy chọn <em>"Hiện tiêu đề đè lên ảnh"</em> và <em>"Hiện nút bấm đè lên ảnh"</em> bên dưới để giao diện gọn gàng, tránh bị lặp nội dung.
                      </span>
                    </div>
                  </div>

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
                    <div className="aspect-[3.84/1] min-h-[140px] max-h-[220px] rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 relative group shadow-inner mt-2">
                      <img
                        src={editingBanner.fullBannerImageUrl || editingBanner.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-white/20">
                        Khung xem trước tỷ lệ Hero chuẩn 14" (Tỷ lệ ~3.8:1)
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
                  <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1">
                    {[
                      { id: 'templates', label: '1. Mẫu Card & Màu Nền', icon: Layout },
                      { id: 'content', label: '2. Tiêu Đề & Giới Thiệu', icon: Sparkles },
                      { id: 'faculty', label: '3. Ảnh Chuyên Gia (Upload)', icon: UserCheck },
                      { id: 'buttons', label: '4. Nút Bấm & Hành Động', icon: ExternalLink },
                      { id: 'taglines', label: '5. Taglines & Đối Tác', icon: CheckCircle2 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-3.5 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-lg ${
                            isActive
                              ? 'border-[#0073C1] text-[#0073C1] bg-blue-50/70 shadow-2xs'
                              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB 1: MẪU CARD & BỘ MÀU NỀN SẴN */}
                  {activeTab === 'templates' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      {/* Section 1: 5 Card Templates */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                            <Layout className="w-4 h-4 text-[#0073C1]" />
                            <span>1. Chọn Mẫu Giao Diện Thẻ Card (Card Template)</span>
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            5 phong cách được thiết kế ăn khớp với tổng thể Hero
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {CARD_TEMPLATES.map((tmpl) => {
                            const Icon = tmpl.icon;
                            const isSelected = (editingBanner.cardTemplate || 'modern_split') === tmpl.id;
                            return (
                              <button
                                key={tmpl.id}
                                type="button"
                                onClick={() => setEditingBanner({ ...editingBanner, cardTemplate: tmpl.id, displayType: 'card' })}
                                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                                  isSelected
                                    ? 'border-[#0073C1] bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-[#0073C1] text-white' : 'bg-slate-100 text-slate-600 group-hover:text-slate-900'}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}>
                                      {tmpl.badge}
                                    </span>
                                  </div>
                                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#0073C1] transition-colors">
                                    {tmpl.label}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                    {tmpl.description}
                                  </p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold">
                                  <span className={isSelected ? 'text-[#0073C1]' : 'text-slate-400'}>
                                    {isSelected ? '✓ Đang chọn mẫu này' : 'Bấm để áp dụng'}
                                  </span>
                                  {isSelected && (
                                    <span className="w-2 h-2 rounded-full bg-[#0073C1] animate-ping" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: Curated background palettes */}
                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                            <Palette className="w-4 h-4 text-[#0073C1]" />
                            <span>2. Bộ Màu Nền Sẵn Dành Riêng Cho Hero Section (Curated Palettes)</span>
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Phối màu tối sâu, hòa quyện với sóng Three.js 3D Wave
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {CARD_GRADIENT_PRESETS.map((p) => {
                            const isSelected = editingBanner.bgGradient === p.value;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setEditingBanner({ ...editingBanner, bgGradient: p.value, displayType: 'card' })}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                                  isSelected
                                    ? 'border-[#0073C1] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                                }`}
                              >
                                <div className={`w-full h-8 rounded-lg ${p.bg} shadow-inner mb-2 border border-black/10`} />
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {p.label}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`font-bold px-1.5 py-0.5 rounded ${p.tagColor}`}>
                                    {p.tag}
                                  </span>
                                  <span className={`font-semibold ${isSelected ? 'text-[#0073C1] font-bold' : 'text-slate-400'}`}>
                                    {isSelected ? '✓ Đang dùng' : 'Chọn'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Gradient Input */}
                        <div className="pt-2">
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            Tùy chỉnh mã Gradient Tailwind CSS riêng:
                          </label>
                          <input
                            type="text"
                            value={editingBanner.bgGradient || 'from-[#0A1A3A] via-[#0E2A5D] to-[#0073C1]'}
                            onChange={(e) => setEditingBanner({ ...editingBanner, bgGradient: e.target.value })}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono shadow-2xs focus:bg-white focus:border-blue-500 focus:outline-none"
                            placeholder="from-[#...] via-[#...] to-[#...]"
                          />
                        </div>
                      </div>

                      {/* Section 3: Live Preview in Tab 1 */}
                      <div className="pt-4 border-t border-slate-200">
                        <BannerCardLivePreview banner={editingBanner} />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Nội dung text & Tiêu đề */}
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

                      <div className="pt-3 border-t border-slate-200">
                        <BannerCardLivePreview banner={editingBanner} />
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Ảnh chuyên gia bên phải (Có UPLOAD từ máy) */}
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
                          <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-md relative group">
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
                                Chuyên Gia
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-1.5">
                            Ảnh góc phải Hero Card
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200">
                        <BannerCardLivePreview banner={editingBanner} />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Nút Bấm & Hành Động */}
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

                      <div className="pt-3 border-t border-slate-200">
                        <BannerCardLivePreview banner={editingBanner} />
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Taglines & Đối Tác */}
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

                      <div className="pt-3 border-t border-slate-200">
                        <BannerCardLivePreview banner={editingBanner} />
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
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md active:scale-98 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu & đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu & Đồng Bộ Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
