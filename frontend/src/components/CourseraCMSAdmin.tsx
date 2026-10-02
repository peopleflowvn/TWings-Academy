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
  X,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  Mail,
  Award
} from 'lucide-react';
import { Course, Order, CMSSectionsConfig, HeroBannerItem, PartnerItem, AdminUser, UserRole, RolePermissionConfig } from '../types';
import { HERO_BANNERS, DEFAULT_PARTNERS, INITIAL_ADMIN_USERS } from '../data/courseraData';
import { CMSCRMOrdersTab } from './cms/CMSCRMOrdersTab';
import { CMSUsersTab } from './cms/CMSUsersTab';
import { CMSArchitectureTab } from './cms/CMSArchitectureTab';
import { CMSArticlesSEOTab } from './cms/CMSArticlesSEOTab';
import { CMSSiteSEOSettingsTab } from './cms/CMSSiteSEOSettingsTab';
import { CMSPartnersTab } from './cms/CMSPartnersTab';
import { CMSHomepageContentTab } from './cms/CMSHomepageContentTab';
import { CMSCoursesTab } from './cms/CMSCoursesTab';
import { CMSEmailTemplatesTab } from './cms/CMSEmailTemplatesTab';
import { CMSInstructorsTab } from './cms/CMSInstructorsTab';
import { RBACAccessGuard } from './cms/RBACAccessGuard';
import { 
  DEFAULT_ROLE_CONFIGS, 
  checkUserCanAccessTab, 
  TAB_PERMISSION_MAP 
} from '../utils/rbac';

interface CourseraCMSAdminProps {
  courses: Course[];
  orders: Order[];
  cmsSections: CMSSectionsConfig;
  onUpdateCMSSections: (sections: CMSSectionsConfig) => void;
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse: (updatedCourse: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onPreviewCourse?: (course: Course) => void;
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
  onPreviewCourse,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<
    'crm_orders' | 'courses' | 'instructors' | 'email_templates' | 'banners' | 'partners' | 'homepage_content' | 'articles' | 'users' | 'seo_settings' | 'architecture' | 'sections'
  >('crm_orders');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sectionsState, setSectionsState] = useState<CMSSectionsConfig>(cmsSections);
  const [bannersState, setBannersState] = useState<HeroBannerItem[]>(HERO_BANNERS);

  // RBAC Global State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [roleConfigs, setRoleConfigs] = useState<Record<UserRole, RolePermissionConfig>>(DEFAULT_ROLE_CONFIGS);
  const [currentActorUser, setCurrentActorUser] = useState<AdminUser>(INITIAL_ADMIN_USERS[0]); // Default: Hoang Tung (Super Admin)
  const [showActorSwitcherDropdown, setShowActorSwitcherDropdown] = useState(false);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
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

  // =========================================================================
  // ENTERPRISE NAVIGATION ARCHITECTURE (Categorized & Professional)
  // =========================================================================
  interface NavItem {
    id: typeof activeTab;
    label: string;
    icon: any;
    badge?: number | string;
    badgeColor?: string;
  }

  interface NavSection {
    sectionKey: string;
    sectionTitle: string;
    items: NavItem[];
  }

