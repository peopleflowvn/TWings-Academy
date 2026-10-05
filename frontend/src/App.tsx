import React, { Suspense, lazy, useEffect, useState } from 'react';
import { 
  Course, 
  Order, 
  CMSSectionsConfig,
  HeroBannerItem,
  Article,
  AdminUser
} from './types';
import { 
  COURSES, 
  INITIAL_ORDERS as COURSERA_INITIAL_ORDERS,
  HERO_BANNERS,
  INITIAL_ARTICLES
} from './data/courseraData';
import { DEFAULT_CMS_SECTIONS } from './data/coursesData';
import { api, isBackendEnabled, Paginated } from './lib/api';

// Coursera Components
import { CourseraHeader } from './components/CourseraHeader';
import { CourseraHeroBanners } from './components/CourseraHeroBanners';
import { CourseraPartnersBar } from './components/CourseraPartnersBar';
import { CourseraShelf } from './components/CourseraShelf';
import { CourseraPlusBanner } from './components/CourseraPlusBanner';
import { CourseraTestimonials } from './components/CourseraTestimonials';
import { CourseraFAQ } from './components/CourseraFAQ';
import { CourseraFooter } from './components/CourseraFooter';
import { IntroSection } from './components/IntroSection';
import { AboutSection } from './components/AboutSection';

// Subpages & Modals
import { CourseraCatalogPage } from './components/CourseraCatalogPage';
import { CourseraCourseDetailPage } from './components/CourseraCourseDetailPage';
import { CourseraArticlesPage } from './components/CourseraArticlesPage';
import { CourseraArticleDetailPage } from './components/CourseraArticleDetailPage';
import { CourseraCheckoutModal, CheckoutPrefill } from './components/CourseraCheckoutModal';
import { StaffLoginGate } from './components/cms/StaffLoginGate';
import { RegistrationModal } from './components/RegistrationModal';
import { YouTubeTrialModal } from './components/YouTubeTrialModal';

// The CMS is only needed by staff: keep it out of the public bundle.
const CourseraCMSAdmin = lazy(() =>
  import('./components/CourseraCMSAdmin').then((m) => ({ default: m.CourseraCMSAdmin }))
);

type View = 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'cms';

// The staff CMS & CRM lives at /app only; the public site has no link to it.
const CMS_PATH = '/app';
const PUBLIC_TITLE = document.title;
const isCmsPath = () => {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path === CMS_PATH || path.startsWith(`${CMS_PATH}/`);
};

