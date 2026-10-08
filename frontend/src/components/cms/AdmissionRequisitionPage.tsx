import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  Building2,
  Award,
  Send,
  Clock,
  Target,
  Layers,
  Plus,
  Trash2,
  Save,
  Eye,
  Flame,
  Globe,
  Tag,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, AdmissionCampaign, CampaignPositionTrack, Instructor } from '../../types';

interface AdmissionRequisitionPageProps {
  courses: Course[];
  initialTemplateCourseId?: string;
  onSaveCampaign: (campaign: AdmissionCampaign) => void;
  onCancel: () => void;
  existingCampaign?: AdmissionCampaign | null;
}

export const AdmissionRequisitionPage: React.FC<AdmissionRequisitionPageProps> = ({
  courses,
  initialTemplateCourseId,
  onSaveCampaign,
  onCancel,
  existingCampaign
}) => {
  // Step 1: Selected Course Template
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    if (existingCampaign?.courseId) return existingCampaign.courseId;
    if (initialTemplateCourseId && courses.some((c) => c.id === initialTemplateCourseId)) {
      return initialTemplateCourseId;
    }
    return courses[0]?.id || '';
  });

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  // Step 2: Requisition Form State
  const [code, setCode] = useState(() => {
    if (existingCampaign?.code) return existingCampaign.code;
    const year = new Date().getFullYear();
    const quarter = Math.floor(new Date().getMonth() / 3) + 1;
    return `CAMP-${year}-Q${quarter}-K${Math.floor(Math.random() * 90) + 10}`;
  });

  const [name, setName] = useState(() => {
    if (existingCampaign?.name) return existingCampaign.name;
    const courseTitle = selectedCourse ? selectedCourse.title : 'Fresher Banker';
    return `Chiến Dịch Tuyển Sinh & Khai Giảng - ${courseTitle}`;
  });

  const [intakeCohort, setIntakeCohort] = useState(() => {
    if (existingCampaign?.intakeCohort) return existingCampaign.intakeCohort;
    return `K${Math.floor(Math.random() * 15) + 1}-HN`;
  });

  const [location, setLocation] = useState(() => {
    if (existingCampaign?.location) return existingCampaign.location;
    return 'Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội';
  });

  const [format, setFormat] = useState<'offline' | 'hybrid' | 'online_external_lms'>(() => {
    if (existingCampaign?.format) return existingCampaign.format;
    return (selectedCourse?.deliveryFormat as any) || 'hybrid';
  });

  const [startDate, setStartDate] = useState(() => {
    if (existingCampaign?.startDate) return existingCampaign.startDate;
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const [deadline, setDeadline] = useState(() => {
    if (existingCampaign?.deadline) return existingCampaign.deadline;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const [openingDate, setOpeningDate] = useState(() => {
    if (existingCampaign?.openingDate) return existingCampaign.openingDate;
    const d = new Date();
    d.setDate(d.getDate() + 35);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const [targetHeadcount, setTargetHeadcount] = useState<number>(() => {
    return existingCampaign?.targetHeadcount || 25;
  });

  const [tuitionFee, setTuitionFee] = useState<number>(() => {
    if (existingCampaign?.tuitionFee) return existingCampaign.tuitionFee;
    return selectedCourse ? selectedCourse.price : 18500000;
  });

  const [earlyBirdFee, setEarlyBirdFee] = useState<number>(() => {
    if (existingCampaign?.earlyBirdFee) return existingCampaign.earlyBirdFee;
    const base = selectedCourse ? selectedCourse.price : 18500000;
    return Math.round(base * 0.85);
  });

  const [scholarshipBudget, setScholarshipBudget] = useState<number>(() => {
    return existingCampaign?.scholarshipBudget || 150000000;
  });

  const [leadRecruiter, setLeadRecruiter] = useState(() => {
    return existingCampaign?.leadRecruiter || 'ThS. Lê Hoàng Tùng & Ban Nhân sự MSB';
  });

  const [description, setDescription] = useState(() => {
    if (existingCampaign?.description) return existingCampaign.description;
    return selectedCourse
      ? `Đợt tuyển sinh và đào tạo thực chiến chuẩn chức danh, tiếp nhận trực tiếp vào các Chi nhánh ngân hàng MSB.`
      : '';
  });

  const [isHot, setIsHot] = useState<boolean>(() => {
    return existingCampaign?.isHot ?? true;
  });

  const [isPublished, setIsPublished] = useState<boolean>(() => {
    return existingCampaign?.isPublished ?? true;
  });

  const [status, setStatus] = useState<'active' | 'planning' | 'closed'>(() => {
    return existingCampaign?.status || 'active';
  });

  // Automatically update suggested info when changing course template
  const handleSelectTemplateCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    const crs = courses.find((c) => c.id === courseId);
    if (crs && !existingCampaign) {
      setName(`Chiến Dịch Tuyển Sinh & Khai Giảng - ${crs.title}`);
      setTuitionFee(crs.price);
      setEarlyBirdFee(Math.round(crs.price * 0.85));
      if (crs.deliveryFormat) setFormat(crs.deliveryFormat as any);
      setDescription(
        `Đợt tuyển sinh và đào tạo thực chiến khóa "${crs.title}", tiếp nhận trực tiếp học viên chất lượng cao vào các Chi nhánh MSB.`
      );
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const handleSubmit = (actionStatus: 'active' | 'planning') => {
    if (!name.trim()) {
      alert('Vui lòng nhập tên chiến dịch tuyển sinh');
      return;
    }

    // Build position tracks
    const courseTitle = selectedCourse ? selectedCourse.title : name;
    const positions: CampaignPositionTrack[] = existingCampaign?.positions?.length
      ? existingCampaign.positions
      : [
          {
            id: `pos-${Date.now()}-1`,
            courseId: selectedCourseId,
            positionTitle: `Chuyên viên Ngân Hàng - ${courseTitle}`,
            shortName: selectedCourse?.category || 'Chuyên viên Ngân hàng',
            department: 'Khối Kinh Doanh & Chi Nhánh MSB',
            targetQuota: targetHeadcount,
            enrolledCount: existingCampaign?.totalEnrolled || 0,
            leadInstructorName: selectedCourse?.instructor?.name || selectedCourse?.instructors?.[0]?.name || leadRecruiter,
            salaryRange: '14 - 26 Triệu / tháng',
            badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
          }
        ];

    const campaignToSave: AdmissionCampaign = {
      id: existingCampaign?.id || `camp-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      timeRange: `${startDate} - ${deadline}`,
      startDate,
      deadline,
      openingDate,
      status: actionStatus,
      targetHeadcount,
      totalEnrolled: existingCampaign?.totalEnrolled || 0,
      positions,
      leadRecruiter: leadRecruiter.trim(),
      scholarshipBudget,
      location: location.trim(),
      description: description.trim(),
      courseId: selectedCourseId,
      courseTitle: selectedCourse?.title || '',
      intakeCohort: intakeCohort.trim(),
      isHot,
      isPublished,
      tuitionFee,
      earlyBirdFee,
      format
    };

    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
    onSaveCampaign(campaignToSave);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions Bar (TalentFlow Requisition Page Header) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Quay lại danh sách đợt tuyển sinh"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0073C1] px-2.5 py-0.5 rounded-full border border-blue-200">
                TalentFlow Requisition Page
              </span>
              <span className="text-xs text-slate-400">&bull; Mở Đợt Khai Giảng Mới</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
              <span>{existingCampaign ? 'Chỉnh Sửa Đợt Tuyển Sinh' : 'Tạo Chiến Dịch Tuyển Sinh & Mở Khóa Học Mới'}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('planning')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Lưu Bản Nháp</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('active')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{existingCampaign ? 'Cập Nhật Chiến Dịch' : 'Xuất Bản & Mở Tuyển Sinh'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =============================================================== */}
        {/* LEFT COLUMN: MASTER COURSE TEMPLATE SELECTOR (TalentFlow Job Position) */}
        {/* =============================================================== */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0073C1] flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#0073C1]" />
                  <span>Chọn Khóa Học Mẫu (Master Template)</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Tương tự như chọn <code>Job Position</code> trong TalentFlow. Mọi giáo trình, học phí chuẩn và chuẩn đầu ra sẽ tự động được kế thừa.
              </p>
            </div>

            {/* Course Template Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Khóa học trong Master Catalog:</label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleSelectTemplateCourse(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1] cursor-pointer"
              >
                {courses.map((crs) => (
                  <option key={crs.id} value={crs.id}>
                    {crs.title} ({formatVND(crs.price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Visual Card Preview */}
            {selectedCourse && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border border-blue-200/80 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0073C1] px-2 py-0.5 rounded-md">
                    {selectedCourse.category || 'Khóa Chuyên Môn'}
                  </span>
                  <span className="font-bold font-mono text-[#0073C1]">
                    {formatVND(selectedCourse.price)}
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-sm leading-snug">
                  {selectedCourse.title}
                </div>

                <p className="text-slate-600 line-clamp-3 text-[11px] leading-relaxed">
                  {selectedCourse.description || 'Chương trình đào tạo thực chiến nghiệp vụ ngân hàng.'}
                </p>

                <div className="pt-2 border-t border-blue-200/60 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span><strong>{selectedCourse.chapters?.length || selectedCourse.syllabus?.length || 4}</strong> Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span><strong>{selectedCourse.duration || '60 giờ'}</strong> học</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{selectedCourse.level || 'Fresher'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{selectedCourse.instructor?.name || selectedCourse.instructors?.[0]?.name || 'GV MSB'}</span>
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-blue-200/60 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Lộ trình mẫu: </span>
                  {(selectedCourse.chapters || selectedCourse.syllabus || []).slice(0, 3).map((m: any) => m.title).join(' • ') || 'Thẩm định tín dụng • Bán hàng B2B • Pháp lý tài chính'}
                </div>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-amber-50/80 p-4 rounded-3xl border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Gợi ý vận hành tuyển sinh:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Mỗi đợt tuyển sinh nên gắn với một <strong>Chỉ tiêu sĩ số lớp (25-30 học viên)</strong>. Khi xuất bản, đợt tuyển sinh sẽ có riêng một bảng <strong>Pipeline Kanban</strong> để cán bộ tư vấn quản lý học viên nộp đơn và theo dõi nộp học phí VietQR.
            </p>
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT COLUMN: REQUISITION SETTINGS & SCHEDULE FORM */}
        {/* =============================================================== */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Thiết Lập Thông Số Đợt Tuyển Sinh &amp; Chỉ Tiêu (Requisition Fields)</span>
              </h3>
            </div>

            {/* Campaign Name & Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Tên Đợt Tuyển Sinh / Chiến Dịch:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Chiến Dịch Tuyển Sinh Fresher Banker Q4/2026 - Hà Nội"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mã Đợt (Requisition ID):</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                />
              </div>
            </div>

            {/* Cohort Code & Target Headcount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mã Khóa / Lớp Khai Giảng:</span>
                </label>
                <input
                  type="text"
                  value={intakeCohort}
                  onChange={(e) => setIntakeCohort(e.target.value)}
                  placeholder="VD: K10-HN hoặc Lớp 11-HCM"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chỉ Tiêu Sĩ Số (Học Viên):</span>
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={targetHeadcount}
                  onChange={(e) => setTargetHeadcount(Number(e.target.value) || 25)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Hình Thức Đào Tạo:</span>
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                >
                  <option value="hybrid">Kết Hợp (Trực tiếp + Online)</option>
                  <option value="offline">Trực Tiếp Tại Cơ Sở / Ngân Hàng</option>
                  <option value="online_external_lms">Trực Tuyến LMS Moodle</option>
                </select>
              </div>
            </div>

            {/* Location & PIC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cơ Sở / Địa Điểm Khai Giảng:</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="VD: Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cán Bộ Phụ Trách Tuyển Sinh (PIC):</span>
                </label>
                <input
                  type="text"
                  value={leadRecruiter}
                  onChange={(e) => setLeadRecruiter(e.target.value)}
                  placeholder="VD: ThS. Lê Hoàng Tùng & Ban Tuyển sinh"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
                />
              </div>
            </div>

            {/* Timeline: Start Date, Deadline, Opening Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ngày Bắt Đầu Nhận Đơn:</span>
                </label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hạn Chót Nộp Hồ Sơ:</span>
                </label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs font-mono font-bold text-rose-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ngày Khai Giảng Dự Kiến:</span>
                </label>
                <input
                  type="text"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-emerald-800"
                />
              </div>
            </div>

            {/* Pricing, Early Bird & Scholarship Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Học Phí Áp Dụng:</span>
                </label>
                <input
                  type="number"
                  step="500000"
                  value={tuitionFee}
                  onChange={(e) => setTuitionFee(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 block font-mono">
                  {formatVND(tuitionFee)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ưu Đãi Early Bird:</span>
                </label>
                <input
                  type="number"
                  step="500000"
                  value={earlyBirdFee}
                  onChange={(e) => setEarlyBirdFee(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-amber-900"
                />
                <span className="text-[10px] text-amber-600 block font-mono">
                  {formatVND(earlyBirdFee)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ngân Sách Học Bổng MSB:</span>
                </label>
                <input
                  type="number"
                  step="10000000"
                  value={scholarshipBudget}
                  onChange={(e) => setScholarshipBudget(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-purple-900"
                />
                <span className="text-[10px] text-purple-600 block font-mono">
                  {formatVND(scholarshipBudget)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Mô Tả &amp; Yêu Cầu Đầu Vào Đợt Tuyển Sinh:</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập thông tin tiêu chuẩn đầu vào, cam kết đầu ra tiếp nhận tại ngân hàng..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0073C1]"
              />
            </div>

            {/* Badges & Toggles (TalentFlow is_hot & is_published) */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isHot}
                    onChange={(e) => setIsHot(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span>Đánh dấu Chiến dịch Tuyển sinh Trọng điểm (Hot)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Đăng công khai trên Website &amp; Landing Page</span>
                  </span>
                </label>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tự động đồng bộ với Moodle LMS khi học viên nhập học</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
