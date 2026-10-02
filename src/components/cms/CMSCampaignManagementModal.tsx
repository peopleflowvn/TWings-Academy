import React, { useState } from 'react';
import {
  X,
  Target,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Users,
  Award,
  DollarSign,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  MapPin,
  Flame,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdmissionCampaign, CampaignPositionTrack, Order } from '../../types';
import { saveCampaigns } from '../../utils/talentCampaigns';

interface CMSCampaignManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: AdmissionCampaign[];
  onUpdateCampaigns: (updated: AdmissionCampaign[]) => void;
  orders: Order[];
  onSelectCampaign?: (campaignId: string) => void;
}

export const CMSCampaignManagementModal: React.FC<CMSCampaignManagementModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onUpdateCampaigns,
  orders,
  onSelectCampaign
}) => {
  const [activeCampaign, setActiveCampaign] = useState<AdmissionCampaign>(campaigns[0] || {} as AdmissionCampaign);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<AdmissionCampaign>>({});
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [newPositionShort, setNewPositionShort] = useState('');
  const [newPositionQuota, setNewPositionQuota] = useState(25);
  const [newPositionSalary, setNewPositionSalary] = useState('14 - 25 Triệu / tháng');
  const [newPositionDept, setNewPositionDept] = useState('Khối Ngân Hàng Bán Lẻ MSB');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const formatVND = (num?: number) => {
    if (!num) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setIsEditing(false);
    setFormData({
      id: `camp-${Date.now()}`,
      code: `CAMP-${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      name: 'Chiến Dịch Tuyển Sinh & Tuyển Dụng Banker Mới',
      status: 'active',
      timeRange: 'Tháng 11/2026 - 01/2027',
      startDate: '01/11/2026',
      deadline: '15/12/2026',
      targetHeadcount: 80,
      totalEnrolled: 0,
      leadRecruiter: 'Hội đồng Tuyển sinh TWings & Ban Nhân sự MSB',
      scholarshipBudget: 200000000,
      location: 'Hà Nội & Miền Bắc',
      description: 'Chương trình đào tạo thực chiến và tuyển dụng trực tiếp vào mạng lưới chi nhánh MSB.',
      positions: [
        {
          id: `pos-${Date.now()}-1`,
          courseId: 'twings-qhkh-doanh-nghiep',
          positionTitle: 'Chuyên viên Quan hệ Khách hàng Doanh nghiệp (RM CIB)',
          shortName: 'RM Doanh Nghiệp',
          department: 'Khối Khách Hàng Doanh Nghiệp MSB',
          targetQuota: 25,
          enrolledCount: 0,
          leadInstructorName: 'GV Vũ Thu Phương',
          salaryRange: '15 - 28 Triệu / tháng',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        {
          id: `pos-${Date.now()}-2`,
          courseId: 'twings-qhkh-ca-nhan',
          positionTitle: 'Chuyên viên Quan hệ Khách hàng Cá nhân (Retail Banker)',
          shortName: 'RM Bán Lẻ (RB)',
          department: 'Khối Ngân Hàng Bán Lẻ MSB',
          targetQuota: 30,
          enrolledCount: 0,
          leadInstructorName: 'GV Đặng Văn Thành',
          salaryRange: '12 - 22 Triệu / tháng',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        }
      ]
    });
  };

  const handleStartEdit = (camp: AdmissionCampaign) => {
    setActiveCampaign(camp);
    setFormData({ ...camp });
    setIsEditing(true);
    setIsCreatingNew(false);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      alert('Vui lòng nhập tên và mã chiến dịch.');
      return;
    }

    let updatedList: AdmissionCampaign[];
    if (isCreatingNew) {
      const newCamp = formData as AdmissionCampaign;
      updatedList = [newCamp, ...campaigns];
      setActiveCampaign(newCamp);
      showToast(`Đã tạo chiến dịch tuyển dụng "${newCamp.name}"!`);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    } else {
      updatedList = campaigns.map((c) => (c.id === formData.id ? ({ ...c, ...formData } as AdmissionCampaign) : c));
      setActiveCampaign({ ...activeCampaign, ...formData } as AdmissionCampaign);
      showToast('Đã lưu thông tin chiến dịch thành công!');
    }

    onUpdateCampaigns(updatedList);
    saveCampaigns(updatedList);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const handleDeleteCampaign = (campId: string, campName: string) => {
    if (campaigns.length <= 1) {
      alert('Hệ thống cần tối thiểu 1 chiến dịch tuyển dụng hoạt động.');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa chiến dịch "${campName}"?`)) {
      const updated = campaigns.filter((c) => c.id !== campId);
      onUpdateCampaigns(updated);
      saveCampaigns(updated);
      setActiveCampaign(updated[0]);
      showToast(`Đã xóa chiến dịch "${campName}".`);
    }
  };

  const handleAddPositionToForm = () => {
    if (!newPositionTitle.trim()) {
      alert('Vui lòng nhập tên vị trí việc làm / khóa học.');
      return;
    }

    const newPos: CampaignPositionTrack = {
      id: `pos-${Date.now()}`,
      courseId: 'twings-qhkh-ca-nhan',
      positionTitle: newPositionTitle.trim(),
      shortName: newPositionShort.trim() || newPositionTitle.trim().slice(0, 18),
      department: newPositionDept,
      targetQuota: Number(newPositionQuota) || 20,
      enrolledCount: 0,
      salaryRange: newPositionSalary,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };

    setFormData((prev) => ({
      ...prev,
      positions: [...(prev.positions || []), newPos]
    }));

    setNewPositionTitle('');
    setNewPositionShort('');
    showToast(`Đã thêm vị trí "${newPos.positionTitle}" vào chiến dịch.`);
  };

  const handleRemovePosition = (posId: string) => {
    setFormData((prev) => ({
      ...prev,
      positions: (prev.positions || []).filter((p) => p.id !== posId)
    }));
  };

  // Count leads in active campaign
  const campaignOrders = orders.filter((o) => {
    if (activeCampaign.id === 'camp-2026-q4-hn') {
      return (o.batchCohort || '').includes('Hà Nội') || (o.studyArea || '').includes('Hà Nội') || !o.batchCohort;
    }
    if (activeCampaign.id === 'camp-2026-oct-hcm') {
      return (o.batchCohort || '').includes('HCM') || (o.studyArea || '').includes('HCM');
    }
    return true;
  });

  const enrolledCount = campaignOrders.filter((o) => o.status === 'paid' || o.crmStatus === '5. Đã đóng phí').length;
  const targetHeadcount = activeCampaign.targetHeadcount || 100;
  const progressPercent = Math.min(100, Math.round((enrolledCount / targetHeadcount) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 px-2 py-0.5 rounded-full border border-indigo-400/30 text-indigo-200">
                  TalentFlow ATS Architecture
                </span>
                <span className="text-xs text-slate-300">&bull; Tuyển Sinh Như Tuyển Dụng</span>
              </div>
              <h2 className="text-lg font-bold">
                Quản Lý Chiến Dịch Tuyển Dụng &amp; Vị Trí Tuyển Sinh (Campaign Hub)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && !isCreatingNew && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Chiến Dịch Mới</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Banner explaining the TalentFlow recruitment logic */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-bold text-blue-900">
                  Cơ chế Tuyển Sinh Tương Tự Tuyển Dụng Nhân Tài (Talent Acquisition Requisition):
                </p>
                <p className="text-blue-700">
                  Mỗi đợt tuyển sinh là 1 <strong>Chiến Dịch (Campaign)</strong> với chỉ tiêu tổng. Trong chiến dịch có từng <strong>Vị trí tuyển dụng (Position Tracks / Requisitions)</strong> tương ứng với các khóa học thực chiến của MSB.
                </p>
              </div>
            </div>
          </div>

          {/* Form View (Create or Edit) */}
          {(isEditing || isCreatingNew) ? (
            <form onSubmit={handleSaveCampaign} className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Edit className="w-4 h-4 text-indigo-600" />
                  <span>{isCreatingNew ? 'Thiết Lập Chiến Dịch Tuyển Dụng Mới' : `Chỉnh Sửa Chiến Dịch: ${formData.name}`}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Hủy thao tác
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã Chiến Dịch (Campaign Code) *</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="CAMP-2026-Q4-HN"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên Chiến Dịch Tuyển Dụng &amp; Tuyển Sinh *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Chiến Dịch Tuyển Sinh Fresher Banker Q4/2026"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thời Gian Diễn Ra (Time Range)</label>
                  <input
                    type="text"
                    value={formData.timeRange || ''}
                    onChange={(e) => setFormData({ ...formData, timeRange: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="15/09/2026 - 15/11/2026"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hạn Chót Ứng Tuyển (Application Deadline)</label>
                  <input
                    type="text"
                    value={formData.deadline || ''}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="12/10/2026"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tổng Chỉ Tiêu Tuyển Dụng (Headcount Quota)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetHeadcount || 100}
                    onChange={(e) => setFormData({ ...formData, targetHeadcount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngân Sách Học Bổng (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.scholarshipBudget || 250000000}
                    onChange={(e) => setFormData({ ...formData, scholarshipBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trưởng Ban Tuyển Sinh / Recruiter Lead</label>
                  <input
                    type="text"
                    value={formData.leadRecruiter || ''}
                    onChange={(e) => setFormData({ ...formData, leadRecruiter: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="ThS. Lê Hoàng Tùng & Ban Nhân sự MSB"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Địa Điểm Đào Tạo &amp; Phỏng Vấn Tiếp Nhận</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Mô Tả &amp; Mục Tiêu Chiến Dịch</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Chiến dịch tuyển chọn và đào tạo nhân sự đầu vào chất lượng cao..."
                  />
                </div>
              </div>

              {/* Position Tracks in this campaign */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>Các Vị Trí Tuyển Dụng &amp; Khóa Học Chi Tiết ({formData.positions?.length || 0})</span>
                  </span>
                </div>

                {/* List of positions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(formData.positions || []).map((pos) => (
                    <div key={pos.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{pos.positionTitle}</p>
                        <p className="text-[11px] text-slate-500 truncate">{pos.department} &bull; Chỉ tiêu: <strong className="text-blue-700">{pos.targetQuota}</strong> &bull; Lương: {pos.salaryRange}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePosition(pos.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer shrink-0"
                        title="Xóa vị trí"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new position inline */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="text"
                    value={newPositionTitle}
                    onChange={(e) => setNewPositionTitle(e.target.value)}
                    placeholder="Tên vị trí việc làm / Khóa học..."
                    className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newPositionQuota}
                    onChange={(e) => setNewPositionQuota(Number(e.target.value))}
                    placeholder="Chỉ tiêu"
                    className="w-20 px-2 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-center"
                    title="Chỉ tiêu tuyển"
                  />
                  <input
                    type="text"
                    value={newPositionSalary}
                    onChange={(e) => setNewPositionSalary(e.target.value)}
                    placeholder="Mức lương dự kiến"
                    className="w-36 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddPositionToForm}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Vị Trí</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCreatingNew ? 'Tạo Chiến Dịch Tuyển Dụng' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Campaign Cards & Detail Inspector */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Campaign List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Danh Sách Chiến Dịch ({campaigns.length})
                </span>

                <div className="space-y-2.5">
                  {campaigns.map((camp) => {
                    const isSelected = camp.id === activeCampaign.id;
                    const campOrders = orders.filter((o) => {
                      if (camp.id === 'camp-2026-q4-hn') return (o.batchCohort || '').includes('Hà Nội') || (o.studyArea || '').includes('Hà Nội') || !o.batchCohort;
                      if (camp.id === 'camp-2026-oct-hcm') return (o.batchCohort || '').includes('HCM') || (o.studyArea || '').includes('HCM');
                      return true;
                    });
                    const enrolled = campOrders.filter((o) => o.status === 'paid' || o.crmStatus === '5. Đã đóng phí').length;
                    const pct = Math.min(100, Math.round((enrolled / (camp.targetHeadcount || 100)) * 100));

                    return (
                      <div
                        key={camp.id}
                        onClick={() => setActiveCampaign(camp)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-400 shadow-sm ring-1 ring-indigo-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md">
                            {camp.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            camp.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : camp.status === 'planning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {camp.status === 'active' ? 'Đang Mở' : camp.status === 'planning' ? 'Chuẩn Bị' : 'Đã Đóng'}
                          </span>
                        </div>

                        <p className="font-bold text-slate-800 text-xs line-clamp-1">{camp.name}</p>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Chỉ tiêu:</span>
                            <span className="font-bold text-slate-800">{enrolled} / {camp.targetHeadcount} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Hạn: {camp.deadline}</span>
                          </span>
                          <span className="text-indigo-600 font-bold">{camp.positions.length} Vị trí</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed View of Active Campaign */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-lg">
                          {activeCampaign.code}
                        </span>
                        <span className="text-xs text-slate-500">{activeCampaign.timeRange}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-1">{activeCampaign.name}</h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectCampaign && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCampaign(activeCampaign.id);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lọc CRM Theo Đợt Này</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeCampaign)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Chỉnh sửa chiến dịch"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(activeCampaign.id, activeCampaign.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Xóa chiến dịch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chỉ Tiêu</span>
                      <span className="text-lg font-black text-slate-800">{activeCampaign.targetHeadcount}</span>
                      <span className="text-[10px] text-slate-500 block">nhân sự</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Đã Tuyển</span>
                      <span className="text-lg font-black text-indigo-700">{enrolledCount}</span>
                      <span className="text-[10px] text-emerald-600 font-bold block">{progressPercent}% hoàn thành</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ngân Sách HB</span>
                      <span className="text-sm font-bold text-amber-700 truncate block mt-1">
                        {formatVND(activeCampaign.scholarshipBudget)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">học bổng</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hạn Chót</span>
                      <span className="text-xs font-bold text-rose-700 block mt-1.5">{activeCampaign.deadline}</span>
                      <span className="text-[10px] text-slate-500 block">chốt danh sách</span>
                    </div>
                  </div>

                  {/* Details metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200">
                    <p className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phụ trách: <strong>{activeCampaign.leadRecruiter}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Địa điểm: <strong>{activeCampaign.location}</strong></span>
                    </p>
                    <p className="sm:col-span-2 text-slate-500 italic mt-1">
                      &ldquo;{activeCampaign.description}&rdquo;
                    </p>
                  </div>

                  {/* Position Tracks Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Các Vị Trí Tuyển Dụng / Khóa Học Thuộc Chiến Dịch:</span>
                      </span>
                      <span className="text-[11px] text-slate-500">{activeCampaign.positions.length} Vị trí chuyên sâu</span>
                    </div>

                    <div className="space-y-2.5">
                      {activeCampaign.positions.map((pos) => {
                        // Count leads for this specific position
                        const posOrders = campaignOrders.filter((o) => {
                          const t = (o.courseTitle || '').toLowerCase();
                          if (pos.shortName.includes('CIB') || pos.positionTitle.includes('Doanh nghiệp')) return t.includes('doanh nghiệp');
                          if (pos.shortName.includes('RB') || pos.positionTitle.includes('Cá nhân')) return t.includes('cá nhân');
                          if (pos.shortName.includes('Teller') || pos.positionTitle.includes('Giao dịch')) return t.includes('giao dịch');
                          if (pos.shortName.includes('AI')) return t.includes('ai') || t.includes('agent');
                          return true;
                        });
                        const posEnrolled = posOrders.filter((o) => o.status === 'paid' || o.crmStatus === '5. Đã đóng phí').length;
                        const posPct = Math.min(100, Math.round((posEnrolled / (pos.targetQuota || 25)) * 100));

                        return (
                          <div key={pos.id} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pos.badgeBg}`}>
                                    {pos.shortName}
                                  </span>
                                  <span className="font-bold text-slate-800 text-xs">{pos.positionTitle}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {pos.department} &bull; Giảng viên chủ nhiệm: <strong>{pos.leadInstructorName || 'Ban Đào tạo MSB'}</strong>
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-slate-800">{posEnrolled} / {pos.targetQuota}</span>
                                <span className="text-[10px] text-slate-400 block">chỉ tiêu ({posPct}%)</span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all"
                                style={{ width: `${posPct}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                              <span>Mức thu nhập sau tiếp nhận: <strong className="text-emerald-700">{pos.salaryRange || '12 - 25 Tr/tháng'}</strong></span>
                              <span className="text-blue-600 font-semibold">{posOrders.length} Hồ sơ ứng tuyển</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Hệ thống CRM Tuyển sinh vận hành theo chuẩn <strong>TalentFlow 1.0 Requisition Model</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
