import React, { useState } from 'react';
import { 
  Layers, 
  BookOpen, 
  DollarSign, 
  Code2, 
  Check, 
  Trash2, 
  Edit, 
  Plus, 
  Save, 
  Eye, 
  ArrowLeft, 
  Sparkles, 
  TrendingUp, 
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Lock,
  LayoutDashboard,
  Users,
  Globe,
  FileText,
  Play,
  Share2,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  X
} from 'lucide-react';
import { Course, Order, CMSSectionsConfig, HeroBannerItem, PartnerItem } from '../types';
import { HERO_BANNERS, DEFAULT_PARTNERS } from '../data/courseraData';
import { CMSCRMOrdersTab } from './cms/CMSCRMOrdersTab';
import { CMSUsersTab } from './cms/CMSUsersTab';
import { CMSArchitectureTab } from './cms/CMSArchitectureTab';
import { CMSArticlesSEOTab } from './cms/CMSArticlesSEOTab';
import { CMSSiteSEOSettingsTab } from './cms/CMSSiteSEOSettingsTab';
import { CMSPartnersTab } from './cms/CMSPartnersTab';
import { CMSHomepageContentTab } from './cms/CMSHomepageContentTab';

interface CourseraCMSAdminProps {
  courses: Course[];
  orders: Order[];
  cmsSections: CMSSectionsConfig;
  onUpdateCMSSections: (sections: CMSSectionsConfig) => void;
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse: (updatedCourse: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onBackToHome: () => void;
}

export const CourseraCMSAdmin: React.FC<CourseraCMSAdminProps> = ({
  courses,
  orders,
  cmsSections,
  onUpdateCMSSections,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onUpdateOrderStatus,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<
    'crm_orders' | 'courses' | 'banners' | 'partners' | 'homepage_content' | 'articles' | 'users' | 'seo_settings' | 'architecture' | 'sections'
  >('crm_orders');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sectionsState, setSectionsState] = useState<CMSSectionsConfig>(cmsSections);
  const [bannersState, setBannersState] = useState<HeroBannerItem[]>(HERO_BANNERS);
  const [courseSearch, setCourseSearch] = useState('');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Edit Course Form State
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCoursePrice, setEditCoursePrice] = useState(0);
  const [editCourseDelivery, setEditCourseDelivery] = useState<Course['deliveryFormat']>('online_external_lms');
  const [editCourseYouTube, setEditCourseYouTube] = useState('');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const handleOpenEditCourse = (c: Course) => {
    setEditingCourse(c);
    setEditCourseTitle(c.title);
    setEditCoursePrice(c.price);
    setEditCourseDelivery(c.deliveryFormat || 'online_external_lms');
    setEditCourseYouTube(c.youtubeVideoId || 'sal78ACtGTc');
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const updated: Course = {
      ...editingCourse,
      title: editCourseTitle,
      price: editCoursePrice,
      deliveryFormat: editCourseDelivery,
      youtubeVideoId: editCourseYouTube,
      youtubeTrialUrl: `https://www.youtube.com/watch?v=${editCourseYouTube}`
    };

    onUpdateCourse(updated);
    setEditingCourse(null);
  };

  const handleToggleSection = (key: keyof CMSSectionsConfig) => {
    const current = sectionsState[key] as any;
    if (!current) return;
    const upd = {
      ...sectionsState,
      [key]: {
        ...current,
        enabled: !current.enabled,
      },
    };
    setSectionsState(upd);
    onUpdateCMSSections(upd);
  };

  const handleUpdatePartners = (newPartners: PartnerItem[]) => {
    const upd: CMSSectionsConfig = {
      ...sectionsState,
      partners: {
        ...sectionsState.partners,
        items: newPartners
      }
    };
    setSectionsState(upd);
    onUpdateCMSSections(upd);
  };

