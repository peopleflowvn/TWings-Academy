import { Course, Coupon, Order, StudentEnrollment, Instructor, CMSSectionsConfig, PartnerItem, GalleryPhoto, CourseReview } from '../types';

export const DEFAULT_COURSE_REVIEWS: CourseReview[] = [
  {
    id: 'rev-1',
    studentName: 'Nguyễn Thị Khánh Linh',
    role: 'Chuyên viên Tín dụng SME - MSB Sở Giao Dịch',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: '15/09/2026',
    comment: 'Khóa học cực kỳ thực tế! Nhờ được các thầy cô là Giám đốc MSB trực tiếp hướng dẫn cách đọc báo cáo CIC và thẩm định thực địa, em đã vượt qua kỳ phỏng vấn và hiện tại đã đạt 150% chỉ tiêu KPI giải ngân ngay tháng đầu.',
    verifiedStudent: true
  },
  {
    id: 'rev-2',
    studentName: 'Trần Quốc Huy',
    role: 'RM Bán Lẻ - MSB Chi nhánh TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: '02/09/2026',
    comment: 'Trước đây em là sinh viên mới ra trường rất sợ gọi điện thoại và tiếp cận khách hàng VIP. Sau khóa học này với bộ kịch bản chốt sale thực chiến, em tự tin tư vấn gói vay mua nhà và thẻ tín dụng cao cấp.',
    verifiedStudent: true
  },
  {
    id: 'rev-3',
    studentName: 'Lê Hoàng Long',
    role: 'Chuyên viên Thẩm định Khách hàng Cá nhân',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: '20/08/2026',
    comment: 'Học liệu rất chuẩn mực, các biểu mẫu hồ sơ đều là tài liệu thật đang áp dụng tại hệ thống ngân hàng. Đặc biệt phần YouTube học thử giúp mình xem trước được chất lượng giảng dạy trước khi quyết định đăng ký.',
    verifiedStudent: true
  },
  {
    id: 'rev-4',
    studentName: 'Phạm Minh Trang',
    role: 'Chuyên viên Quản lý Khách hàng Priority',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: '10/08/2026',
    comment: 'Được học trực tiếp cùng cô Vũ Thu Phương về thương hiệu cá nhân giúp mình nâng tầm phong thái giao tiếp, thấu hiểu tâm lý của khách hàng giàu có khi tư vấn giải pháp tài chính.',
    verifiedStudent: true
  }
];

