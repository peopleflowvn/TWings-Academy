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
  rating?: number;
  studentsCount?: number;
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
  category: 'admission' | 'payment' | 'scheduling' | 'marketing';
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
  rating: number;
  reviewsCount: number;
  enrolledCount?: string;
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
  originalPrice: number;
  /** Pay-in-installments plan offered at checkout (1 = pay in full only). */
  installmentCount?: number;
  installmentIntervalDays?: number;
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
  isFreeEnrollmentAvailable?: boolean;
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
  studentsCount?: number;
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
// ADMISSION & TALENT ACQUISITION CAMPAIGN ARCHITECTURE (TalentFlow ATS)
// -------------------------------------------------------------
export interface CampaignPositionTrack {
  id: string;
  courseId: string;
  positionTitle: string;        // e.g. "Chuyên viên QHKH Doanh Nghiệp (CIB/SME)"
  shortName: string;            // e.g. "RM Doanh Nghiệp"
  department: string;           // e.g. "Khối Khách Hàng Doanh Nghiệp MSB"
  targetQuota: number;          // Chỉ tiêu tuyển sinh/tuyển dụng (e.g. 25)
  enrolledCount: number;        // Đã nhập học
  leadInstructorName?: string;  // Giám đốc Khối / Giảng viên phụ trách
  salaryRange?: string;         // e.g. "12 - 25 Triệu / tháng"
  badgeBg: string;
  iconName?: string;
}

export interface AdmissionCampaign {
  id: string;
  code: string;                 // e.g. "CAMP-2026-Q4-HN"
  name: string;                 // e.g. "Chiến Dịch Tuyển Sinh Fresher Banker Q4/2026 - Hà Nội"
  timeRange: string;            // e.g. "Tháng 09/2026 - 12/2026"
  startDate: string;
  deadline: string;
  status: 'active' | 'planning' | 'closed';
  targetHeadcount: number;      // e.g. 100
  totalEnrolled: number;        // e.g. 78
  positions: CampaignPositionTrack[];
  leadRecruiter: string;        // e.g. "ThS. Lê Hoàng Tùng & Ban Nhân sự MSB"
  scholarshipBudget: number;    // e.g. 250000000 (250tr)
  location: string;             // e.g. "Hà Nội & Miền Bắc"
  description: string;
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

export interface Order {
  /** Steps 4-6 (staff API) */
  responseDueAt?: string | null;
  firstResponseAt?: string | null;
  termsAcceptedAt?: string | null;
  dossierSubmittedAt?: string | null;
  id: string;
  orderCode: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountCode?: string;
  status: 'paid' | 'pending' | 'cancelled';
  paymentMethod: 'vietqr' | 'free' | 'card' | 'transfer' | 'cash';
  createdAt: string;
  paidAt?: string;

  // 1: THÔNG TIN CÁ NHÂN (Image 4)
  registrationCode?: string;      // Mã đăng ký (e.g. 0412_TW3_Nguyen Thi Khanh Linh)
  customerName: string;          // Họ và tên *
  birthDate?: string;             // Ngày sinh * (dd/mm/yyyy)
  gender?: 'Nam' | 'Nữ' | 'Khác';// Giới tính
  customerPhone?: string;         // Số điện thoại *
  customerEmail?: string;         // Email *
  area?: string;                  // Khu vực * (Hà Nội, TP.HCM, Đà Nẵng, Online...)
  permanentAddress?: string;     // Hộ khẩu *
  citizenId?: string;            // CCCD *
  issuedPlace?: string;          // Nơi cấp
  currentResidence?: string;     // Nơi ở hiện tại *
  campaignCode?: string;         // Mã chiến dịch * (TW3, FB_ADS, TIKTOK, EVENT...)
  referrerName?: string;         // Tên NGT (Người giới thiệu)
  referrerEmail?: string;        // Email NGT
  referrerPhone?: string;        // SĐT NGT
  referrerStaffCode?: string;    // MNV NGT (Mã nhân viên người giới thiệu)
  educationLevel?: string;       // Trình độ (Đại học, Cao đẳng, Đã đi làm...)
  major?: string;                // Ngành học (Tài chính - Ngân hàng, Kế toán...)
  university?: string;           // Trường học (NEU, Học viện Ngân hàng, FTU...)
  graduationYear?: string;       // Năm tốt nghiệp
  contactPersonName?: string;    // Tên Người liên hệ
  contactPersonPhone?: string;   // SĐT Người liên hệ
  contactRelation?: string;      // Mối quan hệ NLH (Bố, Mẹ, Anh/Chị...)
  cvLink?: string;               // Link CV

