import React, { useState } from 'react';
import {
  X,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Building2,
  BookOpen,
  MapPin,
  Settings,
  Sparkles,
  Layers,
  Check,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CourseCohort, CohortStatus, Order } from '../../types';
import { COHORT_STATUS_CONFIG, rolloverLeadsToNextCohort } from '../../utils/cohortRouting';
import { CRM_COURSE_CATEGORIES } from './CMSCRMOrdersTab';

interface CMSCohortLifecycleModalProps {
  cohorts: CourseCohort[];
  orders: Order[];
  onClose: () => void;
  onUpdateCohorts: (updatedCohorts: CourseCohort[]) => void;
  onUpdateOrders: (updatedOrders: Order[]) => void;
}

export const CMSCohortLifecycleModal: React.FC<CMSCohortLifecycleModalProps> = ({
  cohorts,
  orders,
  onClose,
  onUpdateCohorts,
  onUpdateOrders,
}) => {
  const [cohortList, setCohortList] = useState<CourseCohort[]>(cohorts);
  const [selectedCohort, setSelectedCohort] = useState<CourseCohort | null>(cohorts[0] || null);
  const [showNewCohortForm, setShowNewCohortForm] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Cohort Form State
  const [newCourseId, setNewCourseId] = useState('twings-qhkh-doanh-nghiep');
  const [newCohortName, setNewCohortName] = useState('');
  const [newStartDate, setNewStartDate] = useState('15/11/2026');
  const [newDeadline, setNewDeadline] = useState('10/11/2026');
  const [newCapacity, setNewCapacity] = useState(25);
  const [newTrainer, setNewTrainer] = useState('Giảng viên Cao cấp MSB');
  const [newLocation, setNewLocation] = useState('Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội');

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Toggle Cohort Status (e.g. from opening -> full, or full -> in_progress)
  const handleStatusChange = (cohortId: string, nextStatus: CohortStatus) => {
    const updated = cohortList.map((c) => {
      if (c.id === cohortId) {
        return { ...c, status: nextStatus };
      }
      return c;
    });

    setCohortList(updated);
    onUpdateCohorts(updated);
    if (selectedCohort && selectedCohort.id === cohortId) {
      setSelectedCohort({ ...selectedCohort, status: nextStatus });
    }

    const cohortObj = cohortList.find((c) => c.id === cohortId);
    triggerToast(
      `Đã cập nhật trạng thái lớp "${cohortObj?.name}" thành "${COHORT_STATUS_CONFIG[nextStatus].label}".`
    );

    if (nextStatus === 'full' || nextStatus === 'in_progress') {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    }
  };

  // Set Next Cohort ID for auto-routing
  const handleNextCohortChange = (cohortId: string, nextCohortId: string) => {
    const targetCohort = cohortList.find((c) => c.id === nextCohortId);
    const updated = cohortList.map((c) => {
      if (c.id === cohortId) {
        return {
          ...c,
          nextCohortId,
          nextCohortName: targetCohort?.name || ''
        };
      }
      return c;
    });

    setCohortList(updated);
    onUpdateCohorts(updated);
    if (selectedCohort && selectedCohort.id === cohortId) {
      setSelectedCohort({
        ...selectedCohort,
        nextCohortId,
        nextCohortName: targetCohort?.name || ''
      });
    }

    triggerToast(`Đã thiết lập lớp kế nhiệm nhận chuyển tiếp: "${targetCohort?.name}".`);
  };

  // 1-Click Rollover Pending Leads to Next Cohort
  const handleExecuteRollover = (sourceCohort: CourseCohort) => {
    if (!sourceCohort.nextCohortId) {
      alert('Vui lòng chọn Lớp Kế Nhiệm trước khi thực hiện chuyển tiếp học viên.');
      return;
    }

    const targetCohort = cohortList.find((c) => c.id === sourceCohort.nextCohortId);
    if (!targetCohort) {
      alert('Không tìm thấy thông tin Lớp Kế Nhiệm.');
      return;
    }

    const { updatedOrders, migratedCount } = rolloverLeadsToNextCohort(
      orders,
      sourceCohort.name,
      targetCohort
    );

    if (migratedCount === 0) {
      triggerToast(`Không có học viên chưa đóng phí nào cần chuyển từ ${sourceCohort.name}.`);
      return;
    }

    onUpdateOrders(updatedOrders);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    triggerToast(
      `Thành công! Đã tự động chuyển ${migratedCount} hồ sơ từ "${sourceCohort.name}" sang "${targetCohort.name}".`
    );
  };

  // Create New Cohort
  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) {
      alert('Vui lòng nhập tên Lớp / Đợt khai giảng.');
      return;
    }

    const matchedCourse = CRM_COURSE_CATEGORIES.find((c) => c.id === newCourseId);

    const newId = `cohort-${Date.now()}`;
    const newObj: CourseCohort = {
      id: newId,
      courseId: newCourseId,
      courseTitle: matchedCourse?.title || 'Khóa Quan hệ Khách hàng doanh nghiệp',
      name: newCohortName.trim(),
      startDate: newStartDate,
      registrationDeadline: newDeadline,
      capacity: newCapacity,
      status: 'opening',
      autoRolloverWaitlist: true,
      trainerName: newTrainer,
      location: newLocation,
      notes: 'Lớp mới được tạo từ Hệ thống Quản trị Vòng đời Đào tạo.'
    };

    const updated = [newObj, ...cohortList];
    setCohortList(updated);
    onUpdateCohorts(updated);
    setSelectedCohort(newObj);
    setShowNewCohortForm(false);
    setNewCohortName('');
    triggerToast(`Đã mở thành công Lớp mới: "${newObj.name}". Sẵn sàng tiếp nhận đăng ký.`);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-w-5xl w-full max-h-[94vh]">
        {/* Header Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-[#0073C1] text-white flex items-center justify-center font-bold shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Quản Lý Vòng Đời Lớp Học & Cơ Chế Đóng / Mở Lớp</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0073C1] text-[11px] font-bold border border-blue-200">
                  Auto-Routing Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động chuyển tiếp đăng ký mới sang lớp kế nhiệm khi lớp hiện tại đã đủ sĩ số hoặc đóng tuyển sinh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewCohortForm(!showNewCohortForm)}
              className="px-3.5 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mở Lớp / Đợt Mới</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Success Notification */}
        {successToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 animate-fadeIn shrink-0 shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Form: Mở Lớp / Đợt Tuyển Sinh Mới (Toggleable) */}
        {showNewCohortForm && (
          <form onSubmit={handleCreateCohort} className="bg-slate-50 p-5 border-b border-slate-200 space-y-3 animate-fadeIn shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Thiết lập mở Lớp / Đợt Khai Giảng Mới:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowNewCohortForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Khóa học áp dụng *</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  {CRM_COURSE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Lớp / Đợt khai giảng *</label>
                <input
                  type="text"
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="Ví dụ: Khóa học 10 - Hà Nội"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ngày khai giảng dự kiến</label>
                <input
                  type="text"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  placeholder="15/11/2026"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hạn chót tuyển sinh</label>
                <input
                  type="text"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  placeholder="10/11/2026"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chỉ tiêu sĩ số (Học viên)</label>
                <input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Địa điểm đào tạo</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Khai Mở Lớp Ngay</span>
              </button>
            </div>
          </form>
        )}

        {/* Content Body: 2 Columns (List of Cohorts & Selected Cohort Management) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 bg-slate-50/50">
          {/* Left Column: All Cohorts List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <span className="font-bold text-xs text-slate-500 uppercase tracking-wider block">
              Danh sách các Lớp / Đợt Khai Giảng ({cohortList.length})
            </span>

            <div className="space-y-2.5">
              {cohortList.map((cohort) => {
                const isSelected = selectedCohort?.id === cohort.id;
                const statusConfig = COHORT_STATUS_CONFIG[cohort.status];
                const enrolledInCohort = orders.filter((o) => (o.batchCohort || '').toLowerCase().includes(cohort.name.toLowerCase())).length;
                const paidInCohort = orders.filter((o) => (o.batchCohort || '').toLowerCase().includes(cohort.name.toLowerCase()) && o.status === 'paid').length;

                return (
                  <div
                    key={cohort.id}
                    onClick={() => setSelectedCohort(cohort)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-white border-[#0073C1] ring-2 ring-[#0073C1]/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
                          <span>{cohort.name}</span>
                        </h4>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                          {cohort.courseTitle}
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badgeBg}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                      <span>Sĩ số: <strong className="text-slate-800">{enrolledInCohort}</strong> / {cohort.capacity}</span>
                      <span className="text-emerald-700 font-semibold">{paidInCohort} đã đóng phí</span>
                    </div>

                    {/* Assigned Lead Instructor */}
                    {(cohort.leadInstructorName || cohort.trainerName) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {cohort.instructorAvatar ? (
                          <img src={cohort.instructorAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate font-semibold">{cohort.leadInstructorName || cohort.trainerName}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Cohort Detail & Routing Configuration (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCohort ? (
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5 animate-fadeIn">
                {/* Cohort Header */}
                <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{selectedCohort.name}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${COHORT_STATUS_CONFIG[selectedCohort.status].badgeBg}`}>
                        {COHORT_STATUS_CONFIG[selectedCohort.status].label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedCohort.courseTitle}</p>
                  </div>
                </div>

                {/* Status Switcher Toolbar */}
                <div className="space-y-2">
                  <label className="font-bold text-xs text-slate-800 block">
                    1. Trạng Thái Vòng Đời Lớp (Đóng / Mở Lớp Tuyển Sinh):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {(['opening', 'full', 'in_progress', 'completed', 'upcoming'] as CohortStatus[]).map((st) => {
                      const cfg = COHORT_STATUS_CONFIG[st];
                      const isCurrent = selectedCohort.status === st;

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(selectedCohort.id, st)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold flex flex-col items-center justify-center gap-1 ${
                            isCurrent
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                          <span className="text-[11px]">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    {COHORT_STATUS_CONFIG[selectedCohort.status].description}
                  </p>
                </div>

                {/* Auto-Routing / Next Cohort Target */}
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Zap className="w-4 h-4 text-[#0073C1]" />
                    <span>2. Cơ Chế Định Tuyến Đăng Ký Mới (Auto-Routing Destination)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Khi lớp <strong>"{selectedCohort.name}"</strong> chuyển sang trạng thái <strong>Đã Đủ Sĩ Số / Đóng Tuyển Sinh</strong> hoặc <strong>Đang Đào Tạo</strong>, mọi ứng viên mới đăng ký khóa này sẽ được hệ thống tự động gán vào:
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Lớp Kế Nhiệm Tiếp Nhận:</label>
                    <select
                      value={selectedCohort.nextCohortId || ''}
                      onChange={(e) => handleNextCohortChange(selectedCohort.id, e.target.value)}
                      className="w-full p-2.5 border border-blue-200 rounded-xl bg-white font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0073C1]"
                    >
                      <option value="">-- Chọn Lớp Kế Nhiệm --</option>
                      {cohortList
                        .filter((c) => c.id !== selectedCohort.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({COHORT_STATUS_CONFIG[c.status].label} - Khai giảng: {c.startDate})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 1-Click Rollover Button */}
                  <div className="pt-2 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-600">
                      Chuyển các đơn chờ đóng phí sang lớp mới:
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecuteRollover(selectedCohort)}
                      className="px-3.5 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Chuyển Học Viên Chờ Sang Đợt Mới</span>
                    </button>
                  </div>
                </div>

                {/* Class Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Lịch khai giảng:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedCohort.startDate}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Hạn chót tuyển sinh:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedCohort.registrationDeadline}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    {selectedCohort.instructorAvatar ? (
                      <img src={selectedCohort.instructorAvatar} alt="" className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        GV
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-400 text-[11px] block">Giảng viên phụ trách:</span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {selectedCohort.leadInstructorName || selectedCohort.trainerName || 'MSB Director'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Địa điểm học:</span>
                    <span className="text-slate-800">{selectedCohort.location || 'Hội sở MSB'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs italic bg-white rounded-3xl border border-slate-200">
                Chọn một lớp bên danh sách để thiết lập cơ chế đóng mở và chuyển tiếp học viên.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
