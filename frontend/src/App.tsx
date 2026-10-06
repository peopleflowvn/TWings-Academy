import React, { useEffect, useState } from 'react';
import { 
  Course, 
  Order, 
  CMSSectionsConfig,
  HeroBannerItem,
  Article
} from './types';
import { 
  COURSES, 
  INITIAL_ORDERS as COURSERA_INITIAL_ORDERS,
  HERO_BANNERS,
  INITIAL_ARTICLES
} from './data/courseraData';
import { DEFAULT_CMS_SECTIONS } from './data/coursesData';
import { api, isBackendEnabled, Paginated } from './lib/api';
import { parseRoute, routePath, View } from './lib/routes';
import { applyPageMeta } from './lib/siteSeo';

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
import { CourseraAboutPage } from './components/CourseraAboutPage';
import { CourseraCheckoutModal, CheckoutPrefill } from './components/CourseraCheckoutModal';
import { RegistrationModal } from './components/RegistrationModal';
import { YouTubeTrialModal } from './components/YouTubeTrialModal';
import { FloatingContact } from './components/FloatingContact';

export default function App() {
  // Every page has its own URL (/khoa-hoc/<slug>, /tin-tuc/<slug>, /ve-chung-toi...): see lib/routes.ts.
  // The staff app (/app) and program / account pages are separate bundles (main.tsx).
  const initialRoute = parseRoute(window.location.pathname) ?? { view: 'home' as View };
  const [currentView, setCurrentView] = useState<View>(initialRoute.view);
  // Slug from the URL waiting for the course / article list (deep link or back/forward).
  const [pendingSlug, setPendingSlug] = useState<string | undefined>(initialRoute.slug);
  // The live course / article lists have arrived (or there is no backend: bundled data only).
  const [contentLoaded, setContentLoaded] = useState(!isBackendEnabled());
  const [articleMissing, setArticleMissing] = useState<string | undefined>();

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
      setContentLoaded(true);
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Shelves
  const mostPopularCourses = courses.filter((c) => c.badgeSection === 'most_popular' || c.reviewsCount > 50000);
  const trendingAICourses = courses.filter((c) => c.category === 'Trí tuệ nhân tạo (AI)' || c.badgeSection === 'trending_ai');
  const professionalCertificates = courses.filter((c) => c.type === 'Chứng chỉ Chuyên môn');
  const degreePrograms = courses.filter((c) => c.type === 'Bằng cấp Trực tuyến' || c.badgeSection === 'hot_new');

  // ---- Routing: state <-> URL ----
  const go = (view: View, slug?: string) => {
    const path = routePath(view, slug);
    if (path !== window.location.pathname) window.history.pushState(null, '', path);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Browser back / forward.
  useEffect(() => {
    const onPopState = () => {
      const route = parseRoute(window.location.pathname) ?? { view: 'home' as View };
      setCurrentView(route.view);
      setPendingSlug(route.slug);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Resolve a slug from the URL once the lists are there (an article beyond the first page is fetched).
  useEffect(() => {
    // Wait for the live lists: the bundled demo data must not answer a deep link.
    if (!pendingSlug || !contentLoaded) return;
    if (currentView === 'course-detail') {
      const found = courses.find((c) => c.slug === pendingSlug);
      if (found) {
        setSelectedCourse(found);
        setPendingSlug(undefined);
      }
    } else if (currentView === 'article-detail') {
      const found = articles.find((a) => a.slug === pendingSlug);
      if (found) {
        setSelectedArticle(found);
        setPendingSlug(undefined);
      } else if (isBackendEnabled()) {
        api
          .get<Article>(`/public/articles/${encodeURIComponent(pendingSlug)}/`)
          .then((a) => {
            setSelectedArticle(a);
            setPendingSlug(undefined);
          })
          .catch(() => setArticleMissing(pendingSlug));
      }
    }
  }, [pendingSlug, currentView, courses, articles, contentLoaded]);

  /** Deep link still resolving, or pointing to nothing. */
  const pendingPage = (kind: 'course' | 'article') => {
    const missing = kind === 'course' ? contentLoaded : articleMissing === pendingSlug;
    return (
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center text-slate-600 space-y-3">
        {missing ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">Không tìm thấy {kind === 'course' ? 'khóa học' : 'bài viết'}</h1>
            <p className="text-sm">Trang có thể đã được đổi tên hoặc gỡ xuống.</p>
            <button type="button" onClick={() => go(kind === 'course' ? 'catalog' : 'articles')}
              className="px-4 py-2 rounded-xl bg-[#0073C1] text-white text-sm font-bold cursor-pointer">
              {kind === 'course' ? 'Xem các khóa học' : 'Xem tin tức & cẩm nang'}
            </button>
          </>
        ) : (
          <p className="text-sm">Đang tải…</p>
        )}
      </main>
    );
  };

  // Title, description, canonical and share tags of the page (same data the server gives bots).
  useEffect(() => {
    applyPageMeta(window.location.pathname);
  }, [currentView, selectedCourse, selectedArticle]);

  const handleNavigate = (view: View) => go(view);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setPendingSlug(undefined);
    go('course-detail', course.slug);
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setPendingSlug(undefined);
    go('article-detail', article.slug);
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
      {currentView === 'course-detail' && pendingSlug && pendingPage('course')}
      {currentView === 'course-detail' && !pendingSlug && (
        <CourseraCourseDetailPage
          course={selectedCourse}
          isEnrolled={enrolledCourseIds.includes(selectedCourse.id)}
          onBack={() => handleNavigate('catalog')}
          onEnrollCourse={(c) => handleOpenRegistration(c)}
          onCheckout={(c, prefill) => {
            setCheckoutPrefill(prefill);
            setCheckoutCourse(c);
          }}
          onQuickRegisterSuccess={handleRegistrationSuccess}
          onStartLesson={(c, l) => {
            const vidId = l.youtubeId || c.youtubeVideoId;
            if (vidId) handleOpenYouTubeTrial(vidId, `${c.title} - ${l.title}`, c);
            else handleOpenRegistration(c);
          }}
          onNavigateClassroom={() => {
            window.location.href = '/learn/';
          }}
        />
      )}

      {/* 4. Subpage: Articles & News SEO */}
      {currentView === 'articles' && (
        <CourseraArticlesPage
          articles={articles}
          courses={courses}
          onSelectArticle={handleSelectArticle}
          onSelectCourse={handleSelectCourse}
          onOpenConsultation={() => handleOpenRegistration()}
        />
      )}

      {/* 4b. Subpage: Standalone Article Detail Page (User: "Mỗi bài viết chi tiết lại là 1 trang con chứ không phải dạng popup. Trong chi tiết bài viết cần gợi ý học các khóa học phù hợp") */}
      {currentView === 'article-detail' && pendingSlug && pendingPage('article')}
      {currentView === 'article-detail' && !pendingSlug && selectedArticle && (
        <CourseraArticleDetailPage
          article={selectedArticle}
          allCourses={courses}
          onBackToArticles={() => handleNavigate('articles')}
          onSelectCourse={handleSelectCourse}
          onOpenConsultation={() => handleOpenRegistration()}
        />
      )}

      {/* 4c. Subpage: Standalone About Us Page (Về Chúng Tôi) */}
      {currentView === 'about' && (
        <CourseraAboutPage
          aboutData={cmsSections.about}
          onNavigate={handleNavigate}
          onOpenConsultation={() => handleOpenRegistration()}
        />
      )}

      {/* 5. Subpage: Coursera Official Homepage */}
      {currentView === 'home' && (
        <main className="flex-1">
          {/* The page's main heading for search engines and screen readers (the banners carry the visuals). */}
          <h1 className="sr-only">
            {cmsSections.about?.title || 'TWings Academy'} – Đào tạo thực chiến nghiệp vụ ngân hàng, tài chính và tuyển sinh nhân sự
          </h1>
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
              onOpenYouTubeTrial={(c) => (c.youtubeVideoId ? handleOpenYouTubeTrial(c.youtubeVideoId, c.title, c) : handleOpenRegistration(c))}
              onViewAll={() => handleNavigate('catalog')}
            />
          )}

          {/* Shelf 2: Trending AI & Generative AI */}
          {cmsSections.trendingAI?.enabled !== false && (
            <CourseraShelf
              id="ai-shelf"
              badgeTag="Đột phá công nghệ 2026"
              title={cmsSections.trendingAI?.title || 'Khám phá các khóa học AI & Công nghệ đột phá'}
              subtitle="Ứng dụng AI và công nghệ vào công việc tài chính – ngân hàng."
              courses={trendingAICourses}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => (c.youtubeVideoId ? handleOpenYouTubeTrial(c.youtubeVideoId, c.title, c) : handleOpenRegistration(c))}
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
              title={cmsSections.certificates?.title || 'Chứng chỉ chuyên môn'}
              subtitle="Trang bị các kỹ năng nghề nghiệp thực tế có chứng chỉ được doanh nghiệp săn đón."
              courses={professionalCertificates}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => (c.youtubeVideoId ? handleOpenYouTubeTrial(c.youtubeVideoId, c.title, c) : handleOpenRegistration(c))}
              onViewAll={() => handleNavigate('catalog')}
            />
          )}

          {/* TWings Plus subscription banner: only when staff switch it on (no such plan is sold yet) */}
          {cmsSections.courseraPlus?.enabled === true && (
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
              subtitle="Chương trình học dài hạn cùng các trường đối tác."
              courses={degreePrograms}
              enrolledCourseIds={enrolledCourseIds}
              onSelectCourse={handleSelectCourse}
              onEnrollCourse={(c) => handleOpenRegistration(c)}
              onOpenYouTubeTrial={(c) => (c.youtubeVideoId ? handleOpenYouTubeTrial(c.youtubeVideoId, c.title, c) : handleOpenRegistration(c))}
              onViewAll={() => handleNavigate('catalog')}
            />
          )}

          {/* About TWings Academy: Brand Pitch & Highlights */}
          {cmsSections.about?.enabled !== false && (
            <AboutSection 
              aboutData={cmsSections.about} 
              onNavigateToAbout={() => handleNavigate('about')}
              onOpenConsultation={() => handleOpenRegistration()}
            />
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
      <CourseraFooter onNavigate={handleNavigate} courses={courses} onSelectCourse={handleSelectCourse} />
      <FloatingContact />

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
