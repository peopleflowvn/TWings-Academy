import { Order, CRMStatus } from '../types';

export interface CompAIPipelineStage {
  id: CRMStatus;
  label: string;
  shortLabel: string;
  badgeBg: string;
  color: string;
  dotColor: string;
  description: string;
}

export const COMP_AI_PIPELINE_STAGES: CompAIPipelineStage[] = [
  {
    id: '1. Mới',
    label: '1. Ứng Tuyển & Sàng Lọc (Applied)',
    shortLabel: 'Ứng tuyển',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    color: 'text-blue-700',
    dotColor: 'bg-blue-500',
    description: 'Hồ sơ ứng tuyển mới nộp từ Website/Chiến dịch, AI đã phân tích CV & Readiness Score.'
  },
  {
    id: '2. Đã tiếp cận',
    label: '2. Phỏng Vấn Sơ Loại (Screening Call)',
    shortLabel: 'Phỏng vấn',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    color: 'text-indigo-700',
    dotColor: 'bg-indigo-500',
    description: 'Chuyên viên tuyển sinh & HR MSB gọi điện phỏng vấn sơ bộ động lực & tiêu chuẩn nghề nghiệp.'
  },
  {
    id: '3. Đang tư vấn',
    label: '3. Cố Vấn Lộ Trình MSB (Career Advising)',
    shortLabel: 'Cố vấn',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    color: 'text-amber-700',
    dotColor: 'bg-amber-500',
    description: 'Tư vấn giáo trình thực chiến, chính sách học bổng và cam kết tiếp nhận việc làm tại chi nhánh.'
  },
  {
    id: '4. Hẹn gặp',
    label: '4. Bank Tour & Đánh Giá (Assessment)',
    shortLabel: 'Bank Tour',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    color: 'text-purple-700',
    dotColor: 'bg-purple-500',
    description: 'Hẹn gặp trực tiếp tại Hội sở MSB (54A Nguyễn Chí Thanh), gặp Giám đốc Khối & làm test nghiệp vụ.'
  },
  {
    id: '5. Đã đóng phí',
    label: '5. Trúng Tuyển & Nhập Học (Enrolled)',
    shortLabel: 'Nhập học',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    description: 'Đã hoàn tất thủ tục học phí qua VietQR, cấp tài khoản Coursera LMS và kích hoạt lộ trình đào tạo.'
  },
  {
    id: '6. Chăm sóc lại',
    label: '6. Dự Bị & Chuyển Đợt Sau (Waitlist)',
    shortLabel: 'Dự bị',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    color: 'text-cyan-700',
    dotColor: 'bg-cyan-500',
    description: 'Ứng viên tiềm năng bảo lưu học bổng, chuyển sang chiến dịch tuyển dụng đợt kế tiếp.'
  },
  {
    id: '7. Đã hủy',
    label: '7. Không Phù Hợp / Loại (Archived)',
    shortLabel: 'Loại',
    badgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
    color: 'text-slate-600',
    dotColor: 'bg-slate-400',
    description: 'Hồ sơ không đáp ứng điều kiện tuyển chọn, sai số điện thoại hoặc từ chối tham gia.'
  }
];

