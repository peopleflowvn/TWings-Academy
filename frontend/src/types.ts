export type CourseType = 
  | 'Chứng chỉ Chuyên môn' 
  | 'Chuyên ngành' 
  | 'Khóa học' 
  | 'Bằng cấp Trực tuyến';

export type CourseLevel = 
  | 'Người mới bắt đầu' 
  | 'Trung cấp' 
  | 'Nâng cao' 
  | 'Mọi cấp độ'
  | 'Chuyên viên Mới (Fresher)' 
  | 'Chuyên viên Chính' 
  | 'Quản lý / Trưởng nhóm' 
  | 'Lãnh đạo Khối / Giám đốc'
  | 'Tất cả cấp bậc';

export type CourseCategory = 
  | 'Trí tuệ nhân tạo (AI)'
  | 'Khoa học dữ liệu'
  | 'Khoa học máy tính'
  | 'Kinh doanh & Quản lý'
  | 'Công nghệ thông tin'
  | 'Ngân Hàng & Tín Dụng'
  | 'Phát triển Kỹ năng'
  | 'Ngoại ngữ & Kỹ năng'
  | string;

export type CourseDeliveryFormat = 
  | 'offline'               // Trực tiếp tại cơ sở / Trụ sở Ngân hàng
  | 'hybrid'                // Kết hợp Trực tiếp + Online
  | 'online_external_lms';  // Online qua nền tảng LMS chuyên biệt (làm việc riêng)

export interface Partner {
  id: string;
  name: string;
  logoText?: string;
  logoColor?: string;
  type?: 'university' | 'company';
  badgeIcon?: string;
  logoUrl?: string;
  slogan?: string;
  themeColor?: string;
  description?: string;
  tag?: string;
  websiteUrl?: string;
}

export type PartnerItem = Partner;

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswerId: string;
  explanation: string;
}

export interface ResourceAttachment {
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'code' | 'zip';
  downloadUrl: string;
}

export interface Flashcard {
  id: string;
  term: string;
  ipa?: string;
  meaning?: string;
  example?: string;
  type?: string;
  exampleSentence?: string;
  definitionVi?: string;
  definitionEn?: string;
  exampleTranslation?: string;
}

export interface NoteItem {
  id: string;
  courseId?: string;
  lessonId: string;
  lessonTitle?: string;
  timestamp: string;
  timestampSeconds?: number;
  content: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz' | 'project' | 'audio_listening' | 'flashcard' | 'pdf_material';
  isFreePreview?: boolean;
  videoDurationSeconds?: number;
  videoUrl?: string;
  youtubeId?: string;
  videoPoster?: string;
  transcript?: string;
  videoTranscript?: string;
  readingContent?: string;
  audioUrl?: string;
  audioScript?: string;
  flashcards?: Flashcard[];
  pdfTitle?: string;
  pdfPages?: string[];
  quizQuestions?: QuizQuestion[];
  resources?: ResourceAttachment[];
}

export interface Module {
  id: string;
  title: string;
  order?: number;
  duration?: string;
  description?: string;
  lessons: Lesson[];
}

export type Chapter = Module;

export interface Instructor {
  id: string;
  name: string;
  title: string;
  organization?: string;
  avatar: string;
  bio: string;
  credential?: string;
  email?: string;
  phone?: string;
  expertiseCourses?: string[];
  assignedCohorts?: string[];
  yearsOfExperience?: number;
  status?: 'active' | 'on_leave' | 'adjunct';
  bankPosition?: string;
  linkedinUrl?: string;
}

// -------------------------------------------------------------
// EMAIL TEMPLATES & RESEND API HUB (WITH WEBHOOK TRACKING)
// -------------------------------------------------------------
export type ResendEmailStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'simulated';

export interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  category: 'admission' | 'payment' | 'scheduling' | 'marketing' | 'lms' | 'crm' | 'security' | 'corporate';
  subject: string;
  body: string; // HTML and template string with {{variables}}
  variables: string[];
  description: string;
  isDefault?: boolean;
  updatedAt: string;
}

export interface ResendWebhookEvent {
  id: string;
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  createdAt: string;
  emailId: string;
  from: string;
  to: string[];
  subject: string;
  payload?: any;
}

