import { AdmissionCampaign, CampaignPositionTrack, Order } from '../types';

/**
 * TALENTFLOW ADMISSION & RECRUITMENT CAMPAIGN ARCHITECTURE
 * Models admissions batches as Talent Acquisition Campaigns and courses as Job Requisitions/Tracks
 * Inspired by TalentFlow 1.0 (PeopleFlow ATS)
 */
export const INITIAL_CAMPAIGNS: AdmissionCampaign[] = [
  {
    id: 'camp-2026-q4-hn',
    code: 'CAMP-2026-Q4-HN',
    name: 'Chiến Dịch Tuyển Sinh Fresher Banker Q4/2026 - Hà Nội & Miền Bắc',
    timeRange: '15/09/2026 - 15/11/2026',
    startDate: '15/09/2026',
    deadline: '12/10/2026',
    status: 'active',
    targetHeadcount: 100,
    totalEnrolled: 78,
    leadRecruiter: 'ThS. Lê Hoàng Tùng & Ban Nhân sự Hội sở MSB',
    scholarshipBudget: 250000000,
    location: 'Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội',
    description: 'Chiến dịch trọng điểm tuyển chọn và đào tạo 100 nhân sự đầu vào chất lượng cao tiếp nhận trực tiếp vào các Chi nhánh MSB Hà Nội & Vùng 1.',
    positions: [
      {
        id: 'pos-cib-hn',
        courseId: 'twings-qhkh-doanh-nghiep',
        positionTitle: 'Chuyên viên Quan hệ Khách hàng Doanh nghiệp (RM CIB/SME)',
        shortName: 'RM Doanh Nghiệp (CIB)',
        department: 'Khối Khách Hàng Doanh Nghiệp MSB',
        targetQuota: 25,
        enrolledCount: 18,
        leadInstructorName: 'GV Vũ Thu Phương (Giám đốc Phân khúc KH Doanh nghiệp)',
        salaryRange: '15 - 28 Triệu / tháng',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
      },
      {
        id: 'pos-rb-hn',
        courseId: 'twings-qhkh-ca-nhan',
        positionTitle: 'Chuyên viên Quan hệ Khách hàng Cá nhân (Retail Banker)',
        shortName: 'RM Cá Nhân (RB)',
        department: 'Khối Ngân Hàng Bán Lẻ MSB',
        targetQuota: 25,
        enrolledCount: 21,
        leadInstructorName: 'GV Đặng Văn Thành (GĐ Bán Hàng Toàn Quốc MSB)',
        salaryRange: '12 - 22 Triệu / tháng',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      },
      {
        id: 'pos-gdv-hn',
        courseId: 'gdv-ngan-hang',
        positionTitle: 'Giao Dịch Viên & Vận Hành Dịch Vụ Khách Hàng',
        shortName: 'Giao Dịch Viên (Teller)',
        department: 'Khối Quản Trị & Dịch Vụ Khách Hàng Chi Nhánh',
        targetQuota: 20,
        enrolledCount: 15,
        leadInstructorName: 'GV Nguyễn Kim Chi (GĐ Quản trị Chuyển đổi MSB)',
        salaryRange: '10 - 16 Triệu / tháng',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      },
      {
        id: 'pos-ai-hn',
        courseId: 'deeplearning-ai-agents',
        positionTitle: 'Kỹ Sư AI & Tự Động Hóa Quy Trình Ngân Hàng (AI Agents)',
        shortName: 'Kỹ Sư AI Banking',
        department: 'Khối Chiến Lược & Sáng Tạo Đổi Mới MSB',
        targetQuota: 30,
        enrolledCount: 24,
        leadInstructorName: 'Chuyên gia AI Banking TWings & MSB Labs',
        salaryRange: '18 - 35 Triệu / tháng',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
      }
    ]
  },
  {
    id: 'camp-2026-oct-hcm',
    code: 'CAMP-2026-OCT-HCM',
    name: 'Chiến Dịch Thu Hút Cán Bộ Tín Dụng & Banker TP.HCM - Tháng 10/2026',
    timeRange: '01/10/2026 - 30/11/2026',
    startDate: '01/10/2026',
    deadline: '20/10/2026',
    status: 'active',
    targetHeadcount: 60,
    totalEnrolled: 42,
    leadRecruiter: 'Ban Nhân Sự MSB Vùng Miền Nam',
    scholarshipBudget: 150000000,
    location: 'MSB Chi nhánh Sài Gòn, Q.1, TP.HCM',
    description: 'Chương trình đào tạo thực chiến cấp tốc bổ sung lực lượng tín dụng và giao dịch viên cho hệ thống 35 phòng giao dịch MSB tại TP.HCM & Đông Nam Bộ.',
    positions: [
      {
        id: 'pos-rb-hcm',
        courseId: 'twings-qhkh-ca-nhan',
        positionTitle: 'Chuyên viên Khách hàng Ưu tiên & Tín dụng Bán lẻ',
        shortName: 'RM Bán Lẻ TP.HCM',
        department: 'Khối Ngân Hàng Bán Lẻ MSB Miền Nam',
        targetQuota: 30,
        enrolledCount: 22,
        leadInstructorName: 'GV Đặng Văn Thành',
        salaryRange: '14 - 25 Triệu / tháng',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      },
      {
        id: 'pos-cib-hcm',
        courseId: 'twings-qhkh-doanh-nghiep',
        positionTitle: 'Chuyên viên Tín dụng Doanh nghiệp Vừa & Nhỏ (SME)',
        shortName: 'RM SME Sài Gòn',
        department: 'Khối Khách Hàng Doanh Nghiệp MSB Miền Nam',
        targetQuota: 30,
        enrolledCount: 20,
        leadInstructorName: 'GV Vũ Thu Phương',
        salaryRange: '16 - 30 Triệu / tháng',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
      }
    ]
  },
  {
    id: 'camp-2027-q1-fresher',
    code: 'CAMP-2027-Q1-EARLY',
    name: 'Chiến Dịch Tuyển Sinh Sớm Mùa Tốt Nghiệp Q1/2027 (Early Bird)',
    timeRange: '15/11/2026 - 15/02/2027',
    startDate: '15/11/2026',
    deadline: '10/01/2027',
    status: 'planning',
    targetHeadcount: 120,
    totalEnrolled: 18,
    leadRecruiter: 'Hội đồng Tuyển sinh TWings Academy',
    scholarshipBudget: 300000000,
    location: 'Hà Nội & TP.HCM (Hybrid)',
    description: 'Chương trình nhận hồ sơ sớm dành riêng cho sinh viên năm cuối các trường ĐH Kinh Tế Quốc Dân, Ngoại Thương, Học viện Ngân hàng, Ngân hàng TP.HCM.',
    positions: [
      {
        id: 'pos-cib-2027',
        courseId: 'twings-qhkh-doanh-nghiep',
        positionTitle: 'Quản trị Viên Tập sự Ngân hàng Doanh nghiệp (CIB MT)',
        shortName: 'CIB Management Trainee',
        department: 'Khối KHDN MSB',
        targetQuota: 40,
        enrolledCount: 6,
        salaryRange: '15 - 32 Triệu / tháng',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
      },
      {
        id: 'pos-ai-2027',
        courseId: 'deeplearning-ai-agents',
        positionTitle: 'Chuyên viên Phân tích Dữ liệu & AI Tín dụng',
        shortName: 'AI & Data Analyst',
        department: 'Trung tâm Phân tích Dữ liệu MSB',
        targetQuota: 40,
        enrolledCount: 7,
        salaryRange: '20 - 40 Triệu / tháng',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
      },
      {
        id: 'pos-rb-2027',
        courseId: 'twings-qhkh-ca-nhan',
        positionTitle: 'Chuyên viên Tư vấn Tài chính Cá nhân Fresher',
        shortName: 'Fresh Retail Banker',
        department: 'Khối Bán Lẻ MSB',
        targetQuota: 40,
        enrolledCount: 5,
        salaryRange: '12 - 20 Triệu / tháng',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      }
    ]
  }
];

export function getSavedCampaigns(): AdmissionCampaign[] {
  try {
    const raw = localStorage.getItem('twings_admission_campaigns');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return INITIAL_CAMPAIGNS;
}

/** The campaign position of a lead: the position on the lead's course (none if the course is not in the campaign). */
export function matchOrderToPosition(order: Order, positions: CampaignPositionTrack[]): CampaignPositionTrack | undefined {
  return (positions || []).find((p) => p.courseId === order.courseId);
}
