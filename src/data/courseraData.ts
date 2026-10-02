import { 
  Course, 
  Partner, 
  Testimonial, 
  FAQItem, 
  Order, 
  HeroBannerItem, 
  AdminUser, 
  Article, 
  SiteSEOSettings 
} from '../types';

export const PARTNERS: Record<string, Partner> = {
  twings: {
    id: 'twings',
    name: 'TWINGS ACADEMY',
    logoText: 'TWiNGS',
    logoColor: '#0073C1',
    type: 'company',
    slogan: 'Nâng tầm năng lực, kiến tạo tương lai',
  },
  msb: {
    id: 'msb',
    name: 'MSB Ngân hàng TMCP Hàng Hải',
    logoText: 'MSB',
    logoColor: '#EA580C',
    type: 'company',
    slogan: 'Cùng vươn tầm tài chính',
  },
  google: {
    id: 'google',
    name: 'Google',
    logoText: 'Google',
    logoColor: '#4285F4',
    type: 'company'
  },
  ibm: {
    id: 'ibm',
    name: 'IBM',
    logoText: 'IBM',
    logoColor: '#052FAD',
    type: 'company'
  },
  deeplearning: {
    id: 'deeplearning',
    name: 'DeepLearning.AI',
    logoText: 'DeepLearning.AI',
    logoColor: '#FF6F00',
    type: 'company'
  },
  stanford: {
    id: 'stanford',
    name: 'Stanford University',
    logoText: 'Stanford',
    logoColor: '#8C1515',
    type: 'university'
  },
  upenn: {
    id: 'upenn',
    name: 'University of Pennsylvania',
    logoText: 'Penn',
    logoColor: '#011F5B',
    type: 'university'
  },
  umichigan: {
    id: 'umichigan',
    name: 'University of Michigan',
    logoText: 'Michigan',
    logoColor: '#00274C',
    type: 'university'
  },
  meta: {
    id: 'meta',
    name: 'Meta',
    logoText: 'Meta',
    logoColor: '#0668E1',
    type: 'company'
  },
  vanderbilt: {
    id: 'vanderbilt',
    name: 'Vanderbilt University',
    logoText: 'Vanderbilt',
    logoColor: '#C1A265',
    type: 'university'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    logoText: 'OpenAI',
    logoColor: '#10A37F',
    type: 'company'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    logoText: 'Anthropic',
    logoColor: '#D97757',
    type: 'company'
  },
  illinois: {
    id: 'illinois',
    name: 'University of Illinois',
    logoText: 'Illinois',
    logoColor: '#13294B',
    type: 'university'
  }
};

export const DEFAULT_PARTNERS: Partner[] = [
  {
    id: 'p-msb',
    name: 'MSB Ngân hàng TMCP Hàng Hải',
    logoText: 'MSB',
    logoColor: '#EA580C',
    logoUrl: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=120&q=80',
    type: 'company',
    slogan: 'Đối tác chiến lược tuyển dụng & đào tạo thực chiến',
    websiteUrl: 'https://www.msb.com.vn'
  },
  {
    id: 'p-rox',
    name: 'Tập đoàn ROX Group',
    logoText: 'ROX GROUP',
    logoColor: '#0073C1',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=120&q=80',
    type: 'company',
    slogan: 'Tập đoàn kinh tế đa ngành hàng đầu Việt Nam',
    websiteUrl: 'https://roxgroup.vn'
  },
  {
    id: 'p-tntalent',
    name: 'TNtalent Human Resources',
    logoText: 'TNTALENT',
    logoColor: '#D97706',
    logoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&q=80',
    type: 'company',
    slogan: 'Đơn vị phát triển nguồn nhân lực chiến lược',
    websiteUrl: 'https://tntalent.vn'
  },
  {
    id: 'p-ba',
    name: 'Học viện Ngân hàng (Banking Academy)',
    logoText: 'HV NGÂN HÀNG',
    logoColor: '#0F294D',
    logoUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=120&q=80',
    type: 'university',
    slogan: 'Cơ sở đào tạo tài chính - ngân hàng hàng đầu',
    websiteUrl: 'https://www.hvnh.edu.vn'
  },
  {
    id: 'p-neu',
    name: 'Đại học Kinh tế Quốc dân (NEU)',
    logoText: 'NEU',
    logoColor: '#DC2626',
    logoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=120&q=80',
    type: 'university',
    slogan: 'Trường đại học trọng điểm quốc gia',
    websiteUrl: 'https://neu.edu.vn'
  },
  {
    id: 'p-google',
    name: 'Google Career Certificates',
    logoText: 'Google',
    logoColor: '#4285F4',
    logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80',
    type: 'company',
    websiteUrl: 'https://grow.google'
  },
  {
    id: 'p-ibm',
    name: 'IBM Skills Network',
    logoText: 'IBM',
    logoColor: '#052FAD',
    logoUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=120&q=80',
    type: 'company',
    websiteUrl: 'https://www.ibm.com'
  },
  {
    id: 'p-stanford',
    name: 'Stanford Online',
    logoText: 'Stanford',
    logoColor: '#8C1515',
    logoUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=120&q=80',
    type: 'university',
    websiteUrl: 'https://online.stanford.edu'
  },
  {
    id: 'p-illinois',
    name: 'University of Illinois',
    logoText: 'ILLINOIS',
    logoColor: '#13294B',
    logoUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=120&q=80',
    type: 'university',
    websiteUrl: 'https://illinois.edu'
  }
];

