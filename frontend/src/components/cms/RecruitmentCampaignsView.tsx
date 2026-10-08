import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Flame,
  Globe,
  Lock,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Tag,
  Clock,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Edit,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { AdmissionCampaign, Order, Course } from '../../types';
import { inCampaign } from './LeadPipelineView';

interface RecruitmentCampaignsViewProps {
  campaigns: AdmissionCampaign[];
  orders: Order[];
  courses: Course[];
  onSelectCampaign: (campaignId: string) => void;
  onOpenCreateRequisition: () => void;
  onEditCampaign?: (campaign: AdmissionCampaign) => void;
  onDeleteCampaign?: (campaignId: string) => void;
}

export const RecruitmentCampaignsView: React.FC<RecruitmentCampaignsViewProps> = ({
  campaigns,
  orders,
  courses,
  onSelectCampaign,
  onOpenCreateRequisition,
  onEditCampaign,
  onDeleteCampaign
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatVND = (num?: number) => {
    if (!num) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const handleCopyLink = (camp: AdmissionCampaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/courses/${camp.courseId || 'banking'}?campaign=${camp.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(camp.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to calculate stage breakdown for each campaign
  const getCampaignFunnelData = (camp: AdmissionCampaign) => {
    const campOrders = orders.filter((o) => inCampaign(o, camp));

    const s1_new = campOrders.filter((o) => !o.crmStatus || o.crmStatus === '1. Mới').length;
    const s2_consulting = campOrders.filter(
      (o) => o.crmStatus === '2. Đã tiếp cận' || o.crmStatus === '3. Đang tư vấn'
    ).length;
    const s3_assessed = campOrders.filter((o) => o.crmStatus === '4. Hẹn gặp').length;
    const s4_pending = campOrders.filter(
      (o) => o.crmStatus === '5. Đã đóng phí' && o.status !== 'paid'
    ).length;
    const s5_enrolled = campOrders.filter(
      (o) => o.status === 'paid' || o.crmStatus === '5. Đã đóng phí'
    ).length;

    const totalLeads = campOrders.length;
    const targetQuota = camp.targetHeadcount || 25;
    const actualEnrolled = Math.max(camp.totalEnrolled || 0, s5_enrolled);
    const progressPercent = Math.min(100, Math.round((actualEnrolled / targetQuota) * 100));

    return {
      campOrders,
      totalLeads,
      actualEnrolled,
      targetQuota,
      progressPercent,
      s1_new,
      s2_consulting,
      s3_assessed,
      s4_pending,
      s5_enrolled
    };
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        camp.name.toLowerCase().includes(q) ||
        camp.code.toLowerCase().includes(q) ||
        (camp.location || '').toLowerCase().includes(q) ||
        (camp.courseTitle || '').toLowerCase().includes(q) ||
        (camp.leadRecruiter || '').toLowerCase().includes(q);

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && camp.status === 'active') ||
        (selectedStatus === 'planning' && camp.status === 'planning') ||
        (selectedStatus === 'closed' && camp.status === 'closed');

      const matchesLocation =
        selectedLocation === 'all' ||
        (selectedLocation === 'hn' && (camp.location || '').toLowerCase().includes('hà nội')) ||
        (selectedLocation === 'hcm' && (camp.location || '').toLowerCase().includes('hcm')) ||
        (selectedLocation === 'online' && (camp.format === 'online_external_lms' || (camp.location || '').toLowerCase().includes('online')));

      const matchesCourse =
        selectedCourseFilter === 'all' ||
        camp.courseId === selectedCourseFilter ||
        camp.positions?.some((p) => p.courseId === selectedCourseFilter);

      return matchesSearch && matchesStatus && matchesLocation && matchesCourse;
    });
  }, [campaigns, searchQuery, selectedStatus, selectedLocation, selectedCourseFilter]);

  return (
    <div className="space-y-6">
      {/* =============================================================== */}
      {/* 1. TOP BAR: STATS, SEARCH & REQUISITION ACTIONS */}
      {/* Inspired by TalentFlow recruitment-view topbar */}
      {/* =============================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                TalentFlow 1.0 Recruitment Model
              </span>
              <span className="text-xs text-slate-400">&bull; Quản Trị Chỉ Tiêu Tuyển Sinh</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>Đợt Tuyển Sinh &amp; Các Khóa Học Đang Mở (Requisitions)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Danh sách các chiến dịch tuyển sinh đang nhận đơn. Click vào từng chiến dịch để mở bảng <strong>Pipeline Kanban</strong> quản lý học viên.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setViewType('card')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewType === 'card'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng Lưới Thẻ (Card View)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Lưới Thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewType('table')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewType === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng Bảng Dữ Liệu (Table View)"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Bảng</span>
              </button>
            </div>

            {/* Create Requisition Button */}
            <button
              type="button"
              onClick={onOpenCreateRequisition}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Mở Đợt Tuyển Sinh Mới</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo mã đợt, tên chiến dịch, khóa học..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất Cả Trạng Thái</option>
              <option value="active">🟢 Đang Tuyển Sinh</option>
              <option value="planning">🟡 Sắp Mở / Chuẩn Bị</option>
              <option value="closed">⚪ Đã Đóng Sổ</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất Cả Cơ Sở</option>
              <option value="hn">Hội sở Hà Nội</option>
              <option value="hcm">Chi nhánh TP.HCM</option>
              <option value="online">Trực tuyến LMS</option>
            </select>

            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[200px]"
            >
              <option value="all">Tất Cả Khóa Học Gốc</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info Pill Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>
            Hiển thị <strong>{filteredCampaigns.length}</strong> / <strong>{campaigns.length}</strong> chiến dịch tuyển sinh (requisitions)
          </span>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 2. CARD VIEW (TalentFlow rec_card_view.html) */}
      {/* =============================================================== */}
      {viewType === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => {
            const funnel = getCampaignFunnelData(camp);
            const isCopied = copiedId === camp.id;

            // Template Course fallback
            const templateCourse = courses.find((c) => c.id === camp.courseId);
            const courseTitleDisplay =
              camp.courseTitle ||
              templateCourse?.title ||
              camp.positions?.[0]?.positionTitle ||
              'Chương Trình Đào Tạo Thực Chiến MSB';

            return (
              <div
                key={camp.id}
                onClick={() => onSelectCampaign(camp.id)}
                className="group bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative"
              >
                <div>
                  {/* Card Header (ID Pill, Status, Hot, Published) */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-b from-slate-50/50 to-white">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* ID Pill */}
                      <span className="font-mono text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {camp.code || `#${camp.id}`}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          camp.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : camp.status === 'planning'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {camp.status === 'active' ? 'Đang Tuyển Sinh' : camp.status === 'planning' ? 'Sắp Mở' : 'Đã Đóng Sổ'}
                      </span>

                      {/* Hot Badge */}
                      {camp.isHot && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                          <span>Hot</span>
                        </span>
                      )}
                    </div>

                    {/* Visibility */}
                    <div className="shrink-0">
                      {camp.isPublished !== false ? (
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1" title="Đã công khai trên website tuyển sinh">
                          <Globe className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Web</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1" title="Chưa đăng web / Nội bộ">
                          <Lock className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Nội bộ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Title */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {camp.name}
                      </h3>

                      {/* Linked Template Course */}
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-700 font-medium bg-indigo-50/60 p-2 rounded-xl border border-indigo-100">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">Template: <strong>{courseTitleDisplay}</strong></span>
                      </div>
                    </div>

                    {/* Meta Rows */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {/* Location */}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{camp.location || 'Hội sở Hà Nội'}</span>
                      </div>

                      {/* Tuition & Scholarship */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Học phí: <strong>{formatVND(camp.tuitionFee || 18500000)}</strong>
                          {camp.scholarshipBudget ? (
                            <span className="text-purple-700 font-medium ml-1">
                              (HB: {formatVND(camp.scholarshipBudget)})
                            </span>
                          ) : null}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {camp.startDate} &rarr; <strong>{camp.deadline}</strong>
                          {camp.openingDate ? (
                            <span className="text-emerald-700 font-medium ml-1">
                              &bull; Khai giảng: {camp.openingDate}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>

                    {/* Headcount Progress Bar */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Chỉ tiêu tuyển sinh:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {funnel.actualEnrolled} / {funnel.targetQuota} học viên{' '}
                          <span className={`ml-1 ${funnel.progressPercent >= 80 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            ({funnel.progressPercent}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            funnel.progressPercent >= 100
                              ? 'bg-emerald-500'
                              : funnel.progressPercent >= 70
                              ? 'bg-indigo-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${funnel.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* TalentFlow Mini Candidate Funnel */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <TrendingUp className="w-3 h-3 text-indigo-600" />
                          <span>Tiến độ phễu học viên:</span>
                        </span>
                        <span className="font-mono">Tổng {funnel.totalLeads} lead</span>
                      </div>

                      <div className="grid grid-cols-5 gap-1 text-center font-mono">
                        <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200/60" title="1. Mới nộp đơn">
                          <div className="text-[9px] text-blue-700 uppercase font-sans font-bold truncate">Mới</div>
                          <div className="text-xs font-black text-blue-900">{funnel.s1_new}</div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200/60" title="2. Đang tư vấn / Sàng lọc">
                          <div className="text-[9px] text-indigo-700 uppercase font-sans font-bold truncate">Tư Vấn</div>
                          <div className="text-xs font-black text-indigo-900">{funnel.s2_consulting}</div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-purple-50 border border-purple-200/60" title="3. Thi tuyển / Đánh giá Comp AI">
                          <div className="text-[9px] text-purple-700 uppercase font-sans font-bold truncate">Test/PV</div>
                          <div className="text-xs font-black text-purple-900">{funnel.s3_assessed}</div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/60" title="4. Chờ nộp phí / Giữ chỗ">
                          <div className="text-[9px] text-amber-700 uppercase font-sans font-bold truncate">Chờ Phí</div>
                          <div className="text-xs font-black text-amber-900">{funnel.s4_pending}</div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60" title="5. Đã đóng phí / Nhập học">
                          <div className="text-[9px] text-emerald-700 uppercase font-sans font-bold truncate">Nhập Học</div>
                          <div className="text-xs font-black text-emerald-900">{funnel.s5_enrolled}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer (Recruiter PIC & Action Link) */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-200">
                      {camp.leadRecruiter ? camp.leadRecruiter.charAt(0) : 'T'}
                    </div>
                    <span className="text-[11px] text-slate-600 truncate" title={camp.leadRecruiter}>
                      {camp.leadRecruiter || 'Cán bộ tuyển sinh'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(camp, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      title="Sao chép link đăng ký tuyển sinh"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCampaign(camp.id);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 text-xs cursor-pointer group-hover:scale-102"
                    >
                      <span>Vào Pipeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =============================================================== */}
      {/* 3. TABLE VIEW */}
      {/* =============================================================== */}
      {viewType === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-5">Mã Đợt</th>
                  <th className="p-3.5">Chiến Dịch Tuyển Sinh</th>
                  <th className="p-3.5">Khóa Học Mẫu</th>
                  <th className="p-3.5">Cơ Sở</th>
                  <th className="p-3.5">Khai Giảng</th>
                  <th className="p-3.5 text-center">Chỉ Tiêu</th>
                  <th className="p-3.5 text-center">Đã Tuyển</th>
                  <th className="p-3.5 text-center">Tiến Độ</th>
                  <th className="p-3.5">Trạng Thái</th>
                  <th className="p-3.5 text-right pr-5">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCampaigns.map((camp) => {
                  const funnel = getCampaignFunnelData(camp);
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => onSelectCampaign(camp.id)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-5 font-mono font-bold text-indigo-700">
                        {camp.code}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 hover:text-indigo-600">{camp.name}</div>
                        <div className="text-[11px] text-slate-400">{camp.leadRecruiter}</div>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {camp.courseTitle || camp.positions?.[0]?.positionTitle || 'Khóa Ngân Hàng'}
                      </td>
                      <td className="p-3.5 text-slate-600">{camp.location}</td>
                      <td className="p-3.5 font-mono text-slate-800">
                        {camp.openingDate || camp.deadline}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                        {funnel.targetQuota}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                        {funnel.actualEnrolled}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {funnel.progressPercent}%
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            camp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {camp.status === 'active' ? 'Đang Mở' : 'Chuẩn Bị'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCampaign(camp.id);
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Pipeline &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