export interface EmailSendLog {
  id: string;
  templateId: string;
  templateName: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  openCount?: number;
  clickedAt?: string;
  clickCount?: number;
  lastClickedUrl?: string;
  bouncedAt?: string;
  bounceReason?: string;
  status: ResendEmailStatus;
  resendMessageId?: string;
  errorMessage?: string;
  previewUrl?: string;
  renderedHtml?: string;
  webhookEvents?: Array<{
    type: string;
    timestamp: string;
    details?: string;
  }>;
}

export interface ResendWebhookConfig {
  webhookUrl: string;
  signingSecret: string;
  enabledEvents: string[];
  status: 'active' | 'listening' | 'not_configured';
  lastPingAt?: string;
}

export interface CourseReview {
  id: string;
  studentName: string;
  role: string; // e.g. "Chuyên viên QHKH Doanh nghiệp - MSB Sở Giao Dịch"
  avatar: string;
  rating: number; // 1 - 5
  date: string;
  comment: string;
  verifiedStudent?: boolean;
}

export interface CourseReadinessItem {
  key: string;
  label: string;
  required: boolean;
  ok: boolean;
  hint: string;
}

export interface Course {
  /** Publishing workflow (staff API): draft -> review -> published -> archived. */
  status?: 'draft' | 'review' | 'published' | 'archived';
  reviewNote?: string;
  publishedAt?: string | null;
  updatedAt?: string;
  readiness?: CourseReadinessItem[];
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
  overview?: string;
  partner?: Partner;
  type?: CourseType;
  level: CourseLevel;
  deliveryFormat?: CourseDeliveryFormat; // offline | hybrid | online_external_lms
  locationText?: string; // e.g. "Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội"
  /** Public API: average of approved learner reviews (0 when none) and their number. */
  rating: number;
  reviewsCount: number;
  /** Public API: learners who were given access to the course. */
  learnersCount?: number;
  duration: string;
  skills?: string[];
  instructors?: Instructor[];
  instructor?: Instructor;
  thumbnail: string;
  category: string;
  careerRole?: string;
  badgeSection?: 'most_popular' | 'hot_new' | 'trending_ai' | 'python' | 'data_analytics' | 'project_management';
  badgeType?: 'bestseller' | 'recommended' | 'new' | 'useful';
  price: number;
  /** Public API: the struck-through price, only during a dated promotion (else equals price). */
  originalPrice: number;
  /** Staff: last day of the promotion; without it no struck-through price is shown. */
  saleEndsOn?: string | null;
  /** Public API: last day of the struck-through price while it is shown. */
  promotionEndsOn?: string | null;
  /** Public API: false when no intake takes learners (the page offers a consultation instead). */
  checkoutOpen?: boolean;
  /** Pay-in-installments plan offered at checkout (1 = pay in full only). */
  installmentCount?: number;
  installmentIntervalDays?: number;
  /** Certificate requires at least this attendance % (0 = no requirement). */
  minAttendanceRate?: number;
  /** Intakes still open for registration (public API). */
  upcomingCohorts?: {
    name: string;
    startDate: string | null;
    registrationDeadline: string | null;
    location: string;
    status: 'opening' | 'upcoming';
    seatsLeft: number;
    /** e.g. "Trực tiếp thứ 2-4-6, 19:00–21:00" */
    scheduleText?: string;
    /** Price for this intake today (early bird until earlyBirdDeadline). */
    price?: number;
    earlyBirdDeadline?: string | null;
  }[];
  youtubeTrialUrl?: string; // e.g. "https://www.youtube.com/watch?v=sal78ACtGTc"
  youtubeVideoId?: string;  // e.g. "sal78ACtGTc"
  syllabus?: Module[];
  chapters?: Module[];
  learningObjectives?: string[];
  highlights?: string[];
  objectives?: string[];
  targetAudience?: string[];
  requirements?: string[];
  reviews?: CourseReview[];
  guarantees?: string[];
  lessonsCount?: number;
}

export interface Coupon {
  id?: string;
  code: string;
  discountPercent: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  expireDate?: string;
  validUntil?: string;
  description: string;
  usageCount?: number;
  maxUsage?: number;
  isActive: boolean;
}

