/**
 * TWings staff app (/app): admissions & sales, products, training on Moodle, finance, marketing,
 * system. Always on live data (no demo mode); every page is also authorised again by the API.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Handshake,
  Users,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  GraduationCap,
  Image,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  Inbox,
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
  CalendarCheck,
  UserRound,
  FileSpreadsheet,
  Link2,
  MessageSquareQuote,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Tag,
  Wrench,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { isBackendEnabled } from '../lib/api';
import { openInMoodle, StaffUserContext } from '../lib/lms';
import { useServerCollection } from '../lib/serverCollection';
import { BANNERS } from '../lib/cmsCollections';
import { getCachedBanners } from '../lib/bannerSync';
import { HERO_BANNERS } from '../data/courseraData';
import { AdminUser, CMSSectionsConfig, HeroBannerItem, PartnerItem } from '../types';
import { ChangePasswordDialog, StaffLoginGate } from '../components/cms/StaffLoginGate';
import { CMSCoursesTab } from '../components/cms/CMSCoursesTab';
import { CMSInstructorsTab } from '../components/cms/CMSInstructorsTab';
import { CMSLmsTab } from '../components/cms/CMSLmsTab';
import { CMSHomepageContentTab } from '../components/cms/CMSHomepageContentTab';
import { CMSPartnersTab } from '../components/cms/CMSPartnersTab';
import { CMSArticlesSEOTab } from '../components/cms/CMSArticlesSEOTab';
import { CMSSiteSEOSettingsTab } from '../components/cms/CMSSiteSEOSettingsTab';
import { CMSEmailTemplatesTab } from '../components/cms/CMSEmailTemplatesTab';
import { CMSUsersTab } from '../components/cms/CMSUsersTab';
import { TopLoadingBar, startPageLoading, donePageLoading } from '../components/TopLoadingBar';
import { useAppPath, linkProps, navigate } from './router';
import { useCourses, useHomepageSections, useOrders } from './data';
import { useSiteSeo } from '../lib/siteSeo';
import { OverviewReportsPage } from './pages/OverviewReportsPage';
import { CouponsPage, TransactionsPage } from './pages/FinancePages';
import { HealthPage, MoodleHubPage } from './pages/SystemPages';
import { BannersPage } from './pages/BannersPage';
import { LayoutPage } from './pages/LayoutPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { JourneysPage } from './pages/JourneysPage';
import { LearnersPage } from './pages/LearnersPage';
import { AdmissionsPage } from './pages/AdmissionsPage';
import { CampaignLinksPage, ReviewsPage } from './pages/MarketingPages';
import { ConsultingPage, InvoicesPage } from './pages/JourneyPages';
import { MyDayPage } from './pages/MyDayPage';
import { LearningSupportPage } from './pages/LearningPages';
import { JobOutcomesPage, JobsPage } from './pages/PlacementPages';
import {
  CorporateAcceptancePage,
  CorporateClassesPage,
  CorporateClientsPage,
  CorporateEmployeesPage,
  CorporateOverviewPage,
  CorporatePlansPage,
  CorporateReceivablesPage,
  CorporateRequestsPage
} from './pages/CorporatePages';

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
      // A consultant's list for today (overdue leads, new leads, tasks, appointments), phone first.
      { path: '/sales/today', label: 'Hôm nay của tôi', icon: CalendarCheck, perms: ['crm.view_leads'] },
      {
        // The classes (a class is an admission campaign) and the lead pipeline (all leads or one class).
        path: '/sales/crm',
        label: 'Lớp tuyển sinh & pipeline',
        icon: Briefcase,
        perms: ['crm.view_leads']
      },
      { path: '/sales/learners', label: 'Học viên', icon: UserRound, perms: ['crm.view_leads'] },
      { path: '/sales/consulting', label: 'Tư vấn & lịch hẹn', icon: Headset, perms: ['crm.view_leads'] },
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
    // B2B: classes a client company sends its staff to (no orders, no tuition).
    title: 'Đào tạo doanh nghiệp',
    items: [
      { path: '/corporate/overview', label: 'Tổng quan B2B', icon: Gauge, perms: ['corporate.view'] },
      { path: '/corporate/classes', label: 'Lớp doanh nghiệp', icon: Users, perms: ['corporate.view'] },
      { path: '/corporate/employees', label: 'Học viên & CBQL', icon: UserRound, perms: ['corporate.view'] },
      { path: '/corporate/plans', label: 'Kế hoạch đào tạo', icon: ClipboardList, perms: ['corporate.view'] },
      { path: '/corporate/requests', label: 'Yêu cầu & SLA', icon: Inbox, perms: ['corporate.view'] },
      { path: '/corporate/acceptance', label: 'Nghiệm thu', icon: FileCheck2, perms: ['corporate.view'] },
      { path: '/corporate/receivables', label: 'Công nợ', icon: Receipt, perms: ['corporate.view'] },
      { path: '/corporate/clients', label: 'Khách hàng & hợp đồng', icon: Handshake, perms: ['corporate.view'] }
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
  const [initialData] = useState<HeroBannerItem[]>(() => getCachedBanners() || HERO_BANNERS);
  const banners = useServerCollection<HeroBannerItem>(BANNERS, initialData);
  return (
    <BannersPage
      bannersState={banners.items}
      setBannersState={banners.update}
      onSaveNow={banners.saveNow}
    />
  );
};

const Workspace: React.FC<{ user: AdminUser; logout: () => void }> = ({ user, logout }) => {
  const path = useAppPath();
  // The former all-leads pipeline page is the pipeline of /sales/crm with every lead (old links keep working).
  useEffect(() => {
    if (path === '/sales/pipeline') navigate('/sales/crm?view=kanban&campaignId=all', { replace: true });
    // Classes and campaigns are one screen now (a class is an admission campaign).
    if (path === '/sales/intakes') navigate('/sales/crm?view=campaigns', { replace: true });
    startPageLoading();
    const timer = setTimeout(() => donePageLoading(), 150);
    return () => clearTimeout(timer);
  }, [path]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('twings_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('twings_admin_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const can = useMemo(() => makeCan(user), [user]);
  const visible = (item: NavItem) => item.perms.length === 0 || item.perms.some(can);
  const current = ALL_ITEMS.find((i) => isItemActive(i, path));

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('twings_admin_sidebar_collapsed_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSectionCollapse = (title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem('twings_admin_sidebar_collapsed_sections', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const navContainerRef = useRef<HTMLDivElement>(null);

  // Restore sidebar scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('twings_admin_sidebar_scroll');
    if (saved && navContainerRef.current) {
      navContainerRef.current.scrollTop = Number(saved);
    }
  }, []);

  // Save scroll position when user scrolls the nav
  const handleNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sessionStorage.setItem('twings_admin_sidebar_scroll', String(e.currentTarget.scrollTop));
  };

  // If path changes, ensure active item is visible in view without jumping to top
  useEffect(() => {
    if (!navContainerRef.current) return;
    const activeEl = navContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      const container = navContainerRef.current;
      const cTop = container.scrollTop;
      const cBottom = cTop + container.clientHeight;
      const elTop = activeEl.offsetTop;
      const elBottom = elTop + activeEl.clientHeight;

      // Only scroll if outside the visible area
      if (elTop < cTop || elBottom > cBottom) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [path]);

  // If active item belongs to a collapsed section, auto-expand that section so active route is visible
  useEffect(() => {
    for (const section of NAV) {
      if (section.title && section.items.some((i) => isItemActive(i, path))) {
        if (collapsedSections[section.title]) {
          setCollapsedSections((prev) => ({ ...prev, [section.title]: false }));
        }
        break;
      }
    }
  }, [path]);

  const pageTitle = (() => {
    if (path === '/') return 'Tổng quan & Báo cáo · Vận hành hôm nay';
    if (path === '/reports') return 'Tổng quan & Báo cáo · Báo cáo phân tích';
    return current?.label || 'TWings Quản trị';
  })();

  const siteSeo = useSiteSeo();
  const siteBrand = siteSeo?.siteName || 'TWings Quản trị';

  useEffect(() => {
    document.title = `${pageTitle} | ${siteBrand}`;
  }, [pageTitle, siteBrand]);

  // E-mail previews read a few leads; the CRM pipeline loads (filtered, paginated) leads itself.
  const orders = useOrders(can('crm.view_leads') && path === '/content/email');
  const courses = useCourses(can('courses.view'));
  const corporateCourses = useMemo(() => courses.courses.map((c) => ({ id: c.id, title: c.title })), [courses.courses]);
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
        return <AdmissionsPage courses={courses.courses} />;
      case '/sales/learners':
        return <LearnersPage courses={courses.courses} />;
      case '/sales/consulting':
        return <ConsultingPage />;
      case '/sales/today':
        return <MyDayPage />;
      case '/finance/invoices':
        return <InvoicesPage />;
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
      case '/corporate/overview':
        return <CorporateOverviewPage />;
      case '/corporate/classes':
        return <CorporateClassesPage courses={corporateCourses} />;
      case '/corporate/plans':
        return <CorporatePlansPage courses={corporateCourses} />;
      case '/corporate/acceptance':
        return <CorporateAcceptancePage />;
      case '/corporate/receivables':
        return <CorporateReceivablesPage />;
      case '/corporate/requests':
        return <CorporateRequestsPage />;
      case '/corporate/employees':
        return <CorporateEmployeesPage />;
      case '/corporate/clients':
        return <CorporateClientsPage courses={corporateCourses} />;
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
        return waitHomepage || (
          <CMSPartnersTab
            partners={homepage.sections.partners.items || []}
            onUpdatePartners={updatePartners}
            sectionTitle={homepage.sections.partners.title}
            onUpdateTitle={(title: string) =>
              updateSections({
                ...homepage.sections,
                partners: { ...homepage.sections.partners, title },
              })
            }
          />
        );
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredNav = useMemo(() => {
    return NAV.map((section) => {
      const visibleItems = section.items.filter(visible);
      if (!normalizedQuery) {
        return { ...section, items: visibleItems };
      }
      const matched = visibleItems.filter(
        (i) =>
          i.label.toLowerCase().includes(normalizedQuery) ||
          i.path.toLowerCase().includes(normalizedQuery)
      );
      return { ...section, items: matched };
    }).filter((section) => section.items.length > 0);
  }, [can, normalizedQuery]);

  const sidebarContent = (
    <nav className={`flex flex-col flex-1 ${desktopCollapsed ? 'items-center px-1' : 'px-2'}`}>
      {filteredNav.length === 0 ? (
        <div className="py-8 px-3 text-center text-xs text-slate-400">
          <p className="mb-2">Không tìm thấy mục "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[#5FBEFF] hover:underline font-medium cursor-pointer"
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        filteredNav.map((section) => {
          const isCollapsed = !normalizedQuery && Boolean(section.title && collapsedSections[section.title]);
          return (
            <div key={section.title || 'home'} className="mb-2 space-y-0.5 w-full">
              {section.title && (
                desktopCollapsed ? (
                  <div className="h-px bg-slate-800/80 my-2 mx-2" title={section.title} />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(section.title)}
                    className="flex items-center justify-between w-full px-2.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400/80 hover:text-slate-200 transition-colors select-none group cursor-pointer"
                  >
                    <span className="truncate">{section.title}</span>
                    <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>
                )
              )}

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isItemActive(item, path);
                    return (
                      <a
                        key={item.path}
                        {...linkProps(item.path)}
                        data-active={active ? 'true' : 'false'}
                        onClickCapture={() => setMenuOpen(false)}
                        title={desktopCollapsed ? item.label : undefined}
                        className={`flex items-center gap-2.5 rounded-xl transition-all duration-150 ${
                          desktopCollapsed
                            ? 'justify-center p-2.5 w-10 h-10 mx-auto'
                            : 'px-3 py-2 text-[13.5px]'
                        } ${
                          active
                            ? 'bg-gradient-to-r from-[#0073C1] to-[#0A84D6] text-white font-semibold shadow-xs shadow-[#0073C1]/25 ring-1 ring-white/10'
                            : 'text-slate-300/85 hover:text-white hover:bg-slate-800/60 font-medium hover:translate-x-0.5'
                        }`}
                      >
                        <item.icon
                          className={`shrink-0 transition-colors ${
                            desktopCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'
                          } ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}
                        />
                        {!desktopCollapsed && <span className="truncate leading-snug">{item.label}</span>}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </nav>
  );

  return (
    <StaffUserContext.Provider value={user}>
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-[15px] lg:flex">
        <TopLoadingBar />
        {/* Sidebar (drawer on mobile, fixed/sticky on desktop) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:shrink-0 lg:translate-x-0 bg-[#0D1527] border-r border-slate-800/80 transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden ${
            menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          } ${desktopCollapsed ? 'lg:w-20 w-72' : 'lg:w-[264px] w-72'}`}
        >
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Sidebar Brand Header */}
            <div
              className={`shrink-0 flex items-center justify-between p-4 border-b border-slate-800/80 min-h-[64px] bg-[#0D1527] ${
                desktopCollapsed ? 'lg:justify-center lg:px-2' : ''
              }`}
            >
              <a
                {...linkProps('/')}
                className="flex items-center min-w-0"
                title="TWings Quản trị"
              >
                <BrandLogo
                  dark={true}
                  title="TWings Quản trị"
                  subtitle={desktopCollapsed ? undefined : "Tuyển sinh · Đào tạo · Vận hành"}
                  collapsed={desktopCollapsed}
                  size="md"
                />
              </a>
              {/* Close button on mobile drawer */}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label="Đóng menu"
                title="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick search input (only when expanded) */}
            {!desktopCollapsed && (
              <div className="shrink-0 px-2.5 pt-2.5 pb-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm nhanh menu..."
                    aria-label="Tìm nhanh menu"
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#0073C1] focus:ring-1 focus:ring-[#0073C1] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sidebar Navigation Links (Dedicated Independent Scroll Container) */}
            <div
              ref={navContainerRef}
              onScroll={handleNavScroll}
              className="overflow-y-auto flex-1 min-h-0 py-2 custom-sidebar-scrollbar"
            >
              {sidebarContent}
            </div>
          </div>

          {/* Desktop Sidebar Collapse Toggle Footer */}
          <div className="shrink-0 p-3 border-t border-slate-800/80 bg-[#0D1527] hidden lg:block">
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className={`flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer ${
                desktopCollapsed ? 'justify-center' : ''
              }`}
              title={desktopCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label={desktopCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {desktopCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-slate-400 hover:text-white" />
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate">Thu gọn menu</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {menuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-6 h-14 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile toggle button */}
              <button
                type="button"
                className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Đóng/mở menu"
                title="Menu điều hướng"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {/* Desktop toggle button */}
              <button
                type="button"
                className="hidden lg:flex p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors items-center justify-center"
                onClick={toggleDesktopSidebar}
                aria-label={desktopCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
                title={desktopCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              >
                {desktopCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5 text-slate-700" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-slate-700" />
                )}
              </button>
              <span className="font-bold text-base text-slate-900 truncate">{pageTitle}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {can('lms.view') && (
                <button
                  type="button"
                  onClick={() => openInMoodle()}
                  className="hidden sm:flex px-3.5 py-2 rounded-xl border border-[#0073C1] text-[#0073C1] hover:bg-blue-50 font-bold items-center gap-1.5 cursor-pointer text-xs sm:text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Mở Moodle
                </button>
              )}
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="hidden sm:inline px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 text-xs sm:text-sm transition-colors"
              >
                Xem website
              </a>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {user.avatar && (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-lg border border-slate-200 object-cover" />
                )}
                <div className="hidden md:block text-left">
                  <div className="font-bold text-slate-800 text-sm leading-tight">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[130px]">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setChangingPassword(true)}
                  title="Đổi mật khẩu"
                  aria-label="Đổi mật khẩu"
                  className="p-2 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-[#0073C1] text-slate-600 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
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