// -------------------------------------------------------------
// DYNAMIC HERO BANNERS (Horizontal Scrollable Carousel - User: "có thể có nhiều hơn 2 và cần chạy cuộn ngang")
// -------------------------------------------------------------
export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: 'banner-ai-frontier',
    title: 'Learn AI from the companies building it',
    subtitle: 'Courses and certificates from Google, OpenAI, Anthropic, and IBM - for every level and role.',
    bgGradient: 'from-[#071328] via-[#0E2042] to-[#0B1936]',
    buttonText: 'Explore AI courses',
    buttonAction: 'explore_ai',
    buttonStyle: 'link',
    partnerBadges: [
      { name: 'Google', color: '#4285F4' },
      { name: 'OpenAI', color: '#10A37F' },
      { name: 'Anthropic', color: '#D97757' },
      { name: 'IBM', color: '#60A5FA' }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    floatingBadges: [
      { text: 'Google', iconColor: '#4285F4', position: 'top-left' },
      { text: 'OpenAI', iconColor: '#10A37F', position: 'bottom-right' }
    ]
  },
  {
    id: 'banner-career-advance',
    title: 'Start, switch, or advance your career',
    subtitle: 'Grow with courses, certificates, and degrees from world-class universities and top organizations.',
    bgGradient: 'from-[#0048C8] via-[#0056D2] to-[#0073C1]',
    buttonText: 'Join for Free',
    buttonAction: 'browse_catalog',
    buttonStyle: 'primary',
    partnerBadges: [
      { name: 'Stanford', color: '#EF4444' },
      { name: 'IBM', color: '#93C5FD' },
      { name: 'Penn', color: '#FCD34D' }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    floatingBadges: [
      { text: 'IBM', position: 'top-right' },
      { text: 'Stanford', iconColor: '#EF4444', position: 'bottom-left' }
    ]
  },
  {
    id: 'banner-twings-banking',
    title: 'Đột phá Sự nghiệp Ngân hàng Thực chiến',
    subtitle: 'Đào tạo trực tiếp cùng Giám đốc khối & Chuyên gia MSB, ROX Group. Cam kết kết nối việc làm và bảo lãnh tuyển dụng.',
    bgGradient: 'from-[#0F294D] via-[#1E3A8A] to-[#0073C1]',
    buttonText: 'Đăng ký tư vấn trực tiếp',
    buttonAction: 'consultation',
    buttonStyle: 'primary',
    partnerBadges: [
      { name: 'TWINGS ACADEMY', color: '#0073C1' },
      { name: 'MSB Bank', color: '#EA580C' }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    floatingBadges: [
      { text: 'TWINGS', iconColor: '#0073C1', position: 'top-left' },
      { text: 'MSB Bank', iconColor: '#EA580C', position: 'bottom-right' }
    ]
  },
  {
    id: 'banner-genai-mastery',
    title: 'Xây dựng & Triển khai các AI Agents',
    subtitle: 'Chuyên môn hóa với DeepLearning.AI và Andrew Ng. Học cách xây dựng hệ thống tác nhân AI đa luồng thế hệ mới.',
    bgGradient: 'from-[#172554] via-[#1E3A8A] to-[#3B82F6]',
    buttonText: 'Học thử Video YouTube',
    buttonAction: 'youtube_trial',
    buttonStyle: 'link',
    partnerBadges: [
      { name: 'DeepLearning.AI', color: '#FF6F00' },
      { name: 'Stanford', color: '#8C1515' }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    floatingBadges: [
      { text: 'DeepLearning.AI', iconColor: '#FF6F00', position: 'top-left' },
      { text: 'Agentic AI', iconColor: '#60A5FA', position: 'bottom-right' }
    ]
  },
  {
    id: 'banner-online-degrees',
    title: 'Tốt nghiệp Cử nhân & Thạc sĩ Quốc tế',
    subtitle: 'Chương trình đào tạo đại học 100% trực tuyến từ University of Illinois và University of London.',
    bgGradient: 'from-[#311042] via-[#4C1D95] to-[#6D28D9]',
    buttonText: 'Khám phá bằng cấp trực tuyến',
    buttonAction: 'browse_catalog',
    buttonStyle: 'primary',
    partnerBadges: [
      { name: 'Illinois iMBA', color: '#F97316' },
      { name: 'London CS', color: '#A78BFA' }
    ],
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80',
    floatingBadges: [
      { text: 'Illinois', iconColor: '#F97316', position: 'top-right' },
      { text: 'Degree', iconColor: '#C084FC', position: 'bottom-left' }
    ]
  }
];

// -------------------------------------------------------------
// COURSES CATALOG WITH DELIVERY FORMAT & YOUTUBE TRIAL EMBED
// -------------------------------------------------------------
export const COURSES: Course[] = [
  // 1. Google Data Analytics (Online via External LMS)
  {
    id: 'google-data-analytics',
    slug: 'phan-tich-du-lieu-google',
    title: 'Phân tích dữ liệu của Google',
    subtitle: 'Khởi đầu sự nghiệp phân tích dữ liệu với chứng chỉ chuyên môn chính thức từ các chuyên gia Google.',
    partner: PARTNERS.google,
    type: 'Chứng chỉ Chuyên môn',
    level: 'Người mới bắt đầu',
    deliveryFormat: 'online_external_lms',
    rating: 4.8,
    reviewsCount: 148200,
    enrolledCount: '1.4M+',
    duration: '6 tháng (10 giờ/tuần)',
    skills: ['Data Analysis', 'SQL', 'Spreadsheets', 'Tableau', 'R Programming', 'Data Cleaning'],
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    category: 'Khoa học dữ liệu',
    careerRole: 'Data Analyst',
    badgeSection: 'most_popular',
    price: 1190000,
    originalPrice: 2400000,
    isFreeEnrollmentAvailable: true,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
    youtubeVideoId: 'kqtD5dpn9C8',
    instructors: [
      {
        id: 'inst-g1',
        name: 'Google Career Certificates Team',
        title: 'Senior Data Analytics Instructors',
        organization: 'Google',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        bio: 'Đội ngũ chuyên gia phân tích dữ liệu cao cấp tại Google thiết kế chương trình theo chuẩn tuyển dụng thực tế.'
      }
    ],
    learningObjectives: [
      'Nắm vững quy trình xử lý dữ liệu: Ask, Prepare, Process, Analyze, Share, Act',
      'Sử dụng thành thạo SQL để truy vấn cơ sở dữ liệu lớn và làm sạch dữ liệu',
      'Trực quan hóa dữ liệu thuyết phục với bảng điều khiển Tableau'
    ],
    syllabus: [
      {
        id: 'mod-1',
        title: 'Học phần 1: Nền tảng phân tích dữ liệu - Dữ liệu ở mọi nơi',
        duration: '22 giờ',
        description: 'Khám phá bức tranh tổng thể về vai trò của nhà phân tích dữ liệu trong doanh nghiệp.',
        lessons: [
          {
            id: 'les-g-1',
            title: '1.1 Video: Giới thiệu hệ sinh thái dữ liệu số',
            duration: '12 phút',
            type: 'video',
            youtubeId: 'kqtD5dpn9C8',
            isFreePreview: true
          },
          {
            id: 'les-g-2',
            title: '1.2 Đọc: Cẩm nang tư duy phản biện với dữ liệu',
            duration: '20 phút',
            type: 'reading'
          }
        ]
      }
    ]
  },

  // 2. Twings Quan hệ Khách hàng Doanh nghiệp (Offline / Trực tiếp tại Ngân hàng)
  {
    id: 'twings-qhkh-doanh-nghiep',
    slug: 'quan-he-khach-hang-doanh-nghiep-msb',
    title: 'Quan hệ Khách hàng Doanh nghiệp & Thẩm định Tín dụng SME',
    subtitle: 'Đào tạo thực chiến trực tiếp tại hội trường MSB. Thẩm định báo cáo tài chính, dòng tiền và cấu trúc gói tài trợ.',
    partner: PARTNERS.twings,
    type: 'Chứng chỉ Chuyên môn',
    level: 'Chuyên viên Chính',
    deliveryFormat: 'offline',
    locationText: 'Hội trường đào tạo MSB & Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội',
    rating: 5.0,
    reviewsCount: 342,
    enrolledCount: '1,850+ học viên',
    duration: '45 giờ thực hành trực tiếp',
    skills: ['Thẩm định Tín dụng', 'Phân tích Báo cáo Tài chính', 'Quản trị Rủi ro', 'Tài trợ Thương mại', 'Chốt Sale SME'],
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    category: 'Ngân Hàng & Tín Dụng',
    careerRole: 'Corporate Banker',
    badgeSection: 'most_popular',
    price: 7999000,
    originalPrice: 11500000,
    isFreeEnrollmentAvailable: true,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=v8D1v8J_G1o',
    youtubeVideoId: 'v8D1v8J_G1o',
    instructors: [
      {
        id: 'inst-vu-thu-phuong',
        name: 'GV Vũ Thu Phương',
        title: 'Giám đốc Phân khúc KH Doanh nghiệp MSB',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        credential: '25+ năm kinh nghiệm tài chính ngân hàng quốc tế',
        bio: 'Dẫn dắt các thương vụ tài trợ vốn lớn cho phân khúc SME và Corporate tại các ngân hàng hàng đầu.'
      }
    ],
    learningObjectives: [
      'Đọc vị rủi ro tiềm ẩn trong báo cáo tài chính doanh nghiệp và thủ thuật làm đẹp số liệu',
      'Xây dựng phương án vay vốn và thuyết trình bảo vệ trước Hội đồng Tín dụng MSB',
      'Cam kết phỏng vấn trực tiếp vào vị trí Chuyên viên QHKH Doanh nghiệp sau tốt nghiệp'
    ],
    syllabus: [
      {
        id: 'tw-mod-1',
        title: 'Học phần 1: Tổng quan Nghiệp vụ Tín dụng Doanh nghiệp tại Ngân hàng Thương mại',
        duration: '15 giờ',
        description: 'Phân loại khách hàng SME, quy định pháp lý và quy trình cấp hạn mức tín dụng.',
        lessons: [
          {
            id: 'tw-l-1',
            title: '1.1 Video: Chân dung Chuyên viên QHKH Doanh nghiệp tiêu chuẩn',
            duration: '25 phút',
            type: 'video',
            youtubeId: 'v8D1v8J_G1o',
            isFreePreview: true
          }
        ]
      }
    ]
  },

  // 3. Twings Quan hệ Khách hàng Cá nhân (Offline / Trực tiếp)
  {
    id: 'twings-qhkh-ca-nhan',
    slug: 'quan-he-khach-hang-ca-nhan',
    title: 'Quan hệ Khách hàng Cá nhân (Retail Banker Master)',
    subtitle: 'Nghiệp vụ cốt lõi thẩm định tín dụng cá nhân, báo cáo CIC và kỹ năng chốt sale thẻ, vay mua nhà, bảo hiểm.',
    partner: PARTNERS.twings,
    type: 'Chứng chỉ Chuyên môn',
    level: 'Chuyên viên Mới (Fresher)',
    deliveryFormat: 'offline',
    locationText: 'Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội',
    rating: 4.98,
    reviewsCount: 420,
    enrolledCount: '2,400+ học viên',
    duration: '40 giờ đào tạo trực tiếp',
    skills: ['Tín dụng cá nhân', 'Kiểm tra CIC', 'Tư vấn vay mua nhà', 'Khai thác nhu cầu', 'Chốt sale'],
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    category: 'Ngân Hàng & Tín Dụng',
    careerRole: 'Retail Relationship Manager',
    badgeSection: 'most_popular',
    price: 7599000,
    originalPrice: 9500000,
    isFreeEnrollmentAvailable: true,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
    youtubeVideoId: 'aircAruvnKk',
    instructors: [
      {
        id: 'inst-dang-van-thanh',
        name: 'GV Đặng Văn Thành',
        title: 'Giám đốc Bán hàng Toàn quốc',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        credential: '20 năm kinh nghiệm Quản trị Bán lẻ Ngân hàng',
        bio: 'Nguyên Giám đốc Vùng và Giám đốc Bán hàng toàn quốc tại các ngân hàng TMCP lớn.'
      }
    ],
    learningObjectives: [
      'Đọc hiểu và bóc tách dữ liệu lịch sử tín dụng CIC để nhận diện nợ xấu',
      'Lập kế hoạch tiếp cận khách hàng cá nhân giàu có và phân khúc Premier Banking',
      'Được bảo lãnh thực tập và tuyển dụng tại hệ thống chi nhánh ngân hàng đối tác'
    ],
    syllabus: [
      {
        id: 'tw-mod-c1',
        title: 'Chương 1: Quy trình Thẩm định Tín dụng & Đọc Báo cáo CIC',
        duration: '12 giờ',
        lessons: [
          {
            id: 'tw-lc-1',
            title: '1.1 Video: Tổng quan Nghiệp vụ RM Cá nhân',
            duration: '20 phút',
            type: 'video',
            youtubeId: 'aircAruvnKk',
            isFreePreview: true
          }
        ]
      }
    ]
  },

  // 4. Machine Learning Specialization (Hybrid)
  {
    id: 'deeplearning-machine-learning',
    slug: 'chuyen-nganh-machine-learning-stanford',
    title: 'Chuyên ngành Học Máy (Machine Learning Specialization)',
    subtitle: 'Nắm vững các thuật toán cốt lõi Supervised Learning, Deep Learning từ GS. Andrew Ng (Stanford & DeepLearning.AI).',
    partner: PARTNERS.deeplearning,
    type: 'Chuyên ngành',
    level: 'Người mới bắt đầu',
    deliveryFormat: 'hybrid',
    locationText: 'Online LMS + Workshop hỏi đáp trực tiếp cùng Trợ giảng chuyên gia',
    rating: 4.9,
    reviewsCount: 182000,
    enrolledCount: '850K+',
    duration: '3 tháng (9 giờ/tuần)',
    skills: ['Machine Learning', 'Linear Regression', 'Neural Networks', 'Decision Trees', 'Gradient Descent', 'Python'],
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    category: 'Trí tuệ nhân tạo (AI)',
    careerRole: 'AI Engineer',
    badgeSection: 'trending_ai',
    price: 1490000,
    originalPrice: 2800000,
    isFreeEnrollmentAvailable: true,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=jGwO_Ei/b5Q',
    youtubeVideoId: 'jGwO_Ei/b5Q',
    instructors: [
      {
        id: 'inst-andrew-ng',
        name: 'Andrew Ng',
        title: 'Founder DeepLearning.AI & Adjunct Professor Stanford',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        bio: 'Đồng sáng lập Coursera, cựu Trưởng nhóm Google Brain và Phó chủ tịch Baidu AI Group.'
      }
    ],
    learningObjectives: [
      'Xây dựng các mô hình Machine Learning bằng Python với NumPy và scikit-learn',
      'Huấn luyện mạng Neural Network phân loại hình ảnh và dự báo dữ liệu',
      'Ứng dụng Best Practices trong việc tinh chỉnh siêu tham số và tối ưu hóa chi phí huấn luyện'
    ],
    syllabus: [
      {
        id: 'mod-ml-1',
        title: 'Khóa 1: Supervised Machine Learning: Regression and Classification',
        duration: '33 giờ',
        lessons: [
          {
            id: 'les-ml-1',
            title: '1.1 Video: Welcome to Machine Learning by Andrew Ng',
            duration: '10 phút',
            type: 'video',
            youtubeId: 'jGwO_Ei/b5Q',
            isFreePreview: true
          }
        ]
      }
    ]
  },

  // 5. DeepLearning.AI Agents (Online via External LMS)
  {
    id: 'deeplearning-ai-agents',
    slug: 'xay-dung-cac-dai-ly-ai-agents',
    title: 'Xây dựng các Đại lý AI & Quy trình Làm việc Tự động (AI Agents)',
    subtitle: 'Học cách thiết kế hệ thống Multi-Agent, kết hợp LLMs, Function Calling và Memory để giải quyết tác vụ phức tạp.',
    partner: PARTNERS.deeplearning,
    type: 'Chứng chỉ Chuyên môn',
    level: 'Trung cấp',
    deliveryFormat: 'online_external_lms',
    rating: 4.9,
    reviewsCount: 24500,
    enrolledCount: '190K+',
    duration: '2 tháng (6 giờ/tuần)',
    skills: ['AI Agents', 'LangGraph', 'CrewAI', 'AutoGen', 'Function Calling', 'RAG'],
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    category: 'Trí tuệ nhân tạo (AI)',
    careerRole: 'AI Engineer',
    badgeSection: 'trending_ai',
    price: 1390000,
    originalPrice: 2200000,
    isFreeEnrollmentAvailable: true,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc',
    youtubeVideoId: 'sal78ACtGTc',
    instructors: [
      {
        id: 'inst-dl-team',
        name: 'Đội ngũ Kỹ sư DeepLearning.AI',
        title: 'Lead AI Agent Architects',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        bio: 'Các chuyên gia hàng đầu về xây dựng Agentic Workflows và tích hợp LLMs trong thực tế.'
      }
    ],
    learningObjectives: [
      'Phát triển đại lý độc lập tự động lập kế hoạch và gọi công cụ bên ngoài',
      'Điều phối nhiều tác nhân làm việc cộng tác (Multi-agent collaboration)',
      'Đánh giá hiệu năng và an toàn cho hệ thống tác nhân trước khi triển khai'
    ],
    syllabus: [
      {
        id: 'mod-ag-1',
        title: 'Học phần 1: Kiến trúc cốt lõi của một AI Agent',
        duration: '18 giờ',
        lessons: [
          {
            id: 'les-ag-1',
            title: '1.1 Video: Khái niệm AI Agent vs Prompting truyền thống',
            duration: '15 phút',
            type: 'video',
            youtubeId: 'sal78ACtGTc',
            isFreePreview: true
          }
        ]
      }
    ]
  },

  // 6. Meta Front-End Developer (Online via External LMS)
  {
    id: 'meta-frontend-developer',
    slug: 'chuyen-nganh-lap-trinh-frontend-meta',
    title: 'Lập trình viên Front-End của Meta',
    subtitle: 'Chương trình nghề nghiệp chính thức từ các kỹ sư Meta: React, JavaScript, HTML/CSS và thiết kế giao diện UI/UX.',
    partner: PARTNERS.meta,
    type: 'Chứng chỉ Chuyên môn',
    level: 'Người mới bắt đầu',
    deliveryFormat: 'online_external_lms',
    rating: 4.7,
    reviewsCount: 78500,
    enrolledCount: '480K+',
    duration: '7 tháng (6 giờ/tuần)',
    skills: ['React', 'JavaScript', 'HTML5/CSS3', 'Version Control (Git)', 'UI/UX Principles', 'Web Development'],
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
    category: 'Khoa học máy tính',
    careerRole: 'Front-End Developer',
    badgeSection: 'most_popular',
    price: 1190000,
    originalPrice: 2400000,
    isFreeEnrollmentAvailable: true,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
    youtubeVideoId: 'Ke90Tje7VS0',
    instructors: [
      {
        id: 'inst-meta',
        name: 'Meta Staff Engineers',
        title: 'Senior Software Engineers at Meta',
        organization: 'Meta',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        bio: 'Các kỹ sư trực tiếp phát triển React và hệ sinh thái web tại Meta.'
      }
    ],
    learningObjectives: [
      'Xây dựng các ứng dụng web tương tác mượt mà với React.js',
      'Làm chủ kiến trúc Component, Hooks và quản lý State hiệu quả',
      'Hoàn thành một đồ án ứng dụng web đặt chỗ nhà hàng hoàn chỉnh'
    ],
    syllabus: [
      {
        id: 'mod-fe-1',
        title: 'Học phần 1: Giới thiệu về Phát triển Web Front-End',
        duration: '20 giờ',
        lessons: [
          {
            id: 'les-fe-1',
            title: '1.1 Video: Làm thế nào Web hoạt động?',
            duration: '14 phút',
            type: 'video',
            youtubeId: 'Ke90Tje7VS0',
            isFreePreview: true
          }
        ]
      }
    ]
  },

  // 7. University of Illinois iMBA (Bằng cấp Trực tuyến 100%)
  {
    id: 'illinois-mba-degree',
    slug: 'bang-thac-si-quan-tri-kinh-doanh-imba-illinois',
    title: 'Thạc sĩ Quản trị Kinh doanh Trực tuyến (iMBA) - University of Illinois',
    subtitle: 'Chương trình MBA trực tuyến hàng đầu thế giới được AACSB kiểm định từ trường Kinh doanh Gies, Illinois.',
    partner: PARTNERS.illinois,
    type: 'Bằng cấp Trực tuyến',
    level: 'Nâng cao',
    deliveryFormat: 'online_external_lms',
    rating: 4.9,
    reviewsCount: 12400,
    enrolledCount: '8,500+ sinh viên',
    duration: '24-36 tháng (linh hoạt)',
    skills: ['Strategic Leadership', 'Financial Management', 'Business Analytics', 'Digital Marketing', 'Corporate Strategy'],
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    category: 'Kinh doanh & Quản lý',
    careerRole: 'Business Leader',
    badgeSection: 'hot_new',
    price: 32000000,
    originalPrice: 45000000,
    isFreeEnrollmentAvailable: false,
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=2f3KMYYnK6s',
    youtubeVideoId: '2f3KMYYnK6s',
    instructors: [
      {
        id: 'inst-gies',
        name: 'Gies College of Business Faculty',
        title: 'Distinguished Business Professors',
        organization: 'University of Illinois Urbana-Champaign',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        bio: 'Khoa kinh doanh Gies là một trong những viện đào tạo MBA uy tín và đổi mới sáng tạo nhất nước Mỹ.'
      }
    ],
    learningObjectives: [
      'Phát triển tư duy chiến lược và năng lực lãnh đạo cấp cao trong kỷ nguyên chuyển đổi số',
      'Quản trị tài chính doanh nghiệp, phân bổ vốn và định giá các thương vụ M&A',
      'Nhận bằng tốt nghiệp Thạc sĩ MBA chính quy từ Đại học Illinois'
    ],
    syllabus: [
      {
        id: 'mod-mba-1',
        title: 'Khối kiến thức 1: Lãnh đạo Chiến lược & Quản trị Thực thi',
        duration: '45 giờ',
        lessons: [
          {
            id: 'les-mba-1',
            title: '1.1 Video: Strategic Mindset for Global Leaders',
            duration: '30 phút',
            type: 'video',
            youtubeId: '2f3KMYYnK6s',
            isFreePreview: true
          }
        ]
      }
    ]
  }
];

// -------------------------------------------------------------
// INITIAL CRM ORDERS & LEADS (All 6 sections matching Image 4 & 5)
// -------------------------------------------------------------
export const INITIAL_CRM_ORDERS: Order[] = [
  {
    id: 'crm-0412',
    orderCode: '0412_TW3_Nguyen Thi Khanh Linh',
    courseId: 'twings-qhkh-doanh-nghiep',
    courseTitle: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    amount: 7999000,
    originalAmount: 11500000,
    discountAmount: 3501000,
    status: 'paid',
    paymentMethod: 'vietqr',
    createdAt: '2026-08-25T09:00:35Z',
    paidAt: '2026-09-08T14:20:00Z',

    // 1: THÔNG TIN CÁ NHÂN (Image 4)
    registrationCode: '0412_TW3_Nguyen Thi Khanh Linh',
    customerName: 'Nguyễn Thị Khánh Linh',
    birthDate: '13/09/2005',
    gender: 'Nữ',
    customerPhone: '0985332929',
    customerEmail: 'ntkhanhlinh.ka@gmail.com',
    area: 'Hà Nội',
    permanentAddress: 'Hà Nội',
    citizenId: '001205019888',
    issuedPlace: 'Cục Cảnh sát QLHC về TTXH',
    currentResidence: 'Q. Cầu Giấy, Hà Nội',
    campaignCode: 'TW3',
    referrerName: 'Chị An',
    referrerEmail: 'an.msb@gmail.com',
    referrerPhone: '0912445566',
    referrerStaffCode: 'MSB_9824',
    educationLevel: 'Đại học',
    major: 'Tài chính - Ngân hàng',
    university: 'Học viện Ngân hàng',
    graduationYear: '2027',
    contactPersonName: 'Nguyễn Văn Thành (Bố)',
    contactPersonPhone: '0912334455',
    contactRelation: 'Bố',
    cvLink: 'https://drive.google.com/cv-khanhlinh.pdf',

    // 2: THÔNG TIN TIẾP CẬN VÀ CHĂM SÓC HỌC VIÊN TIỀM NĂNG (Image 4)
    source: 'Giới thiệu nội bộ (GTNB)',
    registeredAt: '25/08/2026 9:00:35',
    reachedDate: '25/08/2026 10:15:00',
    consultNeed: 'Cần tư vấn về nghiệp vụ tín dụng SME và chuẩn bị phỏng vấn MSB',
    interestedCourse: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    pic: 'HuongNT22',
    studyArea: 'Hà Nội',
    approachMethod: 'Gặp trực tiếp HO MSB',
    interestLevel: 'Rất cao',
    crmStatus: '5. Đã đóng phí',
    enrolledCourseName: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    batchCohort: 'Khóa học 8',
    promotionProgram: 'Cashback 2tr cho học viên Bank Tour',
    consultDetail: 'Đang hẹn lên HO gặp vào chiều thứ 6 tuần này, case GTNB của chị ở MSB.\nNgày 14/09: Đã đóng học phí hôm bank tour, nhận cashback 2tr, cần làm hoàn cho chị An.',

    // 3: THÔNG TIN THANH TOÁN CỦA HỌC VIÊN (Image 4)
    tuitionFee: 7999000,
    totalReceivable: 7999000,
    paidAmountL1: 7999000,
    paymentStatusDetail: 'Đã đóng phí',
    paymentMethodDetail: 'Chuyển khoản VietQR MB Bank',
    paymentDate: '08/09/2026',
    paidAmountL2: 0,
    transactionCode: 'FT262529881023',
    bankAccountNumber: '03001010999988',
    bankName: 'MSB',
    totalPaidAmount: 7999000,
    referralCommission: 500000,
    paymentNote: 'Đã nhận đủ 7.999.000 VNĐ qua VietQR tự động.',

    // 4: THÔNG TIN THANH TOÁN THƯỞNG GIỚI THIỆU (Image 5)
    referralRewardAmount: 500000,
    referralRewardStatus: 'Chờ duyệt',
    referralRewardBankAcc: '04001010887766 (MSB - Chị An)',
    referralRewardDate: '20/09/2026',
    referralRewardNote: 'Thưởng GTNB sinh viên đợt 8',

    // 5: QUẢN LÝ ĐÀO TẠO & VIỆC LÀM (Image 5)
    traineeEmail: 'ntkhanhlinh.ka@gmail.com',
    partnerTraineeId: 'MSB_INTERN_2026_08',
    partnerEmail: 'linhntk.intern@msb.com.vn',
    trainingStatus: 'Đang học',
    certificateType: 'Chứng nhận Hoàn thành Tín dụng Doanh nghiệp Thực chiến',
    certificateDate: '15/10/2026',
    certificateNumber: 'TW-2026-K8-012',
    placementCompany: 'Khối KH Doanh nghiệp - MSB Sở Giao Dịch',
    placementStatus: 'Đã thực tập',
    workStartDate: '01/11/2026',
    guaranteeStartDate: '01/11/2026',
    trainingNote: 'Học viên tiếp thu nhanh, kỹ năng phân tích dòng tiền tốt.',

    // 6: THÔNG TIN THANH TOÁN HỌC LẠI NẾU CÓ (Image 5)
    reExamCount: 0,
    retakeCount: 0,
    fieldStudyRetake: 'Không',
    retakeAmount: 0,
    retakePaymentStatus: 'Không có',
    retakeNote: ''
  },
  {
    id: 'crm-0413',
    orderCode: '0413_TW3_Tran Quoc Huy',
    courseId: 'twings-qhkh-ca-nhan',
    courseTitle: 'Quan hệ Khách hàng cá nhân',
    amount: 7599000,
    originalAmount: 9500000,
    discountAmount: 1901000,
    status: 'paid',
    paymentMethod: 'vietqr',
    createdAt: '2026-09-01T14:10:00Z',
    paidAt: '2026-09-02T09:15:00Z',

    registrationCode: '0413_TW3_Tran Quoc Huy',
    customerName: 'Trần Quốc Huy',
    birthDate: '20/04/1998',
    gender: 'Nam',
    customerPhone: '0912883344',
    customerEmail: 'huy.tq@gmail.com',
    area: 'TP. Hồ Chí Minh',
    permanentAddress: 'Q. 1, TP. Hồ Chí Minh',
    citizenId: '079098012345',
    currentResidence: 'Q. Bình Thạnh, TP. Hồ Chí Minh',
    campaignCode: 'TW3_HCM',
    educationLevel: 'Đại học',
    major: 'Quản trị Kinh doanh',
    university: 'Đại học Kinh tế TP.HCM (UEH)',
    graduationYear: '2020',
    source: 'Facebook Ads',
    registeredAt: '01/09/2026 14:10:00',
    reachedDate: '01/09/2026 15:30:00',
    pic: 'TungLH',
    studyArea: 'TP. Hồ Chí Minh',
    approachMethod: 'Gọi điện',
    interestLevel: 'Cao',
    crmStatus: '5. Đã đóng phí',
    enrolledCourseName: 'Quan hệ Khách hàng cá nhân',
    batchCohort: 'Khóa học 8 - HCM',
    tuitionFee: 7599000,
    totalReceivable: 7599000,
    paidAmountL1: 7599000,
    paymentStatusDetail: 'Đã đóng phí',
    paymentDate: '02/09/2026',
    trainingStatus: 'Đang học'
  },
  {
    id: 'crm-0414',
    orderCode: '0414_FB_Le Bao Ngoc',
    courseId: 'deeplearning-ai-agents',
    courseTitle: 'Xây dựng các Đại lý AI & Quy trình Làm việc Tự động',
    amount: 1390000,
    originalAmount: 2200000,
    discountAmount: 810000,
    status: 'pending',
    paymentMethod: 'vietqr',
    createdAt: '2026-09-28T16:45:00Z',

    registrationCode: '0414_FB_Le Bao Ngoc',
    customerName: 'Lê Bảo Ngọc',
    birthDate: '05/11/2002',
    gender: 'Nữ',
    customerPhone: '0977221199',
    customerEmail: 'ngoc.le@neu.edu.vn',
    area: 'Hà Nội',
    permanentAddress: 'Hà Nội',
    campaignCode: 'FB_AI_2026',
    educationLevel: 'Đại học',
    major: 'Hệ thống thông tin quản lý',
    university: 'Đại học Kinh tế Quốc dân',
    graduationYear: '2024',
    source: 'Website Form',
    registeredAt: '28/09/2026 16:45:00',
    reachedDate: '29/09/2026 09:00:00',
    pic: 'ChiNK',
    studyArea: 'Online',
    approachMethod: 'Zalo',
    interestLevel: 'Đang phân vân',
    crmStatus: '3. Đang tư vấn',
    enrolledCourseName: 'Xây dựng các Đại lý AI',
    tuitionFee: 1390000,
    totalReceivable: 1390000,
    paidAmountL1: 0,
    paymentStatusDetail: 'Chưa thanh toán',
    consultDetail: 'Học viên muốn học thử video bài 1 trước khi chuyển khoản. Đã gửi link YouTube học thử.'
  }
];

export const INITIAL_ORDERS: Order[] = INITIAL_CRM_ORDERS;

// -------------------------------------------------------------
// ADMIN USERS WITH RBAC (Role-Based Access Control)
// -------------------------------------------------------------
export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-admin',
    name: 'Hoàng Tùng (Super Admin)',
    email: 'tunglehoang.vn@gmail.com',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '0912883344',
    status: 'active',
    lastActive: 'Đang online',
    permissions: ['*']
  },
  {
    id: 'user-huong',
    name: 'Nguyễn Thu Hường (Sales & CRM)',
    email: 'huongnt@twings.edu.vn',
    role: 'sales_crm',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    phone: '0843314382',
    status: 'active',
    lastActive: '5 phút trước',
    permissions: ['crm:read', 'crm:write', 'orders:read', 'orders:write']
  },
  {
    id: 'user-phuong',
    name: 'Vũ Thu Phương (Quản lý Đào tạo & Việc làm)',
    email: 'phuong.vu@twings.edu.vn',
    role: 'academic_management',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    phone: '0988776655',
    status: 'active',
    lastActive: '1 giờ trước',
    permissions: ['academic:read', 'academic:write', 'certificates:issue']
  },
  {
    id: 'user-chi',
    name: 'Nguyễn Kim Chi (Content & SEO)',
    email: 'chi.nk@twings.edu.vn',
    role: 'content_seo',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    phone: '0977112233',
    status: 'active',
    lastActive: '30 phút trước',
    permissions: ['articles:read', 'articles:write', 'seo:manage']
  },
  {
    id: 'user-finance',
    name: 'Đặng Thanh Loan (Kế toán & Đối soát)',
    email: 'loan.dt@twings.edu.vn',
    role: 'finance_accountant',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    phone: '0966442211',
    status: 'active',
    lastActive: 'Hôm qua',
    permissions: ['finance:read', 'finance:reconcile', 'rewards:approve']
  }
];

