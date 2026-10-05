import React, { useState } from 'react';
import { useServerCollection } from '../../lib/serverCollection';
import { INSTRUCTORS } from '../../lib/cmsCollections';
import {
  Users,
  Award,
  BookOpen,
  GraduationCap,
  Building2,
  Phone,
  Mail,
  Edit,
  Trash2,
  Plus,
  Star,
  CheckCircle2,
  Calendar,
  Search,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  X,
  Save,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Instructor, CourseCohort } from '../../types';
import { REAL_INSTRUCTORS } from '../../data/coursesData';
import { CRM_COURSE_CATEGORIES } from './CMSCRMOrdersTab';

export const INITIAL_EXTENDED_INSTRUCTORS: Instructor[] = [
  ...REAL_INSTRUCTORS.map((inst, index) => ({
    ...inst,
    email: index === 0 ? 'phuong.vt@msb.com.vn' : index === 1 ? 'thanh.dv@msb.com.vn' : 'chi.nk@msb.com.vn',
    phone: index === 0 ? '0912 345 678' : index === 1 ? '0904 888 999' : '0988 777 666',
    yearsOfExperience: index === 0 ? 25 : index === 1 ? 20 : 20,
    status: 'active' as const,
    bankPosition: inst.title,
    expertiseCourses: index === 0 
      ? ['twings-qhkh-doanh-nghiep', 'twings-qhkh-ca-nhan'] 
      : index === 1 
      ? ['twings-qhkh-doanh-nghiep'] 
      : ['twings-qhkh-ca-nhan', 'deeplearning-ai-agents'],
    assignedCohorts: index === 0 ? ['Khóa học 8 - Hà Nội', 'Khóa học 9 - Hà Nội'] : ['Khóa học 8 - HCM', 'Khóa học 9 - TP.HCM'],
    linkedinUrl: 'https://linkedin.com/in/banker-msb-twings'
  })),
  {
    id: 'inst-le-hoang-tung',
    name: 'ThS. Lê Hoàng Tùng',
    title: 'Phó Tổng Giám Đốc Đào Tạo TWings · Nguyên Giám Đốc Chi Nhánh MSB',
    organization: 'Ngân hàng TMCP Hàng Hải Việt Nam (MSB) & TWings Academy',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    credential: 'Thạc sĩ Tài chính Ngân hàng · Giảng viên Cao cấp Học viện Ngân hàng',
    bio: 'Hơn 18 năm giữ các cương vị điều hành cấp cao trong hệ thống ngân hàng thương mại, trực tiếp tuyển dụng và đào tạo hơn 5.000 cán bộ tín dụng, giao dịch viên trên toàn quốc.',
    rating: 5.0,
    studentsCount: 5200,
    email: 'tung.lh@twings.edu.vn',
    phone: '0983 123 456',
    yearsOfExperience: 18,
    status: 'active',
    bankPosition: 'Chuyên gia Cố vấn Chiến lược Đào tạo',
    expertiseCourses: ['twings-qhkh-doanh-nghiep', 'twings-qhkh-ca-nhan', 'gdv-ngan-hang'],
    assignedCohorts: ['Khóa học 9 - Hà Nội', 'Khóa học 10 (Tháng 11/2026)'],
    linkedinUrl: 'https://linkedin.com/in/hoangtung-twings'
  }
];

