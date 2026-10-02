import React, { useState } from 'react';
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
import { CourseraCMSAdmin } from './components/CourseraCMSAdmin';
import { CourseraCheckoutModal } from './components/CourseraCheckoutModal';
import { RegistrationModal } from './components/RegistrationModal';
import { YouTubeTrialModal } from './components/YouTubeTrialModal';

export default function App() {
  // Navigation View State (User: "Bỏ chế độ bàn học của tôi đi", thêm bài viết chuẩn SEO, CMS CRM)
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'cms'>('home');

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
  const [registrationCourse, setRegistrationCourse] = useState<Course | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [trialVideo, setTrialVideo] = useState<{ videoId: string; title: string; course?: Course } | null>(null);

  // Enrolled courses state
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([
    'google-data-analytics',
    'deeplearning-machine-learning'
  ]);

  // Shelves
  const mostPopularCourses = courses.filter((c) => c.badgeSection === 'most_popular' || c.reviewsCount > 50000);
  const trendingAICourses = courses.filter((c) => c.category === 'Trí tuệ nhân tạo (AI)' || c.badgeSection === 'trending_ai');
  const professionalCertificates = courses.filter((c) => c.type === 'Chứng chỉ Chuyên môn');
  const degreePrograms = courses.filter((c) => c.type === 'Bằng cấp Trực tuyến' || c.badgeSection === 'hot_new');

  // Navigation Handler
  const handleNavigate = (view: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'cms') => {
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
    return (
      <CourseraCMSAdmin
        courses={courses}
        orders={orders}
        cmsSections={cmsSections}
        onUpdateCMSSections={setCmsSections}
        onAddCourse={(newC) => setCourses([newC, ...courses])}
        onUpdateCourse={(updC) => {
          setCourses(courses.map((c) => (c.id === updC.id ? updC : c)));
          if (selectedCourse?.id === updC.id) {
            setSelectedCourse(updC);
          }
        }}
        onDeleteCourse={(id) => setCourses(courses.filter((c) => c.id !== id))}
        onUpdateOrderStatus={(id, status) =>
          setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)))
        }
        onPreviewCourse={(course) => {
          setSelectedCourse(course);
          setCurrentView('course-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onBackToHome={() => handleNavigate('home')}
      />
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
          onOpenVietQR={(c) => {
            setShowRegistrationModal(false);
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
          onClose={() => setCheckoutCourse(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
