import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Sparkles, 
  X, 
  Save, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Sliders,
  Check,
  Plus,
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Send,
  MessageSquare,
  PhoneCall,
  Video,
  ListTodo,
  CheckSquare,
  Square,
  Bot,
  Terminal,
  ArrowRight,
  FileText,
  DollarSign,
  PieChart,
  Target,
  BookOpen,
  Users,
  Compass,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order, CRMStatus, PaymentStatus, CourseCohort, AdmissionCampaign, CampaignPositionTrack } from '../../types';
import { 
  COMP_AI_PIPELINE_STAGES, 
  runCompAIEvidenceEnrichment, 
  CompAIPipelineStage 
} from '../../utils/compAiCrm';
import { CompAILeadDetailModal } from './CompAILeadDetailModal';
import { CMSCohortLifecycleModal } from './CMSCohortLifecycleModal';
import { CMSVietQRWebhookModal } from './CMSVietQRWebhookModal';
import { SendResendEmailModal } from './SendResendEmailModal';
import { CMSCampaignManagementModal } from './CMSCampaignManagementModal';
import { useServerCollection } from '../../lib/serverCollection';
import { CAMPAIGNS, COHORTS } from '../../lib/cmsCollections';
import { INITIAL_COHORTS, COHORT_STATUS_CONFIG } from '../../utils/cohortRouting';
import {
  INITIAL_CAMPAIGNS,
  getSavedCampaigns,
  saveCampaigns,
  matchOrderToPosition,
  calculateATSPipelineMetrics
} from '../../utils/talentCampaigns';

interface CMSCRMOrdersTabProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onUpdateOrderCRM?: (updatedOrder: Order) => void;
}

// Course categories definition with distinctive color coding and icons
export const CRM_COURSE_CATEGORIES = [
  {
    id: 'all',
    title: 'Tất Cả Khóa Học',
    shortName: 'Tất cả',
    icon: BookOpen,
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    accentColor: 'text-[#0073C1]',
    description: 'Toàn bộ chương trình đào tạo của TWings Academy & MSB'
  },
  {
    id: 'twings-qhkh-doanh-nghiep',
    title: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    shortName: 'RM Doanh Nghiệp (CIB)',
    icon: Building2,
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: 'text-blue-600',
    description: 'Đào tạo kỹ năng thẩm định tài chính, bán hàng B2B và quản trị danh mục SME/CIB'
  },
  {
    id: 'twings-qhkh-ca-nhan',
    title: 'Quan hệ Khách hàng cá nhân',
    shortName: 'RM Cá Nhân (RB)',
    icon: User,
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: 'text-indigo-600',
    description: 'Tư vấn tín dụng tiêu dùng, thẻ tín dụng, huy động vốn & bảo hiểm bancassurance'
  },
  {
    id: 'gdv-ngan-hang',
    title: 'Giao dịch viên & Vận hành Dịch vụ Khách hàng',
    shortName: 'Giao Dịch Viên (GDV)',
    icon: CreditCard,
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentColor: 'text-emerald-600',
    description: 'Nghiệp vụ quầy, kiểm soát thanh toán quốc tế và dịch vụ khách hàng xuất sắc'
  },
  {
    id: 'deeplearning-ai-agents',
    title: 'Xây dựng các Đại lý AI & Quy trình Làm việc Tự động',
    shortName: 'AI Agents & Automation',
    icon: Bot,
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    accentColor: 'text-purple-600',
    description: 'Ứng dụng AI tạo sinh, tự động hóa quy trình nghiệp vụ và chấm điểm tín dụng'
  }
];