export const CMSInstructorsTab: React.FC = () => {
  // Saved through /staff/instructors/ in live mode (demo: local sample data).
  const { items: instructors, update: setInstructors } = useServerCollection<Instructor>(
    INSTRUCTORS,
    INITIAL_EXTENDED_INSTRUCTORS
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Edit Modal
  const handleOpenEdit = (inst: Instructor) => {
    setEditingInstructor({ ...inst });
    setIsModalOpen(true);
  };

  // Open New Modal
  const handleOpenNew = () => {
    const newInst: Instructor = {
      id: `inst-${Date.now()}`,
      name: '',
      title: 'Giám đốc Khối / Chuyên gia Ngân hàng MSB',
      organization: 'Ngân hàng TMCP Hàng Hải Việt Nam (MSB)',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      credential: '15+ năm KN Quản trị Tài chính & Tín dụng',
      bio: '',
      rating: 5.0,
      studentsCount: 1200,
      email: '',
      phone: '',
      yearsOfExperience: 15,
      status: 'active',
      bankPosition: 'Giảng viên Chuyên gia',
      expertiseCourses: ['twings-qhkh-doanh-nghiep'],
      assignedCohorts: ['Khóa học 9 - Hà Nội']
    };
    setEditingInstructor(newInst);
    setIsModalOpen(true);
  };

  // Save Instructor Profile
  const handleSaveInstructor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstructor) return;
    if (!editingInstructor.name.trim()) {
      alert('Vui lòng nhập họ và tên giảng viên.');
      return;
    }

    const exists = instructors.some((i) => i.id === editingInstructor.id);
    if (exists) {
      setInstructors(instructors.map((i) => (i.id === editingInstructor.id ? editingInstructor : i)));
      showToast(`Đã cập nhật profile giảng viên "${editingInstructor.name}" thành công!`);
    } else {
      setInstructors([editingInstructor, ...instructors]);
      showToast(`Đã thêm mới giảng viên "${editingInstructor.name}" vào danh sách!`);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
    }

    setIsModalOpen(false);
  };

  // Delete Instructor
  const handleDelete = (instId: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn gỡ bỏ giảng viên "${name}" khỏi hệ thống?`)) {
      setInstructors(instructors.filter((i) => i.id !== instId));
      showToast(`Đã gỡ bỏ profile giảng viên "${name}".`);
    }
  };

  const filteredInstructors = instructors.filter((inst) => {
    const matchSearch =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.bio.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCourse =
      selectedCourseFilter === 'all' ||
      (inst.expertiseCourses && inst.expertiseCourses.includes(selectedCourseFilter));

    return matchSearch && matchCourse;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                Quản Lý Profile Giảng Viên & Chuyên Gia Ngân Hàng Thực Chiến
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Đội ngũ Giám đốc Khối, Trưởng phòng nghiệp vụ ngân hàng MSB trực tiếp dẫn dắt các lớp học Coursera & Bank Tour.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-[#0073C1] hover:bg-[#005fa3] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Profile Giảng Viên</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between animate-fadeIn shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Key Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">Tổng Giảng Viên & Cố Vấn</span>
          <div className="text-2xl font-black text-slate-900 font-mono">{instructors.length} chuyên gia</div>
          <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Cán bộ Lãnh đạo MSB
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">Kinh Nghiệm Ngân Hàng</span>
          <div className="text-2xl font-black text-blue-600 font-mono">20+ Năm</div>
          <span className="text-slate-500 text-[11px]">Thực chiến điều hành chi nhánh & khối</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">Đánh Giá Học Viên</span>
          <div className="text-2xl font-black text-amber-500 font-mono flex items-center gap-1.5">
            <span>5.0 / 5.0</span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <span className="text-slate-500 text-[11px]">Dựa trên 1,420+ lượt review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">Học Viên Đã Đào Tạo</span>
          <div className="text-2xl font-black text-purple-700 font-mono">16,700+</div>
          <span className="text-purple-700 font-semibold text-[11px]">LMS Coursera & Offline MSB</span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, chức vụ, kinh nghiệm..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0073C1]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
          >
            <option value="all">Tất cả chuyên môn</option>
            {CRM_COURSE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
              <option key={c.id} value={c.id}>{c.shortName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Instructor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredInstructors.map((inst) => (
          <div
            key={inst.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              {/* Profile Top Row */}
              <div className="flex items-start gap-4">
                <img
                  src={inst.avatar}
                  alt={inst.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-xs shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                      {inst.name}
                    </h3>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      Đang giảng dạy
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#0073C1] mt-0.5 line-clamp-1">
                    {inst.title}
                  </p>

                  <div className="flex items-center gap-3 text-slate-400 text-xs mt-1.5 font-mono">
                    <span className="flex items-center gap-1 text-slate-700 font-bold">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>{inst.yearsOfExperience || 20} năm KN</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{inst.rating || 5.0}</span>
                    </span>
                    <span>·</span>
                    <span>{inst.studentsCount?.toLocaleString('vi-VN')} HV</span>
                  </div>
                </div>
              </div>

              {/* Bio snippet */}
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                "{inst.bio}"
              </p>

              {/* Assigned Cohorts & Courses */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 text-[11px] font-bold">Lớp phụ trách:</span>
                  {inst.assignedCohorts?.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-[#0073C1] rounded-md text-[11px] font-bold border border-blue-100 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{c}</span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Email: <strong className="text-slate-700">{inst.email || 'contact@msb.com.vn'}</strong></span>
                  <span>·</span>
                  <span>SĐT: <strong className="text-slate-700">{inst.phone || '0904 888 999'}</strong></span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                {inst.organization || 'Hội sở Ngân hàng MSB'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(inst)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(inst.id, inst.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Gỡ bỏ giảng viên"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =============================================================== */}
      {/* 5. MODAL: CREATE / EDIT INSTRUCTOR PROFILE */}
      {/* =============================================================== */}
      {isModalOpen && editingInstructor && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl w-full max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{editingInstructor.name ? `Sửa Profile: ${editingInstructor.name}` : 'Thêm Giảng Viên / Chuyên Gia Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstructor} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Họ và tên giảng viên *</label>
                  <input
                    type="text"
                    value={editingInstructor.name}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, name: e.target.value })}
                    placeholder="Ví dụ: ThS. Vũ Thu Phương"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chức danh / Vị trí hiện tại tại MSB *</label>
                  <input
                    type="text"
                    value={editingInstructor.title}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, title: e.target.value })}
                    placeholder="Giám đốc Phân khúc KH Doanh nghiệp MSB"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số năm kinh nghiệm ngân hàng</label>
                  <input
                    type="number"
                    value={editingInstructor.yearsOfExperience || 20}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, yearsOfExperience: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trạng thái công tác</label>
                  <select
                    value={editingInstructor.status || 'active'}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, status: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
                  >
                    <option value="active">Đang giảng dạy (Active)</option>
                    <option value="on_leave">Nghỉ phép (On Leave)</option>
                    <option value="adjunct">Thỉnh giảng đặc biệt</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    value={editingInstructor.email || ''}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, email: e.target.value })}
                    placeholder="email@msb.com.vn"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editingInstructor.phone || ''}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">URL Ảnh đại diện (Avatar):</label>
                  <input
                    type="text"
                    value={editingInstructor.avatar}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, avatar: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Tiểu sử & Kinh nghiệm chuyên môn (Bio):</label>
                  <textarea
                    rows={4}
                    value={editingInstructor.bio}
                    onChange={(e) => setEditingInstructor({ ...editingInstructor, bio: e.target.value })}
                    placeholder="Tóm tắt thành tích, quá trình công tác tại Techcombank, VPBank, MSB..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0073C1] hover:bg-[#005fa3] text-white rounded-xl font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Profile Giảng Viên</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
