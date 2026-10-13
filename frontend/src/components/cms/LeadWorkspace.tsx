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
  CreditCard,
  GraduationCap,
  Bot,
  PhoneCall,
  MessageSquare,
  Video,
  FileText,
  Send,
  Plus,
  Square,
  CheckSquare,
  ExternalLink,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Copy,
  Printer,
  Share2,
  BookOpen,
  UserCheck,
  Compass,
} from 'lucide-react';
import { Course, Order, CRMStatus } from '../../types';
import { CatalogOptions, catalogItems, itemFields, itemValue, ProgramOption } from '../../admin/catalog';
import { LeadPaymentPanel } from './LeadPaymentPanel';
import { SendResendEmailModal } from './SendResendEmailModal';
import { LmsLearningPanel } from './LmsLearningPanel';
import { OrderBillingPanel } from './OrderBillingPanel';
import { LeadContactPanel } from './LeadContactPanel';
import { PlacementPanel } from '../../admin/pages/PlacementPages';
import { api, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { navigate } from '../../admin/router';

const CRM_STAGES: { id: CRMStatus; label: string }[] = [
  { id: '1. Mới', label: 'Mới' },
  { id: '2. Đã tiếp cận', label: 'Đã tiếp cận' },
  { id: '3. Đang tư vấn', label: 'Đang tư vấn' },
  { id: '4. Hẹn gặp', label: 'Hẹn gặp' },
  { id: '5. Đã đóng phí', label: 'Đã đóng phí' },
  { id: '6. Chăm sóc lại', label: 'Chăm sóc lại' },
  { id: '7. Đã hủy', label: 'Đã hủy' }
];

interface LeadWorkspaceProps {
  order: Order;
  onClose: () => void;
  /** Save `updated` against `previous` (the version loaded); resolves to the order as now stored. */
  onSave: (previous: Order, updated: Order) => Promise<Order>;
  /** Finance: record a received amount; resolves to the order as now stored. */
  onConfirmPayment: (amount: number) => Promise<Order | null>;
  /** Open another lead (same person) in the workspace. */
  onOpenOrder?: (orderId: string) => void;
  /** The catalogue (courses on sale and programs) for the course of this registration. */
  courses: Course[];
  programs: ProgramOption[];
}

interface Consultant { id: string; name: string }
interface CohortOption { id: string; name: string; status: string; startDate?: string | null }

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chưa đóng đủ',
  paid: 'Đã đóng đủ',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền'
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  vietqr: 'Chuyển khoản VietQR',
  transfer: 'Chuyển khoản',
  cash: 'Tiền mặt',
  card: 'Thẻ',
  free: 'Miễn phí',
  bundle: 'Trong gói chương trình'
};

// Kept up to date by the server after an action (note, task, stage, payment), even while the form has
// unsaved edits.
const SERVER_FIELDS: (keyof Order)[] = [
  'timelineActivities',
  'followupTasks',
  'crmStatus',
  'firstResponseAt',
  'status',
  'totalPaidAmount',
  'paidAt'
];
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** dd/mm/yyyy (older records) or ISO -> the yyyy-mm-dd a date input takes. */
const isoDate = (value?: string | null) => {
  if (!value) return '';
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : value.slice(0, 10);
};

/** Server timestamps (ISO) as dd/mm/yyyy hh:mm; anything else as given. */
const when = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SOURCES = ['Website', 'Hotline', 'Facebook', 'Zalo', 'TikTok', 'Giới thiệu', 'Hội thảo trường ĐH', 'Sự kiện'];

/**
 * One registration (lead) in full: course, class, stage, consultation history, tasks, appointments,
 * payment and learning, with a summary of the learner (whose details are on the learner page).
 */