export default function App() {
  // Navigation View State (User: "Bỏ chế độ bàn học của tôi đi", thêm bài viết chuẩn SEO, CMS CRM)
  const [currentView, setCurrentView] = useState<View>(() => (isCmsPath() ? 'cms' : 'home'));

  // Keep the URL in step with the CMS: /app for staff, / for the public site (browser back/forward too).
  useEffect(() => {
    const onPopState = () => setCurrentView(isCmsPath() ? 'cms' : 'home');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    const wantCms = currentView === 'cms';
    if (wantCms !== isCmsPath()) window.history.pushState(null, '', wantCms ? CMS_PATH : '/');
    document.title = wantCms ? 'TWings CMS Quản trị & CRM' : PUBLIC_TITLE;
  }, [currentView]);

  // Core Data
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [orders, setOrders] = useState<Order[]>(COURSERA_INITIAL_ORDERS);
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [cmsSections, setCmsSections] = useState<CMSSectionsConfig>(DEFAULT_CMS_SECTIONS);
  const [banners, setBanners] = useState<HeroBannerItem[]>(HERO_BANNERS);

  // Active Selected Course & Article
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES[0]);
  const [selectedArticle, setSelectedArticle] = useState<Article>(INITIAL_ARTICLES[0]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('Tất cả');

  // Modals State
  const [checkoutCourse, setCheckoutCourse] = useState<Course | null>(null);
  const [checkoutPrefill, setCheckoutPrefill] = useState<CheckoutPrefill | undefined>(undefined);
  const [registrationCourse, setRegistrationCourse] = useState<Course | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [trialVideo, setTrialVideo] = useState<{ videoId: string; title: string; course?: Course } | null>(null);

  // Enrolled courses state
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([
    'google-data-analytics',
    'deeplearning-machine-learning'
  ]);

  // Live content from the Django API; the bundled demo data stays as an offline fallback.
  useEffect(() => {
    if (!isBackendEnabled()) return;
    let cancelled = false;
    const load = async () => {
      const [courseRes, articleRes, bannerRes, sectionsRes] = await Promise.allSettled([
        api.get<Course[]>('/public/courses/'),
        api.get<Paginated<Article>>('/public/articles/'),
        api.get<HeroBannerItem[]>('/public/banners/'),
        api.get<{ data: CMSSectionsConfig }>('/public/site-config/homepage_sections/')
      ]);
      if (cancelled) return;
      if (courseRes.status === 'fulfilled' && courseRes.value.length) {
        setCourses(courseRes.value);
        setSelectedCourse(courseRes.value[0]);
      }
      if (articleRes.status === 'fulfilled' && articleRes.value.results.length) {
        setArticles(articleRes.value.results);
        setSelectedArticle(articleRes.value.results[0]);
      }
      if (bannerRes.status === 'fulfilled' && bannerRes.value.length) setBanners(bannerRes.value);
      if (sectionsRes.status === 'fulfilled' && sectionsRes.value.data?.hero) {
        setCmsSections({ ...DEFAULT_CMS_SECTIONS, ...sectionsRes.value.data });
      }
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Staff (CMS) actions: persisted through the API when a backend is configured ----
  const live = isBackendEnabled();
  const reportError = (err: unknown) =>
    window.alert(err instanceof Error ? err.message : 'Thao tác thất bại, vui lòng thử lại.');

  const loadStaffData = (user: AdminUser) => {
    if (!user.permissions.includes('crm.view_leads')) return;
    api
      .get<Paginated<Order>>('/staff/orders/?pageSize=200')
      .then((res) => setOrders(res.results))
      .catch(reportError);
  };

  const handleAddCourse = async (newC: Course) => {
    if (!live) return setCourses([newC, ...courses]);
    try {
      const saved = await api.post<Course>('/staff/courses/', newC);
      setCourses([saved, ...courses]);
    } catch (err) {
      reportError(err);
    }
  };

  const handleUpdateCourse = async (updC: Course) => {
    let saved = updC;
    if (live) {
      try {
        saved = await api.patch<Course>(`/staff/courses/${updC.id}/`, updC);
      } catch (err) {
        return reportError(err);
      }
    }
    setCourses(courses.map((c) => (c.id === saved.id ? saved : c)));
    if (selectedCourse?.id === saved.id) setSelectedCourse(saved);
  };

  const handleDeleteCourse = async (id: string) => {
    if (live) {
      try {
        await api.delete(`/staff/courses/${id}/`);
      } catch (err) {
        return reportError(err);
      }
    }
    setCourses(courses.filter((c) => c.id !== id));
  };

  // Fields the server owns or that have their own endpoints: never sent in a PATCH.
  const ORDER_READ_ONLY = new Set([
    'id', 'orderCode', 'totalPaidAmount', 'paidAt', 'isDuplicate', 'duplicateCount', 'createdAt', 'updatedAt',
    'privacyConsentAt', 'privacyConsentVersion', 'timelineActivities', 'followupTasks', 'agentResearch'
  ]);
  // Set by the UI when it marks an order paid; the server derives them from the recorded payment.
  const PAYMENT_DERIVED = new Set(['status', 'paymentStatusDetail', 'crmStatus', 'paymentDate']);

  /**
   * Persist a CRM edit made anywhere in the CMS. Only changed fields are sent (so a sales user editing
   * notes never trips the finance-field guard), "mark as paid" becomes a real recorded payment (audit
   * log, totals, LMS enrolment), and new activities / follow-ups go to their endpoints. The order is
   * then reloaded from the server, which stays the source of truth.
   */
  const handleUpdateOrderCRM = async (updated: Order) => {
    const previous = orders.find((o) => o.id === updated.id);
    setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    if (!live || !previous) return;
    const prev = previous as unknown as Record<string, unknown>;
    const next = updated as unknown as Record<string, unknown>;
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(next)) {
      if (!ORDER_READ_ONLY.has(key) && JSON.stringify(next[key]) !== JSON.stringify(prev[key])) changed[key] = next[key];
    }
    const errors: string[] = [];
    try {
      if (updated.status === 'paid' && previous.status !== 'paid') {
        PAYMENT_DERIVED.forEach((k) => delete changed[k]);
        const outstanding = (previous.totalReceivable || previous.amount || 0) - (previous.totalPaidAmount || 0);
        if (outstanding > 0) {
          await api.post(`/staff/orders/${updated.id}/confirm-payment/`, {
            amount: outstanding,
            note: 'Xác nhận thanh toán từ CMS'
          });
        } else {
          await api.patch(`/staff/orders/${updated.id}/`, { status: 'paid' });
        }
      }
      if (Object.keys(changed).length) await api.patch(`/staff/orders/${updated.id}/`, changed);

      const knownActivity = new Set((previous.timelineActivities || []).map((a) => a.id));
      for (const a of updated.timelineActivities || []) {
        // Payment entries are written by the server when it records the payment.
        if (knownActivity.has(a.id) || a.type === 'payment') continue;
        await api.post(`/staff/orders/${updated.id}/activities/`, { type: a.type, title: a.title, content: a.content });
      }
      const knownTask = new Set((previous.followupTasks || []).map((t) => t.id));
      for (const task of updated.followupTasks || []) {
        if (knownTask.has(task.id)) continue;
        try {
          await api.post(`/staff/orders/${updated.id}/followups/`, {
            title: task.title,
            dueDate: /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) ? task.dueDate.slice(0, 10) : null,
            priority: task.priority,
            isCompleted: task.isCompleted,
            assignedTo: task.assignedTo
          });
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
    try {
      const fresh = await api.get<Order>(`/staff/orders/${updated.id}/`);
      setOrders((list) => list.map((o) => (o.id === fresh.id ? fresh : o)));
    } catch {
      setOrders((list) => list.map((o) => (o.id === previous.id ? previous : o)));
    }
    if (errors.length) reportError(new Error(`Chưa lưu được một phần thay đổi: ${errors.join('; ')}`));
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    if (live) {
      try {
        await api.patch(`/staff/orders/${id}/`, { status });
      } catch (err) {
        return reportError(err);
      }
    }
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  // Shelves
  const mostPopularCourses = courses.filter((c) => c.badgeSection === 'most_popular' || c.reviewsCount > 50000);
  const trendingAICourses = courses.filter((c) => c.category === 'Trí tuệ nhân tạo (AI)' || c.badgeSection === 'trending_ai');
  const professionalCertificates = courses.filter((c) => c.type === 'Chứng chỉ Chuyên môn');
  const degreePrograms = courses.filter((c) => c.type === 'Bằng cấp Trực tuyến' || c.badgeSection === 'hot_new');

  // Navigation Handler
  const handleNavigate = (view: View) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRegistration = (course?: Course) => {
    setRegistrationCourse(course || selectedCourse || courses[0]);
    setShowRegistrationModal(true);
  };

  const handleOpenYouTubeTrial = (videoId: string, title: string, course?: Course) => {
    setTrialVideo({ videoId, title, course });
  };

  const handlePaymentSuccess = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);
    if (!enrolledCourseIds.includes(newOrder.courseId)) {
      setEnrolledCourseIds([...enrolledCourseIds, newOrder.courseId]);
    }
  };

  const handleRegistrationSuccess = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);
  };

  // CMS Portal View
  if (currentView === 'cms') {
    const renderCms = (staffUser?: AdminUser, logout?: () => void) => (
        <CourseraCMSAdmin
          courses={courses}
          orders={orders}
          cmsSections={cmsSections}
          onUpdateCMSSections={setCmsSections}
          onAddCourse={handleAddCourse}
          onUpdateCourse={handleUpdateCourse}
          onDeleteCourse={handleDeleteCourse}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateOrderCRM={handleUpdateOrderCRM}
          onPreviewCourse={(course) => {
            setSelectedCourse(course);
            setCurrentView('course-detail');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBackToHome={() => handleNavigate('home')}
          staffUser={staffUser}
          onLogout={logout}
        />
    );
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải CMS…</div>}>
        {isBackendEnabled() ? (
          <StaffLoginGate onBackToHome={() => handleNavigate('home')} onAuthenticated={loadStaffData}>
            {(user, logout) => renderCms(user, logout)}
          </StaffLoginGate>
        ) : (
          renderCms()
        )}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-800">
      {/* 1. Global Coursera Top Header */}
      <CourseraHeader
        currentView={currentView}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => handleNavigate('catalog')}
        onOpenConsultation={() => handleOpenRegistration()}
      />

      {/* 2. Subpage: Course Catalog */}
      {currentView === 'catalog' && (
        <CourseraCatalogPage
          courses={courses}
          enrolledCourseIds={enrolledCourseIds}
          initialSearchQuery={searchQuery}
          initialCategory={searchCategory}
          onSelectCourse={handleSelectCourse}
          onEnrollCourse={(c) => handleOpenRegistration(c)}
        />
      )}

      {/* 3. Subpage: Course Detail Landing Page */}
      {currentView === 'course-detail' && (
        <CourseraCourseDetailPage
          course={selectedCourse}
          isEnrolled={enrolledCourseIds.includes(selectedCourse.id)}
          onBack={() => handleNavigate('catalog')}
          onEnrollCourse={(c) => handleOpenRegistration(c)}
          onQuickRegisterSuccess={handleRegistrationSuccess}
          onStartLesson={(c, l) => {
            const vidId = l.youtubeId || c.youtubeVideoId || 'sal78ACtGTc';
            handleOpenYouTubeTrial(vidId, `${c.title} - ${l.title}`, c);
          }}
          onNavigateClassroom={(c) => {
            const vidId = c.youtubeVideoId || 'sal78ACtGTc';
            handleOpenYouTubeTrial(vidId, c.title, c);
          }}
        />
      )}

      {/* 4. Subpage: Articles & News SEO */}
      {currentView === 'articles' && (
        <CourseraArticlesPage
          articles={articles}
          courses={courses}
          onSelectArticle={(art) => {
            setSelectedArticle(art);
            setCurrentView('article-detail');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSelectCourse={handleSelectCourse}
          onOpenConsultation={() => handleOpenRegistration()}
        />
      )}

      {/* 4b. Subpage: Standalone Article Detail Page (User: "Mỗi bài viết chi tiết lại là 1 trang con chứ không phải dạng popup. Trong chi tiết bài viết cần gợi ý học các khóa học phù hợp") */}
      {currentView === 'article-detail' && selectedArticle && (
        <CourseraArticleDetailPage
          article={selectedArticle}
          allCourses={courses}
          onBackToArticles={() => handleNavigate('articles')}
          onSelectCourse={handleSelectCourse}
          onOpenConsultation={() => handleOpenRegistration()}
        />
      )}

      {/* 5. Subpage: Coursera Official Homepage */}
      {currentView === 'home' && (
        <main className="flex-1">
          {/* Horizontal Scrolling Hero Banners (User: "có thể có nhiều hơn 2 và cần chạy cuộn ngang") */}
          {cmsSections.hero.enabled && (
            <CourseraHeroBanners
              banners={banners}
              onExploreAI={() => {
                setSearchCategory('Trí tuệ nhân tạo (AI)');
                handleNavigate('catalog');
              }}
              onBrowseCatalog={() => handleNavigate('catalog')}
              onOpenConsultation={(bannerTitle) => handleOpenRegistration()}
              onOpenYouTubeTrial={(videoId, title) => handleOpenYouTubeTrial(videoId, title)}
            />
          )}

          {/* Institutional Partners Bar (Managed in CMS) */}
          {cmsSections.partners.enabled && (
            <CourseraPartnersBar 
              partners={cmsSections.partners.items} 
              title={cmsSections.partners.title}
            />
          )}

          {/* Intro Section: PDF Trang 2 - Nâng tầm năng lực, kiến tạo tương lai */}
          {cmsSections.intro?.enabled !== false && (
            <IntroSection 
              introData={cmsSections.intro}
              onScrollToSection={(id) => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          )}

          {/* Shelf 1: Most Popular Courses */}
          {cmsSections.bestsellers.enabled && (
            <CourseraShelf
              id="popular-shelf"
              badgeTag="Khóa học & Chứng chỉ hàng đầu"
              title={cmsSections.bestsellers.title || 'Các khóa học và Chứng chỉ phổ biến nhất'}
              subtitle="Khám phá các chương trình được hàng triệu học viên trên toàn cầu đăng ký nhiều nhất."
              courses={mostPopularCourses}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => handleOpenYouTubeTrial(c.youtubeVideoId || 'sal78ACtGTc', c.title, c)}
              onViewAll={() => handleNavigate('catalog')}
            />
          )}

          {/* Shelf 2: Trending AI & Generative AI */}
          {cmsSections.trendingAI?.enabled !== false && (
            <CourseraShelf
              id="ai-shelf"
              badgeTag="Đột phá công nghệ 2026"
              title={cmsSections.trendingAI?.title || 'Khám phá các khóa học AI & Công nghệ đột phá'}
              subtitle="Nắm vững kỹ năng Generative AI, AI Agents và Machine Learning từ DeepLearning.AI, Google và IBM."
              courses={trendingAICourses}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => handleOpenYouTubeTrial(c.youtubeVideoId || 'sal78ACtGTc', c.title, c)}
              onViewAll={() => {
                setSearchCategory('Trí tuệ nhân tạo (AI)');
                handleNavigate('catalog');
              }}
            />
          )}

          {/* Shelf 3: Professional Certificates */}
          {cmsSections.certificates?.enabled !== false && (
            <CourseraShelf
              id="certificates-shelf"
              badgeTag="Khởi đầu sự nghiệp mới"
              title={cmsSections.certificates?.title || 'Chứng chỉ Chuyên môn từ Google, IBM, Meta'}
              subtitle="Trang bị các kỹ năng nghề nghiệp thực tế có chứng chỉ được doanh nghiệp săn đón."
              courses={professionalCertificates}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => handleOpenYouTubeTrial(c.youtubeVideoId || 'sal78ACtGTc', c.title, c)}
              onViewAll={() => handleNavigate('catalog')}
            />
          )}

          {/* Coursera Plus / TWings Plus Subscription Banner */}
          {cmsSections.courseraPlus?.enabled !== false && (
            <CourseraPlusBanner 
              config={cmsSections.courseraPlus}
              onJoinPlus={() => handleNavigate('catalog')} 
            />
          )}

          {/* Shelf 4: Degrees & Online Master's */}
          {cmsSections.degrees?.enabled !== false && (
            <CourseraShelf
              id="degrees-shelf"
              badgeTag="Bằng cấp trực tuyến 100%"
              title={cmsSections.degrees?.title || 'Chương trình Cử nhân & Thạc sĩ từ các trường đại học uy tín'}
              subtitle="Học tập và tốt nghiệp với tấm bằng danh giá từ University of Illinois, University of London..."
              courses={degreePrograms}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => handleOpenYouTubeTrial(c.youtubeVideoId || 'sal78ACtGTc', c.title, c)}
              onViewAll={() => handleNavigate('catalog')}
            />
          )}

          {/* About TWings Academy: PDF Trang 11 - Tầm Nhìn, Sứ Mệnh, Giá Trị Cốt Lõi */}
          {cmsSections.about?.enabled !== false && (
            <AboutSection aboutData={cmsSections.about} />
          )}

          {/* Learner Outcomes & Testimonials */}
          {cmsSections.testimonials?.enabled !== false && (
            <CourseraTestimonials config={cmsSections.testimonials} />
          )}

          {/* Frequently Asked Questions */}
          {cmsSections.faq?.enabled !== false && (
            <CourseraFAQ config={cmsSections.faq} />
          )}
        </main>
      )}

      {/* Global Footer */}
      <CourseraFooter onNavigate={handleNavigate} />

      {/* Comprehensive Personal Info Registration Modal */}
      {showRegistrationModal && (
        <RegistrationModal
          course={registrationCourse}
          allCourses={courses}
          onClose={() => setShowRegistrationModal(false)}
          onSubmitSuccess={(order) => {
            handleRegistrationSuccess(order);
          }}
          onOpenVietQR={(c, prefill) => {
            setShowRegistrationModal(false);
            setCheckoutPrefill(prefill);
            setCheckoutCourse(c);
          }}
        />
      )}

      {/* YouTube Embedded Video Trial Modal (User: "cho học thử bằng cách tôi upload video lên youtube và nhúng vào") */}
      {trialVideo && (
        <YouTubeTrialModal
          course={trialVideo.course}
          customVideoId={trialVideo.videoId}
          customTitle={trialVideo.title}
          onClose={() => setTrialVideo(null)}
          onOpenRegister={(c) => {
            setTrialVideo(null);
            handleOpenRegistration(c || trialVideo.course);
          }}
        />
      )}

      {/* VietQR Checkout Modal */}
      {checkoutCourse && (
        <CourseraCheckoutModal
          course={checkoutCourse}
          prefill={checkoutPrefill}
          onClose={() => {
            setCheckoutCourse(null);
            setCheckoutPrefill(undefined);
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