// -------------------------------------------------------------
// ARTICLES WITH REAL-TIME SEO SCORING
// -------------------------------------------------------------
export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    slug: 'lo-trinh-chuyen-vien-quan-he-khach-hang-ngan-hang-2026',
    title: 'Lộ Trình Trở Thành Chuyên Viên Quan Hệ Khách Hàng Ngân Hàng Năm 2026',
    excerpt: 'Hướng dẫn toàn diện từ yêu cầu tuyển dụng, kỹ năng thẩm định tín dụng, chỉ tiêu KPI đến cơ hội thăng tiến tại các ngân hàng thương mại lớn.',
    content: `## 1. Chân Dung Chuyên Viên Quan Hệ Khách Hàng (RM)

Chuyên viên Quan hệ Khách hàng (Relationship Manager - RM) là vị trí nòng cốt đóng góp trực tiếp vào doanh số và dư nợ tín dụng của mọi ngân hàng thương mại.

### Vai trò chính của RM Cá nhân và Doanh nghiệp
- Tiếp cận, tìm kiếm và khai thác nhu cầu tài chính của khách hàng
- Thu thập hồ sơ pháp lý, tài chính và tiến hành thẩm định thực địa
- Phân tích báo cáo tín dụng CIC, bóc tách dòng tiền và đánh giá năng lực trả nợ
- Lập tờ trình cấp tín dụng và bảo vệ phương án vay trước Hội đồng Thẩm định

## 2. Các Kỹ Năng Bắt Buộc Để Vượt Qua Vòng Phỏng Vấn
1. **Kỹ năng đọc báo cáo tài chính**: Nhận diện các dấu hiệu làm đẹp sổ sách kế toán.
2. **Kỹ năng giao tiếp và tạo dựng thương hiệu cá nhân**: Xây dựng lòng tin tuyệt đối với khách hàng VIP.
3. **Thấu hiểu chính sách sản phẩm**: Nắm vững hạn mức cho vay mua nhà, thấu chi, bảo lãnh và L/C.`,
    featuredImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
    category: 'Cẩm nang Nghề Ngân hàng',
    author: 'GV Vũ Thu Phương (MSB)',
    publishedAt: '2026-09-20',
    status: 'published',
    tags: ['Nghiệp vụ Tín dụng', 'Phỏng vấn Ngân hàng', 'Quan hệ khách hàng'],
    viewsCount: 3840,
    metaTitle: 'Lộ Trình Chuyên Viên Quan Hệ Khách Hàng Ngân Hàng 2026 | Twings',
    metaDescription: 'Cẩm nang toàn diện về lộ trình thăng tiến, kỹ năng thẩm định tín dụng và bí quyết phỏng vấn RM ngân hàng thành công năm 2026.',
    focusKeyword: 'quan hệ khách hàng ngân hàng',
    canonicalUrl: 'https://twings.edu.vn/tin-tuc/lo-trinh-chuyen-vien-quan-he-khach-hang-ngan-hang-2026',
    seoScore: 92,
    seoChecks: {
      titleLength: true,
      metaDescLength: true,
      keywordInTitle: true,
      keywordInMeta: true,
      keywordInContent: true,
      keywordDensity: 1.8,
      hasHeadings: true,
      hasFeaturedImage: true,
      contentWordCount: 850,
      wordCountPassed: true
    }
  },
  {
    id: 'art-2',
    slug: 'ung-dung-tri-tue-nhan-tao-ai-trong-tham-dinh-tin-dung',
    title: 'Ứng Dụng Trí Tuệ Nhân Tạo (AI) Trong Thẩm Định Tín Dụng & Quản Trị Rủi Ro',
    excerpt: 'Cách các ngân hàng số hóa quy trình chấm điểm tín dụng tự động, phát hiện gian lận và tối ưu hóa thời gian phê duyệt khoản vay.',
    content: `## Cuộc Cách Mạng AI Trong Ngành Ngân Hàng Số

Trí tuệ nhân tạo và Machine Learning đang định hình lại phương thức các tổ chức tài chính đánh giá rủi ro tín dụng.

### Những ứng dụng đột phá:
- **Chấm điểm tín dụng phi truyền thống**: Phân tích hành vi chi tiêu số và hóa đơn dịch vụ
- **Phát hiện gian lận thời gian thực**: Sử dụng mô hình Deep Learning để ngăn chặn rửa tiền
- **Tự động hóa bóc tách hồ sơ**: OCR và LLMs trích xuất số liệu từ hàng nghìn trang báo cáo tài chính chỉ trong vài giây.`,
    featuredImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    category: 'Công nghệ Tài chính (Fintech)',
    author: 'Nguyễn Kim Chi (Chuyên gia Chuyển đổi số)',
    publishedAt: '2026-09-25',
    status: 'published',
    tags: ['AI Ngân hàng', 'Fintech', 'Quản trị rủi ro'],
    viewsCount: 2950,
    metaTitle: 'Ứng Dụng AI Trong Thẩm Định Tín Dụng & Rủi Ro Ngân Hàng | Twings',
    metaDescription: 'Khám phá cách AI và Machine Learning tự động hóa chấm điểm tín dụng, phát hiện gian lận và nâng cao năng lực cạnh tranh ngân hàng.',
    focusKeyword: 'ai trong thẩm định tín dụng',
    canonicalUrl: 'https://twings.edu.vn/tin-tuc/ung-dung-tri-tue-nhan-tao-ai-trong-tham-dinh-tin-dung',
    seoScore: 88,
    seoChecks: {
      titleLength: true,
      metaDescLength: true,
      keywordInTitle: true,
      keywordInMeta: true,
      keywordInContent: true,
      keywordDensity: 1.6,
      hasHeadings: true,
      hasFeaturedImage: true,
      contentWordCount: 720,
      wordCountPassed: true
    }
  }
];

