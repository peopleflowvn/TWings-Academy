import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  ExternalLink, 
  Image as ImageIcon, 
  Sparkles,
  X,
  Upload,
  Loader2,
  ArrowUp,
  ArrowDown,
  Check,
  ShieldCheck,
  Globe,
  Tag,
  Palette
} from 'lucide-react';
import { PartnerItem } from '../../types';
import { uploadImage } from './ImageUploadField';

interface CMSPartnersTabProps {
  partners: PartnerItem[];
  onUpdatePartners: (updated: PartnerItem[]) => void;
  sectionTitle?: string;
  onUpdateTitle?: (title: string) => void;
}

const COLOR_PRESETS = [
  { label: 'Cam MSB', value: '#EA580C' },
  { label: 'Đỏ TNTalent', value: '#DC2626' },
  { label: 'Xanh MB Bank', value: '#0048C8' },
  { label: 'Cam ROX Group', value: '#E65100' },
  { label: 'Xanh TWings', value: '#0073C1' },
  { label: 'Đen Sang Trọng', value: '#0F172A' },
];

const SAMPLE_PARTNERS = [
  {
    name: 'MSB Bank',
    logoText: 'MSB',
    logoColor: '#EA580C',
    logoUrl: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=200&q=80',
    slogan: 'Ngân hàng TMCP Hàng Hải Việt Nam',
    tag: 'Bảo lãnh tuyển dụng',
    type: 'company' as const,
    websiteUrl: 'https://www.msb.com.vn',
  },
  {
    name: 'ROX Group',
    logoText: 'ROX GROUP',
    logoColor: '#E65100',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    slogan: 'Tập đoàn Đầu tư & Phát triển Bất động sản, Dịch vụ',
    tag: 'Đối tác chiến lược',
    type: 'company' as const,
    websiteUrl: 'https://roxgroup.vn',
  },
  {
    name: 'TNTalent',
    logoText: 'TNTALENT',
    logoColor: '#DC2626',
    logoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=200&q=80',
    slogan: 'Tư vấn & Cung ứng Giải pháp Nhân sự Chiến lược',
    tag: 'Kết nối việc làm',
    type: 'company' as const,
    websiteUrl: 'https://tntalent.vn',
  },
  {
    name: 'MB Bank',
    logoText: 'MB BANK',
    logoColor: '#0048C8',
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&q=80',
    slogan: 'Ngân hàng TMCP Quân Đội',
    tag: 'Đối tác ngân hàng',
    type: 'company' as const,
    websiteUrl: 'https://www.mbbank.com.vn',
  },
];

async function safeUploadFile(file: File): Promise<string> {
  try {
    return await uploadImage(file);
  } catch {
    // Resilient fallback for local / offline testing: read local file as data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.readAsDataURL(file);
    });
  }
}