// -------------------------------------------------------------
// ADMISSION CAMPAIGNS (courses, quotas, registration links)
// -------------------------------------------------------------
/**
 * A course offered by an admission campaign: its quota and, for train-to-hire courses, the job it leads
 * to at the partner (used when referring graduates).
 */
export interface CampaignCourse {
  id: string;
  courseId: string;
  targetQuota: number;
  positionTitle: string;
  department: string;
  salaryRange: string;
}

export interface AdmissionCampaign {
  id: string;
  /** The utm_campaign value of its registration links (unique). */
  code: string;
  name: string;
  startDate: string; // dd/mm/yyyy
  deadline: string; // dd/mm/yyyy
  status: CampaignStatus;
  targetHeadcount: number;
  /** Learners who may study (paid, or first installment paid), counted by the server. */
  totalEnrolled: number;
  positions: CampaignCourse[];
  leadRecruiter: string;
  scholarshipBudget: number;
  location: string;
  description: string;
  /** Leads of the campaign (linked or carrying its code), counted by the server over every lead. */
  funnel?: CampaignFunnel;

  // On the public site, like a job posting (/tuyen-sinh/<slug>)
  slug: string;
  /** "Hiện trên website": only while the status is "active"; dates still apply. */
  isPublished: boolean;
  isFeatured: boolean;
  /** Show the places left on the site. */
  showQuota: boolean;
  summary: string;
  image: string;
  viewCount: number;
  /** Server: live | scheduled | off, and why. */
  websiteState?: 'live' | 'scheduled' | 'off';
  websiteLabel?: string;
}

export type CampaignStatus = 'planning' | 'active' | 'paused' | 'full' | 'closed' | 'expired';

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  planning: 'Lên kế hoạch',
  active: 'Đang tuyển sinh',
  paused: 'Tạm dừng',
  full: 'Đã đủ chỉ tiêu',
  closed: 'Đã đóng',
  expired: 'Hết hạn'
};

export interface CampaignFunnel {
  leads: number;
  stages: { stage: CRMStatus; count: number }[];
  courses: { courseId: string; leads: number; paid: number }[];
}

// -------------------------------------------------------------
// CRM COURSE COHORT & CLASS LIFECYCLE (Đóng/Mở lớp & Định tuyến)
// -------------------------------------------------------------
export type CohortStatus = 'opening' | 'full' | 'closed' | 'in_progress' | 'completed' | 'upcoming';

export interface CourseCohort {
  id: string;
  courseId: string;
  courseTitle: string;
  name: string;
  startDate: string;
  registrationDeadline: string;
  capacity: number;
  status: CohortStatus;
  nextCohortId?: string;
  nextCohortName?: string;
  autoRolloverWaitlist?: boolean;
  trainerName?: string;
  leadInstructorId?: string;
  leadInstructorName?: string;
  instructorAvatar?: string;
  location?: string;
  notes?: string;
}

// -------------------------------------------------------------
// CRM LEAD & ORDER (All 6 sections matching Image 4 & 5)
// -------------------------------------------------------------
export type CRMStatus = 
  | '1. Mới'
  | '2. Đã tiếp cận'
  | '3. Đang tư vấn'
  | '4. Hẹn gặp'
  | '5. Đã đóng phí'
  | '6. Chăm sóc lại'
  | '7. Đã hủy';

export type PaymentStatus = 'Chưa thanh toán' | 'Đã đóng phí' | 'Đã đóng 1 phần' | 'Đã hoàn tiền';

/** The person behind a registration, as one registration's detail shows it (CCCD masked). */
export interface LearnerProfile {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string | null;
  gender: string;
  area: string;
  currentResidence: string;
  educationLevel: string;
  university: string;
  major: string;
  citizenIdMasked: string;
  hasCv: boolean;
  dossierMissing: string[];
}

/**
 * One registration of a learner to a course or program (staff API /staff/orders/): from first contact
 * through consultation, payment, learning and job placement. The person's details are the learner's.
 */
