import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  ExternalLink, 
  Image as ImageIcon, 
  Sparkles,
  X
} from 'lucide-react';
import { PartnerItem } from '../../types';

interface CMSPartnersTabProps {
  partners: PartnerItem[];
  onUpdatePartners: (updated: PartnerItem[]) => void;
}

export const CMSPartnersTab: React.FC<CMSPartnersTabProps> = ({
  partners,
  onUpdatePartners,
}) => {
  const [partnerList, setPartnerList] = useState<PartnerItem[]>(partners);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [logoText, setLogoText] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoColor, setLogoColor] = useState('#0073C1');
  const [slogan, setSlogan] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [type, setType] = useState<'company' | 'university'>('company');

  const handleOpenEdit = (p: PartnerItem) => {
    setEditingPartner(p);
    setIsCreatingNew(false);
    setName(p.name);
    setLogoText(p.logoText || p.name);
    setLogoUrl(p.logoUrl || '');
    setLogoColor(p.logoColor || '#0073C1');
    setSlogan(p.slogan || '');
    setWebsiteUrl(p.websiteUrl || '');
    setType(p.type || 'company');
  };

  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    setEditingPartner(null);
    setName('');
    setLogoText('');
    setLogoUrl('https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=120&q=80');
    setLogoColor('#0073C1');
    setSlogan('');
    setWebsiteUrl('');
    setType('company');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: PartnerItem = {
      id: editingPartner?.id || `p-${Date.now()}`,
      name,
      logoText: logoText || name,
      logoUrl,
      logoColor,
      slogan,
      websiteUrl,
      type
    };

    let updated: PartnerItem[];
    if (isCreatingNew) {
      updated = [...partnerList, item];
    } else {
      updated = partnerList.map((p) => (p.id === item.id ? item : p));
    }

    setPartnerList(updated);
    onUpdatePartners(updated);
    setEditingPartner(null);
    setIsCreatingNew(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đối tác này?')) {
      const updated = partnerList.filter((p) => p.id !== id);
      setPartnerList(updated);
      onUpdatePartners(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0073C1]" />
            <h2 className="text-lg font-bold text-slate-900">
              Quản Trị Đơn Vị Hợp Tác & Logo Doanh Nghiệp
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý logo ngân hàng (MSB, ROX Group, TNtalent), các trường đại học đối tác và đường link website.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Đối Tác / Logo Mới</span>
        </button>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partnerList.map((p) => (
          <div
            key={p.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-200 p-1.5 bg-white shadow-2xs flex items-center justify-center shrink-0">
                {p.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt={p.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-[#0073C1]" />
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {p.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.type === 'university' ? 'Đại học' : 'Tập đoàn'}
                  </span>
                </div>

                <div className="text-[11px] font-bold font-mono" style={{ color: p.logoColor || '#0073C1' }}>
                  {p.logoText}
                </div>

                {p.slogan && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {p.slogan}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {p.websiteUrl ? (
                <a
                  href={p.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0073C1] font-semibold text-[11px] flex items-center gap-1 hover:underline"
                >
                  <span>Xem website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400 text-[11px]">Chưa gắn link</span>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 hover:bg-blue-50 text-[#0073C1] rounded-lg transition-colors cursor-pointer"
                  title="Sửa Logo"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit Partner */}
      {(editingPartner || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>{isCreatingNew ? 'Thêm Đơn Vị Hợp Tác Mới' : 'Chỉnh Sửa Đối Tác & Logo'}</span>
              </h3>
              <button
                onClick={() => {
                  setEditingPartner(null);
                  setIsCreatingNew(false);
                }}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên đơn vị hợp tác *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: MSB Ngân hàng TMCP Hàng Hải"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chữ Logo hiển thị</label>
                  <input
                    type="text"
                    value={logoText}
                    onChange={(e) => setLogoText(e.target.value)}
                    placeholder="MSB"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Màu chủ đạo (Hex)</label>
                  <input
                    type="text"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    placeholder="#EA580C"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Đường dẫn ảnh Logo (Logo URL)</label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-slate-400" />}
                  </div>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Slogan / Vai trò hợp tác</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Đối tác chiến lược tuyển dụng & đào tạo thực chiến"
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Liên kết website đối tác (URL ngoài)</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://www.msb.com.vn"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPartner(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Đối Tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