  const getRoleShortLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'sales_crm': return 'Tuyển Sinh';
      case 'academic_management': return 'Ban Đào Tạo';
      case 'content_seo': return 'Nội Dung & SEO';
      case 'finance_accountant': return 'Kế Toán';
      default: return 'Nhân Sự';
    }
  };

  const navSections: NavSection[] = [
    {
      sectionKey: 'admissions',
      sectionTitle: 'Tuyển Sinh & Đào Tạo',
      items: [
        {
          id: 'crm_orders',
          label: 'CRM Tuyển Sinh (ATS)',
          icon: DollarSign,
          badge: orders.length,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        },
        {
          id: 'courses',
          label: 'Chương Trình Đào Tạo',
          icon: BookOpen,
          badge: courses.length,
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
        },
        {
          id: 'instructors',
          label: 'Đội Ngũ Giảng Viên',
          icon: Award,
          badge: 4,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
        },
        {
          id: 'email_templates',
          label: 'Email & Resend Webhook',
          icon: Mail,
          badge: 5,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
        }
      ]
    },
    {
      sectionKey: 'portal_content',
      sectionTitle: 'Nội Dung & Truyền Thông',
      items: [
        {
          id: 'banners',
          label: 'Banner & Truyền Thông',
          icon: Layers,
          badge: bannersState.length,
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
        },
        {
          id: 'partners',
          label: 'Mạng Lưới Đối Tác',
          icon: Building2,
          badge: sectionsState.partners.items?.length || 9,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
        },
        {
          id: 'homepage_content',
          label: 'Biên Tập Trang Chủ',
          icon: Edit3
        },
        {
          id: 'articles',
          label: 'Tin Tức & Bài Viết SEO',
          icon: FileText
        },
        {
          id: 'sections',
          label: 'Bố Cục Giao Diện',
          icon: LayoutDashboard
        }
      ]
    },
    {
      sectionKey: 'system_settings',
      sectionTitle: 'Hệ Thống & Cấu Hình',
      items: [
        {
          id: 'users',
          label: 'Phân Quyền & Tài Khoản',
          icon: Users
        },
        {
          id: 'seo_settings',
          label: 'Cài Đặt Chuẩn SEO',
          icon: Globe
        },
        {
          id: 'architecture',
          label: 'Kiến Trúc & Dữ Liệu',
          icon: Code2
        }
      ]
    }
  ];

  const allNavItems = navSections.flatMap((s) => s.items);
  const navItems = allNavItems;

  // RBAC Access Check for current active tab
  const canAccessActiveTab = checkUserCanAccessTab(currentActorUser, activeTab, roleConfigs);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* 1. COLLAPSIBLE SIDEBAR ON THE LEFT */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 z-30 shrink-0 border-r border-slate-800 select-none shadow-xl`}
      >
        {/* Sidebar Header / Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-[#0073C1] flex items-center justify-center text-white font-black text-xs shadow-xs">
                TW
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-white uppercase truncate">
                    TWINGS CMS
                  </span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 font-mono font-bold px-1.5 py-0.2 rounded border border-blue-400/30">
                    v2.4
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">Hệ Thống Tuyển Sinh &amp; Đào Tạo</p>
              </div>
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

        {/* Sidebar Nav Items with Categorized Sections & RBAC Badges */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={section.sectionKey} className="space-y-1">
              {!isSidebarCollapsed ? (
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 pt-2 pb-1 select-none flex items-center justify-between">
                  <span>{section.sectionTitle}</span>
                  <span className="text-[9px] font-mono text-slate-600">{section.items.length}</span>
                </div>
              ) : (
                sIdx > 0 && <div className="my-2 border-t border-slate-800/80 mx-2" />
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const hasAccess = checkUserCanAccessTab(currentActorUser, item.id, roleConfigs);

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-[#0073C1] text-white shadow-sm ring-1 ring-blue-400/30'
                          : hasAccess
                          ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-400 opacity-60'
                      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                      title={!hasAccess ? `${item.label} (Yêu cầu nâng quyền RBAC)` : item.label}
                    >
                      <div className="relative shrink-0">
                        <Icon className={`w-4 h-4 transition-colors ${
                          isActive 
                            ? 'text-white' 
                            : hasAccess 
                            ? 'text-slate-400 group-hover:text-blue-400' 
                            : 'text-slate-600'
                        }`} />
                        {!hasAccess && (
                          <span className="absolute -bottom-1 -right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full flex items-center justify-center text-white text-[7px]">
                            <Lock className="w-1.5 h-1.5" />
                          </span>
                        )}
                      </div>

                      {!isSidebarCollapsed && (
                        <span className="truncate flex-1 text-left flex items-center gap-1.5">
                          <span className="truncate">{item.label}</span>
                          {!hasAccess && (
                            <span className="text-[9px] bg-red-950/80 text-red-300 font-mono px-1.5 py-0.2 rounded border border-red-500/30 font-semibold shrink-0">
                              Khóa
                            </span>
                          )}
                        </span>
                      )}

                      {!isSidebarCollapsed && item.badge !== undefined && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : item.badgeColor || 'bg-slate-800 text-slate-400 border border-slate-700/60'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Current User Persona & Back to Homepage */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/80">
          <button
            onClick={onBackToHome}
            className={`w-full flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 hover:text-blue-300 text-slate-300 text-xs font-semibold transition-all cursor-pointer border border-slate-700/50 ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Quay về Trang Chủ Khách Hàng"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400 shrink-0" />
            {!isSidebarCollapsed && <span>Về Trang Chủ</span>}
          </button>

          {!isSidebarCollapsed && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={currentActorUser.avatar}
                    alt={currentActorUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      {currentActorUser.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-400/30 shrink-0">
                      {getRoleShortLabel(currentActorUser.role)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {currentActorUser.email}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN SCROLLABLE CONTENT AREA ON THE RIGHT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar with Live RBAC Persona Switcher */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-900 capitalize flex items-center gap-2">
              <span>{navItems.find((i) => i.id === activeTab)?.label}</span>
              {!canAccessActiveTab && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200 flex items-center gap-1 font-mono">
                  <Lock className="w-3 h-3" />
                  <span>Quyền Hạn Chế</span>
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Live Role Persona Switcher Dropdown (Allows testing RBAC permissions instantly) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActorSwitcherDropdown(!showActorSwitcherDropdown)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all cursor-pointer text-xs shadow-2xs"
                title="Bấm để đổi tài khoản giả lập quyền hạn khác nhau"
              >
                <img
                  src={currentActorUser.avatar}
                  alt={currentActorUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                    <span>{currentActorUser.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${roleConfigs[currentActorUser.role]?.color || 'bg-slate-100'}`}>
                      {getRoleShortLabel(currentActorUser.role)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Giả lập vai trò RBAC ▾
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Persona Selector Dropdown Menu */}
              {showActorSwitcherDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-fadeIn space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>Giả lập nhân sự kiểm toán:</span>
                    <span className="text-[10px] text-blue-600 font-mono font-bold">5 Tài khoản</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 py-1">
                    {adminUsers.map((u) => {
                      const isSelected = u.id === currentActorUser.id;
                      const rCfg = roleConfigs[u.role];
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setCurrentActorUser(u);
                            setShowActorSwitcherDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs truncate flex items-center justify-between">
                              <span>{u.name}</span>
                              {isSelected && <span className="text-[10px] text-blue-600 font-bold">✓ Đang dùng</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{rCfg?.roleName}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{rCfg?.department}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 border border-slate-100 flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Hệ thống phân quyền áp dụng ngay lập tức cho sidebar và các tab chức năng.</span>
                  </div>
                </div>
              )}
            </div>

            <span className="hidden md:flex px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CRM & RBAC Sẵn Sàng</span>
            </span>
          </div>
        </header>

        {/* Tab Body View (With RBAC 403 Guard for Unauthorized Roles) */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
          {!canAccessActiveTab ? (
            <RBACAccessGuard
              currentTabId={activeTab}
              tabLabel={navItems.find((i) => i.id === activeTab)?.label || activeTab}
              currentUser={currentActorUser}
              roleConfigs={roleConfigs}
              onSwitchToSuperAdmin={() => {
                const superAdmin = adminUsers.find((u) => u.role === 'super_admin') || adminUsers[0];
                setCurrentActorUser(superAdmin);
              }}
              onNavigateToAllowedTab={() => {
                const allowed = navItems.find((item) => checkUserCanAccessTab(currentActorUser, item.id, roleConfigs));
                if (allowed) setActiveTab(allowed.id as any);
              }}
            />
          ) : (
            <>
              {/* TAB 1: CRM & Orders */}
              {activeTab === 'crm_orders' && (
                <CMSCRMOrdersTab
                  orders={orders}
                  onUpdateOrderStatus={onUpdateOrderStatus}
                  onUpdateOrderCRM={(upd) => onUpdateOrderStatus(upd.id, upd.status)}
                />
              )}

              {/* TAB 2: Courses & YouTube Video Embeds (Dedicated Professional Full-Page Editor) */}
              {activeTab === 'courses' && (
                <CMSCoursesTab
                  courses={courses}
                  onAddCourse={onAddCourse}
                  onUpdateCourse={onUpdateCourse}
                  onDeleteCourse={onDeleteCourse}
                  onPreviewCourse={onPreviewCourse}
                />
              )}

              {/* TAB 2.1: Instructors & Faculty Profiles */}
              {activeTab === 'instructors' && <CMSInstructorsTab />}

              {/* TAB 2.2: Email Templates & Resend API Hub */}
              {activeTab === 'email_templates' && <CMSEmailTemplatesTab orders={orders} />}

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
                          partnerBadges: [{ name: 'MSB', color: 'text-orange-500' }],
                          imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
                          floatingBadges: [{ text: 'Khóa Học Mới', sub: 'Thực chiến 2026', position: 'top-left' }],
                        };
                        setBannersState([newB, ...bannersState]);
                      }}
                      className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm Banner Mới</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bannersState.map((banner, idx) => (
                      <div
                        key={banner.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                              Slide #{idx + 1}
                            </span>
                            <button
                              onClick={() => {
                                setBannersState(bannersState.filter((b) => b.id !== banner.id));
                              }}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa banner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">
                              Chế độ hiển thị banner
                            </label>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`displayType-${banner.id}`}
                                  checked={banner.displayType === 'image_only'}
                                  onChange={() => {
                                    setBannersState(
                                      bannersState.map((b) =>
                                        b.id === banner.id ? { ...b, displayType: 'image_only' } : b
                                      )
                                    );
                                  }}
                                  className="text-blue-600"
                                />
                                <span>Ảnh toàn phần (Full-bleed Image)</span>
                              </label>

                              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`displayType-${banner.id}`}
                                  checked={banner.displayType !== 'image_only'}
                                  onChange={() => {
                                    setBannersState(
                                      bannersState.map((b) =>
                                        b.id === banner.id ? { ...b, displayType: 'card' } : b
                                      )
                                    );
                                  }}
                                  className="text-blue-600"
                                />
                                <span>Tiêu đề text + Badge nổi</span>
                              </label>
                            </div>
                          </div>

                          {banner.displayType === 'image_only' ? (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-700 block">
                                Link Ảnh Banner Toàn Phần (URL)
                              </label>
                              <input
                                type="text"
                                value={banner.fullBannerImageUrl || banner.imageUrl}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBannersState(
                                    bannersState.map((b) =>
                                      b.id === banner.id ? { ...b, fullBannerImageUrl: val, imageUrl: val } : b
                                    )
                                  );
                                }}
                                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                                placeholder="https://images.unsplash.com/..."
                              />

                              <div className="aspect-[16/6] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
                                <img
                                  src={banner.fullBannerImageUrl || banner.imageUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as any).src =
                                      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80';
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                  Tiêu đề Banner
                                </label>
                                <input
                                  type="text"
                                  value={banner.title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBannersState(
                                      bannersState.map((b) => (b.id === banner.id ? { ...b, title: val } : b))
                                    );
                                  }}
                                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                  Mô tả phụ
                                </label>
                                <input
                                  type="text"
                                  value={banner.subtitle}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBannersState(
                                      bannersState.map((b) => (b.id === banner.id ? { ...b, subtitle: val } : b))
                                    );
                                  }}
                                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-700 block">
                              Gắn Hyperlink khi click banner (Tùy chọn)
                            </label>
                            <input
                              type="text"
                              value={banner.linkUrl || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBannersState(
                                  bannersState.map((b) => (b.id === banner.id ? { ...b, linkUrl: val } : b))
                                );
                              }}
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono"
                              placeholder="#dang-ky hoặc https://..."
                            />
                            <p className="text-[11px] text-slate-400">
                              Người dùng click vào banner trên trang chủ sẽ tự động chuyển hướng đến link này.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Enterprise Partners & Logos */}
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
              {activeTab === 'users' && (
                <CMSUsersTab
                  users={adminUsers}
                  onUpdateUsers={setAdminUsers}
                  roleConfigs={roleConfigs}
                  onUpdateRoleConfigs={setRoleConfigs}
                  currentActorUser={currentActorUser}
                  onSelectCurrentActor={setCurrentActorUser}
                />
              )}

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
                        <div
                          key={key}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-800">{name}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSection(key as any)}
                            className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                              isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
