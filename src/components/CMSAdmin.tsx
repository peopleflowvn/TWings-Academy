import React, { useState } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Check, 
  ChevronRight, 
  Copy, 
  DollarSign, 
  Edit, 
  GraduationCap, 
  Layers, 
  Plus, 
  QrCode, 
  Search, 
  ShieldCheck, 
  Trash2, 
  Users, 
  X,
  FileCode2,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import { 
  Course, 
  Order, 
  StudentEnrollment, 
  Coupon, 
  CourseCategory, 
  CourseLevel,
  CMSSectionsConfig,
  Instructor
} from '../types';
import { DJANGO_MODELS_CODE, DJANGO_VIEWS_CODE, NEXTJS_APP_ROUTER_CODE } from '../data/djangoCodeReference';

interface CMSAdminProps {
  courses: Course[];
  orders: Order[];
  students: StudentEnrollment[];
  coupons: Coupon[];
  cmsSections: CMSSectionsConfig;
  onUpdateCMSSections: (newConfig: CMSSectionsConfig) => void;
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onAddCoupon: (coupon: Coupon) => void;
  onBackToStore: () => void;
}

export const CMSAdmin: React.FC<CMSAdminProps> = ({
  courses,
  orders,
  students,
  coupons,
  cmsSections,
  onUpdateCMSSections,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onUpdateOrderStatus,
  onAddCoupon,
  onBackToStore,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'courses' | 'orders' | 'students' | 'coupons' | 'architecture'>('sections');
  
  // Section CMS State (local editable copy)
  const [sectionsConfig, setSectionsConfig] = useState<CMSSectionsConfig>(cmsSections);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Filter orders
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [searchOrderQuery, setSearchOrderQuery] = useState('');

  // Course modal state
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCategory, setNewCategory] = useState<CourseCategory>('Ngân Hàng & Tín Dụng');
  const [newLevel, setNewLevel] = useState<CourseLevel>('Chuyên viên Mới (Fresher)');
  const [newPrice, setNewPrice] = useState(6600000);
  const [newOriginalPrice, setNewOriginalPrice] = useState(8500000);
  const [newDuration, setNewDuration] = useState('36 giờ học thực chiến');
  const [newBadgeType, setNewBadgeType] = useState<Course['badgeType']>('bestseller');

  // Coupon modal state
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(20);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // Code Tab state
  const [codeTab, setCodeTab] = useState<'models' | 'views' | 'nextjs'>('models');
  const [copiedCode, setCopiedCode] = useState(false);

  // Save CMS Sections Handler
  const handleSaveSections = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCMSSections(sectionsConfig);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const course: Course = {
      id: `course-${Date.now()}`,
      slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: newTitle,
      subtitle: newSubtitle || 'Khóa học đào tạo thực chiến tại Twings Academy.',
      category: newCategory,
      level: newLevel,
      price: Number(newPrice),
      originalPrice: Number(newOriginalPrice),
      rating: 5.0,
      reviewsCount: 1,
      studentsCount: 0,
      duration: newDuration,
      lessonsCount: 20,
      badgeType: newBadgeType,
      thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
      instructor: cmsSections.instructors.items[0],
      highlights: ['Giáo trình chuyển giao từ MSB & ngân hàng lớn', 'Thực hành thẩm định thực tế'],
      objectives: ['Nâng cao toàn diện nghiệp vụ ngân hàng'],
      chapters: [
        {
          id: `chap-${Date.now()}`,
          title: 'Chương 1: Tổng Quan Nghiệp Vụ Cốt Lõi',
          order: 1,
          lessons: [
            {
              id: `les-${Date.now()}`,
              title: 'Bài 1.1: Bài Giảng Khởi Động',
              duration: '20 phút',
              type: 'video',
              isFreePreview: true,
              videoTranscript: 'Chào mừng bạn đến với khóa học tại Twings Academy.'
            }
          ]
        }
      ]
    };

    onAddCourse(course);
    setIsAddCourseModalOpen(false);
    setNewTitle('');
    setNewSubtitle('');
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const coupon: Coupon = {
      code: newCouponCode.trim().toUpperCase(),
      discountPercent: Number(newCouponDiscount),
      description: newCouponDesc || `Ưu đãi ${newCouponDiscount}%`,
      validUntil: '2026-12-31',
      usageCount: 0,
      maxUsage: 200,
      isActive: true,
    };
    onAddCoupon(coupon);
    setIsAddCouponModalOpen(false);
    setNewCouponCode('');
  };

  const totalRevenue = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = orderFilter === 'all' || o.status === orderFilter;
    const matchSearch =
      o.orderCode.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
      o.courseTitle.toLowerCase().includes(searchOrderQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* CMS Top Header */}
      <header className="bg-[#0050D8] text-white border-b border-blue-600 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF5722] text-white font-black flex items-center justify-center text-sm shadow-xs">
            T
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>TWINGS ACADEMY · QUẢN TRỊ CMS & BACKEND</span>
              <span className="text-[10px] font-mono bg-blue-900 text-amber-300 px-2 py-0.5 rounded border border-blue-400">
                Django 5.x + Next.js
              </span>
            </div>
            <div className="text-[11px] text-blue-200">
              Quản lý toàn bộ Section trang chủ, bán khóa học & thanh toán VietQR
            </div>
          </div>
        </div>

        <button
          onClick={onBackToStore}
          className="px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span>Xem Trang Chủ Web</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#0050D8]" />
        </button>
      </header>

      {/* Main CMS Container */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {[
            { id: 'sections', label: 'Quản Lý Section Trang Chủ (CMS)', icon: <Sliders className="w-4 h-4 text-amber-600" /> },
            { id: 'overview', label: 'Tổng Quan Doanh Thu', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'courses', label: `Khóa Học Nghiệp Vụ (${courses.length})`, icon: <BookOpen className="w-4 h-4" /> },
            { id: 'orders', label: `Đơn Hàng VietQR (${orders.length})`, icon: <DollarSign className="w-4 h-4" /> },
            { id: 'students', label: `Học Viên (${students.length})`, icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'coupons', label: `Mã Giảm Giá (${coupons.length})`, icon: <Sparkles className="w-4 h-4" /> },
            { id: 'architecture', label: 'Kiến Trúc Django + Next.js', icon: <FileCode2 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0050D8] text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB: SECTION CMS MANAGER (User's primary requirement!) */}
        {activeTab === 'sections' && (
          <form onSubmit={handleSaveSections} className="space-y-6">
            {/* Top Bar with Save Button */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0050D8] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  Quản Trị Các Section Trang Chủ (Front-end Content CMS)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tùy chỉnh tiêu đề, bật/tắt (Enable/Disable), nội dung và hình ảnh của từng section trên trang chủ Twings Academy.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã cập nhật lên trang chủ!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Lưu Thay Đổi Section
                </button>
              </div>
            </div>

            {/* Section 1: Hero Banner Config */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">1</span>
                  <h4 className="text-sm font-bold text-slate-900">Hero Section (Banner Chính & Form Đăng Ký)</h4>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.hero.enabled}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        hero: { ...sectionsConfig.hero, enabled: e.target.checked }
                      })
                    }
                    className="rounded text-[#0050D8]"
                  />
                  <span>Hiển thị section này</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tiêu đề khẩu hiệu chính</label>
                  <input
                    type="text"
                    value={sectionsConfig.hero.title}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        hero: { ...sectionsConfig.hero, title: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tiêu đề Form Đăng Ký</label>
                  <input
                    type="text"
                    value={sectionsConfig.hero.formTitle}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        hero: { ...sectionsConfig.hero, formTitle: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Intro "Nâng Tầm Năng Lực" Config */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">2</span>
                  <h4 className="text-sm font-bold text-slate-900">Section Giới Thiệu (Nâng Tầm Năng Lực & 4 Danh Mục)</h4>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.intro.enabled}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        intro: { ...sectionsConfig.intro, enabled: e.target.checked }
                      })
                    }
                    className="rounded text-[#0050D8]"
                  />
                  <span>Hiển thị section này</span>
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tiêu đề lớn màu cam</label>
                  <input
                    type="text"
                    value={sectionsConfig.intro.headline}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        intro: { ...sectionsConfig.intro, headline: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Đoạn mô tả ngắn</label>
                  <textarea
                    rows={2}
                    value={sectionsConfig.intro.description}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        intro: { ...sectionsConfig.intro, description: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Section 3, 4, 5, 6: Four Alternating Course Collections */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">3</span>
                  <h4 className="text-sm font-bold text-slate-900">4 Khối Khóa Học Nổi Bật (Màu Cam & Xanh Đan Xen)</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Quản lý tiêu đề và hiển thị của 4 khối khóa học: Bán Chạy, Đề Xuất, Mới Ra Mắt, Hữu Ích Nhất.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Block 1 */}
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#FF5722]">Khối 1 (Màu Cam)</span>
                    <input
                      type="checkbox"
                      checked={sectionsConfig.bestsellers.enabled}
                      onChange={(e) =>
                        setSectionsConfig({
                          ...sectionsConfig,
                          bestsellers: { ...sectionsConfig.bestsellers, enabled: e.target.checked }
                        })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={sectionsConfig.bestsellers.title}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        bestsellers: { ...sectionsConfig.bestsellers, title: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded bg-white font-bold"
                  />
                </div>

                {/* Block 2 */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#0050D8]">Khối 2 (Màu Xanh)</span>
                    <input
                      type="checkbox"
                      checked={sectionsConfig.recommended.enabled}
                      onChange={(e) =>
                        setSectionsConfig({
                          ...sectionsConfig,
                          recommended: { ...sectionsConfig.recommended, enabled: e.target.checked }
                        })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={sectionsConfig.recommended.title}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        recommended: { ...sectionsConfig.recommended, title: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded bg-white font-bold"
                  />
                </div>

                {/* Block 3 */}
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#FF5722]">Khối 3 (Màu Cam)</span>
                    <input
                      type="checkbox"
                      checked={sectionsConfig.newReleases.enabled}
                      onChange={(e) =>
                        setSectionsConfig({
                          ...sectionsConfig,
                          newReleases: { ...sectionsConfig.newReleases, enabled: e.target.checked }
                        })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={sectionsConfig.newReleases.title}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        newReleases: { ...sectionsConfig.newReleases, title: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded bg-white font-bold"
                  />
                </div>

                {/* Block 4 */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#0050D8]">Khối 4 (Màu Xanh)</span>
                    <input
                      type="checkbox"
                      checked={sectionsConfig.mostUseful.enabled}
                      onChange={(e) =>
                        setSectionsConfig({
                          ...sectionsConfig,
                          mostUseful: { ...sectionsConfig.mostUseful, enabled: e.target.checked }
                        })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={sectionsConfig.mostUseful.title}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        mostUseful: { ...sectionsConfig.mostUseful, title: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded bg-white font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Section 7: Partners Config */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">4</span>
                  <h4 className="text-sm font-bold text-slate-900">Section Đối Tác Đồng Hành (MSB, ROX Group, TNTalent)</h4>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.partners.enabled}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        partners: { ...sectionsConfig.partners, enabled: e.target.checked }
                      })
                    }
                    className="rounded text-[#0050D8]"
                  />
                  <span>Hiển thị section này</span>
                </label>
              </div>

              <div className="text-xs">
                <label className="block font-medium text-slate-700 mb-1">Tiêu đề section</label>
                <input
                  type="text"
                  value={sectionsConfig.partners.title}
                  onChange={(e) =>
                    setSectionsConfig({
                      ...sectionsConfig,
                      partners: { ...sectionsConfig.partners, title: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Section 8: Instructors Config */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">5</span>
                  <h4 className="text-sm font-bold text-slate-900">Section Đội Ngũ Giảng Viên (MSB & Ngân hàng)</h4>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.instructors.enabled}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        instructors: { ...sectionsConfig.instructors, enabled: e.target.checked }
                      })
                    }
                    className="rounded text-[#0050D8]"
                  />
                  <span>Hiển thị section này</span>
                </label>
              </div>

              <div className="space-y-3 text-xs">
                {sectionsConfig.instructors.items.map((inst, idx) => (
                  <div key={inst.id} className="p-3 bg-slate-50 border rounded-xl space-y-2">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>Giảng viên {idx + 1}: {inst.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={inst.name}
                        onChange={(e) => {
                          const updated = [...sectionsConfig.instructors.items];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setSectionsConfig({
                            ...sectionsConfig,
                            instructors: { ...sectionsConfig.instructors, items: updated }
                          });
                        }}
                        className="px-2 py-1 border rounded bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={inst.title}
                        onChange={(e) => {
                          const updated = [...sectionsConfig.instructors.items];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setSectionsConfig({
                            ...sectionsConfig,
                            instructors: { ...sectionsConfig.instructors, items: updated }
                          });
                        }}
                        className="px-2 py-1 border rounded bg-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 9: About Twings & Sứ Mệnh */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">6</span>
                  <h4 className="text-sm font-bold text-slate-900">Section Về TWings (Tầm Nhìn, Sứ Mệnh, Giá Trị Cốt Lõi)</h4>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionsConfig.about.enabled}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        about: { ...sectionsConfig.about, enabled: e.target.checked }
                      })
                    }
                    className="rounded text-[#0050D8]"
                  />
                  <span>Hiển thị section này</span>
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tầm nhìn</label>
                  <textarea
                    rows={2}
                    value={sectionsConfig.about.vision}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        about: { ...sectionsConfig.about, vision: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Section 10: Contact Information */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0050D8] font-bold text-xs flex items-center justify-center">7</span>
                  <h4 className="text-sm font-bold text-slate-900">Thông Tin Liên Hệ & Footer</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Địa chỉ trụ sở</label>
                  <input
                    type="text"
                    value={sectionsConfig.contact.address}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        contact: { ...sectionsConfig.contact, address: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hotline tư vấn</label>
                  <input
                    type="text"
                    value={sectionsConfig.contact.hotline}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        contact: { ...sectionsConfig.contact, hotline: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={sectionsConfig.contact.email}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        contact: { ...sectionsConfig.contact, email: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Facebook Fanpage</label>
                  <input
                    type="text"
                    value={sectionsConfig.contact.facebook}
                    onChange={(e) =>
                      setSectionsConfig({
                        ...sectionsConfig,
                        contact: { ...sectionsConfig.contact, facebook: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Trigger */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-8 py-3 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Lưu Thay Đổi & Xuất Lên Trang Chủ
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs text-slate-500">Tổng Doanh Thu VietQR</div>
                <div className="text-2xl font-black text-[#0050D8] font-mono tabular-nums">
                  {formatVND(totalRevenue)}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">↑ Kích hoạt tự động qua Napas</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs text-slate-500">Đơn Hàng Thành Công</div>
                <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {orders.filter((o) => o.status === 'paid').length} đơn
                </div>
                <div className="text-[11px] text-slate-500">{orders.filter((o) => o.status === 'pending').length} đơn đang chờ chuyển khoản</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs text-slate-500">Khóa Học Đang Mở Bán</div>
                <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {courses.length} khóa
                </div>
                <div className="text-[11px] text-slate-500">Tài chính - Ngân hàng - Kỹ năng số</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs text-slate-500">Học Viên Kích Hoạt LMS</div>
                <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {students.length} học viên
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">Tỷ lệ hài lòng 100%</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COURSES MANAGER */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-[#0050D8]">
                  Quản Lý Khóa Học Nghiệp Vụ Ngân Hàng ({courses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Thêm mới, sửa giá bán và cấu trúc bài giảng Moodle
                </p>
              </div>

              <button
                onClick={() => setIsAddCourseModalOpen(true)}
                className="px-4 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Thêm Khóa Học Mới
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tên Khóa Học</th>
                      <th className="py-3 px-4">Danh Mục</th>
                      <th className="py-3 px-4">Cấp Bậc</th>
                      <th className="py-3 px-4 text-right">Học Phí Bán</th>
                      <th className="py-3 px-4 text-center">Khối Hiển Thị</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{course.title}</div>
                          <div className="text-[11px] text-slate-500">{course.instructor?.name || course.instructors?.[0]?.name || course.partner?.name || 'Giảng viên'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{course.category}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{course.level}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#FF5722]">
                          {formatVND(course.price)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0050D8]">
                            {course.badgeType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onDeleteCourse(course.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa khóa học"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS & VIETQR */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchOrderQuery}
                  onChange={(e) => setSearchOrderQuery(e.target.value)}
                  placeholder="Tìm mã đơn (TW-...), họ tên..."
                  className="px-3 py-1.5 text-xs border rounded-lg focus:outline-none w-60"
                />

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  {(['all', 'paid', 'pending', 'cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderFilter(st)}
                      className={`px-3 py-1 rounded-md capitalize cursor-pointer ${
                        orderFilter === st
                          ? 'bg-white text-slate-900 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'all' ? 'Tất cả' : st === 'paid' ? 'Đã thanh toán' : st === 'pending' ? 'Chờ quét QR' : 'Đã hủy'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Hiển thị {filteredOrders.length} giao dịch VietQR
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Mã Đơn Hàng</th>
                      <th className="py-3 px-4">Khách Hàng</th>
                      <th className="py-3 px-4">Khóa Học</th>
                      <th className="py-3 px-4 text-right">Số Tiền</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0050D8]">
                          {order.orderCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{order.customerName}</div>
                          <div className="text-[11px] text-slate-500">{order.customerPhone}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-800">{order.courseTitle}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#FF5722]">
                          {formatVND(order.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            order.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {order.status === 'paid' ? '✓ Đã Thanh Toán (Napas)' : order.status === 'pending' ? '⏳ Chờ Quét VietQR' : '✕ Đã Hủy'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'paid')}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded cursor-pointer"
                            >
                              Xác Nhận Đã Nhận Tiền
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STUDENTS */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#0050D8]">
              Danh Sách Học Viên Đang Học Tập ({students.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-3 px-4">Họ Và Tên</th>
                    <th className="py-3 px-4">Khóa Học</th>
                    <th className="py-3 px-4">Tiến Độ</th>
                    <th className="py-3 px-4 text-right">Hoạt Động Gần Nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((stu) => (
                    <tr key={stu.id}>
                      <td className="py-3 px-4 font-bold text-slate-900">{stu.studentName}</td>
                      <td className="py-3 px-4 text-slate-700">{stu.courseTitle}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">{stu.progressPercent}%</td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">{stu.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-[#0050D8]">Mã Ưu Đãi Giảm Giá ({coupons.length})</h3>
              <button
                onClick={() => setIsAddCouponModalOpen(true)}
                className="px-4 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white text-xs font-bold rounded-xl"
              >
                + Thêm Mã Mới
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((c) => (
                <div key={c.code} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-sm text-[#0050D8] bg-blue-50 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <span className="font-bold text-emerald-600">-{c.discountPercent}%</span>
                  </div>
                  <p className="text-xs text-slate-600">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ARCHITECTURE DJANGO + NEXT.JS */}
        {activeTab === 'architecture' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <h3 className="text-sm font-bold text-[#0050D8] flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-amber-600" />
                Kiến Trúc Backend Django + Frontend Next.js Sẵn Sàng Triển Khai
              </h3>
              <p className="text-xs text-slate-600">
                Toàn bộ schema Django ORM models (khóa học, chương, bài giảng, đơn hàng VietQR, học viên) và Next.js App Router code sẵn sàng copy để triển khai lên production.
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCodeTab('models')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      codeTab === 'models' ? 'bg-[#FF5722] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    courses/models.py (Django ORM)
                  </button>
                  <button
                    onClick={() => setCodeTab('views')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      codeTab === 'views' ? 'bg-[#FF5722] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    courses/views.py (VietQR Webhook)
                  </button>
                  <button
                    onClick={() => setCodeTab('nextjs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      codeTab === 'nextjs' ? 'bg-[#FF5722] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    app/courses/[slug]/page.tsx (Next.js SSR)
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-x-auto max-h-[500px]">
                <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                  {codeTab === 'models' && DJANGO_MODELS_CODE}
                  {codeTab === 'views' && DJANGO_VIEWS_CODE}
                  {codeTab === 'nextjs' && NEXTJS_APP_ROUTER_CODE}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-[#0050D8]">Thêm Khóa Học Nghiệp Vụ Mới</h3>
              <button onClick={() => setIsAddCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tên khóa học *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Thẩm định Tín dụng Doanh nghiệp Nâng Cao"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Danh mục</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Ngân Hàng & Tín Dụng">Ngân Hàng & Tín Dụng</option>
                    <option value="Quản Trị & Lãnh Đạo (OKR/MBO)">Quản Trị & Lãnh Đạo (OKR/MBO)</option>
                    <option value="Kỹ Năng Số & AI">Kỹ Năng Số & AI</option>
                    <option value="Kinh Doanh & Khách Hàng">Kinh Doanh & Khách Hàng</option>
                    <option value="Tư Duy & Đột Phá">Tư Duy & Đột Phá</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Khối hiển thị</label>
                  <select
                    value={newBadgeType}
                    onChange={(e) => setNewBadgeType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="bestseller">Khóa Học Bán Chạy Nhất</option>
                    <option value="recommended">Được Đề Xuất Cho Bạn</option>
                    <option value="new">Khóa Học Mới Ra Mắt</option>
                    <option value="useful">Khóa Học Hữu Ích Nhất</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Học phí bán (VND) *</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giá gốc gạch ngang</label>
                  <input
                    type="number"
                    value={newOriginalPrice}
                    onChange={(e) => setNewOriginalPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF5722] text-white font-bold rounded-lg hover:bg-[#E64A19]"
                >
                  Tạo Khóa Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Coupon Modal */}
      {isAddCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-[#0050D8]">Tạo Mã Ưu Đãi Mới</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Mã (vd: BANKER2026)"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value)}
                className="w-full px-3 py-2 border uppercase font-mono rounded-lg"
              />
              <input
                type="number"
                placeholder="Phần trăm giảm (%)"
                value={newCouponDiscount}
                onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCouponModalOpen(false)}
                  className="px-4 py-2 text-slate-600"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 bg-[#0050D8] text-white font-bold rounded-lg">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