export interface Order {
  id: string;
  orderCode: string;
  courseId: string;
  /** A program registration (gói khóa) has a program and no course. */
  programId?: string | null;
  courseTitle: string;
  /** The intake (class) the learner is placed in; batchCohort keeps its name. */
  cohortId?: string | null;
  batchCohort?: string;
  /** The consultant (staff user id) in charge; pic keeps their name. */
  assignedTo?: string | null;
  pic?: string;
  /** Why the registration was cancelled ('7. Đã hủy'). */
  lostReason?: string;
  /** Write-only: the call-back day when moving to '6. Chăm sóc lại'. */
  nextContactOn?: string;
  /** The learner (one per person) this registration belongs to. */
  learnerId?: string | null;
  learnerCode?: string;
  /** Detail only: the learner's details (the list leaves it out). */
  learnerProfile?: LearnerProfile | null;
  /** Detail only: the learner's other registrations. */
  relatedOrders?: { id: string; orderCode: string; courseTitle: string; status: string; crmStatus: string; createdAt: string }[] | null;
  /** The admission campaign the lead came from (campaignCode keeps its code). */
  campaign?: string | null;
  campaignCode?: string;

  // Contact typed for this registration
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  referrerName?: string;
  referrerPhone?: string;
  referrerStaffCode?: string;

  // Consultation
  source?: string;
  consultNeed?: string;
  interestedCourse?: string;
  interestLevel?: 'Rất cao' | 'Cao' | 'Trung bình' | 'Thấp' | 'Đang phân vân';
  crmStatus?: CRMStatus;
  consultDetail?: string;
  /** First response to a new lead (deadline and when it happened). */
  responseDueAt?: string | null;
  firstResponseAt?: string | null;
  termsAcceptedAt?: string | null;
  dossierSubmittedAt?: string | null;

  // Tuition (payments, installments and refunds: /billing/)
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountCode?: string;
  tuitionFee?: number;
  totalReceivable?: number;
  totalPaidAmount?: number;
  status: 'paid' | 'pending' | 'cancelled' | 'refunded';
  paymentMethod: 'vietqr' | 'free' | 'card' | 'transfer' | 'cash';
  paidAt?: string;
  createdAt: string;

  // Learning (Moodle progress and certificates: /lms/; jobs: placements)
  trainingStatus?: string;

  /** Same learner, same course, still open. */
  isDuplicate?: boolean;
  duplicateCount?: number;
  duplicateNote?: string;

  timelineActivities?: Array<{
    id: string;
    type: 'call' | 'zalo' | 'email' | 'meeting' | 'note' | 'agent_research' | 'payment';
    title: string;
    content: string;
    actor: string;
    timestamp: string;
  }>;
  followupTasks?: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    isCompleted: boolean;
    assignedTo: string;
  }>;
}

// -------------------------------------------------------------
// POST / ARTICLE WITH SEO SCORING
// -------------------------------------------------------------
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Markdown or HTML
  featuredImage: string;
  category: string;
  author: string;
  publishedAt: string;
  status: 'published' | 'draft' | 'scheduled';
  tags: string[];
  viewsCount: number;

  // SEO Fields
  metaTitle: string;
  metaDescription: string;
  /** Staff only: the public API leaves it out (public pages must not rely on it). */
  focusKeyword: string;
  canonicalUrl?: string;
  /** Staff only (not in the public API). */
  seoScore: number; // 0 - 100
  seoChecks: {
    titleLength: boolean;
    metaDescLength: boolean;
    keywordInTitle: boolean;
    keywordInMeta: boolean;
    keywordInContent: boolean;
    keywordDensity: number; // e.g. 1.8%
    hasHeadings: boolean;
    hasFeaturedImage: boolean;
    contentWordCount: number;
    wordCountPassed: boolean;
  };
}

// -------------------------------------------------------------
// USER MANAGEMENT & RBAC
// -------------------------------------------------------------
export type UserRole = 
  | 'super_admin'         // Quản trị tối cao (Toàn quyền)
  | 'content_seo'         // Quản lý Nội dung, Bài viết & SEO
  | 'sales_crm'           // Chuyên viên Tư vấn & CRM Khách hàng
  | 'academic_management' // Quản lý Đào tạo, Chứng chỉ & Việc làm
  | 'finance_accountant'  // Kế toán, Đối soát VietQR & Hoa hồng
  | 'corporate_training'; // Đào tạo doanh nghiệp (B2B): khách hàng, lớp, kết quả, nghiệm thu

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'crm' | 'courses' | 'homepage' | 'articles_seo' | 'finance' | 'rbac' | 'system' | 'corporate';
  categoryLabel: string;
  riskLevel?: 'high' | 'medium' | 'low';
}