export const REAL_INSTRUCTORS: Instructor[] = [
  {
    id: 'inst-vu-thu-phuong',
    name: 'GV Vũ Thu Phương',
    title: 'Giám đốc Phân khúc KH Doanh nghiệp MSB',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    credential: 'Giám đốc Phân khúc KH Doanh nghiệp MSB · 25+ năm KN',
    bio: 'Với hơn 25 năm kinh nghiệm tại các tập đoàn đa quốc gia hàng đầu trong các lĩnh vực dịch vụ cao cấp, tài chính, bất động sản và đầu tư, chị Vũ Phương đã khẳng định vị thế của mình qua nhiều vai trò cấp cao, dẫn dắt đội ngũ lãnh đạo và xây dựng thành công hình ảnh thương hiệu cho doanh nghiệp. Không chỉ là một nhà lãnh đạo xuất sắc, chị còn là chuyên gia hàng đầu trong lĩnh vực xây dựng thương hiệu cá nhân và quản trị hình ảnh chuyên nghiệp. Chị Phương sẽ đồng hành cùng các bạn học viên của TWings trong các học phần nội dung về "Xây dựng Thương hiệu cá nhân" giúp học viên: Nhận thức được giá trị Thương hiệu cá nhân, định vị bản thân & tạo dấu ấn khác biệt, Kĩ năng giao tiếp & Quản trị hình ảnh cá nhân.',
    rating: 5.0,
    studentsCount: 3400,
  },
  {
    id: 'inst-dang-van-thanh',
    name: 'GV Đặng Văn Thành',
    title: 'Giám đốc Giám sát, Thúc đẩy và Nâng cao năng lực bán Ngân hàng Doanh nghiệp',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    credential: 'Giám đốc Bán hàng Toàn quốc · 20 năm KN Tài chính Ngân hàng',
    bio: 'Anh Thành có gần 20 năm kinh nghiệm trong lĩnh vực tài chính - ngân hàng, từng đảm nhiệm các vị trí chiến lược như Giám đốc Chi nhánh, Giám đốc Vùng, và Giám đốc Quản trị Bán hàng toàn quốc. Anh đã gặt hái nhiều thành công nổi bật trong triển khai, quản trị bán hàng và phát triển năng lực đội ngũ. Anh Thành sẽ đồng hành cùng học viên TWings trong các học phần chuyên sâu về Tín dụng cũng như kỹ năng khai thác nhu cầu, xây dựng chiến lược tiếp cận, thuyết phục và duy trì mối quan hệ khách hàng lâu dài, giúp tối ưu hóa giá trị vòng đời khách hàng.',
    rating: 5.0,
    studentsCount: 4200,
  },
  {
    id: 'inst-nguyen-kim-chi',
    name: 'GV Nguyễn Kim Chi',
    title: 'Giám đốc Quản trị dự án chiến lược MSB',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    credential: 'Chuyên gia Chuyển đổi số Ngân hàng · Techcombank, VPBank, MSB',
    bio: 'Với 20 năm kinh nghiệm trong ngành tài chính ngân hàng, chị Kim Chi đã và đang đảm nhiệm những vị trí quan trọng trong các dự án chuyển đổi số tại các ngân hàng lớn nhất Việt Nam như: Techcombank, VPBank. Hiện nay, chị Chi đang là Giám đốc quản trị chuyển đổi tại Khối Chiến lược và sáng tạo đổi mới với vai trò dẫn dắt sự chuyển đổi và hành trình số hóa ngân hàng tại MSB. Ngoài ra, chị Kim Chi còn là một trong những giảng viên nội bộ xuất sắc đang giảng dạy các nội dung liên quan đến tư duy chuyển đổi số và phương pháp làm việc Agile nhằm thúc đẩy văn hóa chuyển đổi số tại ngân hàng.',
    rating: 4.98,
    studentsCount: 3900,
  }
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-qhkh-ca-nhan',
    slug: 'quan-he-khach-hang-ca-nhan',
    title: 'Quan hệ Khách hàng cá nhân',
    subtitle: 'Nghiệp vụ cốt lõi thẩm định tín dụng cá nhân, khai thác nhu cầu tài chính và kỹ năng chốt sale sản phẩm thẻ, tiền gửi, vay mua nhà tại ngân hàng.',
    overview: 'Khóa học Quan hệ Khách hàng Cá nhân tại TWings Academy được thiết kế và trực tiếp dẫn dắt bởi các Giám đốc Khối Ngân hàng Bán lẻ MSB. Học viên được đào tạo theo mô hình "Cầm tay chỉ việc", trực tiếp xử lý các bộ hồ sơ vay vốn, mở thẻ tín dụng thực tế từ ngân hàng thương mại, nắm vững kỹ thuật đọc báo cáo CIC và tự tin vượt qua các vòng phỏng vấn tuyển dụng.',
    category: 'Ngân Hàng & Tín Dụng',
    level: 'Chuyên viên Mới (Fresher)',
    deliveryFormat: 'online_external_lms',
    locationText: 'Học qua LMS chuyên biệt + Cố vấn 1-1 & Thực tập tại MSB',
    price: 7599000,
    originalPrice: 9500000,
    rating: 5.0,
    reviewsCount: 184,
    studentsCount: 1420,
    duration: '45 giờ học thực chiến',
    lessonsCount: 36,
    badgeType: 'bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    youtubeVideoId: 'sal78ACtGTc',
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc',
    instructor: REAL_INSTRUCTORS[0],
    instructors: [REAL_INSTRUCTORS[0], REAL_INSTRUCTORS[1]],
    reviews: DEFAULT_COURSE_REVIEWS,
    guarantees: [
      'Bảo lãnh cơ hội thực tập & giới thiệu việc làm tại MSB',
      'Cấp tài khoản cá nhân trên hệ thống LMS chuyên biệt',
      'Cố vấn 1-1 cùng Giám đốc Khối ngân hàng thương mại',
      'Chứng chỉ hoàn thành có giá trị công nhận trong hồ sơ tuyển dụng'
    ],
    highlights: [
      'Bộ hồ sơ mẫu thẩm định tín dụng thực tế từ ngân hàng thương mại',
      'Kỹ năng phỏng vấn xác thực nguồn thu nhập và lịch sử tín dụng CIC',
      'Xử lý tình huống từ chối giải ngân và tư vấn gói bảo hiểm liên kết'
    ],
    objectives: [
      'Tự tin tiếp cận khách hàng cá nhân và đạt chỉ tiêu KPI ngay tháng đầu thử việc',
      'Đọc hiểu báo cáo CIC và phát hiện các rủi ro tín dụng tiềm ẩn',
      'Xây dựng thương hiệu cá nhân uy tín của chuyên viên ngân hàng chuẩn mực'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chương 1: Chân dung Khách hàng Cá nhân & Quy trình Thẩm định Tín dụng',
        order: 1,
        lessons: [
          {
            id: 'les-c1-1',
            title: 'Bài 1.1: Tổng quan Nghiệp vụ Chuyên viên Quan hệ Khách hàng Cá nhân (RM)',
            duration: '25 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Chào mừng các bạn đến với học phần Quan hệ Khách hàng Cá nhân tại Twings Academy. Trong bài học này, chúng ta sẽ tìm hiểu về hành trình trải nghiệm của khách hàng tại chi nhánh ngân hàng...',
            resources: [
              { name: 'So_tay_Nghiep_vu_Tin_dung_Ca_nhan.pdf', size: '3.8 MB', type: 'pdf', downloadUrl: '#' }
            ]
          },
          {
            id: 'les-c1-2',
            title: 'Bài 1.2: Thực hành Đọc Báo Cáo CIC & Nhận diện Bẫy Tín Dụng',
            duration: '20 phút',
            type: 'quiz',
            quizQuestions: [
              {
                id: 'cic-1',
                question: 'Khách hàng có lịch sử nợ nhóm 2 trong vòng 12 tháng gần nhất thì chính sách ngân hàng thường xử lý như thế nào?',
                options: [
                  { id: 'o1', text: 'Từ chối tuyệt đối không xem xét' },
                  { id: 'o2', text: 'Yêu cầu giải trình lý do phát sinh nợ quá hạn và xem xét thẩm định thực tế nguồn thu' },
                  { id: 'o3', text: 'Tự động duyệt ngay không cần điều kiện' },
                  { id: 'o4', text: 'Báo cáo cơ quan công an' }
                ],
                correctAnswerId: 'o2',
                explanation: 'Nợ nhóm 2 (nợ cần chú ý từ 10 - 90 ngày) yêu cầu chuyên viên thẩm định làm rõ nguyên nhân khách quan và đánh giá lại thiện chí trả nợ của khách hàng.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'course-mbo-to-okr',
    slug: 'di-san-tu-mbo-den-ky-nguyen-okr',
    title: 'Di Sản Từ MBO Đến Kỷ Nguyên OKR',
    subtitle: 'Chuyển hóa mô hình quản trị mục tiêu truyền thống sang phương pháp OKR linh hoạt, bứt phá năng suất toàn diện cho đội ngũ ngân hàng hiện đại.',
    category: 'Quản Trị & Lãnh Đạo (OKR/MBO)',
    level: 'Quản lý / Trưởng nhóm',
    price: 1890000,
    originalPrice: 3200000,
    rating: 5.0,
    reviewsCount: 152,
    studentsCount: 1890,
    duration: '28 giờ thực hành',
    lessonsCount: 24,
    badgeType: 'bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[1],
    highlights: [
      'Công thức thiết lập Objective tham vọng và Key Results đo lường định lượng',
      'Quy trình CFR (Conversation - Feedback - Recognition) định kỳ hàng tuần',
      'Ma trận liên kết OKR cá nhân với mục tiêu chiến lược của Khối kinh doanh'
    ],
    objectives: [
      'Phân biệt rõ ràng MBO (quản trị theo mục tiêu) và OKR (mục tiêu & kết quả then chốt)',
      'Vận hành cuộc họp check-in 1-on-1 truyền cảm hứng cho nhân viên cấp dưới'
    ],
    chapters: [
      {
        id: 'mbo-c1',
        title: 'Chương 1: Nền tảng Tư duy OKR trong Ngành Tài chính',
        order: 1,
        lessons: [
          {
            id: 'mbo-1',
            title: 'Bài 1.1: Tại sao các Ngân hàng lớn chuyển dịch mạnh mẽ sang OKR?',
            duration: '30 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'OKR giúp toàn bộ tổ chức tập trung vào những mục tiêu có ý nghĩa chiến lược cao nhất, thay vì chỉ hoàn thành danh sách công việc thụ động.'
          },
          {
            id: 'mbo-2',
            title: 'Bài 1.2: Flashcards Thuật Ngữ Quản Trị Mục Tiêu Hiện Đại (MBO, OKR, KPI, CFR)',
            duration: '15 phút',
            type: 'flashcard',
            flashcards: [
              {
                id: 'fc-okr-1',
                term: 'Key Result (KR)',
                ipa: '/kiː rɪˈzʌlt/',
                type: 'Concept',
                definitionVi: 'Kết quả then chốt đo lường định lượng được để đánh giá tiến độ đạt Objective',
                definitionEn: 'A specific, measurable outcome that defines success for an objective.',
                exampleSentence: 'KR: Tăng dư nợ tín dụng bán lẻ thêm 15% trong quý 3.',
                exampleTranslation: 'KR: Increase retail credit balance by 15% in Q3.'
              },
              {
                id: 'fc-okr-2',
                term: 'Stretch Goal',
                ipa: '/strɛtʃ ɡoʊl/',
                type: 'Strategy',
                definitionVi: 'Mục tiêu thách thức, vượt ngưỡng khả năng thông thường để kích hoạt đột phá',
                definitionEn: 'An ambitious target that inspires innovation and peak performance.',
                exampleSentence: 'Stretch goals push the branch to achieve beyond conventional expectations.',
                exampleTranslation: 'Mục tiêu thách thức thúc đẩy chi nhánh đạt kết quả vượt ngoài kỳ vọng thông thường.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'course-quan-tri-thuc-thi',
    slug: 'quan-tri-thuc-thi-lam-chu-muc-tieu',
    title: 'Quản trị thực thi, làm chủ mục tiêu',
    subtitle: 'Nâng cao năng lực giám sát, thúc đẩy chỉ số kinh doanh và giải quyết nút thắt trong vận hành chi nhánh ngân hàng.',
    category: 'Quản Trị & Lãnh Đạo (OKR/MBO)',
    level: 'Quản lý / Trưởng nhóm',
    price: 1490000,
    originalPrice: 2800000,
    rating: 5.0,
    reviewsCount: 120,
    studentsCount: 1650,
    duration: '24 giờ học',
    lessonsCount: 20,
    badgeType: 'bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[1],
    highlights: [
      'Bộ công cụ theo dõi tiến độ Dashboard thời gian thực',
      'Kỹ năng thúc đẩy động lực cho chuyên viên quan hệ khách hàng',
      'Phương pháp phản hồi 360 độ xây dựng niềm tin'
    ],
    objectives: [
      'Làm chủ quy trình quản trị hiệu suất công việc (Performance Management)',
      'Xóa bỏ tình trạng chậm trễ trong hoàn thành chỉ tiêu tháng'
    ],
    chapters: [
      {
        id: 'qt-c1',
        title: 'Chương 1: Khung Quản Trị Thực Thi Thực Chiến',
        order: 1,
        lessons: [
          {
            id: 'qt-1',
            title: 'Bài 1.1: 4 Nguyên Tắc Thực Thi Mục Tiêu Cốt Lõi',
            duration: '22 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Tập trung vào điều tối quan trọng, hành động trên thước đo dẫn dắt, duy trì bảng điểm hấp dẫn và thiết lập trách nhiệm định kỳ.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-qhkh-doanh-nghiep',
    slug: 'quan-he-khach-hang-doanh-nghiep',
    title: 'Quan hệ Khách hàng Doanh nghiệp',
    subtitle: 'Chuyên sâu thẩm định tài chính doanh nghiệp, phân tích dòng tiền, cơ cấu tài sản bảo đảm và đàm phán hợp đồng cấp tín dụng lớn.',
    overview: 'Chương trình đào tạo chuyên sâu dành cho chuyên viên quan hệ khách hàng doanh nghiệp (Corporate RM). Học viên được hướng dẫn trực tiếp bởi Giám đốc Bán hàng Toàn quốc Đặng Văn Thành và đội ngũ lãnh đạo Khối Khách hàng Doanh nghiệp MSB, phân tích 20 bộ báo cáo tài chính kiểm toán thực tế, bóc tách dòng tiền và đàm phán hạn mức tín dụng nghìn tỷ.',
    category: 'Ngân Hàng & Tín Dụng',
    level: 'Chuyên viên Chính',
    deliveryFormat: 'hybrid',
    locationText: 'Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội & Hệ thống LMS',
    price: 7999000,
    originalPrice: 10500000,
    rating: 5.0,
    reviewsCount: 210,
    studentsCount: 1280,
    duration: '50 giờ chuyên sâu',
    lessonsCount: 40,
    badgeType: 'recommended',
    thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
    youtubeVideoId: 'sal78ACtGTc',
    youtubeTrialUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc',
    instructor: REAL_INSTRUCTORS[1],
    instructors: [REAL_INSTRUCTORS[1], REAL_INSTRUCTORS[2]],
    reviews: [
      {
        id: 'rev-dn-1',
        studentName: 'Võ Minh Quân',
        role: 'Chuyên viên Quản lý Khách hàng Doanh nghiệp - MSB',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        rating: 5,
        date: '12/09/2026',
        comment: 'Phần bóc tách Báo cáo tài chính doanh nghiệp và dòng tiền của thầy Đặng Văn Thành quá đỉnh cao. Giúp mình phát hiện được các thủ thuật làm đẹp số liệu kế toán khi thẩm định cấp hạn mức tín dụng 50 tỷ.',
        verifiedStudent: true
      },
      {
        id: 'rev-dn-2',
        studentName: 'Hoàng Bích Thủy',
        role: 'Cố vấn Tín dụng Cao cấp',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        rating: 5,
        date: '28/08/2026',
        comment: 'Các case study thẩm định hồ sơ tài sản bảo đảm và đàm phán với CFO rất sát thực tế tác nghiệp tại ngân hàng.',
        verifiedStudent: true
      }
    ],
    guarantees: [
      'Bảo lãnh thực tập và phỏng vấn vào Khối KHDN tại MSB',
      'Được đồng hành trực tiếp bởi các Giám đốc Vùng & Giám đốc Khối',
      'Cấp tài khoản trọn đời trên hệ thống LMS TWings'
    ],
    highlights: [
      'Phân tích 20 bộ Báo cáo tài chính doanh nghiệp kiểm toán thực tế',
      'Đánh giá rủi ro ngành sản xuất, thương mại xuất nhập khẩu và bất động sản',
      'Kỹ năng tiếp cận Chủ tịch & Giám đốc Tài chính (CFO) đàm phán hợp đồng hạn mức'
    ],
    objectives: [
      'Nắm vững 5 chữ C trong thẩm định tín dụng doanh nghiệp (Character, Capacity, Capital, Collateral, Conditions)',
      'Lập Tờ trình tín dụng chuẩn xác bảo vệ trước Hội đồng thẩm định rủi ro'
    ],
    chapters: [
      {
        id: 'dn-c1',
        title: 'Chương 1: Phân Tích Báo Cáo Tài Chính & Dòng Tiền Doanh Nghiệp',
        order: 1,
        lessons: [
          {
            id: 'dn-1',
            title: 'Bài 1.1: Các Chỉ Số Tài Chính Trọng Yếu Khi Cấp Hạn Mức Tín Dụng',
            duration: '35 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Chuyên viên thẩm định cần đặc biệt lưu tâm tới hệ số thanh toán hiện hành (Current Ratio), vòng quay hàng tồn kho và dòng tiền thuần từ hoạt động kinh doanh (Operating Cashflow).'
          }
        ]
      }
    ]
  },
  {
    id: 'course-design-thinking',
    slug: 'tu-duy-thiet-ke-dot-pha-giai-phap-design-thinking',
    title: 'Tư duy thiết kế, đột phá giải pháp (Design Thinking)',
    subtitle: 'Ứng dụng phương pháp Design Thinking để thấu cảm khách hàng, đồng sáng tạo và phát triển các sản phẩm tài chính số hóa vượt trội.',
    category: 'Tư Duy & Đột Phá',
    level: 'Tất cả cấp bậc',
    price: 1590000,
    originalPrice: 2900000,
    rating: 5.0,
    reviewsCount: 140,
    studentsCount: 1540,
    duration: '20 giờ học',
    lessonsCount: 18,
    badgeType: 'recommended',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[2],
    highlights: [
      '5 bước Design Thinking: Empathize - Define - Ideate - Prototype - Test',
      'Phương pháp phỏng vấn sâu tìm ra "nỗi đau" (pain-point) khách hàng tài chính',
      'Thực hành làm mẫu thử nghiệm (Mockup) tính năng ứng dụng ngân hàng số'
    ],
    objectives: [
      'Chuyển đổi tư duy từ "bán cái mình có" sang "giải quyết nhu cầu khách hàng"',
      'Thúc đẩy sáng kiến đổi mới trong quy trình nghiệp vụ nội bộ'
    ],
    chapters: [
      {
        id: 'dt-c1',
        title: 'Chương 1: 5 Giai Đoạn Vàng Của Tư Duy Thiết Kế',
        order: 1,
        lessons: [
          {
            id: 'dt-1',
            title: 'Bài 1.1: Thấu Cảm Khách Hàng (Empathy Mapping)',
            duration: '25 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Lập bản đồ thấu cảm giúp chúng ta lắng nghe khách hàng nói gì, nghĩ gì, làm gì và cảm thấy thế nào khi giao dịch tại ngân hàng.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-khai-phong-quyen-nang-so',
    slug: 'khai-phong-quyen-nang-so',
    title: 'Khai Phóng Quyền Năng Số',
    subtitle: 'Nâng tầm tư duy chuyển đổi số, làm chủ các công cụ cộng tác trực tuyến và phương pháp làm việc Agile/Scrum trong môi trường ngân hàng hiện đại.',
    category: 'Kỹ Năng Số & AI',
    level: 'Tất cả cấp bậc',
    price: 1290000,
    originalPrice: 2400000,
    rating: 5.0,
    reviewsCount: 175,
    studentsCount: 2100,
    duration: '22 giờ học',
    lessonsCount: 20,
    badgeType: 'new',
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[2],
    highlights: [
      'Mô hình Agile & Scrum áp dụng vào cải tiến quy trình phục vụ khách hàng',
      'Văn hóa cộng tác số và tư duy thích ứng linh hoạt trong kỷ nguyên số'
    ],
    objectives: [
      'Tự tin tham gia các dự án chuyển đổi số tại ngân hàng',
      'Tăng 200% năng suất làm việc cá nhân nhờ ứng dụng số hóa'
    ],
    chapters: [
      {
        id: 'kp-c1',
        title: 'Chương 1: Chuyển Đổi Số Không Phải Chỉ Là Công Nghệ',
        order: 1,
        lessons: [
          {
            id: 'kp-1',
            title: 'Bài 1.1: Chuyển dịch Tâm thế và Văn hóa Số',
            duration: '20 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Chuyển đổi số bắt đầu từ tư duy con người, sẵn sàng thử nghiệm nhanh và học hỏi từ các cải tiến nhỏ mỗi ngày.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-ai-ngan-hang',
    slug: 'khai-mo-suc-manh-ai-trong-ngan-hang',
    title: 'Khai mở sức mạnh AI',
    subtitle: 'Ứng dụng Trí tuệ Nhân tạo thế hệ mới (GenAI) vào soạn thảo văn bản tín dụng, phân tích rủi ro, dự đoán xu hướng và chăm sóc khách hàng 24/7.',
    category: 'Kỹ Năng Số & AI',
    level: 'Tất cả cấp bậc',
    price: 1690000,
    originalPrice: 3200000,
    rating: 5.0,
    reviewsCount: 220,
    studentsCount: 2600,
    duration: '26 giờ thực hành AI',
    lessonsCount: 24,
    badgeType: 'new',
    thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[2],
    highlights: [
      'Kỹ thuật Prompt Engineering chuyên biệt cho ngành Tài chính - Ngân hàng',
      'Tự động hóa lập báo cáo phân tích ngành và thị trường trong 5 phút',
      'Ứng dụng AI kiểm tra tính hợp lệ của chứng từ và hợp đồng'
    ],
    objectives: [
      'Sử dụng AI thành thạo như một trợ lý ảo chuyên nghiệp hàng ngày',
      'Đảm bảo an toàn thông tin và bảo mật dữ liệu ngân hàng khi sử dụng AI'
    ],
    chapters: [
      {
        id: 'ai-c1',
        title: 'Chương 1: GenAI & Cách Mạng Ngành Ngân Hàng',
        order: 1,
        lessons: [
          {
            id: 'ai-1',
            title: 'Bài 1.1: Bộ Câu Lệnh Prompt Mẫu Soạn Thảo Đề Xuất Tín Dụng',
            duration: '28 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Hướng dẫn cấu trúc câu lệnh chuẩn để AI trích xuất thông tin tài chính và tổng hợp bảng phân tích độ an toàn vốn.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-ban-linh-thep',
    slug: 'ban-linh-thep-trong-ky-nguyen-so',
    title: 'Bản Lĩnh Thép Trong Kỷ Nguyên Số',
    subtitle: 'Rèn luyện khả năng phục hồi (Resilience), quản trị áp lực công việc và giữ vững đạo đức nghề nghiệp trong ngành tài chính nhiều thách thức.',
    category: 'Tư Duy & Đột Phá',
    level: 'Tất cả cấp bậc',
    price: 1190000,
    originalPrice: 2200000,
    rating: 5.0,
    reviewsCount: 160,
    studentsCount: 1720,
    duration: '18 giờ học',
    lessonsCount: 16,
    badgeType: 'useful',
    thumbnail: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[0],
    highlights: [
      'Kỹ năng quản trị cảm xúc khi gặp khách hàng khó tính hoặc nợ xấu',
      'Bảo vệ đạo đức nghề nghiệp và tuân thủ pháp lý tín dụng nghiêm ngặt'
    ],
    objectives: [
      'Vững vàng tâm lý, tự tin phát triển sự nghiệp ngân hàng bền vững'
    ],
    chapters: [
      {
        id: 'bl-c1',
        title: 'Chương 1: Đạo Đức Nghề Nghiệp & Trí Tuệ Cảm Xúc',
        order: 1,
        lessons: [
          {
            id: 'bl-1',
            title: 'Bài 1.1: Nhận Diện Các Rủi Ro Pháp Lý Thường Gặp Của Banker',
            duration: '20 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Tuân thủ quy trình nội bộ là chiếc áo giáp an toàn nhất bảo vệ người làm ngân hàng trong suốt sự nghiệp.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-qhkh-co-ban',
    slug: 'quan-he-khach-hang-co-ban',
    title: 'Quan hệ Khách hàng cơ bản',
    subtitle: 'Nền tảng nghiệp vụ tổng quan dành cho sinh viên chuẩn bị ra trường và nhân sự chuyển ngành bước vào con đường Ngân hàng chuyên nghiệp.',
    category: 'Ngân Hàng & Tín Dụng',
    level: 'Chuyên viên Mới (Fresher)',
    price: 6600000,
    originalPrice: 8500000,
    rating: 5.0,
    reviewsCount: 198,
    studentsCount: 1850,
    duration: '40 giờ bài giảng',
    lessonsCount: 32,
    badgeType: 'useful',
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[0],
    highlights: [
      'Giao tiếp chuyên nghiệp, phong thái banker chuẩn mực',
      'Hiểu rõ các sản phẩm tiền gửi, thẻ tín dụng, cho vay tiêu dùng'
    ],
    objectives: [
      'Đỗ các vòng phỏng vấn tuyển dụng tại các Ngân hàng lớn (MSB, Techcombank, VPBank, Vietcombank)'
    ],
    chapters: [
      {
        id: 'cb-c1',
        title: 'Chương 1: Nhập Môn Nghiệp Vụ Ngân Hàng Thương Mại',
        order: 1,
        lessons: [
          {
            id: 'cb-1',
            title: 'Bài 1.1: Cấu Trúc Vận Hành Các Khối Trong Ngân Hàng',
            duration: '22 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Tìm hiểu mối quan hệ cộng tác giữa Khối Kinh doanh, Khối Thẩm định rủi ro và Khối Vận hành.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-lam-chu-du-lieu',
    slug: 'lam-chu-du-lieu-dan-dau-xu-the',
    title: 'Làm chủ dữ liệu, dẫn đầu xu thế',
    subtitle: 'Khai thác dữ liệu phân tích hành vi tiêu dùng, số hóa quy trình báo cáo quản trị và ra quyết định kinh doanh dựa trên dữ liệu (Data-driven).',
    category: 'Kỹ Năng Số & AI',
    level: 'Chuyên viên Chính',
    price: 2190000,
    originalPrice: 3800000,
    rating: 5.0,
    reviewsCount: 130,
    studentsCount: 1390,
    duration: '32 giờ thực hành dữ liệu',
    lessonsCount: 26,
    badgeType: 'new',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    instructor: REAL_INSTRUCTORS[2],
    highlights: [
      'Trực quan hóa dữ liệu qua biểu đồ trực quan Power BI / Dashboard',
      'Phân khúc khách hàng tiềm năng bằng mô hình dữ liệu RFM'
    ],
    objectives: [
      'Biến dữ liệu thô thành thông tin giá trị hỗ trợ bán chéo sản phẩm'
    ],
    chapters: [
      {
        id: 'data-c1',
        title: 'Chương 1: Tư Duy Phân Tích Dữ Liệu Ngân Hàng',
        order: 1,
        lessons: [
          {
            id: 'data-1',
            title: 'Bài 1.1: Trực Quan Hóa Dữ Liệu Doanh Số Chi Nhánh',
            duration: '30 phút',
            type: 'video',
            isFreePreview: true,
            videoTranscript: 'Cách xây dựng biểu đồ theo dõi tăng trưởng dư nợ và nợ xấu theo từng phân khúc khách hàng.'
          }
        ]
      }
    ]
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderCode: 'TW-89241',
    courseId: 'course-qhkh-ca-nhan',
    courseTitle: 'Quan hệ Khách hàng cá nhân',
    amount: 7599000,
    originalAmount: 9500000,
    discountAmount: 1901000,
    status: 'paid',
    paymentMethod: 'vietqr',
    customerName: 'Nguyễn Văn Minh',
    customerEmail: 'minh.nguyen99@gmail.com',
    customerPhone: '0912345678',
    createdAt: '2026-09-28T09:15:00Z',
    paidAt: '2026-09-28T09:17:24Z'
  },
  {
    id: 'ord-102',
    orderCode: 'TW-89242',
    courseId: 'course-mbo-to-okr',
    courseTitle: 'Di Sản Từ MBO Đến Kỷ Nguyên OKR',
    amount: 1890000,
    originalAmount: 3200000,
    discountAmount: 1310000,
    status: 'paid',
    paymentMethod: 'vietqr',
    customerName: 'Trần Thị Thu Hà',
    customerEmail: 'thuha.tran@msb.com.vn',
    customerPhone: '0988776655',
    createdAt: '2026-09-29T14:30:00Z',
    paidAt: '2026-09-29T14:31:45Z'
  },
  {
    id: 'ord-103',
    orderCode: 'TW-89243',
    courseId: 'course-ai-ngan-hang',
    courseTitle: 'Khai mở sức mạnh AI',
    amount: 1352000,
    originalAmount: 3200000,
    discountAmount: 1848000,
    discountCode: 'TWINGS2026',
    status: 'pending',
    paymentMethod: 'vietqr',
    customerName: 'Lê Hoàng Anh',
    customerEmail: 'hoanganh.le@gmail.com',
    customerPhone: '0977112233',
    createdAt: '2026-09-30T20:10:00Z'
  }
];

export const INITIAL_STUDENTS: StudentEnrollment[] = [
  {
    id: 'stu-01',
    studentName: 'Nguyễn Văn Minh',
    studentEmail: 'minh.nguyen99@gmail.com',
    studentPhone: '0912345678',
    courseId: 'course-qhkh-ca-nhan',
    courseTitle: 'Quan hệ Khách hàng cá nhân',
    enrolledAt: '2026-09-28',
    completedLessons: ['les-c1-1'],
    progressPercent: 50,
    lastActive: 'Hôm nay 08:30',
    quizScores: { 'les-c1-2': 100 }
  },
  {
    id: 'stu-02',
    studentName: 'Trần Thị Thu Hà',
    studentEmail: 'thuha.tran@msb.com.vn',
    studentPhone: '0988776655',
    courseId: 'course-mbo-to-okr',
    courseTitle: 'Di Sản Từ MBO Đến Kỷ Nguyên OKR',
    enrolledAt: '2026-09-29',
    completedLessons: ['mbo-1', 'mbo-2'],
    progressPercent: 75,
    lastActive: 'Hôm qua 21:15',
    quizScores: {}
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'TWINGS2026',
    discountPercent: 20,
    description: 'Ưu đãi bứt phá sự nghiệp ngân hàng - Giảm 20% toàn bộ khóa học',
    validUntil: '2026-12-31',
    usageCount: 142,
    maxUsage: 500,
    isActive: true
  },
  {
    code: 'BANKERPRO',
    discountPercent: 15,
    description: 'Giảm 15% khóa học Nghiệp vụ Tín dụng & OKR',
    validUntil: '2026-11-30',
    usageCount: 88,
    maxUsage: 200,
    isActive: true
  }
];

export const REAL_PARTNERS: PartnerItem[] = [
  {
    id: 'p-msb',
    name: 'MSB',
    slogan: 'Ngân hàng TMCP Hàng Hải Việt Nam - cùng vươn tầm',
    themeColor: '#EA580C',
  },
  {
    id: 'p-rox',
    name: 'ROX GROUP',
    slogan: 'Tập đoàn Đầu tư & Phát triển Bất động sản, Dịch vụ ROX',
    themeColor: '#E65100',
  },
  {
    id: 'p-tntalent',
    name: 'TNTalent',
    slogan: 'Tư vấn & Cung ứng Giải pháp Nhân sự Chiến lược',
    themeColor: '#DC2626',
  }
];

export const REAL_GALLERY: GalleryPhoto[] = [
  {
    id: 'g1',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    caption: 'Lễ khai giảng Khóa Đào tạo Nghiệp vụ Ngân hàng Thực chiến tại Hội trường Twings Academy'
  },
  {
    id: 'g2',
    url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    caption: 'Học viên thuyết trình phương án tín dụng trước Hội đồng Giám khảo Giám đốc MSB'
  },
  {
    id: 'g3',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    caption: 'Trao chứng chỉ tốt nghiệp xuất sắc cho các Tân Banker chuẩn bị gia nhập ngân hàng'
  },
  {
    id: 'g4',
    url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80',
    caption: 'Workshop thực hành triển khai mô hình OKR và quản trị thực thi cho cán bộ quản lý'
  },
  {
    id: 'g5',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    caption: 'Sinh viên các trường Đại học Kinh tế Quốc dân, Học viện Ngân hàng tham gia trải nghiệm'
  },
  {
    id: 'g6',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
    caption: 'Buổi thảo luận nhóm chuyên sâu về phương pháp thẩm định dòng tiền dự án'
  }
];

export const DEFAULT_CMS_SECTIONS: CMSSectionsConfig = {
  hero: {
    enabled: true,
    title: 'Cùng TWINGS ACADEMY Chắp cánh SỰ NGHIỆP NGÂN HÀNG',
    subSlogan: 'HỌC VIỆN ĐÀO TẠO NGHIỆP VỤ NGÂN HÀNG THỰC CHIẾN',
    description: 'TWings Academy giúp bạn phát triển nhanh những năng lực thực tiễn, thích ứng với thị trường lao động không ngừng thay đổi và chủ động tiến xa trên hành trình sự nghiệp.',
    formTitle: 'ĐĂNG KÝ TƯ VẤN KHÓA HỌC',
  },
  intro: {
    enabled: true,
    eyebrow: 'TWINGS ACADEMY',
    headline: 'NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI',
    description: 'TWings Academy giúp bạn phát triển nhanh những năng lực thực tiễn, thích ứng với thị trường lao động không ngừng thay đổi và chủ động tiến xa trên hành trình sự nghiệp.',
  },
  bestsellers: {
    enabled: true,
    title: 'KHÓA HỌC BÁN CHẠY NHẤT',
    bgColor: '#FF5722',
  },
  recommended: {
    enabled: true,
    title: 'ĐƯỢC ĐỀ XUẤT CHO BẠN',
    bgColor: '#0050D8',
  },
  newReleases: {
    enabled: true,
    title: 'KHÓA HỌC MỚI RA MẮT',
    bgColor: '#FF5722',
  },
  mostUseful: {
    enabled: true,
    title: 'KHÓA HỌC HỮU ÍCH NHẤT',
    bgColor: '#0050D8',
  },
  partners: {
    enabled: true,
    title: 'ĐỐI TÁC ĐỒNG HÀNH CÙNG TWINGS ACADEMY',
    items: REAL_PARTNERS,
  },
  instructors: {
    enabled: true,
    title: 'ĐỘI NGŨ GIẢNG VIÊN TẠI TWINGS',
    items: REAL_INSTRUCTORS,
  },
  gallery: {
    enabled: true,
    title: 'HÌNH ẢNH HỌC VIÊN TWINGS',
    photos: REAL_GALLERY,
  },
  about: {
    enabled: true,
    title: 'TWINGS ACADEMY',
    subtitle: 'HỌC VIỆN TIÊN PHONG TRONG MÔ HÌNH ĐÀO TẠO THỰC CHIẾN',
    lead: 'TWings Academy - Học viện tiên phong với mô hình đào tạo thực chiến trong lĩnh vực tài chính - ngân hàng, nay mở rộng hệ sinh thái học tập với các khóa học Short course: chương trình đào tạo ngắn hạn, tập trung, ứng dụng cao, giúp học viên nhanh chóng nắm bắt kiến thức trọng tâm và nâng cấp kỹ năng cần thiết cho học tập, công việc và định hướng nghề nghiệp.\n\nBên cạnh các khóa đào tạo thực chiến chuyên sâu, TWings Academy phát triển các khóa học Short course nhằm đáp ứng nhu cầu học nhanh, học đúng trọng tâm, học để ứng dụng ngay. Với triết lý "Học đi đôi với hành", các chương trình được thiết kế tinh gọn nhưng thực tiễn, cập nhật xu hướng mới trong ngành tài chính - ngân hàng và các kỹ năng nghề nghiệp hiện đại, giúp học viên rút ngắn thời gian học tập nhưng vẫn đạt được hiệu quả rõ ràng.',
    vision: 'Trở thành học viện hàng đầu Việt Nam về đào tạo thực chiến và đào tạo ngắn hạn trong lĩnh vực tài chính - ngân hàng, là cầu nối uy tín giúp học viên, sinh viên và người đi làm nâng cao năng lực nghề nghiệp, sẵn sàng thích ứng với nhu cầu ngày càng khắt khe của thị trường lao động.',
    mission: [
      'Cung cấp các chương trình đào tạo thực chiến và khóa học Short course ngắn hạn, tập trung vào kiến thức cốt lõi, kỹ năng thực tiễn và khả năng ứng dụng ngay sau học.',
      'Xây dựng môi trường học tập năng động, linh hoạt, phù hợp với học viên, sinh viên và người đi làm có nhu cầu nâng cấp năng lực trong thời gian ngắn.',
      'Đồng hành cùng học viên trong quá trình định hướng nghề nghiệp, phát triển kỹ năng và gia tăng lợi thế cạnh tranh trên thị trường tài chính - ngân hàng.',
      'Liên tục cập nhật nội dung đào tạo theo xu hướng mới, kết hợp phương pháp giảng dạy hiện đại để mang đến trải nghiệm học tập hiệu quả, thực tế và khác biệt.'
    ],
    coreValues: [
      'Thấu hiểu: Lắng nghe nhu cầu học tập, phát triển kỹ năng và định hướng nghề nghiệp của học viên để thiết kế chương trình phù hợp, thiết thực.',
      'Thực tiễn: Tập trung vào kiến thức và kỹ năng có thể áp dụng ngay trong học tập, công việc và môi trường nghề nghiệp thực tế.',
      'Tinh gọn: Thiết kế nội dung ngắn hạn, cô đọng, đúng trọng tâm, giúp học viên tiết kiệm thời gian nhưng vẫn đạt hiệu quả học tập cao.',
      'Sáng tạo: Không ngừng đổi mới nội dung, phương pháp đào tạo và trải nghiệm học tập để bắt kịp xu hướng hiện đại.',
      'Nâng tầm: Đồng hành cùng học viên trong quá trình phát triển năng lực, mở rộng cơ hội nghề nghiệp và đạt được những mục tiêu vượt trội.'
    ]
  },
  contact: {
    address: 'Tòa ROX Tower, 54A Nguyễn Chí Thanh, Phường Láng, Hà Nội',
    hotline: '0843 314 382 (Ms. Hường)',
    email: 'hello@twings.edu.vn',
    facebook: 'https://www.facebook.com/twings.academy',
    copyright: '©2024 Allrights reserved TNTalent'
  }
};

export const TWINGS_BANKING_CONFIG = {
  bankName: 'MSB (Ngân hàng TMCP Hàng Hải Việt Nam)',
  bankBin: '970426',
  accountNumber: '03001010999988',
  accountName: 'CONG TY CP GIAO DUC TWINGS ACADEMY',
  hotline: '0843 314 382',
  email: 'hello@twings.edu.vn',
  website: 'https://www.twings.edu.vn',
  address: 'Tòa ROX Tower, 54A Nguyễn Chí Thanh, Phường Láng, Hà Nội'
};

export const TWINGS_CONFIG = TWINGS_BANKING_CONFIG;