export const CMSCRMOrdersTab: React.FC<CMSCRMOrdersTabProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateOrderCRM,
}) => {
  // View mode switcher: kanban, table, analytics, agent_queue
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'analytics' | 'agent_queue'>('kanban');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>('all');
  const [selectedCRMStatus, setSelectedCRMStatus] = useState<string>('Tất cả');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('Tất cả');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');

  // TalentFlow Recruitment Campaign Hub state (ATS Architecture)
  // Persisted through the API in live mode (demo: browser storage as before).
  const { items: campaigns, update: setCampaigns } = useServerCollection<AdmissionCampaign>(CAMPAIGNS, getSavedCampaigns());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('camp-2026-q4-hn');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCampaignHub, setShowCampaignHub] = useState(true);

  // Show/Hide Cohort Progress Board
  const [showCohortBoard, setShowCohortBoard] = useState(true);

  // Cohort & Class Lifecycle Management with Auto-Routing
  const { items: cohorts, update: setCohorts } = useServerCollection<CourseCohort>(COHORTS, INITIAL_COHORTS);
  const [showCohortManager, setShowCohortManager] = useState(false);

  // VietQR Realtime Webhook Simulator Modal
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // Active Lead Detail Modal (Comp AI 2-Column Split Workspace)
  const [selectedLead, setSelectedLead] = useState<Order | null>(null);

  // Quick Resend Email Modal
  const [selectedEmailOrder, setSelectedEmailOrder] = useState<Order | null>(null);

  // Agent Simulator Modal
  const [isRunningBatchAgent, setIsRunningBatchAgent] = useState(false);
  const [batchAgentProgress, setBatchAgentProgress] = useState(0);
  const [batchAgentLogs, setBatchAgentLogs] = useState<string[]>([]);

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  // Helper to ensure lead has Comp AI data
  const getEnrichedLead = (ord: Order): Order => {
    if (!ord.agentResearch) {
      return {
        ...ord,
        agentResearch: runCompAIEvidenceEnrichment(ord),
        timelineActivities: ord.timelineActivities || [
          {
            id: `act-1-${ord.id}`,
            type: 'agent_research',
            title: 'Comp AI Agent: Tự động khởi tạo hồ sơ nghiên cứu',
            content: `Xác thực thông tin ứng viên ${ord.customerName} từ đơn đăng ký website khóa ${ord.courseTitle}.`,
            actor: 'Comp AI Agent (v2.4)',
            timestamp: ord.registeredAt || '28/09/2026 10:00'
          },
          {
            id: `act-2-${ord.id}`,
            type: 'call',
            title: 'Cuộc gọi tư vấn ban đầu (Sàng lọc)',
            content: ord.consultDetail || 'Đã liên hệ xác nhận nguyện vọng học viên.',
            actor: ord.pic || 'Chuyên viên Tuyển sinh MSB',
            timestamp: ord.reachedDate || '29/09/2026 14:30'
          }
        ],
        followupTasks: ord.followupTasks || [
          {
            id: `task-1-${ord.id}`,
            title: `Gửi link YouTube bài giảng học thử & lịch khai giảng ${ord.batchCohort || 'Khóa 9'}`,
            dueDate: 'Hôm nay, 17:00',
            priority: 'high',
            isCompleted: ord.status === 'paid',
            assignedTo: ord.pic || 'HuongNT22'
          },
          {
            id: `task-2-${ord.id}`,
            title: 'Gọi điện hỗ trợ quét mã chuyển khoản VietQR giữ học bổng',
            dueDate: 'Ngày mai, 10:30',
            priority: 'medium',
            isCompleted: false,
            assignedTo: ord.pic || 'HuongNT22'
          }
        ]
      };
    }
    return ord;
  };

  const enrichedOrders = orders.map(getEnrichedLead);

  // Extract unique cohorts / batches dynamically from orders
  const dynamicCohorts = Array.from(
    new Set(
      orders
        .map((o) => o.batchCohort || 'Khóa học 9 - Hà Nội')
        .filter(Boolean)
    )
  ).sort();

  // Extract unique courses dynamically from orders
  const dynamicCourses = Array.from(
    new Set(orders.map((o) => o.courseTitle).filter(Boolean))
  );

  // Matching helper for course filtering
  const matchCourse = (ord: Order, filterVal: string) => {
    if (filterVal === 'all') return true;
    const cat = CRM_COURSE_CATEGORIES.find((c) => c.id === filterVal);
    if (cat && cat.id !== 'all') {
      return (
        ord.courseId === cat.id ||
        ord.courseTitle?.toLowerCase().includes(cat.title.toLowerCase()) ||
        cat.title.toLowerCase().includes(ord.courseTitle?.toLowerCase() || '')
      );
    }
    return ord.courseTitle === filterVal || ord.courseId === filterVal;
  };

  // Matching helper for cohort / batch filtering
  const matchCohort = (ord: Order, filterVal: string) => {
    if (filterVal === 'all') return true;
    const cohort = ord.batchCohort || 'Khóa học 9 - Hà Nội';
    return cohort.toLowerCase().includes(filterVal.toLowerCase()) || filterVal.toLowerCase().includes(cohort.toLowerCase());
  };

  // Main Filtering with TalentFlow Campaign & Position Requisitions
  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  const filteredOrders = enrichedOrders.filter((ord) => {
    const matchesSearch =
      (ord.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.customerPhone?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.customerEmail?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.orderCode?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.citizenId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.university?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.batchCohort?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ord.campaignCode?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesCourse = matchCourse(ord, selectedCourseFilter);
    const matchesCohort = matchCohort(ord, selectedCohortFilter);

    const matchesCRM =
      selectedCRMStatus === 'Tất cả' || ord.crmStatus === selectedCRMStatus;

    const matchesPay =
      selectedPaymentStatus === 'Tất cả' ||
      (selectedPaymentStatus === 'paid' && ord.status === 'paid') ||
      (selectedPaymentStatus === 'pending' && ord.status === 'pending');

    const matchesTier =
      selectedTierFilter === 'all' || ord.agentResearch?.leadQualityTier === selectedTierFilter;

    // TalentFlow Campaign Match
    const matchesCampaign = (() => {
      if (selectedCampaignId === 'all') return true;
      if (selectedCampaignId === 'camp-2026-q4-hn') {
        return (ord.batchCohort || '').includes('Hà Nội') || (ord.studyArea || '').includes('Hà Nội') || !ord.batchCohort;
      }
      if (selectedCampaignId === 'camp-2026-oct-hcm') {
        return (ord.batchCohort || '').includes('HCM') || (ord.studyArea || '').includes('HCM');
      }
      if (selectedCampaignId === 'camp-2027-q1-fresher') {
        return (ord.educationLevel || '').includes('Đại học') || (ord.graduationYear || '').includes('2026') || (ord.graduationYear || '').includes('2027');
      }
      return ord.campaignCode === activeCampaign?.code;
    })();

    // TalentFlow Position Requisition Match
    const matchesPosition = (() => {
      if (selectedPositionId === 'all') return true;
      const pos = matchOrderToPosition(ord, activeCampaign?.positions || []);
      return pos?.id === selectedPositionId;
    })();

    return matchesSearch && matchesCourse && matchesCohort && matchesCRM && matchesPay && matchesTier && matchesCampaign && matchesPosition;
  });

  // ATS Pipeline Metrics (TalentFlow 1.0)
  const atsMetrics = calculateATSPipelineMetrics(filteredOrders);

  // Check if any filter is active
  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    selectedCourseFilter !== 'all' ||
    selectedCohortFilter !== 'all' ||
    selectedCRMStatus !== 'Tất cả' ||
    selectedPaymentStatus !== 'Tất cả' ||
    selectedTierFilter !== 'all' ||
    selectedPositionId !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCourseFilter('all');
    setSelectedCohortFilter('all');
    setSelectedCRMStatus('Tất cả');
    setSelectedPaymentStatus('Tất cả');
    setSelectedTierFilter('all');
    setSelectedPositionId('all');
  };

  // Metrics
  const totalRevenue = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);
  const activePipelineValue = orders
    .filter((o) => o.crmStatus !== '7. Đã hủy' && o.status !== 'paid')
    .reduce((sum, o) => sum + o.amount, 0);
  const paidCount = orders.filter((o) => o.status === 'paid').length;
  const newLeadsCount = orders.filter((o) => !o.crmStatus || o.crmStatus === '1. Mới').length;
  const inConsultCount = orders.filter((o) => o.crmStatus === '3. Đang tư vấn' || o.crmStatus === '4. Hẹn gặp').length;

  // Cohort capacity statistics
  const cohortStats = dynamicCohorts.map((cohortName) => {
    const cohortOrders = enrichedOrders.filter((o) => (o.batchCohort || 'Khóa học 9 - Hà Nội') === cohortName);
    const targetCapacity = 25; // Target per class
    const enrolledCount = cohortOrders.length;
    const paidInCohort = cohortOrders.filter((o) => o.status === 'paid').length;
    const fillRate = Math.min(100, Math.round((enrolledCount / targetCapacity) * 100));
    const revenueInCohort = cohortOrders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0);

    return {
      name: cohortName,
      targetCapacity,
      enrolledCount,
      paidInCohort,
      fillRate,
      revenueInCohort,
      orders: cohortOrders
    };
  });

  // Open Lead Detail Workspace (Comp AI 2-Column Split View)
  const handleOpenLeadDetail = (order: Order) => {
    const enriched = getEnrichedLead(order);
    setSelectedLead(enriched);
  };

  // Quick move status in Kanban or Table
  const handleMoveStatus = (lead: Order, nextStatus: CRMStatus) => {
    const isPaid = nextStatus === '5. Đã đóng phí';
    const updated: Order = {
      ...lead,
      crmStatus: nextStatus,
      status: isPaid ? 'paid' : lead.status,
      paymentStatusDetail: isPaid ? 'Đã đóng phí' : lead.paymentStatusDetail,
      totalPaidAmount: isPaid ? (lead.tuitionFee || lead.amount) : lead.totalPaidAmount
    };

    if (onUpdateOrderCRM) {
      onUpdateOrderCRM(updated);
    }
    if (selectedLead && selectedLead.id === lead.id) {
      setSelectedLead(updated);
    }
  };

  // Batch Autonomous Agent Runner Simulator
  const handleRunBatchAgent = () => {
    setIsRunningBatchAgent(true);
    setBatchAgentProgress(15);
    setBatchAgentLogs(['[Comp AI Agent] Bắt đầu quét hàng đợi nghiên cứu dữ liệu ứng viên...']);

    setTimeout(() => {
      setBatchAgentProgress(45);
      setBatchAgentLogs((prev) => [
        ...prev,
        '[Comp AI Agent] Phân loại ứng viên theo khóa học & chỉ tiêu lớp/đợt tuyển sinh...',
        '[Comp AI Agent] Quét dữ liệu giao dịch VietQR và tính toán Readiness Score...'
      ]);
    }, 900);

    setTimeout(() => {
      setBatchAgentProgress(85);
      setBatchAgentLogs((prev) => [
        ...prev,
        '[Comp AI Agent] Ghi nhận bằng chứng mới vào Evidence Ledger (Zero Hallucination).',
        '[Comp AI Agent] Tự động sinh Battle Card & Kịch bản tư vấn chốt sale cho chuyên viên tuyển sinh...'
      ]);
    }, 1800);

    setTimeout(() => {
      setBatchAgentProgress(100);
      setBatchAgentLogs((prev) => [
        ...prev,
        '[Comp AI Agent] Hoàn tất 100%! Toàn bộ phễu Lead đã được cập nhật phân hạng Tier A/B/C/D.'
      ]);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        setIsRunningBatchAgent(false);
      }, 1200);
    }, 2600);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Mã Đơn',
      'Họ và Tên',
      'Số Điện Thoại',
      'Email',
      'Khóa Đào Tạo',
      'Lớp / Đợt Khai Giảng',
      'Học Phí',
      'Trạng Thái CRM',
      'Thanh Toán',
      'AI Lead Tier',
      'Chuyên Viên PIC'
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderCode || ''}"`,
      `"${o.customerName || ''}"`,
      `"${o.customerPhone || ''}"`,
      `"${o.customerEmail || ''}"`,
      `"${o.courseTitle || ''}"`,
      `"${o.batchCohort || 'Khóa học 9'}"`,
      o.amount,
      `"${o.crmStatus || '1. Mới'}"`,
      `"${o.status === 'paid' ? 'Đã đóng phí' : 'Chờ nộp'}"`,
      `"${o.agentResearch?.leadQualityTier || 'Tier B'}"`,
      `"${o.pic || ''}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CRM_TuyenSinh_TWings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* =============================================================== */}
      {/* 1. COMP AI COMMAND BAR & AGENT ENGINE BANNER */}
      {/* =============================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                Comp AI Agentic CRM · Quản Lý Tuyển Sinh & Lớp Học Ngân Hàng
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Phân loại chuyên sâu theo <strong>Khóa học</strong>, <strong>Lớp / Đợt khai giảng</strong>, kèm Sổ Bằng Chứng (Evidence Ledger) chuẩn xác.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowWebhookModal(true)}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Mô phỏng Webhook tự động gạch nợ 1s từ ngân hàng MSB"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span>Mô Phỏng Webhook VietQR</span>
            </button>

            <button
              onClick={handleRunBatchAgent}
              disabled={isRunningBatchAgent}
              className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningBatchAgent ? 'animate-spin' : ''}`} />
              <span>{isRunningBatchAgent ? 'Đang xác thực...' : 'Quét Toàn Bộ Lead Bằng AI'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Agent Progress Box */}
      {isRunningBatchAgent && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 animate-fadeIn font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-bold flex items-center gap-2">
              <Bot className="w-4 h-4" /> Comp AI Autonomous Research Pipeline
            </span>
            <span className="text-slate-400">{batchAgentProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${batchAgentProgress}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 max-h-24 overflow-y-auto">
            {batchAgentLogs.map((log, i) => (
              <div key={i} className="text-emerald-400/90">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 2. METRICS OVERVIEW */}
      {/* =============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Doanh Thu Đã Thu</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{formatVND(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{paidCount} học viên đã đóng phí VietQR</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Dòng Pipeline Đang Tư Vấn</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">{formatVND(activePipelineValue)}</div>
          <div className="text-[11px] text-slate-500">Giá trị cơ hội tiềm năng trong tháng</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Lead Mới & Hẹn Gặp</span>
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {newLeadsCount} <span className="text-xs text-slate-400 font-normal">mới /</span> {inConsultCount} <span className="text-xs text-slate-400 font-normal">hẹn gặp</span>
          </div>
          <div className="text-[11px] text-amber-600 font-medium">Cần hoàn thành follow-up hôm nay</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Lớp & Đợt Khai Giảng</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            {dynamicCohorts.length} <span className="text-xs text-slate-400 font-normal">đợt tuyển /</span> {dynamicCourses.length} <span className="text-xs text-slate-400 font-normal">khóa</span>
          </div>
          <div className="text-[11px] text-purple-700 font-semibold">Theo dõi sĩ số thời gian thực</div>
        </div>
      </div>

      {/* 2.1 CẢNH BÁO LEAD NGUỘI (> 48H CHƯA TƯƠNG TÁC) */}
      {(() => {
        const staleLeads = enrichedOrders.filter(
          (o) => o.crmStatus === '3. Đang tư vấn' || o.interestLevel === 'Đang phân vân'
        );
        if (staleLeads.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="font-bold text-amber-900 block text-xs">
                  Cảnh Báo Lead Bị Nguội ({staleLeads.length} hồ sơ &gt; 48 giờ chưa có cuộc gọi mới):
                </span>
                <span className="text-amber-800 text-[11px] mt-0.5 block">
                  {staleLeads.map((l) => l.customerName).join(', ')} đang có nguy cơ rớt đơn. Hãy gọi điện hoặc gửi email kích hoạt lại ngay!
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCRMStatus('3. Đang tư vấn')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Lọc Xem Lead Nguội
              </button>
            </div>
          </div>
        );
      })()}

      {/* =============================================================== */}
      {/* 2.8 TALENTFLOW ATS CAMPAIGN & POSITION REQUISITION HUB */}
      {/* Inspired by TalentFlow 1.0 (PeopleFlow Recruitment & Candidate ATS) */}
      {/* =============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
        {/* Campaign Header & Switcher */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                TalentFlow 1.0 ATS Requisition Model
              </span>
              <span className="text-xs text-slate-300">&bull; Quản Lý Tuyển Sinh Như Tuyển Dụng</span>
            </div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Chiến Dịch Tuyển Dụng &amp; Vị Trí Tuyển Sinh Ngân Hàng</span>
            </h3>
            <p className="text-xs text-slate-300">
              Coi mỗi đợt tuyển sinh là <strong>1 Chiến dịch tuyển dụng (Campaign)</strong>. Mỗi khóa học chi tiết là <strong>1 Vị trí tuyển dụng (Position Track)</strong> có chỉ tiêu và đãi ngộ rõ ràng.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Campaign Dropdown Selector */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400 shrink-0" />
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setSelectedPositionId('all');
                }}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">Tất Cả Chiến Dịch Tuyển Sinh</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.code}: {c.name} ({c.totalEnrolled}/{c.targetHeadcount})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowCampaignModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              title="Mở bảng điều khiển quản lý chiến dịch và chỉ tiêu vị trí"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-200" />
              <span>⚙️ Quản Lý Chiến Dịch &amp; Vị Trí</span>
            </button>
          </div>
        </div>

        {/* Active Campaign Detail Banner */}
        {activeCampaign && selectedCampaignId !== 'all' && (
          <div className="p-4 sm:p-5 bg-indigo-50/50 border-b border-indigo-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-md border border-indigo-200">
                  {activeCampaign.code}
                </span>
                <span className="font-bold text-slate-900 text-sm">{activeCampaign.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeCampaign.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {activeCampaign.status === 'active' ? 'Đang Mở Tuyển' : 'Chuẩn Bị'}
                </span>
              </div>
              <p className="text-slate-600 text-xs">
                Thời gian: <strong>{activeCampaign.timeRange}</strong> &bull; Hạn chót nộp hồ sơ: <strong className="text-rose-700">{activeCampaign.deadline}</strong> &bull; Phụ trách: <strong>{activeCampaign.leadRecruiter}</strong>
              </p>
            </div>

            {/* Campaign Progress KPIs */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-2xs min-w-[200px] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Chỉ tiêu nhân sự:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeCampaign.totalEnrolled} / {activeCampaign.targetHeadcount} ({Math.min(100, Math.round((activeCampaign.totalEnrolled / (activeCampaign.targetHeadcount || 100)) * 100))}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((activeCampaign.totalEnrolled / (activeCampaign.targetHeadcount || 100)) * 100))}%`
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>Còn thiếu: <strong className="text-rose-600">{Math.max(0, activeCampaign.targetHeadcount - activeCampaign.totalEnrolled)}</strong></span>
                  <span className="text-emerald-700 font-bold">Học bổng: {formatVND(activeCampaign.scholarshipBudget)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Position Tracks Pills (Khóa học tương ứng Vị trí tuyển dụng) */}
        {activeCampaign && activeCampaign.positions && (
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span>Vị Trí Tuyển Dụng &amp; Chuyên Ngành Khóa Học Trong Chiến Dịch:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Click để lọc ứng viên theo từng vị trí</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedPositionId('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedPositionId === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất Cả Vị Trí ({filteredOrders.length})
              </button>

              {activeCampaign.positions.map((pos) => {
                const isSelected = selectedPositionId === pos.id;
                const posCount = enrichedOrders.filter((o) => {
                  const matched = matchOrderToPosition(o, activeCampaign.positions);
                  return matched?.id === pos.id;
                }).length;

                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setSelectedPositionId(isSelected ? 'all' : pos.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{pos.shortName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {posCount}/{pos.targetQuota}
                    </span>
                    <span className={`text-[10px] hidden sm:inline ${
                      isSelected ? 'text-indigo-200' : 'text-emerald-700 font-semibold'
                    }`}>
                      ({pos.salaryRange})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TalentFlow ATS Visual Conversion Funnel Strip */}
        <div className="p-4 sm:p-5 bg-white space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Phễu Tuyển Dụng &amp; Tỷ Lệ Chuyển Đổi ATS (Talent Pipeline Funnel):</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Tỷ lệ trúng tuyển &amp; nhập học: {atsMetrics.conversionRate}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* Step 1: Applied */}
            <div 
              onClick={() => setSelectedCRMStatus('1. Mới')}
              className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1 hover:bg-blue-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-blue-700">1. Ứng Tuyển</span>
                <span className="text-[10px] font-mono font-bold text-blue-800 bg-white px-1.5 py-0.2 rounded">100%</span>
              </div>
              <div className="text-lg font-black text-blue-900 font-mono">{atsMetrics.totalSourced}</div>
              <div className="text-[10px] text-blue-600 truncate">Hồ sơ nộp ban đầu</div>
            </div>

            {/* Step 2: Screened */}
            <div 
              onClick={() => setSelectedCRMStatus('2. Đã tiếp cận')}
              className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1 hover:bg-indigo-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-indigo-700">2. Sàng Lọc</span>
                <span className="text-[10px] font-mono font-bold text-indigo-800 bg-white px-1.5 py-0.2 rounded">
                  {atsMetrics.screenToInterviewRate}%
                </span>
              </div>
              <div className="text-lg font-black text-indigo-900 font-mono">{atsMetrics.screenedCount}</div>
              <div className="text-[10px] text-indigo-600 truncate">Đạt chuẩn tiêu chí</div>
            </div>

            {/* Step 3: Interviewed */}
            <div 
              onClick={() => setSelectedCRMStatus('3. Đang tư vấn')}
              className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1 hover:bg-purple-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-purple-700">3. Phỏng Vấn</span>
                <span className="text-[10px] font-mono font-bold text-purple-800 bg-white px-1.5 py-0.2 rounded">
                  {atsMetrics.interviewToOfferRate}%
                </span>
              </div>
              <div className="text-lg font-black text-purple-900 font-mono">{atsMetrics.interviewedCount}</div>
              <div className="text-[10px] text-purple-600 truncate">Test &amp; Bank Tour MSB</div>
            </div>

            {/* Step 4: Offered */}
            <div 
              onClick={() => setSelectedCRMStatus('4. Hẹn gặp')}
              className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1 hover:bg-amber-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-amber-700">4. Thư Mời</span>
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-white px-1.5 py-0.2 rounded">
                  {atsMetrics.offerToEnrollRate}%
                </span>
              </div>
              <div className="text-lg font-black text-amber-900 font-mono">{atsMetrics.offeredCount}</div>
              <div className="text-[10px] text-amber-600 truncate">Giấy báo &amp; Học bổng</div>
            </div>

            {/* Step 5: Enrolled */}
            <div 
              onClick={() => setSelectedCRMStatus('5. Đã đóng phí')}
              className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1 hover:bg-emerald-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-700">5. Nhập Học</span>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.2 rounded">
                  {atsMetrics.conversionRate}%
                </span>
              </div>
              <div className="text-lg font-black text-emerald-900 font-mono">{atsMetrics.enrolledCount}</div>
              <div className="text-[10px] text-emerald-600 truncate">Đã nộp học phí VietQR</div>
            </div>

            {/* Step 6: Placement */}
            <div 
              className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-teal-700">6. Việc Làm</span>
                <span className="text-[10px] font-mono font-bold text-teal-800 bg-white px-1.5 py-0.2 rounded">MSB</span>
              </div>
              <div className="text-lg font-black text-teal-900 font-mono">{atsMetrics.onboardedCount || atsMetrics.enrolledCount}</div>
              <div className="text-[10px] text-teal-600 truncate">Bố trí chi nhánh làm việc</div>
            </div>
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 3. COHORT / BATCH CAPACITY & RECRUITMENT PROGRESS BOARD */}
      {/* =============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div 
          onClick={() => setShowCohortBoard(!showCohortBoard)}
          className="p-4 px-6 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                <span>Tiến Độ Sĩ Số & Tuyển Sinh Theo Lớp / Đợt Khai Giảng</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0073C1] text-[10px] font-bold border border-blue-200">
                  {dynamicCohorts.length} Lớp Đang Mở
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Theo dõi chỉ tiêu lấp đầy sĩ số (Mục tiêu 25 học viên/lớp) và 1-click lọc nhanh danh sách học viên theo lớp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCohortManager(true);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>⚙️ Cơ Chế Đóng/Mở & Định Tuyến</span>
            </button>

            <span className="text-xs font-semibold text-slate-400 hidden sm:inline ml-2">
              {showCohortBoard ? 'Thu gọn' : 'Mở rộng'}
            </span>
            {showCohortBoard ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {showCohortBoard && (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-white animate-fadeIn">
            {cohortStats.map((cohort) => {
              const isSelected = selectedCohortFilter === cohort.name;
              const matchedCohort = cohorts.find((c) => c.name.toLowerCase() === cohort.name.toLowerCase() || cohort.name.toLowerCase().includes(c.name.toLowerCase()));
              const statusCfg = matchedCohort ? COHORT_STATUS_CONFIG[matchedCohort.status] : null;

              return (
                <div
                  key={cohort.name}
                  onClick={() => setSelectedCohortFilter(isSelected ? 'all' : cohort.name)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-blue-50/60 border-[#0073C1] ring-2 ring-[#0073C1]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>{cohort.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {statusCfg ? statusCfg.label : (cohort.name.includes('Khóa học 8') ? 'Đang đào tạo' : 'Đang tuyển sinh')}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        cohort.fillRate >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cohort.fillRate}% Sĩ số
                      </span>
                      {statusCfg && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${statusCfg.badgeBg}`}>
                          {statusCfg.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Auto-routing note if class is full / closed */}
                  {matchedCohort?.nextCohortName && (matchedCohort.status === 'full' || matchedCohort.status === 'in_progress') && (
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Đăng ký mới tự động chuyển sang: <strong>{matchedCohort.nextCohortName}</strong></span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Đã tuyển: <strong>{cohort.enrolledCount}</strong> / {cohort.targetCapacity}</span>
                      <span className="text-emerald-700 font-semibold">{cohort.paidInCohort} đã đóng phí</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          cohort.fillRate >= 70 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${cohort.fillRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800">
                      {formatVND(cohort.revenueInCohort)}
                    </span>
                    <button
                      type="button"
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                        isSelected ? 'bg-[#0073C1] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ Đang Lọc' : 'Xem Lớp Này'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =============================================================== */}
      {/* 4. NAVIGATION TABS BAR (Kanban, Table, Analytics, Work Queue) */}
      {/* =============================================================== */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        {/* Sub-view switcher */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'kanban'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>1. Pipeline Kanban (7 Giai Đoạn)</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-[#0073C1] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>2. Bảng Dữ Liệu Chi Tiết ({filteredOrders.length})</span>
            </button>

            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'analytics'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>3. Phễu Chuyển Đổi & Hiệu Suất</span>
            </button>

            <button
              onClick={() => setViewMode('agent_queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'agent_queue'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>4. Hàng Đợi Tác Vụ Agent</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-200"
              title="Xuất báo cáo Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 4.1 COURSE CATEGORY HORIZONTAL PILL RIBBON */}
        {/* ============================================================= */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#0073C1]" />
              <span>Phân Loại Theo Khóa Học:</span>
            </span>
            <span className="text-slate-500 font-mono text-xs">
              {filteredOrders.length} / {enrichedOrders.length} hồ sơ hiển thị
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
            {CRM_COURSE_CATEGORIES.map((cat) => {
              const isSelected = selectedCourseFilter === cat.id;
              const countInCourse = enrichedOrders.filter((o) => matchCourse(o, cat.id)).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCourseFilter(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#0073C1] text-white border-[#0073C1] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title={cat.title + ': ' + cat.description}
                >
                  <cat.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.shortName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {countInCourse}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================= */}
        {/* 4.2 SEARCH & MULTI-FILTER CONTROLS BAR */}
        {/* ============================================================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Search box */}
          <div className="w-full lg:w-72 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, Email, Trường, Đợt..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Cohort / Lớp / Đợt */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-600 ml-1.5 shrink-0" />
              <select
                value={selectedCohortFilter}
                onChange={(e) => setSelectedCohortFilter(e.target.value)}
                className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none pr-1 py-1 cursor-pointer"
              >
                <option value="all">Lớp/Đợt: Tất cả ({dynamicCohorts.length})</option>
                {dynamicCohorts.map((cohort) => (
                  <option key={cohort} value={cohort}>
                    {cohort} ({enrichedOrders.filter((o) => (o.batchCohort || 'Khóa học 9 - Hà Nội') === cohort).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Tier */}
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
            >
              <option value="all">Tất cả Tier AI</option>
              <option value="Tier A">Tier A - Sẵn sàng (90%+)</option>
              <option value="Tier B">Tier B - Tiềm năng</option>
              <option value="Tier C">Tier C - Nuôi dưỡng</option>
              <option value="Tier D">Tier D - Hủy</option>
            </select>

            {/* Filter by Payment Status */}
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
            >
              <option value="Tất cả">Thanh toán: Tất cả</option>
              <option value="paid">Đã đóng phí VietQR</option>
              <option value="pending">Chờ thanh toán</option>
            </select>

            {/* Filter by CRM Status */}
            <select
              value={selectedCRMStatus}
              onChange={(e) => setSelectedCRMStatus(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
            >
              <option value="Tất cả">Giai đoạn: Tất cả (7)</option>
              {COMP_AI_PIPELINE_STAGES.map((st) => (
                <option key={st.id} value={st.id}>{st.label}</option>
              ))}
            </select>

            {/* Reset Filters button if any filter is active */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-rose-200"
                title="Xóa tất cả bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        {isAnyFilterActive && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-blue-900">
            <span className="font-bold flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#0073C1]" /> Đang lọc:
            </span>
            {selectedCourseFilter !== 'all' && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-slate-700 border border-blue-200">
                Khóa: {CRM_COURSE_CATEGORIES.find((c) => c.id === selectedCourseFilter)?.shortName || selectedCourseFilter}
              </span>
            )}
            {selectedCohortFilter !== 'all' && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-slate-700 border border-blue-200">
                Lớp/Đợt: {selectedCohortFilter}
              </span>
            )}
            {selectedCRMStatus !== 'Tất cả' && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-slate-700 border border-blue-200">
                Giai đoạn: {selectedCRMStatus}
              </span>
            )}
            {selectedPaymentStatus !== 'Tất cả' && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-slate-700 border border-blue-200">
                {selectedPaymentStatus === 'paid' ? 'Đã đóng phí VietQR' : 'Chờ nộp'}
              </span>
            )}
            {selectedTierFilter !== 'all' && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-slate-700 border border-blue-200">
                Tier: {selectedTierFilter}
              </span>
            )}
            {searchQuery && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-slate-700 border border-blue-200">
                Từ khóa: "{searchQuery}"
              </span>
            )}
            <span className="font-semibold text-slate-500 ml-auto">
              Tìm thấy {filteredOrders.length} hồ sơ
            </span>
          </div>
        )}
      </div>

      {/* =============================================================== */}
      {/* VIEW 1: KANBAN PIPELINE BOARD (COMP AI SIGNATURE EXPERIENCE) */}
      {/* =============================================================== */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1300px]">
            {COMP_AI_PIPELINE_STAGES.map((stage) => {
              const stageDeals = filteredOrders.filter((o) => (o.crmStatus || '1. Mới') === stage.id);
              const stageSum = stageDeals.reduce((sum, d) => sum + d.amount, 0);

              return (
                <div
                  key={stage.id}
                  className="w-[280px] shrink-0 bg-slate-200/60 rounded-3xl p-3 border border-slate-200/80 space-y-3 flex flex-col max-h-[82vh]"
                >
                  {/* Column Header */}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                        <span className="font-bold text-xs text-slate-800 truncate" title={stage.label}>
                          {stage.shortLabel}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-2xs">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 font-bold pl-4">
                      {formatVND(stageSum)}
                    </div>
                  </div>

                  {/* Deals Cards Container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {stageDeals.map((deal) => {
                      const tier = deal.agentResearch?.leadQualityTier || 'Tier B';
                      const readiness = deal.agentResearch?.readinessScore || 75;
                      const verifiedFact = deal.agentResearch?.verifiedFacts[0]?.fact;
                      const cohortName = deal.batchCohort || 'Khóa học 9';

                      // Find category badge for course
                      const courseCat = CRM_COURSE_CATEGORIES.find((c) => c.id !== 'all' && (deal.courseId === c.id || deal.courseTitle?.includes(c.title)));

                      return (
                        <div
                          key={deal.id}
                          onClick={() => handleOpenLeadDetail(deal)}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                              {deal.customerName}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                              tier === 'Tier A'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : tier === 'Tier B'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : tier === 'Tier C'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {tier} · {readiness}%
                            </span>
                          </div>

                          {/* Course & Cohort / Batch & Position Track Pills */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(() => {
                              const pos = matchOrderToPosition(deal, activeCampaign?.positions || []);
                              if (!pos) return null;
                              return (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold truncate max-w-[170px] border ${pos.badgeBg}`} title={`Vị trí tuyển dụng: ${pos.positionTitle} - Lương: ${pos.salaryRange}`}>
                                  🎯 {pos.shortName}
                                </span>
                              );
                            })()}

                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold truncate max-w-[170px] ${
                              courseCat ? courseCat.badgeBg : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {courseCat ? courseCat.shortName : deal.courseTitle}
                            </span>

                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold font-mono flex items-center gap-1 border border-slate-200">
                              <Calendar className="w-2.5 h-2.5 text-slate-400" />
                              <span className="truncate max-w-[90px]">{cohortName}</span>
                            </span>
                          </div>

                          {/* Evidence snippet */}
                          {verifiedFact && (
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-600 leading-snug line-clamp-2">
                              <span className="font-bold text-emerald-700">✓ Evidence:</span> {verifiedFact}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              {formatVND(deal.amount)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmailOrder(deal);
                                }}
                                className="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                title="Gửi thư tuyển sinh qua Resend"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>

                              {deal.status === 'paid' ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  Đã đóng
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded">
                                  Chờ thu
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                                {deal.pic || 'PIC'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageDeals.length === 0 && (
                      <div className="p-6 text-center text-slate-400 text-xs italic bg-white/40 rounded-2xl border border-dashed border-slate-300">
                        Chưa có deal trong giai đoạn này
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* VIEW 2: DATA TABLE / LEDGER VIEW */}
      {/* =============================================================== */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Ứng Viên / Lead</th>
                  <th className="p-3.5">Khóa Đào Tạo</th>
                  <th className="p-3.5">Lớp / Đợt Khai Giảng</th>
                  <th className="p-3.5">AI Lead Tier</th>
                  <th className="p-3.5">Học Phí</th>
                  <th className="p-3.5">Tiến Trình Pipeline</th>
                  <th className="p-3.5">Thanh Toán</th>
                  <th className="p-3.5">Phụ Trách (PIC)</th>
                  <th className="p-3.5 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const tier = ord.agentResearch?.leadQualityTier || 'Tier B';
                  const readiness = ord.agentResearch?.readinessScore || 75;
                  const courseCat = CRM_COURSE_CATEGORIES.find((c) => c.id !== 'all' && (ord.courseId === c.id || ord.courseTitle?.includes(c.title)));

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{ord.customerPhone}</span>
                          <span>·</span>
                          <span>{ord.university || ord.area}</span>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-[200px]">
                        <div className="text-slate-800 font-semibold truncate" title={ord.courseTitle}>
                          {courseCat ? courseCat.shortName : ord.courseTitle}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{ord.orderCode}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] inline-flex items-center gap-1 border border-slate-200">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>{ord.batchCohort || 'Khóa học 9 - Hà Nội'}</span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          tier === 'Tier A'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : tier === 'Tier B'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : tier === 'Tier C'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{tier} ({readiness}%)</span>
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {formatVND(ord.amount)}
                      </td>

                      <td className="p-3.5">
                        <select
                          value={ord.crmStatus || '1. Mới'}
                          onChange={(e) => handleMoveStatus(ord, e.target.value as CRMStatus)}
                          className="text-xs font-bold p-1.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                        >
                          {COMP_AI_PIPELINE_STAGES.map((st) => (
                            <option key={st.id} value={st.id}>{st.shortLabel}</option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3.5">
                        {ord.status === 'paid' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" /> Đã đóng phí
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" /> Chờ VietQR
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                        {ord.pic || 'Chưa gán'}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedEmailOrder(ord)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Gửi thư tuyển sinh qua Resend API"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Gửi Mail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenLeadDetail(ord)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0073C1] font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Mở hồ sơ</span>
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

      {/* =============================================================== */}
      {/* VIEW 3: PIPELINE ANALYTICS & CONVERSION FUNNEL */}
      {/* =============================================================== */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Phễu Chuyển Đổi Tuyển Sinh (Conversion Funnel)</span>
              </h3>

              <div className="space-y-3">
                {COMP_AI_PIPELINE_STAGES.slice(0, 5).map((st, i) => {
                  const count = orders.filter((o) => (o.crmStatus || '1. Mới') === st.id).length;
                  const total = orders.length || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={st.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{st.label}</span>
                        <span className="font-mono">{count} ứng viên ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full ${
                            i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-indigo-500' : i === 2 ? 'bg-amber-500' : i === 3 ? 'bg-purple-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(10, pct * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown by Course */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0073C1]" />
                <span>Cơ Cấu Tuyển Sinh Theo Khóa Học</span>
              </h3>

              <div className="space-y-3 text-xs">
                {CRM_COURSE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                  const count = orders.filter((o) => matchCourse(o, cat.id)).length;
                  const paid = orders.filter((o) => matchCourse(o, cat.id) && o.status === 'paid').length;
                  const total = orders.length || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={cat.id} className="p-3 rounded-2xl border border-slate-100 space-y-1.5 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <cat.icon className="w-3.5 h-3.5 text-blue-600" />
                          <span>{cat.shortName}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-700">{count} hồ sơ ({pct}%)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{paid} đã đóng phí VietQR</span>
                        <span className="text-emerald-700 font-semibold">{count > 0 ? Math.round((paid / count) * 100) : 0}% tỷ lệ chốt</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campaign Source ROI */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                <span>Nguồn Tiếp Cận & Hiệu Quả Tuyển Sinh (Source Attribution)</span>
              </h3>

              <div className="space-y-3 text-xs">
                {[
                  { name: 'Giới thiệu nội bộ (GTNB) & Bank Tour', count: 4, share: '50%', color: 'bg-emerald-500' },
                  { name: 'Facebook Ads & Quảng cáo số', count: 2, share: '25%', color: 'bg-blue-500' },
                  { name: 'TikTok Video chia sẻ nghề Banker', count: 1, share: '12.5%', color: 'bg-purple-500' },
                  { name: 'Google Tìm kiếm & Website Form', count: 1, share: '12.5%', color: 'bg-amber-500' }
                ].map((s) => (
                  <div key={s.name} className="p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${s.color}`} />
                      <span className="font-bold text-slate-800">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-600">{s.count} Leads ({s.share})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cohort Fill Rate Overview */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Tỷ Lệ Lấp Đầy Sĩ Số Lớp / Đợt Khai Giảng</span>
              </h3>

              <div className="space-y-3">
                {cohortStats.map((cohort) => (
                  <div key={cohort.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{cohort.name}</span>
                      <span className="font-mono">{cohort.enrolledCount} / {cohort.targetCapacity} ({cohort.fillRate}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full ${
                          cohort.fillRate >= 70 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${cohort.fillRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* VIEW 4: COMP AI AUTONOMOUS AGENT WORK QUEUE */}
      {/* =============================================================== */}
      {viewMode === 'agent_queue' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <span>Hàng Đợi Tác Vụ Tự Động (Comp AI Agent Work Queue)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các tác vụ nghiên cứu ứng viên, kiểm tra bằng chứng học vấn và tự động xếp lịch follow-up độc lập.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunBatchAgent}
              className="px-4 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thực thi hàng đợi ngay</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {[
              {
                id: 'wq-1',
                action: 'Nghiên cứu ứng viên Nguyễn Thị Khánh Linh',
                detail: 'Đối chiếu kinh nghiệm Giao dịch viên MSB Ba Đình & chỉ tiêu chuyển RM',
                status: 'Đã hoàn thành',
                time: 'Vừa xong'
              },
              {
                id: 'wq-2',
                action: 'Kiểm toán khả năng đóng phí VietQR cho Hoàng Minh Đức',
                detail: 'Tạo mã QR thanh toán 8.490.000 ₫ & gửi lời mời tham gia Bank Tour HO MSB',
                status: 'Đang xếp lịch',
                time: '5 phút trước'
              },
              {
                id: 'wq-3',
                action: 'Phân tích phản hồi TikTok của Phan Thu Thảo',
                detail: 'Đánh giá mức độ quan tâm khóa QHKH Cá nhân & phân công cho PIC PhuongVU',
                status: 'Chờ xử lý',
                time: '15 phút trước'
              }
            ].map((task) => (
              <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{task.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({task.time})</span>
                  </div>
                  <div className="text-slate-500">{task.detail}</div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 w-max border border-blue-200">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 5. COMP AI LEAD DETAIL WORKSPACE (OPTIMIZED 2-COLUMN SPLIT UI/UX) */}
      {/* =============================================================== */}
      {selectedLead && (
        <CompAILeadDetailModal
          order={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSave={(updatedOrder) => {
            if (onUpdateOrderCRM) onUpdateOrderCRM(updatedOrder);
            setSelectedLead(updatedOrder);
          }}
          onUpdateStatus={onUpdateOrderStatus}
        />
      )}

      {/* =============================================================== */}
      {/* 6. COHORT & CLASS LIFECYCLE MANAGER MODAL (AUTO-ROUTING ENGINE) */}
      {/* =============================================================== */}
      {showCohortManager && (
        <CMSCohortLifecycleModal
          cohorts={cohorts}
          orders={orders}
          onClose={() => setShowCohortManager(false)}
          onUpdateCohorts={setCohorts}
          onUpdateOrders={(updatedOrders) => {
            updatedOrders.forEach((o) => {
              if (onUpdateOrderCRM) onUpdateOrderCRM(o);
            });
          }}
        />
      )}

      {/* =============================================================== */}
      {/* 7. VIETQR REALTIME WEBHOOK RECONCILIATION SIMULATOR MODAL */}
      {/* =============================================================== */}
      {showWebhookModal && (
        <CMSVietQRWebhookModal
          orders={orders}
          onClose={() => setShowWebhookModal(false)}
          onConfirmPayment={(updatedOrder) => {
            if (onUpdateOrderCRM) onUpdateOrderCRM(updatedOrder);
            if (selectedLead && selectedLead.id === updatedOrder.id) {
              setSelectedLead(updatedOrder);
            }
          }}
        />
      )}

      {/* =============================================================== */}
      {/* 8. QUICK RESEND EMAIL MODAL FROM CRM KANBAN & TABLE */}
      {/* =============================================================== */}
      {selectedEmailOrder && (
        <SendResendEmailModal
          isOpen={!!selectedEmailOrder}
          onClose={() => setSelectedEmailOrder(null)}
          order={selectedEmailOrder}
          onEmailSent={(activity, log) => {
            const updated = {
              ...selectedEmailOrder,
              timelineActivities: [activity, ...(selectedEmailOrder.timelineActivities || [])]
            };
            if (onUpdateOrderCRM) onUpdateOrderCRM(updated);
            if (selectedLead && selectedLead.id === updated.id) {
              setSelectedLead(updated);
            }
          }}
        />
      )}

      {/* =============================================================== */}
      {/* 9. TALENTFLOW RECRUITMENT CAMPAIGN & REQUISITION MANAGEMENT MODAL */}
      {/* =============================================================== */}
      {showCampaignModal && (
        <CMSCampaignManagementModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          campaigns={campaigns}
          onUpdateCampaigns={(updated) => setCampaigns(updated)}
          orders={orders}
          onSelectCampaign={(cId) => {
            setSelectedCampaignId(cId);
            setSelectedPositionId('all');
          }}
        />
      )}
    </div>
  );
};
