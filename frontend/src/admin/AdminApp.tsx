/**
 * TWings staff app (/app): admissions & sales, products, training on Moodle, finance, marketing,
 * system. Always on live data (no demo mode); every page is also authorised again by the API.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  GraduationCap,
  Image,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  LayoutTemplate,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Award,
  BarChart3,
  Briefcase,
  CalendarDays,
  Headset,
  FileSpreadsheet,
  Link2,
  MessageSquareQuote,
  Receipt,
  Send,
  ShieldCheck,
  Tag,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { isBackendEnabled } from '../lib/api';
import { openInMoodle, StaffUserContext } from '../lib/lms';
import { useServerCollection } from '../lib/serverCollection';
import { BANNERS } from '../lib/cmsCollections';
import { AdminUser, CMSSectionsConfig, HeroBannerItem, PartnerItem } from '../types';
import { ChangePasswordDialog, StaffLoginGate } from '../components/cms/StaffLoginGate';
import { CMSCRMOrdersTab } from '../components/cms/CMSCRMOrdersTab';
import { CMSCoursesTab } from '../components/cms/CMSCoursesTab';
import { CMSInstructorsTab } from '../components/cms/CMSInstructorsTab';
import { CMSLmsTab } from '../components/cms/CMSLmsTab';
import { CMSHomepageContentTab } from '../components/cms/CMSHomepageContentTab';
import { CMSPartnersTab } from '../components/cms/CMSPartnersTab';
import { CMSArticlesSEOTab } from '../components/cms/CMSArticlesSEOTab';
import { CMSSiteSEOSettingsTab } from '../components/cms/CMSSiteSEOSettingsTab';
import { CMSEmailTemplatesTab } from '../components/cms/CMSEmailTemplatesTab';
import { CMSUsersTab } from '../components/cms/CMSUsersTab';
import { useAppPath, linkProps } from './router';
import { useCourses, useHomepageSections, useOrders } from './data';
import { OverviewReportsPage } from './pages/OverviewReportsPage';
import { CouponsPage, TransactionsPage } from './pages/FinancePages';
import { HealthPage, MoodleHubPage } from './pages/SystemPages';
import { BannersPage } from './pages/BannersPage';
import { LayoutPage } from './pages/LayoutPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { JourneysPage } from './pages/JourneysPage';
import { IntakesPage } from './pages/IntakesPage';
import { CampaignLinksPage, ReviewsPage } from './pages/MarketingPages';
import { ConsultingPage, InvoicesPage } from './pages/JourneyPages';
import { LearningSupportPage } from './pages/LearningPages';
import { JobOutcomesPage, JobsPage } from './pages/PlacementPages';

interface NavItem {
  path: string;
  aliasPaths?: string[];
  label: string;
  icon: React.ElementType;
  /** Any one of these permission codes shows the page. */
  perms: string[];
}

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: '',
    items: [
      {
        path: '/',
        aliasPaths: ['/reports'],
        label: 'Tổng quan & Báo cáo',
        icon: LayoutDashboard,
        perms: []
      }
    ]
  },
  {
    title: 'Tuyển sinh & Bán hàng',
    items: [
      { path: '/sales/crm', label: 'CRM & đơn hàng', icon: Users, perms: ['crm.view_leads'] },
      { path: '/sales/consulting', label: 'Tư vấn & lịch hẹn', icon: Headset, perms: ['crm.view_leads'] },
      { path: '/sales/intakes', label: 'Đợt khai giảng & chỉ tiêu', icon: CalendarDays, perms: ['courses.view', 'crm.view_leads'] },
      { path: '/sales/coupons', label: 'Mã giảm giá & học bổng', icon: Tag, perms: ['finance.transactions', 'crm.view_leads'] }
    ]
  },
  {
    title: 'Sản phẩm đào tạo',
    items: [
      { path: '/catalog/courses', label: 'Khóa học', icon: BookOpen, perms: ['courses.view'] },
      { path: '/catalog/programs', label: 'Chương trình (gói khóa)', icon: Layers, perms: ['courses.view'] },
      { path: '/catalog/instructors', label: 'Giảng viên', icon: Award, perms: ['courses.view', 'courses.instructors'] }
    ]
  },
  {
    title: 'Đào tạo (Moodle)',
    items: [
      { path: '/learning/progress', label: 'Học viên & tiến độ', icon: GraduationCap, perms: ['lms.view'] },
      { path: '/learning/support', label: 'Học viên cần hỗ trợ', icon: LifeBuoy, perms: ['lms.view'] },
      { path: '/learning/moodle', label: 'Ngân hàng đề, khóa & báo cáo', icon: Wrench, perms: ['lms.view'] }
    ]
  },
  {
    title: 'Việc làm',
    items: [
      { path: '/jobs/referrals', label: 'Giới thiệu việc làm', icon: Briefcase, perms: ['placement.view', 'placement.manage'] },
      { path: '/jobs/outcomes', label: 'Kết quả việc làm', icon: BarChart3, perms: ['placement.view', 'placement.manage'] }
    ]
  },
  {
    title: 'Tài chính',
    items: [
      { path: '/finance/transactions', label: 'Giao dịch & đối soát', icon: Receipt, perms: ['finance.transactions'] },
      { path: '/finance/invoices', label: 'Hóa đơn theo yêu cầu', icon: FileSpreadsheet, perms: ['finance.transactions'] }
    ]
  },
  {
    title: 'Marketing & Nội dung',
    items: [
      { path: '/content/homepage', label: 'Nội dung trang chủ', icon: LayoutTemplate, perms: ['homepage.intro_about'] },
      { path: '/content/banners', label: 'Banner', icon: Image, perms: ['banner.carousel'] },
      { path: '/content/partners', label: 'Đối tác', icon: Building2, perms: ['homepage.partners'] },
      { path: '/content/layout', label: 'Bố cục trang chủ', icon: LayoutDashboard, perms: ['system.sections_toggle'] },
      { path: '/content/articles', label: 'Bài viết & SEO', icon: FileText, perms: ['articles.create_edit', 'articles.publish'] },
      { path: '/content/seo', label: 'Cài đặt SEO website', icon: Globe, perms: ['seo.settings'] },
      { path: '/content/links', label: 'Link chiến dịch (UTM)', icon: Link2, perms: ['crm.view_leads', 'homepage.intro_about'] },
      { path: '/content/reviews', label: 'Đánh giá của học viên', icon: MessageSquareQuote, perms: ['courses.reviews', 'courses.view'] },
      { path: '/content/journeys', label: 'Email tự động theo hành trình', icon: Send, perms: ['crm.view_leads'] },
      { path: '/content/email', label: 'Mẫu email & lịch sử gửi', icon: Mail, perms: ['crm.view_leads', 'crm.edit_status'] }
    ]
  },
  {
    title: 'Hệ thống',
    items: [
      { path: '/system/users', label: 'Nhân sự & phân quyền', icon: ShieldCheck, perms: ['rbac.view_users'] },
      { path: '/system/health', label: 'Tình trạng tích hợp', icon: Gauge, perms: ['system.architecture', 'rbac.manage_roles'] }
    ]
  }
];

