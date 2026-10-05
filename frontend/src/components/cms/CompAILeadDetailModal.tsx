import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Check,
  CheckCircle2,
  Clock,
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
  Bot,
  Terminal,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  Video,
  FileText,
  Send,
  Plus,
  Square,
  CheckSquare,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Copy,
  Printer,
  Share2,
  Flame,
  BadgeAlert,
  ShieldCheck,
  Tag,
  BookOpen,
  UserCheck,
  Hash,
  Compass,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order, CRMStatus, PaymentStatus } from '../../types';
import { COMP_AI_PIPELINE_STAGES, runCompAIEvidenceEnrichment } from '../../utils/compAiCrm';
import { SendResendEmailModal } from './SendResendEmailModal';
import { LmsLearningPanel } from './LmsLearningPanel';

interface CompAILeadDetailModalProps {
  order: Order;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
  onUpdateStatus?: (orderId: string, status: Order['status']) => void;
}

export const CompAILeadDetailModal: React.FC<CompAILeadDetailModalProps> = ({
  order: initialOrder,
  onClose,
  onSave,
  onUpdateStatus,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'agent' | 'timeline' | 'tasks' | 'vietqr' | 'lms' | 'training'>('profile');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quick activity filter in Timeline tab
  const [activityFilter, setActivityFilter] = useState<'all' | 'call' | 'zalo' | 'meeting' | 'note' | 'agent'>('all');

  // Agent re-run simulation
  const [isResearching, setIsResearching] = useState(false);
  const [agentConsoleLogs, setAgentConsoleLogs] = useState<string[]>([]);

  // Note composer
  const [noteType, setNoteType] = useState<'call' | 'zalo' | 'meeting' | 'note'>('call');
  const [noteContent, setNoteContent] = useState('');

  // Task composer
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('Ngày mai, 10:00');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Fact composer
  const [factText, setFactText] = useState('');
  const [factCat, setFactCat] = useState<'background' | 'career_goal' | 'budget' | 'timing'>('career_goal');

  // Quick Note in sidebar
  const [sidebarNote, setSidebarNote] = useState(order.consultDetail || '');

  // Print view state
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Send Resend Email Modal state
  const [showResendEmailModal, setShowResendEmailModal] = useState(false);

  // Keyboard shortcut: Ctrl/Cmd + S to save, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order]);

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFieldChange = (field: keyof Order, value: any) => {
    setOrder((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(order);
    setIsDirty(false);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  // Pipeline stage click
  const handleStageSelect = (nextStage: CRMStatus) => {
    const isPaid = nextStage === '5. Đã đóng phí';
    const updated: Order = {
      ...order,
      crmStatus: nextStage,
      status: isPaid ? 'paid' : order.status,
      paymentStatusDetail: isPaid ? 'Đã đóng phí' : order.paymentStatusDetail,
      totalPaidAmount: isPaid ? (order.tuitionFee || order.amount) : order.totalPaidAmount
    };
    setOrder(updated);
    setIsDirty(true);
    onSave(updated);

    if (isPaid) {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
    }
  };

  // Mark as paid VietQR
  const handleMarkAsPaid = () => {
    const updated: Order = {
      ...order,
      crmStatus: '5. Đã đóng phí',
      status: 'paid',
      paymentStatusDetail: 'Đã đóng phí',
      totalPaidAmount: order.tuitionFee || order.amount,
      paidAt: new Date().toLocaleDateString('vi-VN'),
      timelineActivities: [
        {
          id: `act-pay-${Date.now()}`,
          type: 'payment',
          title: 'Gạch nợ học phí qua VietQR',
          content: `Xác nhận nhận học phí ${formatVND(order.amount)} thành công. Đã cấp mã học viên và bàn giao quyền truy cập Coursera.`,
          actor: 'Hệ thống VietQR NAPAS 247',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
        },
        ...(order.timelineActivities || [])
      ]
    };
    setOrder(updated);
    setIsDirty(false);
    onSave(updated);
    if (onUpdateStatus) onUpdateStatus(updated.id, 'paid');
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  // Re-run single lead agent
  const handleRerunAgent = () => {
    setIsResearching(true);
    setAgentConsoleLogs(['[Comp AI Agent] Khởi động quá trình xác minh học vấn & việc làm cho ' + order.customerName + '...']);

    setTimeout(() => {
      setAgentConsoleLogs((prev) => [
        ...prev,
        '[Comp AI Agent] Kiểm tra hồ sơ ngân hàng liên kết: MSB Ba Đình & Sở Giao Dịch...',
        '[Comp AI Agent] Xác nhận chỉ tiêu tuyển dụng chuyên viên Khách hàng Doanh nghiệp...',
        '[Comp AI Agent] Tổng hợp bằng chứng học vấn & đối chiếu năng lực Coursera...'
      ]);
    }, 600);

    setTimeout(() => {
      const enriched = runCompAIEvidenceEnrichment(order);
      enriched.readinessScore = Math.min(99, (enriched.readinessScore || 80) + 4);
      const updated: Order = {
        ...order,
        agentResearch: enriched,
        timelineActivities: [
          {
            id: `act-agent-${Date.now()}`,
            type: 'agent_research',
            title: 'Comp AI Agent hoàn tất quét dữ liệu',
            content: `Điểm sẵn sàng tuyển dụng đạt ${enriched.readinessScore}%. Bằng chứng kiểm chứng đạt chuẩn 'Nothing is Guessed'.`,
            actor: 'Comp AI Autonomous Agent',
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
          },
          ...(order.timelineActivities || [])
        ]
      };
      setOrder(updated);
      onSave(updated);
      setIsResearching(false);
      setAgentConsoleLogs((prev) => [
        ...prev,
        '[Comp AI Agent] ✅ Hoàn tất xác minh! Dữ liệu đã đồng bộ vào Sổ Bằng Chứng.'
      ]);
    }, 1500);
  };

  // Add verified fact
  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factText.trim() || !order.agentResearch) return;
    const newFact = {
      id: `fact-${Date.now()}`,
      fact: factText.trim(),
      verifiedAt: 'Vừa xác minh',
      confidence: 100,
      category: factCat,
      source: 'Xác minh trực tiếp bởi chuyên viên tuyển sinh'
    };

    const updatedResearch = {
      ...order.agentResearch,
      verifiedFacts: [newFact, ...order.agentResearch.verifiedFacts]
    };

    const updated = { ...order, agentResearch: updatedResearch };
    setOrder(updated);
    setIsDirty(true);
    onSave(updated);
    setFactText('');
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    const newAct = {
      id: `act-${Date.now()}`,
      type: noteType,
      title: noteType === 'call' ? 'Cuộc gọi tư vấn' : noteType === 'zalo' ? 'Tin nhắn Zalo' : noteType === 'meeting' ? 'Gặp trực tiếp HO MSB' : 'Ghi chú nội bộ',
      content: noteContent.trim(),
      actor: order.pic || 'Chuyên viên Tuyển sinh',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
    };

    const updated = {
      ...order,
      timelineActivities: [newAct, ...(order.timelineActivities || [])]
    };
    setOrder(updated);
    setIsDirty(true);
    onSave(updated);
    setNoteContent('');
  };

  // Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      dueDate: taskDate,
      priority: taskPriority,
      isCompleted: false,
      assignedTo: order.pic || 'HuongNT22'
    };

    const updated = {
      ...order,
      followupTasks: [newTask, ...(order.followupTasks || [])]
    };
    setOrder(updated);
    setIsDirty(true);
    onSave(updated);
    setTaskTitle('');
  };

  // Toggle Task
  const handleToggleTask = (taskId: string) => {
    if (!order.followupTasks) return;
    const updatedTasks = order.followupTasks.map((t) =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    const updated = { ...order, followupTasks: updatedTasks };
    setOrder(updated);
    setIsDirty(true);
    onSave(updated);
  };

  const currentStage = order.crmStatus || '1. Mới';
  const tier = order.agentResearch?.leadQualityTier || 'Tier B';
  const readiness = order.agentResearch?.readinessScore || 78;

  // VietQR generation payload
  const vietQrAmount = order.tuitionFee || order.amount || 8490000;
  const vietQrTransferDesc = `TW3 ${order.orderCode} ${order.customerName.replace(/[^a-zA-Z0-9 ]/g, '')}`.slice(0, 50).toUpperCase();
  const vietQrImageUrl = `https://img.vietqr.io/image/MSB-03001010099999-compact2.png?amount=${vietQrAmount}&addInfo=${encodeURIComponent(vietQrTransferDesc)}&accountName=CONG%20TY%20CP%20TWINGS%20ACADEMY`;

  const filteredActivities = (order.timelineActivities || []).filter((act) => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'call') return act.type === 'call';
    if (activityFilter === 'zalo') return act.type === 'zalo';
    if (activityFilter === 'meeting') return act.type === 'meeting';
    if (activityFilter === 'note') return act.type === 'note';
    if (activityFilter === 'agent') return act.type === 'agent_research' || act.type === 'payment';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-hidden">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullScreen ? 'w-full h-full rounded-none' : 'max-w-7xl w-full max-h-[96vh]'
        }`}
      >
        {/* ================================================================= */}
        {/* 1. TOP HEADER & BREADCRUMBS COMMAND BAR */}
        {/* ================================================================= */}
        <div className="bg-white border-b border-slate-200 px-5 sm:px-6 py-3.5 flex flex-col gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Breadcrumbs & Candidate Summary */}
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar with Status Pulse */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-[#0073C1] text-white font-bold flex items-center justify-center text-lg shadow-sm">
                  {order.customerName.charAt(0)}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    order.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  title={order.status === 'paid' ? 'Đã đóng học phí' : 'Chưa hoàn tất học phí'}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    {order.customerName}
                  </h2>

                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-xs font-mono font-semibold text-slate-700">
                    <span>{order.orderCode}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.orderCode, 'orderCode')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer ml-0.5"
                      title="Sao chép mã đơn hàng"
                    >
                      {copiedField === 'orderCode' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  {order.isDuplicate && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[11px] font-bold flex items-center gap-1 border border-red-200">
                      <AlertTriangle className="w-3 h-3" />
                      Trùng lặp ({order.duplicateCount || 2})
                    </span>
                  )}

                  {order.status === 'paid' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã đóng phí
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> Chờ VietQR
                    </span>
                  )}
                </div>

                {/* Subtitle Contact & Metadata */}
                <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                  <div className="flex items-center gap-1.5 font-mono text-slate-700 font-medium">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>{order.customerPhone || 'Chưa có SĐT'}</span>
                    {order.customerPhone && (
                      <div className="flex items-center gap-1 ml-1">
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-[11px] text-[#0073C1] hover:underline font-semibold"
                        >
                          Gọi
                        </a>
                        <span className="text-slate-300">·</span>
                        <a
                          href={`https://zalo.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          Zalo
                        </a>
                      </div>
                    )}
                  </div>

                  <span className="text-slate-300">·</span>

                  <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-sm flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[11px]">
                      🎯 {order.campaignCode || 'CAMP-2026-Q4-HN'}
                    </span>
                    <span className="truncate font-semibold text-slate-800">{order.courseTitle}</span>
                  </div>

                  <span className="text-slate-300 hidden md:inline">·</span>

                  <div className="hidden md:flex items-center gap-1 text-slate-600">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>PIC: <strong className="text-slate-800">{order.pic || 'Chưa gán'}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions (Resend Email, Mark as Paid, Save, Print, Fullscreen, Close) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowResendEmailModal(true)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Gửi thư tuyển sinh qua Resend API"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gửi Thư (Resend)</span>
              </button>

              {order.status !== 'paid' && (
                <button
                  type="button"
                  onClick={handleMarkAsPaid}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Gạch Nợ VietQR</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                className={`px-3.5 py-2 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                  isDirty
                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                    : 'bg-[#0073C1] hover:bg-[#005fa3] text-white'
                }`}
                title="Lưu hồ sơ (Phím tắt: Ctrl + S)"
              >
                <Save className="w-4 h-4" />
                <span>{isDirty ? 'Lưu Thay Đổi *' : 'Đã Lưu'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintPreview(!isPrintPreview)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer hidden md:flex items-center justify-center ${
                  isPrintPreview ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Xem bản in / Xuất hồ sơ"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center"
                title={isFullScreen ? 'Thu nhỏ giao diện' : 'Mở rộng toàn màn hình'}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Đóng cửa sổ (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* PIPELINE STEPPER INTERACTIVE PROGRESS BAR */}
          {/* =============================================================== */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5 px-0.5">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Tiến Trình Chuyển Đổi Tuyển Sinh (Pipeline Stepper):</span>
              </span>
              <span className="font-bold text-slate-800">
                Giai đoạn hiện tại: <span className="text-[#0073C1]">{currentStage}</span>
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 bg-slate-100/80 p-1 rounded-xl">
              {COMP_AI_PIPELINE_STAGES.map((st, index) => {
                const isCurrent = currentStage === st.id;
                const isPassed = COMP_AI_PIPELINE_STAGES.findIndex((s) => s.id === currentStage) >= index;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStageSelect(st.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer text-xs truncate flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/90 ring-2 ring-[#0073C1]/20'
                        : isPassed
                        ? 'text-blue-800 font-semibold hover:bg-white/60'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                    }`}
                    title={st.label + ': ' + st.description}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isPassed ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <span className="truncate">{st.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =============================================================== */}
          {/* QUICK AT-A-GLANCE METRIC CHIPS STRIP */}
          {/* =============================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-1 text-xs">
            {/* Metric 1: Amount & Payment */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Học Phí Thu</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{formatVND(order.amount)}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {order.status === 'paid' ? 'Đã đóng' : 'Chờ nộp'}
              </span>
            </div>

            {/* Metric 2: AI Lead Quality */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">AI Phân Hạng</span>
                <span className="font-bold text-purple-700">{tier} · {readiness}%</span>
              </div>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>

            {/* Metric 3: PIC selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Chuyên Viên PIC</span>
              <select
                value={order.pic || 'HuongNT22'}
                onChange={(e) => handleFieldChange('pic', e.target.value)}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="HuongNT22">HuongNT22 (Nguyễn Thu Hường)</option>
                <option value="TuanNM">TuanNM (Nguyễn Minh Tuấn)</option>
                <option value="PhuongVU">PhuongVU (Vũ Phương)</option>
                <option value="ChiNK">ChiNK (Kim Chi)</option>
                <option value="TungLH">TungLH (Lê Hoàng Tùng)</option>
              </select>
            </div>

            {/* Metric 4: Interest Level */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Độ Quan Tâm</span>
              <select
                value={order.interestLevel || 'Rất cao'}
                onChange={(e) => handleFieldChange('interestLevel', e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="Rất cao">🔥 Rất cao (Sẵn sàng nộp)</option>
                <option value="Cao">⚡ Cao (Đang so sánh)</option>
                <option value="Trung bình">⏳ Trung bình (Cần hỏi gia đình)</option>
                <option value="Đang phân vân">🤔 Đang phân vân</option>
                <option value="Thấp">❄️ Thấp</option>
              </select>
            </div>

            {/* Metric 5: Multi-course / Duplicate Alert */}
            <div className="hidden lg:flex bg-slate-50 border border-slate-200 rounded-xl p-2.5 items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lịch Sử Khóa Học</span>
                <span className="font-medium text-slate-700 text-xs">
                  {order.otherEnrolledCourses?.length ? `${order.otherEnrolledCourses.length + 1} khóa tại TWings` : 'Khóa đầu tiên'}
                </span>
              </div>
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Global Save Toast Notification */}
        {showSaveToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 animate-fadeIn shrink-0 shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            <span>Hồ sơ đã được lưu thành công vào CRM!</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. PRINT / EXPORT PREVIEW DRAWER (TOGGLEABLE) */}
        {/* ================================================================= */}
        {isPrintPreview && (
          <div className="bg-slate-100 p-4 border-b border-slate-200 shrink-0 flex items-center justify-between">
            <div className="text-xs text-slate-700">
              <strong>Chế độ in hồ sơ:</strong> Xem trước thông tin ứng viên chuẩn biểu mẫu TWings Academy & MSB.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In ra máy in / Xuất PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreview(false)}
                className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 font-bold text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. MAIN WORKSPACE: 2-COLUMN SPLIT (68% Core Workspaces / 32% Sticky Sidebar) */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 bg-slate-50/50">
          {/* =============================================================== */}
          {/* LEFT COLUMN: CORE WORKSPACES & TAB VIEWS (8 COLS) */}
          {/* =============================================================== */}
          <div className="lg:col-span-8 space-y-5">
            {/* Clean Segmented Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200 bg-white p-1 rounded-2xl border shadow-2xs overflow-x-auto">
              {[
                { id: 'profile', label: 'Hồ Sơ & Học Vấn', icon: User, count: null },
                { id: 'agent', label: 'Bằng Chứng AI (Evidence)', icon: Bot, count: order.agentResearch?.verifiedFacts.length },
                { id: 'timeline', label: 'Nhật Ký Tương Tác', icon: FileText, count: order.timelineActivities?.length },
                { id: 'tasks', label: 'Lịch Nhắc Hẹn', icon: CheckSquare, count: order.followupTasks?.filter(t => !t.isCompleted).length },
                { id: 'vietqr', label: 'Thanh Toán & VietQR', icon: CreditCard, count: null },
                { id: 'lms', label: 'Học Tập (LMS)', icon: BookOpen, count: null },
                { id: 'training', label: 'Đào Tạo & Tuyển Dụng MSB', icon: GraduationCap, count: null }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-[#0073C1] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ============================================================= */}
            {/* TAB 1: EDITABLE CANDIDATE & ORDER PROFILE */}
            {/* ============================================================= */}
            {activeTab === 'profile' && (
              <div className="space-y-5 animate-fadeIn">
                {/* 1.1 Thông tin cá nhân & liên hệ */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#0073C1]" />
                      <span>1. Thông Tin Cá Nhân & Liên Hệ Ứng Viên</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">Có thể chỉnh sửa trực tiếp</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Họ và tên *</label>
                      <input
                        type="text"
                        value={order.customerName}
                        onChange={(e) => handleFieldChange('customerName', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số điện thoại *</label>
                      <input
                        type="text"
                        value={order.customerPhone || ''}
                        onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email *</label>
                      <input
                        type="email"
                        value={order.customerEmail || ''}
                        onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số CCCD / CMND *</label>
                      <input
                        type="text"
                        value={order.citizenId || ''}
                        onChange={(e) => handleFieldChange('citizenId', e.target.value)}
                        placeholder="001205019888"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ngày sinh</label>
                      <input
                        type="text"
                        value={order.birthDate || ''}
                        onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                        placeholder="18/06/2004"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Giới tính</label>
                      <select
                        value={order.gender || 'Nữ'}
                        onChange={(e) => handleFieldChange('gender', e.target.value as any)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      >
                        <option value="Nữ">Nữ</option>
                        <option value="Nam">Nam</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Nơi ở hiện tại / Khu vực *</label>
                      <input
                        type="text"
                        value={order.currentResidence || order.area || ''}
                        onChange={(e) => handleFieldChange('currentResidence', e.target.value)}
                        placeholder="Số 25 ngõ 180 Triều Khúc, Thanh Xuân, Hà Nội"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Hộ khẩu thường trú</label>
                      <input
                        type="text"
                        value={order.permanentAddress || ''}
                        onChange={(e) => handleFieldChange('permanentAddress', e.target.value)}
                        placeholder="Thành phố Nam Định"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.2 Học vấn & Nguyện vọng nghề nghiệp */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#0073C1]" />
                      <span>2. Học Vấn & Năng Lực Ứng Tuyển</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Trường Đại học / Cao đẳng</label>
                      <input
                        type="text"
                        value={order.university || ''}
                        onChange={(e) => handleFieldChange('university', e.target.value)}
                        placeholder="Học viện Ngân hàng"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Chuyên ngành đào tạo</label>
                      <input
                        type="text"
                        value={order.major || ''}
                        onChange={(e) => handleFieldChange('major', e.target.value)}
                        placeholder="Tài chính - Ngân hàng"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Năm tốt nghiệp</label>
                      <input
                        type="text"
                        value={order.graduationYear || '2026'}
                        onChange={(e) => handleFieldChange('graduationYear', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Trình độ học vấn</label>
                      <select
                        value={order.educationLevel || 'Đại học'}
                        onChange={(e) => handleFieldChange('educationLevel', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      >
                        <option value="Sinh viên năm cuối">Sinh viên năm cuối</option>
                        <option value="Đại học">Đại học (Đã tốt nghiệp)</option>
                        <option value="Cao đẳng">Cao đẳng</option>
                        <option value="Đã đi làm ngành khác">Đã đi làm ngành khác (Chuyển ngành)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Link Hồ Sơ / CV đính kèm</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={order.cvLink || 'https://drive.google.com/cv-banker-sample.pdf'}
                          onChange={(e) => handleFieldChange('cvLink', e.target.value)}
                          className="flex-1 p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono text-slate-600"
                        />
                        {order.cvLink && (
                          <a
                            href={order.cvLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 bg-blue-50 text-[#0073C1] hover:bg-blue-100 rounded-xl font-bold flex items-center justify-center shrink-0"
                            title="Mở link CV trong tab mới"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1.3 Khóa học Coursera & Ưu đãi học phí */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#0073C1]" />
                      <span>3. Khóa Học Coursera & Chính Sách Học Phí</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Tên khóa học quan tâm *</label>
                      <div className="space-y-1.5">
                        <select
                          value={order.courseTitle}
                          onChange={(e) => {
                            const selected = e.target.value;
                            handleFieldChange('courseTitle', selected);
                            if (selected.includes('doanh nghiệp')) {
                              handleFieldChange('courseId', 'twings-qhkh-doanh-nghiep');
                            } else if (selected.includes('cá nhân')) {
                              handleFieldChange('courseId', 'twings-qhkh-ca-nhan');
                            } else if (selected.includes('Giao dịch viên')) {
                              handleFieldChange('courseId', 'gdv-ngan-hang');
                            } else if (selected.includes('AI')) {
                              handleFieldChange('courseId', 'deeplearning-ai-agents');
                            }
                          }}
                          className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-semibold text-slate-900 text-xs"
                        >
                          <option value="Khóa Quan hệ Khách hàng doanh nghiệp">🏢 Khóa Quan hệ Khách hàng doanh nghiệp (RM CIB)</option>
                          <option value="Quan hệ Khách hàng cá nhân">👤 Quan hệ Khách hàng cá nhân (RM RB)</option>
                          <option value="Giao dịch viên & Vận hành Dịch vụ Khách hàng">💳 Giao dịch viên & Vận hành Dịch vụ Khách hàng (GDV)</option>
                          <option value="Xây dựng các Đại lý AI & Quy trình Làm việc Tự động">🤖 Xây dựng các Đại lý AI & Quy trình Làm việc Tự động</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Lớp / Đợt khai giảng *</label>
                      <select
                        value={order.batchCohort || 'Khóa học 9 - Hà Nội'}
                        onChange={(e) => handleFieldChange('batchCohort', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-semibold text-slate-900 text-xs"
                      >
                        <option value="Khóa học 9 - Hà Nội">📅 Khóa học 9 - Hà Nội (Khai giảng 15/10/2026)</option>
                        <option value="Khóa học 9 - TP.HCM">📅 Khóa học 9 - TP.HCM (Khai giảng 20/10/2026)</option>
                        <option value="Khóa học 8">📅 Khóa học 8 - Hà Nội (Đang đào tạo)</option>
                        <option value="Khóa học 8 - HCM">📅 Khóa học 8 - TP.HCM (Đang đào tạo)</option>
                        <option value="Khóa học 10 (Dự bị)">📅 Khóa học 10 (Dự bị tuyển sinh Tháng 11/2026)</option>
                        <option value="Chưa xếp lớp / Học viên đăng ký sớm">⏳ Chưa xếp lớp / Đăng ký sớm</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Học phí niêm yết (₫)</label>
                      <input
                        type="number"
                        value={order.amount}
                        onChange={(e) => handleFieldChange('amount', Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Chương trình khuyến mãi (CTKM)</label>
                      <input
                        type="text"
                        value={order.promotionProgram || 'Học bổng MSB Early Bird 20%'}
                        onChange={(e) => handleFieldChange('promotionProgram', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tổng tiền thực thu (₫)</label>
                      <input
                        type="number"
                        value={order.tuitionFee || order.amount}
                        onChange={(e) => handleFieldChange('tuitionFee', Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono font-bold text-emerald-700"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="font-bold text-slate-700 block mb-1">Ghi chú tư vấn tuyển sinh</label>
                      <textarea
                        rows={2}
                        value={order.consultDetail || ''}
                        onChange={(e) => handleFieldChange('consultDetail', e.target.value)}
                        placeholder="Ứng viên muốn định hướng làm RM KHDN tại MSB Hội sở, cần hỗ trợ thêm kỹ năng thẩm định tín dụng..."
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.4 Nguồn tuyển sinh & Người giới thiệu */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-[#0073C1]" />
                      <span>4. Nguồn Tuyển Sinh & Người Giới Thiệu (NGT)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kênh tiếp cận *</label>
                      <select
                        value={order.source || 'Website'}
                        onChange={(e) => handleFieldChange('source', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      >
                        <option value="Website">Website Form</option>
                        <option value="Bank Tour">Bank Tour Hội Sở MSB</option>
                        <option value="Facebook">Facebook Ads / Fanpage</option>
                        <option value="TikTok">TikTok Video</option>
                        <option value="Giới thiệu">Giới thiệu nội bộ (GTNB)</option>
                        <option value="Hội thảo trường ĐH">Hội thảo trường ĐH</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Mã chiến dịch</label>
                      <input
                        type="text"
                        value={order.campaignCode || 'TW3'}
                        onChange={(e) => handleFieldChange('campaignCode', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tên Người giới thiệu (NGT)</label>
                      <input
                        type="text"
                        value={order.referrerName || ''}
                        onChange={(e) => handleFieldChange('referrerName', e.target.value)}
                        placeholder="Nguyễn Văn A (Alumni K8)"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">SĐT Người giới thiệu</label>
                      <input
                        type="text"
                        value={order.referrerPhone || ''}
                        onChange={(e) => handleFieldChange('referrerPhone', e.target.value)}
                        placeholder="0912345678"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: AGENTIC RESEARCH & EVIDENCE LEDGER ("NOTHING IS GUESSED") */}
            {/* ============================================================= */}
            {activeTab === 'agent' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Agent Control & Status Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          Sổ Bằng Chứng Xác Thực (Evidence Ledger)
                        </span>
                        <span className="text-slate-400 text-xs">·</span>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Nothing is Guessed
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Mọi quyết định tư vấn và điểm sẵn sàng đều được đối chiếu trực tiếp từ các sự kiện có thật.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRerunAgent}
                      disabled={isResearching}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin' : ''}`} />
                      <span>{isResearching ? 'Đang xác minh hồ sơ...' : 'Chạy Quét AI Xác Minh'}</span>
                    </button>
                  </div>

                  {isResearching && (
                    <div className="p-3.5 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400 space-y-1.5 border border-slate-800 animate-fadeIn">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                        <Terminal className="w-3.5 h-3.5 text-blue-400" />
                        <span>Comp AI Autonomous Lead Research Agent v2.4</span>
                      </div>
                      {agentConsoleLogs.map((log, i) => (
                        <div key={i} className="leading-relaxed">{log}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evidence List */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-100 pb-2.5">
                    <span className="text-slate-900">Các bằng chứng đã xác minh ({order.agentResearch?.verifiedFacts.length || 0})</span>
                    <span className="text-emerald-700 font-mono">100% Verified Evidence</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {order.agentResearch?.verifiedFacts.map((fact) => (
                      <div key={fact.id} className="py-3.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                              {fact.fact}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                            {fact.confidence}% Xác thực
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 pl-6.5 flex items-center gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">Nguồn: {fact.source}</span>
                          <span>·</span>
                          <span>{fact.verifiedAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Fact Form */}
                  <form onSubmit={handleAddFact} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={factCat}
                      onChange={(e) => setFactCat(e.target.value as any)}
                      className="p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-700 font-semibold"
                    >
                      <option value="career_goal">🎯 Nguyện vọng nghề nghiệp</option>
                      <option value="background">🎓 Nền tảng học vấn</option>
                      <option value="budget">💰 Ngân sách học phí</option>
                      <option value="timing">⏰ Thời gian nhập học</option>
                    </select>

                    <input
                      type="text"
                      value={factText}
                      onChange={(e) => setFactText(e.target.value)}
                      placeholder="Nhập bằng chứng xác thực mới về ứng viên..."
                      className="flex-1 w-full p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                    />

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Thêm Bằng Chứng
                    </button>
                  </form>
                </div>

                {/* AI Battle Card & Consultation Pitch */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Sparkles className="w-4 h-4 text-[#0073C1]" />
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Chiến Lược Tư Vấn & Kịch Bản Gợi Mở (AI Battle Card)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
                      <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Điểm Mạnh & Động Lực Ứng Viên</span>
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc leading-relaxed">
                        {order.agentResearch?.battleCard.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-2">
                      <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Rào Cản Tâm Lý & Xử Lý Từ Chối</span>
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc leading-relaxed">
                        {order.agentResearch?.battleCard.objections.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Kịch Bản Gợi Ý Cho Chuyên Viên Tư Vấn:
                    </span>
                    <p className="text-xs text-slate-900 italic leading-relaxed font-medium">
                      "{order.agentResearch?.battleCard.recommendedPitch}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3: ACTIVITY TIMELINE & LOGS */}
            {/* ============================================================= */}
            {activeTab === 'timeline' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Note composer */}
                <form onSubmit={handleAddNote} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-800">Thêm nhật ký tương tác:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'call', label: 'Cuộc gọi', icon: PhoneCall },
                        { id: 'zalo', label: 'Zalo / SMS', icon: MessageSquare },
                        { id: 'meeting', label: 'Hẹn gặp MSB', icon: Video },
                        { id: 'note', label: 'Ghi chú', icon: FileText }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNoteType(item.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            noteType === item.id
                              ? 'bg-[#0073C1] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <item.icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Ghi lại chi tiết nội dung cuộc trao đổi với học viên..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                  />

                  {/* Quick Pre-fill Tags */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-medium">Gợi ý nhanh:</span>
                      {[
                        'Hẹn gọi lại sau giờ hành chính',
                        'Đã gửi link VietQR đóng phí',
                        'Mời tham gia Bank Tour MSB',
                        'Cần hỗ trợ giáo trình Coursera'
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNoteContent((prev) => (prev ? prev + ' · ' + tag : tag))}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Ghi Nhật Ký</span>
                    </button>
                  </div>
                </form>

                {/* Timeline Filter & List */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Lịch sử tương tác ({filteredActivities.length})
                    </span>

                    <div className="flex items-center gap-1 text-[11px]">
                      {(['all', 'call', 'zalo', 'meeting', 'note', 'agent'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setActivityFilter(filter)}
                          className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                            activityFilter === filter
                              ? 'bg-blue-100 text-[#0073C1]'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {filter === 'all' ? 'Tất cả' : filter === 'call' ? 'Cuộc gọi' : filter === 'zalo' ? 'Zalo' : filter === 'meeting' ? 'Hẹn gặp' : filter === 'note' ? 'Ghi chú' : 'AI Agent'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredActivities.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Chưa có hoạt động tương tác nào theo bộ lọc này.
                      </div>
                    ) : (
                      filteredActivities.map((act) => (
                        <div key={act.id} className="py-3.5 flex items-start gap-3.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                            {act.type === 'call' ? (
                              <PhoneCall className="w-4 h-4 text-blue-600" />
                            ) : act.type === 'zalo' ? (
                              <MessageSquare className="w-4 h-4 text-emerald-600" />
                            ) : act.type === 'meeting' ? (
                              <Video className="w-4 h-4 text-purple-600" />
                            ) : act.type === 'payment' ? (
                              <CreditCard className="w-4 h-4 text-emerald-600" />
                            ) : act.type === 'agent_research' ? (
                              <Bot className="w-4 h-4 text-blue-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">{act.title}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{act.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">{act.content}</p>
                            <div className="text-[11px] text-slate-400">
                              Người thực hiện: <strong className="text-slate-600">{act.actor}</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 4: TASKS & FOLLOW-UPS */}
            {/* ============================================================= */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Task composer */}
                <form onSubmit={handleAddTask} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                  <span className="font-bold text-xs text-slate-800 block">Thêm nhiệm vụ follow-up mới:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Nội dung cần thực hiện (ví dụ: Gọi lại chốt học bổng...)"
                      className="sm:col-span-2 p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                    />
                    <input
                      type="text"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      placeholder="Hạn chót"
                      className="p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                    />
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-700 font-semibold"
                    >
                      <option value="high">🚨 Khẩn cấp</option>
                      <option value="medium">⚡ Bình thường</option>
                      <option value="low">⏳ Thấp</option>
                    </select>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo Nhiệm Vụ</span>
                    </button>
                  </div>
                </form>

                {/* Tasks List */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Danh sách nhiệm vụ ({order.followupTasks?.length || 0})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Đã hoàn thành: {order.followupTasks?.filter(t => t.isCompleted).length || 0} / {order.followupTasks?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.followupTasks?.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          task.isCompleted
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            {task.isCompleted ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <span className={`text-xs font-bold text-slate-900 block ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>
                              {task.title}
                            </span>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Hạn chót: {task.dueDate} · Người phụ trách: {task.assignedTo}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            task.priority === 'high'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : task.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority === 'high' ? 'Khẩn cấp' : task.priority === 'medium' ? 'Tiêu chuẩn' : 'Thấp'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: LEARNING ON THE MOODLE LMS (live data, staff actions) */}
            {activeTab === 'lms' && <LmsLearningPanel orderId={order.id} />}

            {/* TAB 5: VIETQR BILLING & INVOICING */}
            {/* ============================================================= */}
            {activeTab === 'vietqr' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* QR Image Card */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>VietQR Chuẩn NAPAS 247</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <img
                        src={vietQrImageUrl}
                        alt="VietQR Chuyển Khoản Học Phí"
                        className="w-48 h-48 object-contain rounded-lg"
                        onError={(e) => {
                          // Fallback placeholder if network fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      Quét bằng app mọi ngân hàng để thanh toán
                    </span>
                  </div>

                  {/* Transfer Details & Copy */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Thông tin tài khoản thụ hưởng TWings Academy
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        Ngân hàng TMCP Hàng Hải Việt Nam (MSB)
                      </h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Số tài khoản:</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">03001010099999</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('03001010099999', 'bankAcc')}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'bankAcc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'bankAcc' ? 'Đã sao chép' : 'Sao chép STK'}</span>
                        </button>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Chủ tài khoản:</span>
                          <span className="font-bold text-slate-900">CONG TY CP TWINGS ACADEMY</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Nội dung chuyển khoản (Bắt buộc):</span>
                          <span className="font-mono font-bold text-blue-700 text-xs">{vietQrTransferDesc}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(vietQrTransferDesc, 'syntax')}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'syntax' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'syntax' ? 'Đã sao chép' : 'Sao chép cú pháp'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-600">Số tiền cần đóng:</span>
                        <span className="font-mono font-bold text-slate-900 text-base">{formatVND(vietQrAmount)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      {order.status === 'paid' ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Học viên đã đóng đủ học phí {formatVND(order.amount)} vào ngày {order.paidAt || '02/10/2026'}.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleMarkAsPaid}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
                        >
                          <Check className="w-4 h-4" />
                          <span>Xác Nhận Đã Nhận Tiền & Gạch Nợ Ngay</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 6: TRAINING & MSB PLACEMENT */}
            {/* ============================================================= */}
            {activeTab === 'training' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 animate-fadeIn">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0073C1]" />
                    <span>Quản Lý Đào Tạo & Giới Thiệu Việc Làm Tại MSB</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi tiến độ học tập trên Coursera và lộ trình tiếp nhận vào ngân hàng đối tác MSB.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trạng thái chương trình học</label>
                    <select
                      value={order.trainingStatus || 'Đang học'}
                      onChange={(e) => handleFieldChange('trainingStatus', e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 font-semibold"
                    >
                      <option value="Đang học">Đang học (Lớp K9)</option>
                      <option value="Đã tốt nghiệp">Đã tốt nghiệp (Cấp chứng chỉ)</option>
                      <option value="Bảo lưu">Bảo lưu</option>
                      <option value="Thôi học">Thôi học</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Đơn vị tiếp nhận làm việc tại MSB</label>
                    <input
                      type="text"
                      value={order.placementCompany || 'Khối KH Doanh nghiệp - MSB Sở Giao Dịch'}
                      onChange={(e) => handleFieldChange('placementCompany', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã số chứng nhận tốt nghiệp</label>
                    <input
                      type="text"
                      value={order.certificateNumber || 'TW-2026-K9-088'}
                      onChange={(e) => handleFieldChange('certificateNumber', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ngày bắt đầu làm việc chính thức</label>
                    <input
                      type="text"
                      value={order.workStartDate || '01/11/2026'}
                      onChange={(e) => handleFieldChange('workStartDate', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* RIGHT COLUMN: STICKY CONTEXT, CONTROLS & INTELLIGENCE (4 COLS) */}
          {/* =============================================================== */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Candidate Quick Connect */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
                Kết Nối Nhanh Với Học Viên
              </span>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#0073C1] font-bold flex items-center justify-center text-xl shrink-0">
                  {order.customerName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{order.customerName}</h4>
                  <span className="font-mono text-slate-600 text-xs block">{order.customerPhone || 'Chưa có SĐT'}</span>
                </div>
              </div>

              {/* 3 Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <a
                  href={`tel:${order.customerPhone}`}
                  className="py-2 px-1 bg-blue-50 hover:bg-blue-100 text-[#0073C1] rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi Điện</span>
                </a>

                <a
                  href={`https://zalo.me/${(order.customerPhone || '').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Zalo</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowResendEmailModal(true)}
                  className="py-2 px-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Gửi email mẫu qua Resend API"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Gửi Mail</span>
                </button>
              </div>
            </div>

            {/* Card 2: AI Lead Quality & Readiness Gauge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chỉ Số Chuyển Đổi (AI Quality)
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {tier}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Điểm sẵn sàng (Readiness Score):</span>
                  <span className="font-mono font-bold text-slate-900">{readiness}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic leading-relaxed pt-1">
                {tier === 'Tier A'
                  ? 'Ứng viên có động lực cao, khớp chỉ tiêu tuyển dụng MSB, sẵn sàng chuyển khoản học phí.'
                  : 'Ứng viên đang cân nhắc thời gian khóa học, nên gợi ý hỗ trợ chia kỳ thanh toán.'}
              </p>
            </div>

            {/* Card 3: Financial & VietQR Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
                Tài Chính & Học Phí
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Học phí khóa học:</span>
                  <span className="font-mono font-bold text-slate-900">{formatVND(order.amount)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Trạng thái thanh toán:</span>
                  {order.status === 'paid' ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã đóng đủ
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Chờ chuyển khoản
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Phương thức:</span>
                  <span className="text-slate-800 font-bold">VietQR NAPAS 247</span>
                </div>
              </div>

              {order.status !== 'paid' && (
                <button
                  type="button"
                  onClick={handleMarkAsPaid}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận thu học phí (Gạch nợ)</span>
                </button>
              )}
            </div>

            {/* Card 4: Multi-Course & Duplicate Warning Banner */}
            {order.isDuplicate && (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Phát hiện trùng lặp lead ({order.duplicateCount || 2} lần)</span>
                </div>
                <p className="text-red-700 text-[11px] leading-relaxed">
                  {order.duplicateNote || 'Ứng viên để lại thông tin 2 lần từ Facebook Ads và Website.'}
                </p>
              </div>
            )}

            {order.otherEnrolledCourses && order.otherEnrolledCourses.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-blue-800 font-bold">
                  <GraduationCap className="w-4 h-4 text-[#0073C1]" />
                  <span>Học viên đa khóa học (Alumni)</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {order.otherEnrolledCourses.map((c) => (
                    <div key={c.id} className="p-1.5 bg-white/80 rounded border border-blue-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{c.title}</span>
                      <span className="font-mono text-slate-500">{c.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 5: Sticky Quick Notes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
                Ghi Chú Nhanh Cho Chuyên Viên
              </span>

              <textarea
                rows={3}
                value={sidebarNote}
                onChange={(e) => {
                  setSidebarNote(e.target.value);
                  handleFieldChange('consultDetail', e.target.value);
                }}
                placeholder="Lưu ý quan trọng cần nhớ về ứng viên này..."
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. RESEND EMAIL DISPATCH WORKSPACE MODAL */}
      {showResendEmailModal && (
        <SendResendEmailModal
          isOpen={showResendEmailModal}
          onClose={() => setShowResendEmailModal(false)}
          order={order}
          onEmailSent={(activity, log) => {
            const updated = {
              ...order,
              timelineActivities: [activity, ...(order.timelineActivities || [])]
            };
            setOrder(updated);
            setIsDirty(true);
            onSave(updated);
            setShowSaveToast(true);
            setTimeout(() => setShowSaveToast(false), 2500);
          }}
        />
      )}
    </div>
  );
};