export const CMSPartnersTab: React.FC<CMSPartnersTabProps> = ({
  partners,
  onUpdatePartners,
  sectionTitle,
  onUpdateTitle,
}) => {
  const [partnerList, setPartnerList] = useState<PartnerItem[]>(partners);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customTitle, setCustomTitle] = useState(sectionTitle || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenEdit = (p: PartnerItem) => {
    // Clone partner into local editing state so edits don't apply until saved
    setEditingPartner(JSON.parse(JSON.stringify(p)));
    setIsCreatingNew(false);
  };

  const handleOpenCreate = () => {
    const newPartner: PartnerItem = {
      id: `partner-${Date.now()}`,
      name: '',
      logoText: '',
      logoUrl: '',
      logoColor: '#0073C1',
      slogan: '',
      tag: 'Đối tác chiến lược',
      websiteUrl: '',
      type: 'company'
    };
    setEditingPartner(newPartner);
    setIsCreatingNew(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner || !editingPartner.name.trim()) {
      alert('Vui lòng nhập tên đơn vị hợp tác.');
      return;
    }

    const item: PartnerItem = {
      ...editingPartner,
      logoText: editingPartner.logoText?.trim() || editingPartner.name.trim(),
      logoColor: editingPartner.logoColor || '#0073C1',
      themeColor: editingPartner.logoColor || '#0073C1',
    };

    let updated: PartnerItem[];
    if (isCreatingNew) {
      updated = [...partnerList, item];
      showToast('Đã thêm đối tác mới thành công!');
    } else {
      updated = partnerList.map((p) => (p.id === item.id ? item : p));
      showToast('Đã lưu thay đổi đối tác thành công!');
    }

    setPartnerList(updated);
    onUpdatePartners(updated);
    setEditingPartner(null);
    setIsCreatingNew(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa đối tác "${name}"?`)) {
      const updated = partnerList.filter((p) => p.id !== id);
      setPartnerList(updated);
      onUpdatePartners(updated);
      showToast('Đã xóa đối tác.');
    }
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...partnerList];
    const tmp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = tmp;
    setPartnerList(next);
    onUpdatePartners(next);
    showToast(`Đã chuyển đối tác lên vị trí #${idx}`);
  };

  const moveDown = (idx: number) => {
    if (idx >= partnerList.length - 1) return;
    const next = [...partnerList];
    const tmp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = tmp;
    setPartnerList(next);
    onUpdatePartners(next);
    showToast(`Đã chuyển đối tác xuống vị trí #${idx + 2}`);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingPartner) return;

    setIsUploading(true);
    try {
      const url = await safeUploadFile(file);
      setEditingPartner({
        ...editingPartner,
        logoUrl: url
      });
      showToast('Tải logo lên thành công!');
    } catch {
      alert('Không thể tải file ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveTitle = () => {
    if (onUpdateTitle) {
      onUpdateTitle(customTitle);
      showToast('Đã lưu tiêu đề khu vực đối tác!');
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

      {/* Top Banner Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              Quản Trị Đơn Vị Hợp Tác & Logo Doanh Nghiệp
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0073C1] border border-blue-200">
              {partnerList.length} Đối Tác
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Quản lý danh sách các ngân hàng bảo lãnh tuyển dụng, tập đoàn chiến lược và trường đại học liên kết hiển thị trên trang chủ. Hỗ trợ upload ảnh logo, sắp xếp thứ tự và gắn liên kết website.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Đối Tác Mới</span>
        </button>
      </div>

      {/* Section Title Customizer */}
      {onUpdateTitle && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tiêu Đề Khu Vực Đối Tác Hiển Thị Trên Trang Chủ
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="VD: Mạng lưới Đối tác Chiến lược & Doanh nghiệp Bảo lãnh Tuyển dụng"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveTitle}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto mt-0 sm:mt-5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Tiêu Đề</span>
          </button>
        </div>
      )}

      {/* Partners List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partnerList.map((p, idx) => (
          <div
            key={p.id || idx}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 hover:border-blue-300 group"
          >
            {/* Top row: Order, Logo, Name & Type */}
            <div className="flex items-start gap-3.5">
              {/* Reorder arrows */}
              <div className="flex flex-col gap-1 items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Di chuyển lên trước"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-700">
                  #{idx + 1}
                </span>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === partnerList.length - 1}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Di chuyển xuống sau"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Logo Preview */}
              <div className="w-14 h-14 rounded-2xl border border-slate-200 p-2 bg-slate-50 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-white transition-colors overflow-hidden">
                {p.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt={p.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=120&q=80';
                    }}
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-[#0073C1]" />
                )}
              </div>

              {/* Partner Text Info */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {p.name || 'Chưa đặt tên'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {p.type === 'university' ? 'Đại học' : 'Tập đoàn / Ngân hàng'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs font-black font-mono tracking-tight"
                    style={{ color: p.logoColor || '#0073C1' }}
                  >
                    {p.logoText || p.name}
                  </span>
                  {p.tag && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#0073C1] border border-blue-100">
                      {p.tag}
                    </span>
                  )}
                </div>

                {p.slogan && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed font-medium">
                    {p.slogan}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {p.websiteUrl ? (
                <a
                  href={p.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0073C1] font-bold text-[11px] flex items-center gap-1 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{p.websiteUrl.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400 text-[11px]">Chưa gắn website</span>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(p)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0073C1] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Chỉnh sửa đối tác"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="Xóa đối tác này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDIT & SAVE ĐỐI TÁC (CHỈ LƯU KHI BẤM "LƯU ĐỐI TÁC") */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-blue-400" />
                <span>{isCreatingNew ? 'Thêm Đơn Vị Hợp Tác Mới' : `Chỉnh Sửa Đối Tác: ${editingPartner.name || 'Chưa đặt tên'}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4.5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Tên đối tác */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Tên Đơn Vị Hợp Tác *
                </label>
                <input
                  type="text"
                  required
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  placeholder="VD: MSB Ngân hàng TMCP Hàng Hải Việt Nam"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Logo URL & Upload từ máy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#0073C1]" />
                    <span>Ảnh Logo Đối Tác (Upload Từ Máy Hoặc Nhập URL)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1 bg-[#0073C1] hover:bg-[#005FA0] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Tải File Từ Máy</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleUploadLogo}
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white p-1.5 shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
                    {editingPartner.logoUrl ? (
                      <img src={editingPartner.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingPartner.logoUrl || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, logoUrl: e.target.value })}
                    placeholder="https://... hoặc tải từ máy"
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl font-mono text-[11px] bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Sample quick picker */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Mẫu có sẵn:</span>
                  {SAMPLE_PARTNERS.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setEditingPartner({
                        ...editingPartner,
                        name: editingPartner.name || s.name,
                        logoText: s.logoText,
                        logoUrl: s.logoUrl,
                        logoColor: s.logoColor,
                        slogan: editingPartner.slogan || s.slogan,
                        tag: s.tag,
                        websiteUrl: s.websiteUrl
                      })}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-blue-50 text-[#0073C1] border border-blue-200 rounded-md transition-colors cursor-pointer"
                    >
                      {s.logoText}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chữ Logo hiển thị & Màu thương hiệu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Chữ Logo Viết Tắt (logoText)
                  </label>
                  <input
                    type="text"
                    value={editingPartner.logoText || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, logoText: e.target.value })}
                    placeholder="MSB, ROX GROUP..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Màu Thương Hiệu (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingPartner.logoColor || '#0073C1'}
                      onChange={(e) => setEditingPartner({ ...editingPartner, logoColor: e.target.value })}
                      className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={editingPartner.logoColor || '#0073C1'}
                      onChange={(e) => setEditingPartner({ ...editingPartner, logoColor: e.target.value })}
                      placeholder="#EA580C"
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px] bg-slate-50 focus:bg-white"
                    />
                  </div>
                  {/* Preset color swatches */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {COLOR_PRESETS.map((c, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => setEditingPartner({ ...editingPartner, logoColor: c.value })}
                        className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Phân loại & Tag điểm nhấn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Loại Đơn Vị
                  </label>
                  <select
                    value={editingPartner.type || 'company'}
                    onChange={(e) => setEditingPartner({ ...editingPartner, type: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white cursor-pointer font-medium"
                  >
                    <option value="company">Tập đoàn / Ngân hàng Doanh nghiệp</option>
                    <option value="university">Trường Đại học / Viện nghiên cứu</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Tag Điểm Nhấn (Nhãn nổi)
                  </label>
                  <input
                    type="text"
                    value={editingPartner.tag || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, tag: e.target.value })}
                    placeholder="VD: Bảo lãnh tuyển dụng, Đối tác chiến lược"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Slogan / Vai trò hợp tác */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Slogan / Vai Trò Hợp Tác
                </label>
                <input
                  type="text"
                  value={editingPartner.slogan || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, slogan: e.target.value })}
                  placeholder="VD: Ngân hàng TMCP Hàng Hải Việt Nam - Cam kết tuyển dụng"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Liên Kết Website Đối Tác (URL ngoài)
                </label>
                <input
                  type="text"
                  value={editingPartner.websiteUrl || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, websiteUrl: e.target.value })}
                  placeholder="https://www.msb.com.vn"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px] bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Nhấn "Lưu Đối Tác" để ghi nhận thay đổi.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPartner(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Đối Tác</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