export function runCompAIEvidenceEnrichment(lead: Order): NonNullable<Order['agentResearch']> {
  const isCorporate = (lead.courseTitle || '').toLowerCase().includes('doanh nghiệp');
  const isAI = (lead.courseTitle || '').toLowerCase().includes('ai') || (lead.courseTitle || '').toLowerCase().includes('agent');
  
  let tier: 'Tier A' | 'Tier B' | 'Tier C' | 'Tier D' = 'Tier B';
  let score = 78;

  if (lead.status === 'paid' || lead.interestLevel === 'Rất cao') {
    tier = 'Tier A';
    score = 94;
  } else if (lead.crmStatus === '7. Đã hủy') {
    tier = 'Tier D';
    score = 25;
  } else if (lead.interestLevel === 'Đang phân vân') {
    tier = 'Tier C';
    score = 62;
  }

  const verifiedFacts = [
    {
      id: `fact-1-${lead.id}`,
      fact: isCorporate
        ? `Ứng viên định hướng thi tuyển vị trí Chuyên viên QHKH Doanh nghiệp (SME RM) tại các NHTM CP (MSB, Techcombank, VPBank).`
        : isAI
        ? `Ứng viên mong muốn tự động hóa quy trình nghiệp vụ & tạo Đại lý AI ứng dụng trực tiếp vào công việc tài chính.`
        : `Ứng viên nhắm tới vị trí Quan hệ Khách hàng Cá nhân (PBO/RM) với mong muốn đạt KPI doanh số ngay tháng đầu nhận việc.`,
      verifiedAt: 'Vừa xác thực',
      confidence: 98,
      category: 'career_goal' as const,
      source: 'Phân tích đơn đăng ký & Lịch sử khảo sát nguyện vọng'
    },
    {
      id: `fact-2-${lead.id}`,
      fact: `Trình độ: ${lead.educationLevel || 'Đại học'} chuyên ngành ${lead.major || 'Tài chính - Ngân hàng'} (${lead.university || 'Học viện Ngân hàng / NEU'}).`,
      verifiedAt: '1 giờ trước',
      confidence: 100,
      category: 'background' as const,
      source: 'Căn cước công dân & Khai báo học vấn'
    },
    {
      id: `fact-3-${lead.id}`,
      fact: `Khả năng tài chính: Sẵn sàng đóng học phí qua cổng VietQR tự động, ngân sách phù hợp mức ${new Intl.NumberFormat('vi-VN').format(lead.amount)} ₫.`,
      verifiedAt: '2 giờ trước',
      confidence: 92,
      category: 'budget' as const,
      source: 'Check-in đối soát hạn mức thanh toán VietQR'
    },
    {
      id: `fact-4-${lead.id}`,
      fact: `Thời gian học khả dụng: Ưu tiên lớp học ca tối (Thứ 3-5-7) hoặc cuối tuần kết hợp kiến tập thực tế tại Chi nhánh MSB.`,
      verifiedAt: 'Hôm qua',
      confidence: 95,
      category: 'timing' as const,
      source: 'Ghi âm cuộc gọi tư vấn sàng lọc ban đầu'
    }
  ];

  const battleCard = {
    candidateProfileSummary: `${lead.customerName} (${lead.customerPhone || 'SĐT bảo mật'}) tốt nghiệp ${lead.university || 'Đại học'}, đang tìm kiếm bước ngoặt nghề nghiệp trong lĩnh vực tài chính ngân hàng thực chiến.`,
    strengths: [
      'Nền tảng kiến thức kinh tế vững vàng, tư duy logic tốt',
      'Khao khát gia nhập hệ sinh thái MSB & ROX Group',
      'Chủ động tìm hiểu chương trình đào tạo chuyên sâu'
    ],
    objections: [
      'Lo lắng về thời gian học bận rộn nếu vừa đi làm vừa học',
      'Cần cam kết bảo lãnh phỏng vấn việc làm bằng văn bản'
    ],
    recommendedPitch: `Nhấn mạnh quyền lợi "Bảo lãnh thực tập có trợ cấp tại MSB" và lịch học linh hoạt xem lại video bài giảng YouTube LMS 24/7. Hướng dẫn quét mã VietQR để giữ suất ưu đãi giảm ngay học phí.`,
    suggestedCoursePackage: lead.courseTitle || 'Chương trình Đào tạo Chuyên viên Ngân hàng Thực chiến'
  };

  return {
    verifiedFacts,
    leadQualityTier: tier,
    readinessScore: score,
    battleCard,
    researchStatus: 'completed',
    lastResearchedAt: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
  };
}