// -------------------------------------------------------------
// SITE SEO & GENERAL SETTINGS
// -------------------------------------------------------------
export const INITIAL_SEO_SETTINGS: SiteSEOSettings = {
  siteName: 'TWINGS ACADEMY - Học Viện Đào Tạo Thực Chiến',
  siteSlogan: 'Nâng tầm năng lực, kiến tạo tương lai',
  faviconUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=64&q=80',
  logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80',
  defaultMetaTitle: 'Twings Academy - Đào Tạo Nghiệp Vụ Ngân Hàng & Khóa Học Chuyên Nghiệp',
  defaultMetaDescription: 'Học viện tiên phong đào tạo thực chiến ngành tài chính ngân hàng, công nghệ AI và chứng chỉ quốc tế. Kết nối việc làm trực tiếp tại MSB, ROX Group.',
  defaultKeywords: ['Twings Academy', 'học nghiệp vụ ngân hàng', 'quan hệ khách hàng doanh nghiệp', 'thẩm định tín dụng', 'chứng chỉ Coursera', 'AI ngân hàng'],
  ogImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  canonicalDomain: 'https://twings.edu.vn',
  googleAnalyticsId: 'G-TWINGS2026',
  facebookPixelId: '1098245582910',
  robotsTxt: 'User-agent: *\nAllow: /\nDisallow: /cms/\nDisallow: /api/\nSitemap: https://twings.edu.vn/sitemap.xml',
  hotline: '0843 314 382 (Ms. Hường)',
  email: 'hello@twings.edu.vn',
  address: 'Tòa ROX Tower, 54A Nguyễn Chí Thanh, Phường Láng, Hà Nội'
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Nguyễn Thị Khánh Linh',
    role: 'Chuyên viên Tín dụng SME - MSB Sở Giao Dịch',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    quote: '"Nhờ chương trình thực chiến tại Twings Academy và sự hướng dẫn của các Giám đốc MSB, tôi tự tin xử lý trọn vẹn bộ hồ sơ cấp tín dụng 20 tỷ ngay tháng đầu thử việc."',
    outcome: 'Được nhận chính thức tại MSB với mức thu nhập vượt chỉ tiêu 150%'
  },
  {
    id: 't2',
    name: 'Trần Quốc Huy',
    role: 'RM Cá nhân Xuất sắc - Chi nhánh TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    quote: '"Kỹ năng bóc tách CIC và tâm lý học chốt sale sản phẩm thẻ, tiền gửi tại Twings đã giúp tôi tăng gấp đôi lượng khách hàng Premier Banking."',
    outcome: 'Thăng tiến lên vị trí Chuyên viên Quản lý Khách hàng Cao cấp sau 6 tháng'
  },
  {
    id: 't3',
    name: 'Sarah W.',
    role: 'Data Analyst at Global Tech',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    quote: '"Coursera và Twings mang lại kiến thức thực tế, chuẩn chỉ và cập nhật sát nhất với nhu cầu thị trường."',
    outcome: 'Chuyển đổi nghề nghiệp sang vai trò Phân tích Dữ liệu với mức lương tăng 40%'
  }
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Hình thức đào tạo của các khóa học tại Twings Academy như thế nào?',
    answer: 'Các khóa học tại Twings Academy được phân chia rõ ràng theo 3 hình thức: 1) Học trực tiếp (Offline) tại Tòa nhà ROX Tower hoặc hội trường đào tạo ngân hàng MSB; 2) Học kết hợp (Hybrid) giữa trực tiếp và bài giảng số; 3) Khóa học Online chuyên biệt được vận hành trên hệ thống LMS riêng - Ban quản lý học tập sẽ liên hệ và cấp tài khoản riêng kèm lộ trình học 1-1 cho học viên sau khi đăng ký.',
    isExpandedByDefault: true
  },
  {
    id: 'faq-2',
    question: 'Tôi có thể xem thử video bài giảng trước khi đăng ký không?',
    answer: 'Có! Mỗi khóa học đều được tích hợp video học thử nhúng trực tiếp từ YouTube. Bạn chỉ cần bấm "Học thử qua YouTube" trên thẻ khóa học để xem trước phong cách giảng dạy và chất lượng học liệu trước khi quyết định đăng ký.',
    isExpandedByDefault: true
  },
  {
    id: 'faq-3',
    question: 'Hệ thống thanh toán tự động VietQR hoạt động ra sao?',
    answer: 'Hệ thống tạo mã VietQR động theo từng đơn hàng với số tiền và nội dung chuyển khoản tự động. Ngay khi bạn chuyển khoản qua bất kỳ app ngân hàng nào (MB Bank, Vietcombank, Techcombank...), hệ thống tự động ghi nhận và chuyển trạng thái đơn hàng sang "Đã đóng phí" trong 3 giây.',
  },
  {
    id: 'faq-4',
    question: 'Chính sách bảo lãnh việc làm và kết nối thực tập tại ngân hàng thế nào?',
    answer: 'Học viên tốt nghiệp đạt chứng nhận sẽ được kết nối phỏng vấn trực tiếp vào hệ thống ngân hàng đối tác (MSB và các ngân hàng TMCP lớn). Ban Quản lý Đào tạo theo dõi và bảo lãnh trong suốt quá trình thử việc.',
  }
];
