import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  Target,
  Plus,
  Edit,
  Download,
  Search,
  Filter,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  Bot,
  ExternalLink,
  Tag,
  Building2,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { AdmissionCampaign, CampaignPositionTrack, Order, Course, CRMStatus } from '../../types';
import { matchOrderToPosition, calculateATSPipelineMetrics } from '../../utils/talentCampaigns';
import { COMP_AI_PIPELINE_STAGES, runCompAIEvidenceEnrichment } from '../../utils/compAiCrm';

interface CampaignCBVPipelineViewProps {
  campaign: AdmissionCampaign;
  orders: Order[];
  courses?: Course[];
  onBack: () => void;
  onUpdateOrderCRM?: (updatedOrder: Order) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onOpenLeadDetail: (order: Order) => void;
  onOpenEditCampaign: () => void;
  onOpenCreateRequisition: () => void;
  onOpenWebhookModal: () => void;
}

export const CampaignCBVPipelineView: React.FC<CampaignCBVPipelineViewProps> = ({
  campaign,
  orders,
  courses = [],
  onBack,
  onUpdateOrderCRM,
  onUpdateOrderStatus,
  onOpenLeadDetail,
  onOpenEditCampaign,
  onOpenCreateRequisition,
  onOpenWebhookModal
}) => {
  // Active Position Filter Tab (All or specific track within campaign)
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'kanban' | 'table'>('kanban');

  // Format VND
  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  // Filter orders strictly for this campaign
  const campaignOrders = useMemo(() => {
    return orders.filter((o) => {
      if (campaign.id === 'camp-2026-q4-hn') {
        return (o.batchCohort || '').includes('Hà Nội') || (o.studyArea || '').includes('Hà Nội') || !o.batchCohort;
      }
      if (campaign.id === 'camp-2026-oct-hcm') {
        return (o.batchCohort || '').includes('HCM') || (o.studyArea || '').includes('HCM');
      }
      if (campaign.courseId && o.courseId === campaign.courseId) return true;
      if (campaign.intakeCohort && (o.batchCohort || '').includes(campaign.intakeCohort)) return true;
      return o.campaignCode === campaign.code;
    });
  }, [campaign, orders]);

  // Enriched orders with Comp AI research
  const enrichedCampaignOrders: Order[] = useMemo(() => {
    return campaignOrders.map((o) => {
      if (!o.agentResearch) {
        return {
          ...o,
          agentResearch: runCompAIEvidenceEnrichment(o)
        };
      }
      return o;
    });
  }, [campaignOrders]);

  // Position tracks
  const positionTracks = useMemo(() => {
    if (campaign.positions && campaign.positions.length > 0) {
      return campaign.positions;
    }
    // Fallback single position
    return [
      {
        id: `pos-${campaign.id}`,
        courseId: campaign.courseId || 'general',
        positionTitle: campaign.courseTitle || campaign.name,
        shortName: campaign.courseTitle || 'Chuyên viên Ngân hàng',
        department: 'Khối Kinh Doanh & Chi Nhánh',
        targetQuota: campaign.targetHeadcount || 30,
        enrolledCount: campaign.totalEnrolled || 0,
        salaryRange: '14 - 26 Triệu / tháng',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
      }
    ] as CampaignPositionTrack[];
  }, [campaign]);

  // Filtered orders according to search & position
  const filteredOrders = useMemo(() => {
    return enrichedCampaignOrders.filter((order) => {
      // 1. Position filter
      if (selectedPositionId !== 'all') {
        const matched = matchOrderToPosition(order, positionTracks);
        if (matched?.id !== selectedPositionId) return false;
      }

      // 2. Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').includes(q);
        const matchEmail = (order.customerEmail || '').toLowerCase().includes(q);
        const matchCode = (order.orderCode || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCode) return false;
      }

      // 3. AI Tier Filter
      if (selectedTierFilter !== 'all') {
        const tier = order.agentResearch?.leadQualityTier || 'Tier B';
        if (tier !== selectedTierFilter) return false;
      }

      // 4. Payment status
      if (selectedPaymentFilter !== 'all') {
        if (selectedPaymentFilter === 'paid' && order.status !== 'paid') return false;
        if (selectedPaymentFilter === 'pending' && order.status === 'paid') return false;
      }

      return true;
    });
  }, [enrichedCampaignOrders, selectedPositionId, searchQuery, selectedTierFilter, selectedPaymentFilter, positionTracks]);

  // TalentFlow ATS Conversion Funnel for this campaign
  const atsMetrics = useMemo(() => {
    return calculateATSPipelineMetrics(filteredOrders);
  }, [filteredOrders]);

  // Quota progress calculation
  const targetQuota = campaign.targetHeadcount || 30;
  const enrolledCount = filteredOrders.filter((o) => o.status === 'paid' || o.crmStatus === '5. Đã đóng phí').length;
  const progressPercent = Math.min(100, Math.round((enrolledCount / targetQuota) * 100));

  // Quick Move Stage handler
  const handleQuickMoveStage = (order: Order, newStageId: CRMStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Order = {
      ...order,
      crmStatus: newStageId,
      status: newStageId === '5. Đã đóng phí' ? 'paid' : order.status
    };
    if (onUpdateOrderCRM) onUpdateOrderCRM(updated);
    if (newStageId === '5. Đã đóng phí') {
      onUpdateOrderStatus(order.id, 'paid');
    }
  };

  // Export CSV for this campaign pipeline
  const handleExportCSV = () => {
    const headers = [
      'Mã Ứng Viên',
      'Họ và Tên',
      'Số Điện Thoại',
      'Email',
      'Vị Trí / Chuyên Ngành',
      'Giai Đoạn Pipeline ATS',
      'AI Lead Tier',
      'Điểm Phù Hợp',
      'Trạng Thái Học Phí',
      'Học Phí (VNĐ)',
      'Người Phụ Trách (PIC)'
    ];

    const rows = filteredOrders.map((o) => {
      const pos = matchOrderToPosition(o, positionTracks);
      return [
        `"${o.orderCode || ''}"`,
        `"${o.customerName || ''}"`,
        `"${o.customerPhone || ''}"`,
        `"${o.customerEmail || ''}"`,
        `"${pos?.shortName || o.courseTitle || ''}"`,
        `"${o.crmStatus || '1. Mới'}"`,
        `"${o.agentResearch?.leadQualityTier || 'Tier B'}"`,
        `"${o.agentResearch?.readinessScore || 75}%"`,
        `"${o.status === 'paid' ? 'Đã đóng phí VietQR' : 'Chờ nộp'}"`,
        o.amount,
        `"${o.pic || campaign.leadRecruiter || ''}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pipeline_${campaign.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-16">
      {/* =============================================================== */}
      {/* 1. DEDICATED CBV-PIPELINE HEADER (TALENTFLOW ATS 1.0 DESIGN)   */}
      {/* =============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        {/* Top Breadcrumb & Action Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Quay lại danh sách đợt tuyển sinh (Recruitment View)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold hover:text-slate-900 cursor-pointer" onClick={onBack}>
                Đợt Tuyển Sinh &amp; Chiến Dịch
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {campaign.code}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-semibold text-slate-700 truncate max-w-[280px]">
                {campaign.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenWebhookModal}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-amber-200"
              title="Mô phỏng Webhook VietQR tự động gạch nợ học phí"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Mô Phỏng VietQR</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Xuất danh sách ứng viên pipeline ra file CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenEditCampaign}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Chỉnh sửa thông số chiến dịch tuyển sinh"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cài Đặt</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateRequisition}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Tạo thêm chiến dịch / đợt tuyển sinh mới từ Template"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mở Đợt Mới</span>
            </button>
          </div>
        </div>

        {/* Campaign Hero Detail */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {campaign.name}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  campaign.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : campaign.status === 'planning'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                ● {campaign.status === 'active' ? 'Đang Mở Tuyển' : campaign.status === 'planning' ? 'Lên Kế Hoạch' : 'Đã Đóng'}
              </span>
              {campaign.isHot && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  🔥 Trọng Điểm
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {campaign.description || 'Chương trình tuyển sinh và đào tạo thực chiến kết nối trực tiếp vào hệ thống Ngân hàng MSB.'}
            </p>

            {/* Meta badges row */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{campaign.location || 'Hà Nội & TP.HCM'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Hạn chót: <strong className="text-rose-700">{campaign.deadline || '20/10/2026'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Khai giảng: <strong>{campaign.startDate || '01/11/2026'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>PIC: <strong>{campaign.leadRecruiter || 'Ban Tuyển Sinh'}</strong></span>
              </span>
            </div>
          </div>

          {/* Sĩ số & Quota Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 rounded-2xl border border-blue-100/80 shadow-2xs min-w-[260px] space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Tiến Độ Chỉ Tiêu Tuyển Dụng</span>
              </span>
              <span className="font-mono font-black text-blue-700 text-sm">{progressPercent}%</span>
            </div>

            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent >= 100 ? 'bg-emerald-500' : progressPercent >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
              <span>Đã nhập học: <strong className="text-slate-900 font-mono">{enrolledCount}</strong></span>
              <span>Chỉ tiêu: <strong className="text-slate-900 font-mono">{targetQuota}</strong> học viên</span>
            </div>
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 2. POSITION TRACKS TABS (LỌC THEO VỊ TRÍ TUYỂN DỤNG CỤ THỂ)   */}
      {/* =============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span>Vị Trí Tuyển Dụng / Khóa Đào Tạo Trong Đợt Tuyển Sinh:</span>
          </span>
          <span className="text-[11px] text-slate-400">Chọn để lọc ứng viên theo từng vị trí</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedPositionId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
              selectedPositionId === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Tất Cả Vị Trí</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              selectedPositionId === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              {enrichedCampaignOrders.length}
            </span>
          </button>

          {positionTracks.map((pos) => {
            const isSelected = selectedPositionId === pos.id;
            const posCount = enrichedCampaignOrders.filter((o) => {
              const matched = matchOrderToPosition(o, positionTracks);
              return matched?.id === pos.id;
            }).length;

            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => setSelectedPositionId(isSelected ? 'all' : pos.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>🎯 {pos.shortName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {posCount}/{pos.targetQuota}
                </span>
                <span className={`text-[10px] hidden md:inline font-semibold ${
                  isSelected ? 'text-blue-100' : 'text-emerald-700'
                }`}>
                  ({pos.salaryRange})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =============================================================== */}
      {/* 3. TALENTFLOW ATS VISUAL FUNNEL BAR (PIPELINE CONVERSION)       */}
      {/* =============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Phễu Tuyển Dụng &amp; Tỷ Lệ Chuyển Đổi ATS (Candidate Pipeline Funnel):</span>
          </span>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Tỷ lệ nhập học thực tế: {atsMetrics.conversionRate}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {/* Step 1: Sourced / Applied */}
          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-blue-700">1. Ứng Tuyển</span>
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-white px-1.5 py-0.2 rounded shadow-2xs">
                100%
              </span>
            </div>
            <div className="text-lg font-black text-blue-900 font-mono">{atsMetrics.totalSourced}</div>
            <div className="text-[10px] text-blue-600 truncate">Hồ sơ nộp ban đầu</div>
          </div>

          {/* Step 2: Screened */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-indigo-700">2. Sàng Lọc</span>
              <span className="text-[10px] font-mono font-bold text-indigo-800 bg-white px-1.5 py-0.2 rounded shadow-2xs">
                {atsMetrics.screenToInterviewRate}%
              </span>
            </div>
            <div className="text-lg font-black text-indigo-900 font-mono">{atsMetrics.screenedCount}</div>
            <div className="text-[10px] text-indigo-600 truncate">Đã tiếp cận &amp; tư vấn</div>
          </div>

          {/* Step 3: Interviewed */}
          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-purple-700">3. Phỏng Vấn / Test</span>
              <span className="text-[10px] font-mono font-bold text-purple-800 bg-white px-1.5 py-0.2 rounded shadow-2xs">
                {atsMetrics.interviewToOfferRate}%
              </span>
            </div>
            <div className="text-lg font-black text-purple-900 font-mono">{atsMetrics.interviewedCount}</div>
            <div className="text-[10px] text-purple-600 truncate">Hẹn gặp đánh giá</div>
          </div>

          {/* Step 4: Offered */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-amber-700">4. Thư Mời / Học Phí</span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-white px-1.5 py-0.2 rounded shadow-2xs">
                {atsMetrics.offerToEnrollRate}%
              </span>
            </div>
            <div className="text-lg font-black text-amber-900 font-mono">{atsMetrics.offeredCount}</div>
            <div className="text-[10px] text-amber-600 truncate">Chờ đóng học phí</div>
          </div>

          {/* Step 5: Enrolled */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-700">5. Nhập Học</span>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.2 rounded shadow-2xs">
                {atsMetrics.conversionRate}%
              </span>
            </div>
            <div className="text-lg font-black text-emerald-900 font-mono">{atsMetrics.enrolledCount}</div>
            <div className="text-[10px] text-emerald-600 truncate">Hoàn tất phí &amp; vào LMS</div>
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 4. SEARCH & FILTER TOOLBAR                                     */}
      {/* =============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm ứng viên theo tên, số điện thoại, email, mã hồ sơ..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* AI Tier Filter */}
          <select
            value={selectedTierFilter}
            onChange={(e) => setSelectedTierFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất Cả AI Tier</option>
            <option value="Tier A">Tier A (Tiềm năng cao ≥90%)</option>
            <option value="Tier B">Tier B (Tiềm năng khá 75-89%)</option>
            <option value="Tier C">Tier C (Cần bồi dưỡng thêm)</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedPaymentFilter}
            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất Cả Học Phí</option>
            <option value="paid">Đã đóng phí VietQR</option>
            <option value="pending">Chờ nộp học phí</option>
          </select>
        </div>

        {/* View Layout Toggle: Kanban vs Table */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewLayout('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewLayout === 'kanban'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewLayout === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Bảng Danh Sách ({filteredOrders.length})</span>
          </button>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 5. MAIN CBV-PIPELINE KANBAN BOARD                               */}
      {/* =============================================================== */}
      {viewLayout === 'kanban' && (
        <div className="overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1300px]">
            {COMP_AI_PIPELINE_STAGES.map((stage) => {
              const stageDeals = filteredOrders.filter((o) => (o.crmStatus || '1. Mới') === stage.id);
              const stageSum = stageDeals.reduce((sum, d) => sum + d.amount, 0);

              return (
                <div
                  key={stage.id}
                  className="w-[285px] shrink-0 bg-slate-100/80 rounded-3xl p-3 border border-slate-200/90 space-y-3 flex flex-col max-h-[82vh]"
                >
                  {/* Column Header */}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                        <span className="font-black text-xs text-slate-800 truncate" title={stage.label}>
                          {stage.shortLabel}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-2xs border border-slate-200">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 font-bold pl-4">
                      {formatVND(stageSum)}
                    </div>
                  </div>

                  {/* Deals Cards Container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {stageDeals.length === 0 ? (
                      <div className="p-6 text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-2xl">
                        Chưa có ứng viên ở giai đoạn này
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const tier = deal.agentResearch?.leadQualityTier || 'Tier B';
                        const readiness = deal.agentResearch?.readinessScore || 75;
                        const verifiedFact = deal.agentResearch?.verifiedFacts[0]?.fact;
                        const pos = matchOrderToPosition(deal, positionTracks);

                        return (
                          <div
                            key={deal.id}
                            onClick={() => onOpenLeadDetail(deal)}
                            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                          >
                            {/* Card Top: Candidate Name + Tier Pill */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors block">
                                  {deal.customerName}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{deal.orderCode || deal.id.slice(-6)}
                                </span>
                              </div>

                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 border ${
                                  tier === 'Tier A'
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : tier === 'Tier B'
                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}
                              >
                                {tier} · {readiness}%
                              </span>
                            </div>

                            {/* Position Track Pill */}
                            {pos && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold truncate max-w-[210px] border ${pos.badgeBg}`}
                                  title={`Vị trí tuyển dụng: ${pos.positionTitle}`}
                                >
                                  🎯 {pos.shortName}
                                </span>
                              </div>
                            )}

                            {/* Verified Fact / Education Note */}
                            {verifiedFact && (
                              <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                💡 {verifiedFact}
                              </p>
                            )}

                            {/* Tuition fee & payment badge */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              <span className="font-mono font-bold text-slate-800">
                                {formatVND(deal.amount)}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  deal.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {deal.status === 'paid' ? 'Đã đóng VietQR' : 'Chờ nộp'}
                              </span>
                            </div>

                            {/* Quick Action Footer: Contact & Move Stage Dropdown */}
                            <div
                              className="flex items-center justify-between gap-1 pt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1">
                                {deal.customerPhone && (
                                  <a
                                    href={`tel:${deal.customerPhone}`}
                                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title={`Gọi cho ${deal.customerName}: ${deal.customerPhone}`}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {deal.customerEmail && (
                                  <a
                                    href={`mailto:${deal.customerEmail}`}
                                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title={`Gửi email cho ${deal.customerName}`}
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>

                              {/* Quick Move Stage Select */}
                              <select
                                value={deal.crmStatus || '1. Mới'}
                                onChange={(e) => handleQuickMoveStage(deal, e.target.value as CRMStatus, e as any)}
                                className="text-[10px] font-bold py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
                              >
                                {COMP_AI_PIPELINE_STAGES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    Chuyển: {s.shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 6. MAIN CBV-PIPELINE TABLE LIST VIEW                            */}
      {/* =============================================================== */}
      {viewLayout === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Mã &amp; Ứng Viên</th>
                  <th className="p-3.5">Liên Hệ</th>
                  <th className="p-3.5">Vị Trí Tuyển Dụng</th>
                  <th className="p-3.5">Giai Đoạn Pipeline</th>
                  <th className="p-3.5">AI Quality Tier</th>
                  <th className="p-3.5">Học Phí</th>
                  <th className="p-3.5">Thanh Toán</th>
                  <th className="p-3.5 pr-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Không tìm thấy ứng viên nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const pos = matchOrderToPosition(order, positionTracks);
                    const tier = order.agentResearch?.leadQualityTier || 'Tier B';
                    const readiness = order.agentResearch?.readinessScore || 75;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => onOpenLeadDetail(order)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="p-3.5 pl-5">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 block">
                            {order.customerName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{order.orderCode || order.id.slice(-6)}
                          </span>
                        </td>

                        <td className="p-3.5 space-y-0.5">
                          <div className="font-mono text-slate-700">{order.customerPhone}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{order.customerEmail}</div>
                        </td>

                        <td className="p-3.5">
                          {pos ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold truncate max-w-[180px] inline-block border ${pos.badgeBg}`}>
                              🎯 {pos.shortName}
                            </span>
                          ) : (
                            <span className="text-slate-500">{order.courseTitle}</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <select
                            value={order.crmStatus || '1. Mới'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleQuickMoveStage(order, e.target.value as CRMStatus, e as any)}
                            className="text-xs font-bold py-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
                          >
                            {COMP_AI_PIPELINE_STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                              tier === 'Tier A'
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : tier === 'Tier B'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                          >
                            {tier} · {readiness}%
                          </span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {formatVND(order.amount)}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                              order.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {order.status === 'paid' ? 'Đã đóng VietQR' : 'Chờ nộp'}
                          </span>
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLeadDetail(order);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Hồ Sơ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