  // 2: THÔNG TIN TIẾP CẬN VÀ CHĂM SÓC HỌC VIÊN TIỀM NĂNG (Image 4)
  source?: string;               // Nguồn * (Facebook, Website, Hotline, Giới thiệu...)
  registeredAt?: string;          // Ngày đăng ký *
  reachedDate?: string;          // Ngày tiếp cận *
  consultNeed?: string;          // Cần tư vấn về
  interestedCourse?: string;     // Khóa quan tâm *
  pic?: string;                   // PIC * (Người phụ trách: HuongNT22, TungLH, ChiNK...)
  studyArea?: string;            // Khu vực học * (Hà Nội, TP.HCM, Online...)
  approachMethod?: string;       // Hình thức tiếp cận * (Gọi điện, Zalo, Gặp trực tiếp HO MSB...)
  interestLevel?: 'Rất cao' | 'Cao' | 'Trung bình' | 'Thấp' | 'Đang phân vân'; // Mức độ quan tâm *
  crmStatus?: CRMStatus;          // Trạng thái * (1. Mới, 2. Đã tiếp cận, 3. Đang tư vấn, 4. Hẹn gặp, 5. Đã đóng phí...)
  enrolledCourseName?: string;   // Khóa đăng ký *
  batchCohort?: string;          // Đợt khai giảng * (Khóa học 8, Khóa học 9...)
  promotionProgram?: string;     // CTKM * (Cashback 2tr, Học bổng 20%...)
  consultDetail?: string;        // Chi tiết * (Ghi chú tư vấn)

  // 3: THÔNG TIN THANH TOÁN CỦA HỌC VIÊN (Image 4)
  tuitionFee?: number;           // Học phí *
  totalReceivable?: number;      // Số tiền phải thu *
  paidAmountL1?: number;         // Số tiền đã đóng L1 *
  paymentStatusDetail?: PaymentStatus; // Trạng thái TT *
  paymentMethodDetail?: string;  // Phương thức TT * (Chuyển khoản, Tiền mặt...)
  paymentDate?: string;          // Ngày thanh toán *
  paidAmountL2?: number;         // Số tiền đã đóng L2 *
  transactionCode?: string;      // Mã giao dịch
  bankAccountNumber?: string;    // STK
  bankName?: string;             // Ngân hàng
  totalPaidAmount?: number;      // Tổng tiền đã đóng
  referralCommission?: number;   // Hoa hồng cho NGT
  paymentNote?: string;          // Ghi chú thanh toán

  // 4: THÔNG TIN THANH TOÁN THƯỞNG GIỚI THIỆU NẾU CÓ (Image 5)
  referralRewardAmount?: number; // Số tiền thưởng
  referralRewardStatus?: 'Chờ duyệt' | 'Đã chi' | 'Không duyệt'; // Tình trạng
  referralRewardBankAcc?: string;// STK
  referralRewardDate?: string;   // Ngày trả thưởng
  referralRewardNote?: string;   // Ghi chú TT thưởng

  // 5: QUẢN LÝ ĐÀO TẠO & VIỆC LÀM (Image 5)
  traineeEmail?: string;         // Email
  partnerTraineeId?: string;     // ID MSB
  partnerEmail?: string;         // Email MSB
  trainingStatus?: 'Đang học' | 'Đã tốt nghiệp' | 'Bảo lưu' | 'Thôi học'; // TT chương trình
  certificateType?: string;      // Loại chứng nhận
  certificateDate?: string;      // Ngày cấp CN
  certificateNumber?: string;    // Mã số chứng nhận
  placementCompany?: string;     // ĐV tiếp nhận LV (Đơn vị tiếp nhận làm việc)
  placementStatus?: 'Chờ phỏng vấn' | 'Đã thực tập' | 'Đã ký HĐLĐ'; // TT tiếp nhận CV
  workStartDate?: string;        // Ngày vào LV
  guaranteeStartDate?: string;   // Ngày bắt đầu BL (Bảo lãnh)
  trainingNote?: string;         // Ghi chú QLĐT

  // 6: THÔNG TIN THANH TOÁN HỌC LẠI NẾU CÓ (Image 5)
  reExamCount?: number;          // Số môn Thi lại
  retakeCount?: number;          // Số môn Học lại
  fieldStudyRetake?: string;     // Học lại thực địa
  retakeAmount?: number;         // Số tiền HL/TL
  retakePaymentStatus?: string;  // Tình trạng đóng
  retakeNote?: string;           // Ghi chú TTHL

  // 7: CRM PHÁT HIỆN TRÙNG LẶP & ĐA KHÓA HỌC
  isDuplicate?: boolean;
  duplicateCount?: number;
  duplicateNote?: string;
  otherEnrolledCourses?: Array<{ id: string; code: string; title: string; date: string }>;

  // 8: COMP AI AGENTIC CRM (Evidence Ledger, Battle Card & Autonomous Research)
  agentResearch?: {
    verifiedFacts: Array<{
      id: string;
      fact: string;
      verifiedAt: string;
      confidence: number;
      category: 'background' | 'career_goal' | 'budget' | 'timing';
      source: string;
    }>;
    leadQualityTier: 'Tier A' | 'Tier B' | 'Tier C' | 'Tier D';
    readinessScore: number; // 0 - 100
    battleCard: {
      candidateProfileSummary: string;
      strengths: string[];
      objections: string[];
      recommendedPitch: string;
      suggestedCoursePackage: string;
    };
    researchStatus: 'idle' | 'running' | 'completed';
    lastResearchedAt: string;
  };
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
  focusKeyword: string;
  canonicalUrl?: string;
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
  | 'finance_accountant'; // Kế toán, Đối soát VietQR & Hoa hồng

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'crm' | 'courses' | 'homepage' | 'articles_seo' | 'finance' | 'rbac' | 'system';
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