export interface RolePermissionConfig {
  role: UserRole;
  roleName: string;
  department: string;
  description: string;
  color: string;
  badgeBg: string;
  allowedPermissionCodes: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone: string;
  status: 'active' | 'suspended';
  lastActive: string;
  permissions: string[];
  customOverrides?: {
    grantedCodes?: string[];
    revokedCodes?: string[];
  };
}

// -------------------------------------------------------------
// SITE SEO & GENERAL SETTINGS
// -------------------------------------------------------------
export interface SiteSEOSettings {
  siteName: string;
  /** Public channels (footer, floating contact button); empty = not shown. */
  facebookUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  /** Zalo: phone number or zalo.me link. */
  zalo?: string;
  /** Custom legal pages (HTML, sanitised by the server); empty = the built-in default text. */
  privacyPolicyHtml?: string;
  termsHtml?: string;
  siteSlogan: string;
  faviconUrl: string;
  logoUrl: string;
  logoDarkUrl?: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultKeywords: string[];
  ogImageUrl: string;
  canonicalDomain: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  robotsTxt: string;
  hotline: string;
  email: string;
  address: string;
}

// -------------------------------------------------------------
// HERO BANNER SLIDER ITEM
// -------------------------------------------------------------
export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string; // e.g. "from-[#071328] via-[#0E2042] to-[#0B1936]"
  buttonText: string;
  buttonAction: 'explore_ai' | 'browse_catalog' | 'consultation' | 'youtube_trial' | 'custom_link';
  buttonStyle: 'link' | 'primary';
  partnerBadges: Array<{ name: string; color?: string; bg?: string; text?: string }>;
  imageUrl: string;
  floatingBadges: Array<{ text: string; sub?: string; iconColor?: string; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }>;
  // Full image banner mode
  displayType?: 'card' | 'image_only';
  fullBannerImageUrl?: string;
  linkUrl?: string; // internal anchor (e.g. #dang-ky, #khoa-hoc-ban-chay) or external URL
  targetBlank?: boolean;
  showOverlayText?: boolean;
  showOverlayButton?: boolean;
}

export interface StudentEnrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  completedLessons: string[];
  progressPercent: number;
  lastActive: string;
  quizScores?: Record<string, number>;
}

export interface GalleryPhoto {
  id: string;
  title?: string;
  caption?: string;
  date?: string;
  participants?: string;
  imageUrl?: string;
  url?: string;
  description?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  quote: string;
  outcome: string;
  companyLogo?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isExpandedByDefault?: boolean;
}

export interface CMSSectionsConfig {
  hero: {
    enabled: boolean;
    title: string;
    subSlogan?: string;
    subtitle?: string;
    description?: string;
    formTitle?: string;
  };
  partners: {
    enabled: boolean;
    title: string;
    items: PartnerItem[];
  };
  exploreTabs?: {
    enabled: boolean;
    title: string;
  };
  bestsellers: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    bgColor?: string;
  };
  trendingAI?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
  };
  certificates?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
  };
  degrees?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
  };
  courseraPlus?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    badgeText?: string;
    bulletPoints?: string[];
  };
  testimonials?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    /** Entered in /app from TWings' own surveys (edited for the website). */
    items?: Testimonial[];
  };
  businessCTA?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
  };
  faq?: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    items?: FAQItem[];
  };
  intro: { 
    enabled: boolean; 
    eyebrow?: string; 
    headline?: string; 
    description?: string; 
    title?: string;
    buttonText?: string;
  };
  recommended: { enabled: boolean; title: string; subtitle?: string; bgColor?: string };
  newReleases: { enabled: boolean; title: string; subtitle?: string; bgColor?: string };
  mostUseful: { enabled: boolean; title: string; subtitle?: string; bgColor?: string };
  instructors: { enabled: boolean; title: string; subtitle?: string; items: Instructor[] };
  gallery: { enabled: boolean; title: string; photos: GalleryPhoto[] };
  about: { 
    enabled: boolean; 
    title?: string; 
    subtitle?: string; 
    lead?: string; 
    vision?: string; 
    mission: string[]; 
    coreValues: string[];
  };
  contact: {
    address?: string;
    hotline?: string;
    email?: string;
    facebook?: string;
    copyright?: string;
  };
}