  const navItems = [
    {
      id: 'crm_orders',
      label: 'CRM & Đơn Hàng',
      icon: DollarSign,
      badge: orders.length,
      badgeColor: 'bg-emerald-500/20 text-emerald-300'
    },
    {
      id: 'courses',
      label: 'Khóa Học & YouTube Embed',
      icon: BookOpen,
      badge: courses.length,
      badgeColor: 'bg-blue-500/20 text-blue-300'
    },
    {
      id: 'banners',
      label: 'Quản Lý Banner (Ảnh/Hyperlink)',
      icon: Layers,
      badge: bannersState.length,
      badgeColor: 'bg-purple-500/20 text-purple-300'
    },
    {
      id: 'partners',
      label: 'Đối Tác & Logo Doanh Nghiệp',
      icon: Building2,
      badge: sectionsState.partners.items?.length || 9,
      badgeColor: 'bg-amber-500/20 text-amber-300'
    },
    {
      id: 'homepage_content',
      label: 'Biên Tập Nội Dung Trang Chủ',
      icon: Edit3,
    },
    {
      id: 'articles',
      label: 'Bài Viết & Chấm Điểm SEO',
      icon: FileText,
    },
    {
      id: 'users',
      label: 'Quản Lý User & Vai Trò (RBAC)',
      icon: Users,
    },
    {
      id: 'seo_settings',
      label: 'Cài Đặt Chuẩn SEO Website',
      icon: Globe,
    },
    {
      id: 'architecture',
      label: 'Kiến Trúc Django & Database',
      icon: Code2,
    },
    {
      id: 'sections',
      label: 'Bật / Tắt Khối Section',
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* 1. COLLAPSIBLE SIDEBAR ON THE LEFT (User: "menu các chức năng topbar cần đưa về đưa về dạng sidebar bên trái có cơ chế colapsse, expand") */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 z-30 shrink-0 border-r border-slate-800 select-none shadow-xl`}
      >
        {/* Sidebar Header / Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg font-black tracking-tight text-white uppercase truncate">
                TWINGS CMS
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-400/30">
                Django 5.x
              </span>
            </div>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer mx-auto"
            title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-blue-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0073C1] text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!isSidebarCollapsed && item.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Back to Homepage */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950">
          <button
            onClick={onBackToHome}
            className={`w-full flex items-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Quay về Trang Chủ"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400 shrink-0" />
            {!isSidebarCollapsed && <span>Về Trang Chủ</span>}
          </button>

          {!isSidebarCollapsed && (
            <div className="text-[11px] text-slate-500 px-2 truncate">
              Admin: nguyen.tuan@twings.edu.vn
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN SCROLLABLE CONTENT AREA ON THE RIGHT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-900 capitalize">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống CRM Hoạt Động Bình Thường</span>
            </span>
          </div>
        </header>

        {/* Tab Body View */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
          {/* TAB 1: CRM & Orders */}
          {activeTab === 'crm_orders' && (
            <CMSCRMOrdersTab
              orders={orders}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onUpdateOrderCRM={(upd) => onUpdateOrderStatus(upd.id, upd.status)}
            />
          )}

          {/* TAB 2: Courses & YouTube Video Embeds */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Quản Lý Khóa Học & Nhúng ID Video YouTube Học Thử
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Cấu hình hình thức đào tạo (LMS riêng biệt, Offline trung tâm hoặc Hybrid) và nhúng video YouTube cho học viên xem trước.
                  </p>
                </div>

                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Tìm kiếm khóa học..."
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3.5">Khóa Học</th>
                        <th className="p-3.5">Hình Thức Đào Tạo</th>
                        <th className="p-3.5">YouTube Embed ID</th>
                        <th className="p-3.5">Học Phí</th>
                        <th className="p-3.5 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courses
                        .filter((c) => c.title.toLowerCase().includes(courseSearch.toLowerCase()))
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 max-w-sm truncate">{c.title}</div>
                              <div className="text-[11px] text-[#0073C1] font-semibold">{c.partner?.name} · {c.level}</div>
                            </td>

                            <td className="p-3.5">
                              {c.deliveryFormat === 'online_external_lms' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                                  Online qua LMS chuyên biệt
                                </span>
                              )}
                              {c.deliveryFormat === 'offline' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold border border-orange-200">
                                  Trực tiếp tại Trung tâm
                                </span>
                              )}
                              {c.deliveryFormat === 'hybrid' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                                  Hybrid (LMS + Workshop)
                                </span>
                              )}
                              {!c.deliveryFormat && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                  Tự học tiêu chuẩn
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <span className="font-mono text-slate-700 flex items-center gap-1.5 text-[11px]">
                                <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                                <span>{c.youtubeVideoId || 'sal78ACtGTc'}</span>
                              </span>
                            </td>

                            <td className="p-3.5 font-mono font-bold text-slate-900">
                              {formatVND(c.price)}
                            </td>

                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditCourse(c)}
                                className="p-1.5 hover:bg-blue-50 text-[#0073C1] rounded-lg transition-colors cursor-pointer"
                                title="Sửa Khóa Học & Link YouTube"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteCourse(c.id)}
                                className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                                title="Xóa"
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

              {/* Edit Course Modal */}
              {editingCourse && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                      <h3 className="font-bold text-base">Chỉnh Sửa Khóa Học & Nhúng YouTube</h3>
                      <button onClick={() => setEditingCourse(null)} className="p-1 hover:bg-slate-800 rounded-full">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCourse} className="p-6 space-y-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tên khóa học *</label>
                        <input
                          type="text"
                          required
                          value={editCourseTitle}
                          onChange={(e) => setEditCourseTitle(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Học phí (VND) *</label>
                        <input
                          type="number"
                          required
                          value={editCoursePrice}
                          onChange={(e) => setEditCoursePrice(Number(e.target.value))}
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Hình thức đào tạo *</label>
                        <select
                          value={editCourseDelivery}
                          onChange={(e) => setEditCourseDelivery(e.target.value as any)}
                          className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50"
                        >
                          <option value="online_external_lms">Online qua LMS chuyên biệt (Cấp tài khoản & kèm 1-1)</option>
                          <option value="offline">Trực tiếp tại Trung tâm (Offline)</option>
                          <option value="hybrid">Hybrid (Kết hợp Online LMS & Workshop Offline)</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Khi chọn "Online qua LMS chuyên biệt", học viên sẽ được cấp tài khoản trên nền tảng riêng và ban đào tạo làm việc 1-1 sau.
                        </p>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">ID Video YouTube Học Thử *</label>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 bg-slate-100 p-2 rounded-lg text-[11px]">
                            youtube.com/watch?v=
                          </span>
                          <input
                            type="text"
                            required
                            value={editCourseYouTube}
                            onChange={(e) => setEditCourseYouTube(e.target.value)}
                            placeholder="sal78ACtGTc"
                            className="flex-1 p-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCourse(null)}
                          className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white font-bold rounded-xl"
                        >
                          Lưu Cập Nhật
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Banners Management (Full Image & Hyperlink Mode) */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Quản Lý Banner Trang Chủ ({bannersState.length} Banner Cuộn Ngang)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ chế độ thay thế hoàn toàn bằng ảnh và gắn liên kết (hyperlink) nội bộ hoặc link ngoài theo yêu cầu.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const newB: HeroBannerItem = {
                      id: `banner-${Date.now()}`,
                      title: 'Banner Chương Trình Mới 2026',
                      subtitle: 'Chắp cánh sự nghiệp ngân hàng thực chiến cùng TWings.',
                      bgGradient: 'from-[#0048C8] via-[#0056D2] to-[#0073C1]',
                      buttonText: 'Đăng Ký Ngay',
                      buttonAction: 'consultation',
                      buttonStyle: 'primary',
                      displayType: 'image_only',
                      fullBannerImageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
                      linkUrl: '#dang-ky',
                      partnerBadges: [{ name: 'TWINGS', color: '#0073C1' }],
                      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                      floatingBadges: [{ text: 'MỚI 2026', position: 'top-left' }]
                    };
                    setBannersState([...bannersState, newB]);
                  }}
                  className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Banner Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bannersState.map((b, idx) => (
                  <div key={b.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Banner #{idx + 1}</span>
                      <button
                        onClick={() => setBannersState(bannersState.filter((item) => item.id !== b.id))}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Xóa Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Chế độ hiển thị banner *</label>
                        <select
                          value={b.displayType || 'card'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setBannersState(bannersState.map((item) => item.id === b.id ? { ...item, displayType: val } : item));
                          }}
                          className="w-full p-2 border border-blue-300 rounded-lg font-bold bg-blue-50/50"
                        >
                          <option value="image_only">Chế độ ảnh toàn phần (Thay thế hoàn toàn bằng ảnh)</option>
                          <option value="card">Chế độ thẻ Gradient Typography</option>
                        </select>
                      </div>

                      {b.displayType === 'image_only' && (
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Đường dẫn ảnh Banner đầy đủ (Full Image URL) *</label>
                          <input
                            type="text"
                            value={b.fullBannerImageUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBannersState(bannersState.map((item) => item.id === b.id ? { ...item, fullBannerImageUrl: val } : item));
                            }}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                      )}

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Hyperlink khi bấm vào banner (URL ngoài hoặc anchor #dang-ky)</label>
                        <input
                          type="text"
                          value={b.linkUrl || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBannersState(bannersState.map((item) => item.id === b.id ? { ...item, linkUrl: val } : item));
                          }}
                          placeholder="#dang-ky hoặc https://..."
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tiêu đề Banner *</label>
                        <input
                          type="text"
                          value={b.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBannersState(bannersState.map((item) => item.id === b.id ? { ...item, title: val } : item));
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
                        <textarea
                          rows={2}
                          value={b.subtitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBannersState(bannersState.map((item) => item.id === b.id ? { ...item, subtitle: val } : item));
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Partners Management */}
          {activeTab === 'partners' && (
            <CMSPartnersTab
              partners={sectionsState.partners.items || DEFAULT_PARTNERS}
              onUpdatePartners={handleUpdatePartners}
            />
          )}

          {/* TAB 5: Homepage Content Editor */}
          {activeTab === 'homepage_content' && (
            <CMSHomepageContentTab
              cmsSections={sectionsState}
              onUpdateCMSSections={(upd) => {
                setSectionsState(upd);
                onUpdateCMSSections(upd);
              }}
            />
          )}

          {/* TAB 6: Articles & SEO Scoring */}
          {activeTab === 'articles' && <CMSArticlesSEOTab />}

          {/* TAB 7: Operational Users & RBAC */}
          {activeTab === 'users' && <CMSUsersTab />}

          {/* TAB 8: Site SEO Settings */}
          {activeTab === 'seo_settings' && <CMSSiteSEOSettingsTab />}

          {/* TAB 9: Django Backend Architecture & Database Analysis */}
          {activeTab === 'architecture' && <CMSArchitectureTab />}

          {/* TAB 10: Sections Toggle */}
          {activeTab === 'sections' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Bật / Tắt Các Khối Trên Trang Chủ</h2>
                  <p className="text-xs text-slate-500 mt-1">Ẩn hoặc hiện các section theo nhu cầu vận hành.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'hero', name: 'Hero Carousel Banners (Cuộn Ngang)' },
                  { key: 'partners', name: 'Thanh Logo Đối Tác Doanh Nghiệp' },
                  { key: 'bestsellers', name: 'Kệ Khóa Học Bán Chạy Nhất' },
                  { key: 'recommended', name: 'Kệ Khóa Học Được Đề Xuất' },
                  { key: 'newReleases', name: 'Kệ Khóa Học Mới Ra Mắt' },
                  { key: 'mostUseful', name: 'Kệ Khóa Học Hữu Ích Nhất' },
                  { key: 'courseraPlus', name: 'Gói Đào Tạo Doanh Nghiệp & Hội Viên' },
                  { key: 'testimonials', name: 'Cảm Nhận Học Viên & Việc Làm' },
                  { key: 'faq', name: 'Câu Hỏi Thường Gặp (FAQ)' },
                ].map(({ key, name }) => {
                  const isEnabled = (sectionsState as any)[key]?.enabled !== false;
                  return (
                    <div key={key} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{name}</div>
                        <div className="text-[11px] text-slate-400">Trạng thái: {isEnabled ? 'Đang bật' : 'Đang ẩn'}</div>
                      </div>
                      <button
                        onClick={() => handleToggleSection(key as keyof CMSSectionsConfig)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isEnabled ? 'Đang bật' : 'Tắt'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