export const LeadWorkspace: React.FC<LeadWorkspaceProps> = ({
  order: initialOrder,
  onClose,
  onSave,
  onConfirmPayment,
  onOpenOrder,
  courses,
  programs,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  // The order as last loaded from / saved to the server: changes are sent against it.
  const [saved, setSaved] = useState<Order>(initialOrder);
  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'contact' | 'timeline' | 'tasks' | 'payment' | 'training'>('profile');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedLeadLink, setCopiedLeadLink] = useState(false);
  const canAssign = useStaffCan('crm.assign_pic');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);

  // Real consultants (staff with the admissions role) and the real intakes of the lead's course.
  useEffect(() => {
    api.get<Consultant[]>('/staff/consultants/').then(setConsultants).catch(() => setConsultants([]));
  }, []);
  useEffect(() => {
    if (!initialOrder.courseId) return;
    api
      .get<Paginated<CohortOption>>(`/staff/cohorts/?course=${encodeURIComponent(initialOrder.courseId)}&pageSize=100`)
      .then((res) => setCohorts(res.results))
      .catch(() => setCohorts([]));
  }, [initialOrder.courseId]);

  const handleCopyLeadLink = () => {
    const url = `${window.location.origin}/app/sales/crm?orderId=${encodeURIComponent(order.id)}`;
    navigator.clipboard.writeText(url);
    setCopiedLeadLink(true);
    setTimeout(() => setCopiedLeadLink(false), 2000);
  };

  // Quick activity filter in Timeline tab
  const [activityFilter, setActivityFilter] = useState<'all' | 'call' | 'zalo' | 'meeting' | 'note' | 'agent'>('all');

  // Agent re-run simulation

  // Note composer
  const [noteType, setNoteType] = useState<'call' | 'zalo' | 'meeting' | 'note'>('call');
  const [noteContent, setNoteContent] = useState('');

  // Task composer
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(tomorrowIso);
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Print view state
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Send Resend Email Modal state
  const [showResendEmailModal, setShowResendEmailModal] = useState(false);

  // Closing with unsaved edits asks first.
  const requestClose = () => {
    if (isDirty && !window.confirm('Hồ sơ có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?')) return;
    onClose();
  };

  // Keyboard shortcut: Ctrl/Cmd + S to save, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && !showResendEmailModal) {
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  const flashSaved = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  // Save the whole form (the "Lưu" button / Ctrl+S).
  const handleSave = async () => {
    if (busy || !isDirty) return;
    setBusy(true);
    try {
      const fresh = await onSave(saved, order);
      setSaved(fresh);
      setOrder(fresh);
      setIsDirty(false);
      flashSaved();
    } finally {
      setBusy(false);
    }
  };

  // One action (note, task, stage): only that change is sent, unsaved form edits stay in the form.
  const commit = async (change: (o: Order) => Order) => {
    setBusy(true);
    try {
      const fresh = await onSave(saved, change(saved));
      setSaved(fresh);
      setOrder((cur) => {
        const merged = { ...cur } as Record<string, unknown>;
        SERVER_FIELDS.forEach((k) => (merged[k] = fresh[k]));
        return merged as unknown as Order;
      });
    } finally {
      setBusy(false);
    }
  };

  // Pipeline stage click
  const handleStageSelect = (nextStage: CRMStatus) => {
    // "Đã đóng phí" follows a recorded payment (bank webhook or finance confirmation), never a click.
    if (nextStage === '5. Đã đóng phí' && order.status !== 'paid') {
      setActiveTab('payment');
      return;
    }
    if (nextStage === (saved.crmStatus || '1. Mới')) return;
    commit((o) => ({ ...o, crmStatus: nextStage }));
  };

  // Finance confirmed the money (the payments tab asks first); the server records the payment.
  const handleConfirmReceived = async (amount: number) => {
    const fresh = await onConfirmPayment(amount);
    if (!fresh) return;
    setSaved(fresh);
    setOrder((cur) => {
      const merged = { ...cur } as Record<string, unknown>;
      SERVER_FIELDS.forEach((k) => (merged[k] = fresh[k]));
      return merged as unknown as Order;
    });
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || busy) return;
    const newAct = {
      id: `act-${Date.now()}`,
      type: noteType,
      title: noteType === 'call' ? 'Cuộc gọi tư vấn' : noteType === 'zalo' ? 'Tin nhắn Zalo' : noteType === 'meeting' ? 'Gặp trực tiếp' : 'Ghi chú nội bộ',
      content: noteContent.trim(),
      actor: '',
      timestamp: new Date().toISOString()
    };
    await commit((o) => ({ ...o, timelineActivities: [newAct, ...(o.timelineActivities || [])] }));
    setNoteContent('');
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || busy) return;
    const newTask = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      dueDate: taskDate,
      priority: taskPriority,
      isCompleted: false,
      assignedTo: saved.pic || ''
    };
    await commit((o) => ({ ...o, followupTasks: [newTask, ...(o.followupTasks || [])] }));
    setTaskTitle('');
    setTaskDate(tomorrowIso());
  };

  // Toggle Task
  const handleToggleTask = (taskId: string) => {
    if (busy) return;
    commit((o) => ({
      ...o,
      followupTasks: (o.followupTasks || []).map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t))
    }));
  };

  const currentStage = order.crmStatus || '1. Mới';

  const filteredActivities = (order.timelineActivities || []).filter((act) => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'call') return act.type === 'call';
    if (activityFilter === 'zalo') return act.type === 'zalo';
    if (activityFilter === 'meeting') return act.type === 'meeting';
    if (activityFilter === 'note') return act.type === 'note';
    if (activityFilter === 'agent') return act.type === 'email' || act.type === 'payment';
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
                      Trùng lặp{order.duplicateCount ? ` (${order.duplicateCount} hồ sơ)` : ''}
                    </span>
                  )}

                  {order.status === 'paid' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã đóng phí
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> {PAYMENT_STATUS_LABEL[order.status] || 'Chưa đóng đủ'}
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
                    {order.campaignCode && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[11px]">
                        🎯 {order.campaignCode}
                      </span>
                    )}
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
                title="Gửi email cho học viên"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gửi email</span>
              </button>


              <button
                type="button"
                onClick={handleSave}
                className={`px-3.5 py-2 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                  isDirty
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-[#0073C1] hover:bg-[#005fa3] text-white'
                }`}
                title="Lưu hồ sơ (Phím tắt: Ctrl + S)"
              >
                <Save className="w-4 h-4" />
                <span>{busy ? 'Đang lưu…' : isDirty ? 'Lưu thay đổi' : 'Đã lưu'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLeadLink}
                className="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Sao chép liên kết hồ sơ (để gửi đồng nghiệp xem trực tiếp)"
              >
                {copiedLeadLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span className="hidden xl:inline">{copiedLeadLink ? 'Đã chép link' : 'Chép link'}</span>
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
                onClick={requestClose}
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
              {CRM_STAGES.map((st, index) => {
                const isCurrent = currentStage === st.id;
                const isPassed = CRM_STAGES.findIndex((s) => s.id === currentStage) >= index;

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
                    title={st.id === '5. Đã đóng phí' && order.status !== 'paid' ? 'Tự chuyển khi ghi nhận thanh toán' : st.id}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isPassed ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <span className="truncate">{st.label}</span>
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Phải thu</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{formatVND(order.totalReceivable || order.amount)}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {PAYMENT_STATUS_LABEL[order.status] || order.status}
              </span>
            </div>

            {/* Metric 2: interest level and source, as recorded on the lead */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Mức quan tâm · Nguồn</span>
              <span className="font-bold text-slate-800">{order.interestLevel || '–'} · {order.source || '–'}</span>
            </div>

            {/* Metric 3: PIC selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Chuyên Viên PIC</span>
              <select
                value={order.assignedTo || ''}
                disabled={!canAssign}
                title={canAssign ? 'Phân công tư vấn viên' : 'Cần quyền phân công PIC'}
                onChange={(e) => {
                  const next = consultants.find((c) => c.id === e.target.value);
                  setOrder((prev) => ({ ...prev, assignedTo: next?.id || null, pic: next?.name || '' }));
                  setIsDirty(true);
                }}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="">Chưa phân công</option>
                {order.assignedTo && !consultants.some((c) => c.id === order.assignedTo) && (
                  <option value={order.assignedTo}>{order.pic || 'Nhân viên khác'}</option>
                )}
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Metric 4: Interest Level */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Độ Quan Tâm</span>
              <select
                value={order.interestLevel || ''}
                onChange={(e) => handleFieldChange('interestLevel', e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="">Chưa đánh giá</option>
                <option value="Rất cao">🔥 Rất cao (Sẵn sàng nộp)</option>
                <option value="Cao">⚡ Cao (Đang so sánh)</option>
                <option value="Trung bình">⏳ Trung bình (Cần hỏi gia đình)</option>
                <option value="Đang phân vân">🤔 Đang phân vân</option>
                <option value="Thấp">❄️ Thấp</option>
              </select>
            </div>

            {/* Metric 5: other leads / orders of the same person */}
            <div className="hidden lg:flex bg-slate-50 border border-slate-200 rounded-xl p-2.5 items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Hồ sơ khác</span>
                <span className="font-medium text-slate-700 text-xs">
                  {order.relatedOrders?.length ? `${order.relatedOrders.length} hồ sơ cùng SĐT/email/CCCD` : 'Không có'}
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
              <strong>Chế độ in hồ sơ:</strong> Xem trước hồ sơ đăng ký để in hoặc lưu PDF.
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
                { id: 'profile', label: 'Hồ sơ', icon: User, count: null },
                { id: 'contact', label: 'Liên hệ & lịch hẹn', icon: Phone, count: null },
                { id: 'timeline', label: 'Nhật ký', icon: FileText, count: order.timelineActivities?.length },
                { id: 'tasks', label: 'Việc cần làm', icon: CheckSquare, count: order.followupTasks?.filter(t => !t.isCompleted).length },
                { id: 'payment', label: 'Học phí & thanh toán', icon: CreditCard, count: null },
                { id: 'training', label: 'Học tập & việc làm', icon: GraduationCap, count: null }
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
            {/* TAB 1: THE REGISTRATION (course, class, fees, source) AND A SUMMARY OF THE LEARNER */}
            {/* ============================================================= */}
            {activeTab === 'profile' && (
              <div className="space-y-5 animate-fadeIn">
                {/* The person: details live on the learner's page and apply to every registration */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#0073C1]" />
                      <span>Học viên {order.learnerCode ? <span className="font-mono text-slate-400 text-xs">{order.learnerCode}</span> : null}</span>
                    </h3>
                    {order.learnerId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isDirty && !window.confirm('Hồ sơ đăng ký có thay đổi chưa lưu. Mở hồ sơ học viên và bỏ các thay đổi này?')) return;
                          onClose();
                          navigate(`/sales/learners?id=${encodeURIComponent(order.learnerId || '')}`);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        Mở hồ sơ học viên <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                    {[
                      ['Họ và tên', order.learnerProfile?.fullName || order.customerName],
                      ['Số điện thoại', order.customerPhone],
                      ['Email', order.customerEmail],
                      ['Ngày sinh', order.learnerProfile?.birthDate ? isoDate(order.learnerProfile.birthDate).split('-').reverse().join('/') : ''],
                      ['Giới tính', order.learnerProfile?.gender],
                      ['CCCD', order.learnerProfile?.citizenIdMasked],
                      ['Trường', order.learnerProfile?.university],
                      ['Ngành', order.learnerProfile?.major],
                      ['Nơi ở hiện tại', order.learnerProfile?.currentResidence || order.learnerProfile?.area],
                      ['Hồ sơ nhập học', order.learnerProfile ? (order.learnerProfile.dossierMissing.length ? `Thiếu ${order.learnerProfile.dossierMissing.length} mục` : 'Đủ') : ''],
                      ['CV', order.learnerProfile ? (order.learnerProfile.hasCv ? 'Đã có' : 'Chưa có') : '']
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span className="text-slate-400 block">{label}</span>
                        <span className="font-semibold text-slate-800">{value || '–'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Thông tin cá nhân, học vấn, người liên hệ và CV được sửa ở hồ sơ học viên và áp dụng cho mọi khóa người này đăng ký.
                  </p>
                </div>

                {/* 1.3 Khóa học & ưu đãi học phí */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#0073C1]" />
                      <span>Khóa học & học phí</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Khóa học / chương trình *</label>
                      <div className="space-y-1.5">
                        <select
                          value={itemValue(order)}
                          disabled={order.status !== 'pending' || (order.totalPaidAmount || 0) > 0}
                          onChange={(e) => {
                            const next = itemFields(e.target.value);
                            // The server reprices and picks the open intake of the new course on save.
                            setOrder((prev) => ({ ...prev, ...next, courseId: next.courseId || '', cohortId: null }));
                            setIsDirty(true);
                          }}
                          className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-semibold text-slate-900 text-xs disabled:opacity-70"
                        >
                          {!itemValue(order) && <option value="">Chưa chọn</option>}
                          <CatalogOptions items={catalogItems(courses, programs, 'sellable')} current={{ value: itemValue(saved), title: saved.courseTitle }} />
                        </select>
                        <p className="text-[11px] text-slate-500">
                          {order.status !== 'pending' || (order.totalPaidAmount || 0) > 0
                            ? 'Đã thu học phí: đổi khóa bằng một đăng ký mới (và hoàn tiền nếu cần).'
                            : itemValue(order) !== itemValue(saved)
                              ? 'Lưu để áp dụng: học phí và lớp được tính lại theo khóa mới.'
                              : 'Chỉ các khóa / chương trình đang mở bán.'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Lớp / Đợt khai giảng *</label>
                      <select
                        value={order.cohortId || ''}
                        onChange={(e) => {
                          const next = cohorts.find((c) => c.id === e.target.value);
                          setOrder((prev) => ({ ...prev, cohortId: next?.id || null, batchCohort: next?.name || '' }));
                          setIsDirty(true);
                        }}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1] font-semibold text-slate-900 text-xs"
                      >
                        <option value="">Chưa xếp lớp</option>
                        {order.cohortId && !cohorts.some((c) => c.id === order.cohortId) && (
                          <option value={order.cohortId}>{order.batchCohort || 'Lớp hiện tại'}</option>
                        )}
                        {cohorts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.startDate ? ` · khai giảng ${c.startDate.split('-').reverse().join('/')}` : ''}
                            {c.status !== 'opening' ? ' (không nhận đăng ký)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Học phí niêm yết</span>
                      <div className="p-2.5 border border-slate-100 rounded-xl bg-slate-50 font-mono font-bold text-slate-900">
                        {formatVND(order.tuitionFee || order.originalAmount || order.amount)}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Phải thu (sau ưu đãi)</span>
                      <div className="p-2.5 border border-slate-100 rounded-xl bg-slate-50 font-mono font-bold text-emerald-700">
                        {formatVND(order.totalReceivable || order.amount)}
                        {order.discountCode ? <span className="ml-1 text-[10px] font-sans text-slate-500">mã {order.discountCode}</span> : null}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="font-bold text-slate-700 block mb-1">Ghi chú tư vấn tuyển sinh</label>
                      <textarea
                        rows={2}
                        value={order.consultDetail || ''}
                        onChange={(e) => handleFieldChange('consultDetail', e.target.value)}
                        placeholder="Nhu cầu, mong muốn, vướng mắc của học viên…"
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
                      <span>Nguồn & người giới thiệu</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kênh tiếp cận *</label>
                      <select
                        value={order.source || ''}
                        onChange={(e) => handleFieldChange('source', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      >
                        <option value="">Chưa rõ</option>
                        {/* The stored source (e.g. "Website · Facebook" from the UTM link) stays selectable as is. */}
                        {order.source && !SOURCES.includes(order.source) && <option value={order.source}>{order.source}</option>}
                        {SOURCES.map((src) => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Mã chiến dịch</label>
                      <input
                        type="text"
                        value={order.campaignCode || ''}
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
                        placeholder="Họ tên người giới thiệu"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">SĐT Người giới thiệu</label>
                      <input
                        type="text"
                        value={order.referrerPhone || ''}
                        onChange={(e) => handleFieldChange('referrerPhone', e.target.value)}
                        placeholder="Số điện thoại"
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
                        { id: 'meeting', label: 'Gặp mặt', icon: Video },
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
                        'Cần hỗ trợ tài liệu học'
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
                          {filter === 'all' ? 'Tất cả' : filter === 'call' ? 'Cuộc gọi' : filter === 'zalo' ? 'Zalo' : filter === 'meeting' ? 'Hẹn gặp' : filter === 'note' ? 'Ghi chú' : 'Email & thanh toán'}
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
                              <span className="text-[11px] text-slate-400 font-mono">{when(act.timestamp)}</span>
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
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      title="Hạn chót"
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
                              Hạn chót: {task.dueDate ? isoDate(task.dueDate).split('-').reverse().join('/') : 'không đặt'} · Người phụ trách: {task.assignedTo || 'chưa giao'}
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
            {activeTab === 'contact' && (
              <LeadContactPanel
                orderId={order.id}
                name={order.customerName}
                phone={order.customerPhone}
                email={order.customerEmail}
                responseDueAt={order.responseDueAt}
                firstResponseAt={order.firstResponseAt}
                dossierSubmittedAt={order.dossierSubmittedAt}
                hasCv={Boolean(order.learnerProfile?.hasCv)}
              />
            )}

            {/* TAB 5: VIETQR BILLING & INVOICING */}
            {/* ============================================================= */}
            {activeTab === 'payment' && (
              <div className="space-y-4 animate-fadeIn">
                <LeadPaymentPanel key={`pay-${order.totalPaidAmount}`} orderId={order.id} onConfirmReceived={handleConfirmReceived} />
                <OrderBillingPanel key={`bill-${order.totalPaidAmount}`} orderId={order.id} />
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-4 animate-fadeIn">
              <LmsLearningPanel orderId={order.id} />
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0073C1]" />
                    <span>Đào Tạo & Giới Thiệu Việc Làm</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trạng thái đào tạo và các lần giới thiệu việc làm sang ngân hàng đối tác (phỏng vấn, nhận việc, thử việc).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trạng thái chương trình học</label>
                    <select
                      value={order.trainingStatus || ''}
                      onChange={(e) => handleFieldChange('trainingStatus', e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 font-semibold"
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Đang học">Đang học</option>
                      <option value="Chờ xét tốt nghiệp">Chờ xét tốt nghiệp</option>
                      <option value="Đã tốt nghiệp">Đã tốt nghiệp (Cấp chứng chỉ)</option>
                      <option value="Bảo lưu">Bảo lưu</option>
                      <option value="Thôi học">Thôi học</option>
                    </select>
                  </div>
                </div>
                <PlacementPanel orderId={order.id} name={order.customerName} />
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

            {/* Card 3: Financial & VietQR Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
                Tài Chính & Học Phí
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Phải thu:</span>
                  <span className="font-mono font-bold text-slate-900">{formatVND(order.totalReceivable || order.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Đã đóng:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatVND(order.totalPaidAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Trạng thái:</span>
                  <span className={`font-bold ${order.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {PAYMENT_STATUS_LABEL[order.status] || order.status}
                    {order.status === 'pending' && (order.totalPaidAmount || 0) > 0 ? ' (đã đóng một phần)' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Phương thức:</span>
                  <span className="text-slate-800 font-bold">{PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod || '–'}</span>
                </div>
              </div>

              {order.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('payment')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Hướng dẫn thanh toán & xác nhận thu</span>
                </button>
              )}
            </div>

            {/* Card 4: other leads / orders of the same person */}
            {(order.isDuplicate || (order.relatedOrders?.length ?? 0) > 0) && (
              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${order.isDuplicate ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`flex items-center gap-2 font-bold ${order.isDuplicate ? 'text-red-800' : 'text-blue-800'}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Hồ sơ khác cùng SĐT / email / CCCD{order.relatedOrders?.length ? ` (${order.relatedOrders.length})` : ''}</span>
                </div>
                {order.duplicateNote && <p className="text-red-700 text-[11px] leading-relaxed">{order.duplicateNote}</p>}
                <div className="space-y-1 text-[11px]">
                  {(order.relatedOrders || []).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (!onOpenOrder) return;
                        if (isDirty && !window.confirm('Hồ sơ có thay đổi chưa lưu. Mở hồ sơ khác và bỏ các thay đổi này?')) return;
                        onOpenOrder(r.id);
                      }}
                      className="w-full p-1.5 bg-white/80 rounded border border-slate-200 flex items-center justify-between gap-2 text-left hover:border-blue-400 cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-800 block truncate">{r.courseTitle || 'Chưa chọn khóa'}</span>
                        <span className="font-mono text-slate-500">{r.orderCode} · {new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                      </span>
                      <span className="shrink-0 text-slate-600">{r.status === 'paid' ? 'Đã đóng phí' : r.crmStatus}</span>
                    </button>
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
                value={order.consultDetail || ''}
                onChange={(e) => handleFieldChange('consultDetail', e.target.value)}
                placeholder="Lưu ý về lần đăng ký này…"
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
          onEmailSent={() => {
            // The server put the e-mail into the lead's history: reload it (nothing else is sent).
            commit((o) => o);
          }}
        />
      )}
    </div>
  );
};