const ALL_ITEMS = NAV.flatMap((s) => s.items);

function isItemActive(item: NavItem, currentPath: string): boolean {
  return item.path === currentPath || Boolean(item.aliasPaths?.includes(currentPath));
}

function makeCan(user: AdminUser) {
  return (code: string) => user.role === 'super_admin' || (user.permissions || []).includes(code);
}

/** Mounted only on its page, so users without the banner permission never trigger the request. */
const BannersRoute: React.FC = () => {
  const banners = useServerCollection<HeroBannerItem>(BANNERS, []);
  return <BannersPage bannersState={banners.items} setBannersState={banners.update} />;
};

const Workspace: React.FC<{ user: AdminUser; logout: () => void }> = ({ user, logout }) => {
  const path = useAppPath();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const can = useMemo(() => makeCan(user), [user]);
  const visible = (item: NavItem) => item.perms.length === 0 || item.perms.some(can);
  const current = ALL_ITEMS.find((i) => isItemActive(i, path));

  const pageTitle = (() => {
    if (path === '/') return 'Tổng quan & Báo cáo · Vận hành hôm nay';
    if (path === '/reports') return 'Tổng quan & Báo cáo · Báo cáo phân tích';
    return current?.label || 'TWings Quản trị';
  })();

  useEffect(() => {
    document.title = `${pageTitle} | TWings Quản trị`;
  }, [pageTitle]);

  const orders = useOrders(can('crm.view_leads'));
  const courses = useCourses(can('courses.view'));
  const homepage = useHomepageSections(
    can('homepage.intro_about') || can('homepage.partners') || can('system.sections_toggle')
  );

  const updateSections = (next: CMSSectionsConfig) => homepage.update(next);
  const toggleSection = (key: keyof CMSSectionsConfig) => {
    const section = homepage.sections[key] as unknown as { enabled?: boolean } | undefined;
    if (!section) return;
    updateSections({ ...homepage.sections, [key]: { ...section, enabled: !section.enabled } });
  };
  const updatePartners = (items: PartnerItem[]) =>
    updateSections({ ...homepage.sections, partners: { ...homepage.sections.partners, items } });

  // Editors that copy their props into local state must mount with the loaded document.
  const waitHomepage = !homepage.loaded && <p className="text-sm text-slate-500">Đang tải nội dung trang chủ…</p>;

  const page = (() => {
    if (current && !visible(current)) {
      return <p className="text-sm text-slate-600">Bạn không có quyền truy cập trang này.</p>;
    }
    switch (path) {
      case '/':
      case '/reports':
        return (
          <OverviewReportsPage
            user={user}
            currentPath={path}
            canViewReports={can('finance.transactions') || can('crm.view_leads') || can('lms.view')}
          />
        );
      case '/content/links':
        return <CampaignLinksPage courses={courses.courses} />;
      case '/content/reviews':
        return <ReviewsPage />;
      case '/content/journeys':
        return <JourneysPage canEdit={can('crm.edit_status')} />;
      case '/sales/crm':
        return <CMSCRMOrdersTab orders={orders.orders} onUpdateOrderStatus={orders.updateStatus} onUpdateOrderCRM={orders.updateCRM} />;
      case '/sales/consulting':
        return <ConsultingPage />;
      case '/finance/invoices':
        return <InvoicesPage />;
      case '/sales/intakes':
        return <IntakesPage courses={courses.courses.map((c) => ({ id: c.id, title: c.title }))} />;
      case '/sales/coupons':
        return <CouponsPage canEdit={can('finance.confirm_manual')} />;
      case '/catalog/courses':
        return (
          <CMSCoursesTab
            courses={courses.courses}
            onAddCourse={courses.add}
            onUpdateCourse={courses.update}
            onDeleteCourse={courses.remove}
            onReload={courses.reload}
          />
        );
      case '/catalog/programs':
        return <ProgramsPage courses={courses.courses} canEdit={can('courses.programs')} />;
      case '/catalog/instructors':
        return <CMSInstructorsTab />;
      case '/learning/progress':
        return <CMSLmsTab />;
      case '/learning/support':
        return <LearningSupportPage />;
      case '/jobs/referrals':
        return <JobsPage />;
      case '/jobs/outcomes':
        return <JobOutcomesPage />;
      case '/learning/moodle':
        return <MoodleHubPage />;
      case '/finance/transactions':
        return <TransactionsPage />;
      case '/content/homepage':
        return waitHomepage || <CMSHomepageContentTab cmsSections={homepage.sections} onUpdateCMSSections={updateSections} />;
      case '/content/banners':
        return <BannersRoute />;
      case '/content/partners':
        return waitHomepage || <CMSPartnersTab partners={homepage.sections.partners.items || []} onUpdatePartners={updatePartners} />;
      case '/content/layout':
        return waitHomepage || <LayoutPage sectionsState={homepage.sections} handleToggleSection={toggleSection} />;
      case '/content/articles':
        return <CMSArticlesSEOTab />;
      case '/content/seo':
        return <CMSSiteSEOSettingsTab />;
      case '/content/email':
        return <CMSEmailTemplatesTab orders={orders.orders} />;
      case '/system/users':
        return <CMSUsersTab currentActorUser={user} />;
      case '/system/health':
        return <HealthPage />;
      default:
        return (
          <div className="text-sm text-slate-600">
            Không tìm thấy trang. <a {...linkProps('/')} className="text-[#0073C1] font-bold hover:underline">Về Tổng quan</a>
          </div>
        );
    }
  })();

  const sidebar = (
    <nav className="flex flex-col gap-5 p-4 text-sm">
      {NAV.map((section) => {
        const items = section.items.filter(visible);
        if (!items.length) return null;
        return (
          <div key={section.title || 'home'} className="space-y-1">
            {section.title && <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{section.title}</div>}
            {items.map((item) => {
              const active = isItemActive(item, path);
              return (
                <a key={item.path} {...linkProps(item.path)} onClickCapture={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors ${
                    active ? 'bg-[#0073C1] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <StaffUserContext.Provider value={user}>
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans lg:flex">
        {/* Sidebar (drawer on mobile) */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 overflow-y-auto transition-transform lg:static lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <a {...linkProps('/')} className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-[#0073C1] text-white flex items-center justify-center font-black text-xs">TW</div>
            <div>
              <div className="text-sm font-black text-white">TWings Quản trị</div>
              <div className="text-[10px] text-slate-400">Tuyển sinh · Đào tạo · Vận hành</div>
            </div>
          </a>
          {sidebar}
        </aside>
        {menuOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMenuOpen(false)} />}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" className="lg:hidden p-2 -ml-2 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <span className="font-bold text-sm text-slate-900 truncate">{pageTitle}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {can('lms.view') && (
                <button type="button" onClick={() => openInMoodle()}
                  className="hidden sm:flex px-3 py-1.5 rounded-xl border border-[#0073C1] text-[#0073C1] hover:bg-blue-50 font-bold items-center gap-1.5 cursor-pointer">
                  <ExternalLink className="w-3.5 h-3.5" /> Mở Moodle
                </button>
              )}
              <a href="/" target="_blank" rel="noopener" className="hidden sm:inline px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-600">
                Xem website
              </a>
              <span className="hidden md:inline font-bold text-slate-800">{user.name}</span>
              <button type="button" onClick={() => setChangingPassword(true)} title="Đổi mật khẩu" aria-label="Đổi mật khẩu"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer">
                <KeyRound className="w-4 h-4" />
              </button>
              <button type="button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
          <main className="p-4 lg:p-6 max-w-[1600px]">{page}</main>
        </div>
        {changingPassword && <ChangePasswordDialog onClose={() => setChangingPassword(false)} />}
      </div>
    </StaffUserContext.Provider>
  );
};

export default function AdminApp() {
  if (!isBackendEnabled()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-slate-600">
        Trang quản trị cần kết nối máy chủ TWings (VITE_API_BASE_URL).
      </div>
    );
  }
  return (
    <StaffLoginGate onBackToHome={() => (window.location.href = '/')}>
      {(user, logout) => <Workspace user={user} logout={logout} />}
    </StaffLoginGate>
  );
}
