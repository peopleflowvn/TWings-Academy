import { CourseCohort, CohortStatus, Order } from '../types';

export const INITIAL_COHORTS: CourseCohort[] = [
  {
    id: 'cib-k8-hn',
    courseId: 'twings-qhkh-doanh-nghiep',
    courseTitle: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    name: 'Khóa học 8 - Hà Nội',
    startDate: '15/09/2026',
    registrationDeadline: '10/09/2026',
    capacity: 25,
    status: 'in_progress',
    nextCohortId: 'cib-k9-hn',
    nextCohortName: 'Khóa học 9 - Hà Nội',
    autoRolloverWaitlist: true,
    trainerName: 'GV Đặng Văn Thành (Giám đốc Bán hàng Toàn quốc MSB)',
    leadInstructorId: 'inst-dang-van-thanh',
    leadInstructorName: 'GV Đặng Văn Thành',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    location: 'Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội',
    notes: 'Lớp đã đủ 25/25 học viên và khai giảng thành công. Toàn bộ đăng ký mới được chuyển sang Khóa 9.'
  },
  {
    id: 'cib-k9-hn',
    courseId: 'twings-qhkh-doanh-nghiep',
    courseTitle: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    name: 'Khóa học 9 - Hà Nội',
    startDate: '15/10/2026',
    registrationDeadline: '12/10/2026',
    capacity: 25,
    status: 'opening',
    nextCohortId: 'cib-k10-hn',
    nextCohortName: 'Khóa học 10 (Tháng 11/2026)',
    autoRolloverWaitlist: true,
    trainerName: 'GV Vũ Thu Phương (Giám đốc Phân khúc KH Doanh nghiệp MSB)',
    leadInstructorId: 'inst-vu-thu-phuong',
    leadInstructorName: 'GV Vũ Thu Phương',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    location: 'Hội sở MSB 54A Nguyễn Chí Thanh, Hà Nội',
    notes: 'Đang mở tuyển sinh đợt cao điểm tháng 10. Đã tuyển được 18/25 chỉ tiêu.'
  },
  {
    id: 'cib-k10-hn',
    courseId: 'twings-qhkh-doanh-nghiep',
    courseTitle: 'Khóa Quan hệ Khách hàng doanh nghiệp',
    name: 'Khóa học 10 (Tháng 11/2026)',
    startDate: '15/11/2026',
    registrationDeadline: '10/11/2026',
    capacity: 25,
    status: 'upcoming',
    autoRolloverWaitlist: true,
    trainerName: 'ThS. Lê Hoàng Tùng (Nguyên GĐ Chi nhánh MSB)',
    leadInstructorId: 'inst-le-hoang-tung',
    leadInstructorName: 'ThS. Lê Hoàng Tùng',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    location: 'Hội sở MSB Hà Nội',
    notes: 'Lớp dự bị nhận chuyển tiếp từ Khóa 9 khi Khóa 9 đạt 25 học viên.'
  },
  {
    id: 'rb-k8-hcm',
    courseId: 'twings-qhkh-ca-nhan',
    courseTitle: 'Quan hệ Khách hàng cá nhân',
    name: 'Khóa học 8 - HCM',
    startDate: '08/09/2026',
    registrationDeadline: '05/09/2026',
    capacity: 25,
    status: 'in_progress',
    nextCohortId: 'rb-k9-hn',
    nextCohortName: 'Khóa học 9 - Hà Nội & Online',
    autoRolloverWaitlist: true,
    trainerName: 'GV Đặng Văn Thành (Chuyên gia Bán lẻ MSB Miền Nam)',
    leadInstructorId: 'inst-dang-van-thanh',
    leadInstructorName: 'GV Đặng Văn Thành',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    location: 'MSB Chi nhánh Sài Gòn, Q.1, TP.HCM',
    notes: 'Đang đào tạo module Thẩm định Tín dụng Tiêu dùng.'
  },
  {
    id: 'rb-k9-hn',
    courseId: 'twings-qhkh-ca-nhan',
    courseTitle: 'Quan hệ Khách hàng cá nhân',
    name: 'Khóa học 9 - Hà Nội & Online',
    startDate: '20/10/2026',
    registrationDeadline: '16/10/2026',
    capacity: 25,
    status: 'opening',
    autoRolloverWaitlist: true,
    trainerName: 'GV Vũ Thu Phương (25+ năm KN Ngân hàng)',
    leadInstructorId: 'inst-vu-thu-phuong',
    leadInstructorName: 'GV Vũ Thu Phương',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    location: 'Hội sở MSB & Hybrid Zoom LMS',
    notes: 'Đang tiếp nhận học viên đăng ký sớm giữ học bổng 20%.'
  },
  {
    id: 'gdv-k9-hn',
    courseId: 'gdv-ngan-hang',
    courseTitle: 'Giao dịch viên & Vận hành Dịch vụ Khách hàng',
    name: 'Khóa học 9 - GDV Ngân hàng',
    startDate: '25/10/2026',
    registrationDeadline: '20/10/2026',
    capacity: 20,
    status: 'opening',
    autoRolloverWaitlist: true,
    trainerName: 'GV Nguyễn Kim Chi (GĐ Quản trị Chuyển đổi MSB)',
    leadInstructorId: 'inst-nguyen-kim-chi',
    leadInstructorName: 'GV Nguyễn Kim Chi',
    instructorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    location: 'MSB Sở Giao Dịch Hà Nội',
    notes: 'Cam kết 100% học viên tốt nghiệp đạt chuẩn tiếp nhận thực tập có lương.'
  },
  {
    id: 'ai-k9-online',
    courseId: 'deeplearning-ai-agents',
    courseTitle: 'Xây dựng các Đại lý AI & Quy trình Làm việc Tự động',
    name: 'Khóa học 9 - AI Agents Online',
    startDate: '18/10/2026',
    registrationDeadline: '15/10/2026',
    capacity: 35,
    status: 'opening',
    autoRolloverWaitlist: true,
    trainerName: 'GV Nguyễn Kim Chi & Chuyên gia AI Banking',
    leadInstructorId: 'inst-nguyen-kim-chi',
    leadInstructorName: 'GV Nguyễn Kim Chi',
    instructorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    location: 'Online LMS Coursera & Hands-on Lab',
    notes: 'Lớp học thực hành xây dựng AI Agent cho nghiệp vụ thẩm định hồ sơ.'
  }
];

export const COHORT_STATUS_CONFIG: Record<
  CohortStatus,
  { label: string; badgeBg: string; textClass: string; dotClass: string; description: string }
> = {
  opening: {
    label: 'Đang Mở Tuyển Sinh',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
    description: 'Lớp đang nhận đăng ký mới bình thường. Học viên đăng ký sẽ được xếp thẳng vào lớp này.'
  },
  full: {
    label: 'Đã Đủ Sĩ Số (Đóng Tuyển)',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
    description: 'Lớp đã đạt chỉ tiêu tối đa (25/25). Mọi đăng ký mới sẽ tự động chuyển sang Lớp Kế Nhiệm.'
  },
  in_progress: {
    label: 'Đang Đào Tạo',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
    description: 'Lớp đã chính thức khai giảng. Học viên đang học trên Coursera và trải nghiệm thực địa tại MSB.'
  },
  completed: {
    label: 'Đã Tốt Nghiệp',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    textClass: 'text-purple-700',
    dotClass: 'bg-purple-500',
    description: 'Học viên đã hoàn thành khóa học, đã cấp chứng chỉ và bàn giao hồ sơ tuyển dụng sang MSB.'
  },
  upcoming: {
    label: 'Dự Bị (Sắp Mở)',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
    description: 'Lớp dự phòng đợt tiếp theo. Sẵn sàng tiếp nhận học viên chuyển tiếp khi lớp hiện tại đóng.'
  }
};

const normalizeCohortLabel = (s: string | undefined) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * True when a lead's free-text cohort label refers to the given cohort name: exact match, or the
 * label is a less specific prefix ending on a word boundary ("Khóa học 8" → "Khóa học 8 - Hà Nội",
 * but never "Khóa học 1" → "Khóa học 10"). Empty labels never match.
 */
export function cohortLabelMatches(label: string | undefined, cohortName: string): boolean {
  const l = normalizeCohortLabel(label);
  const n = normalizeCohortLabel(cohortName);
  if (!l || !n) return false;
  if (l === n) return true;
  return n.startsWith(l) && !/[\p{L}\p{N}]/u.test(n.charAt(l.length));
}

/**
 * Resolves the active cohort for a course when an inbound lead arrives.
 * If the preferred cohort is full or in_progress, it automatically routes to the next opening cohort.
 */
export function resolveActiveCohortForCourse(
  courseId: string,
  preferredCohortName: string | undefined,
  cohorts: CourseCohort[]
): { assignedCohort: CourseCohort; wasRerouted: boolean; originalCohortName?: string } {
  // If user specified a cohort, check its status
  if (preferredCohortName) {
    const matched =
      cohorts.find((c) => normalizeCohortLabel(c.name) === normalizeCohortLabel(preferredCohortName)) ||
      cohorts.find((c) => c.courseId === courseId && cohortLabelMatches(preferredCohortName, c.name));
    if (matched) {
      if (matched.status === 'opening') {
        return { assignedCohort: matched, wasRerouted: false };
      }
      // If closed/full/in_progress, check for next cohort
      if (matched.nextCohortId) {
        const next = cohorts.find((c) => c.id === matched.nextCohortId);
        if (next) {
          return { assignedCohort: next, wasRerouted: true, originalCohortName: matched.name };
        }
      }
    }
  }

  // Find the primary opening cohort for this course
  const openingForCourse = cohorts.find((c) => c.courseId === courseId && c.status === 'opening');
  if (openingForCourse) {
    return { assignedCohort: openingForCourse, wasRerouted: false };
  }

  // Fallback to any upcoming or first matching cohort
  const fallback = cohorts.find((c) => c.courseId === courseId) || cohorts[0];
  return { assignedCohort: fallback, wasRerouted: false };
}

/**
 * Rollovers all pending/unpaid leads from a closed cohort to a new target cohort.
 */
export function rolloverLeadsToNextCohort(
  orders: Order[],
  fromCohortName: string,
  toCohort: CourseCohort
): { updatedOrders: Order[]; migratedCount: number } {
  let migratedCount = 0;

  const updatedOrders = orders.map((ord) => {
    // Only migrate leads that are NOT paid yet and match the fromCohort
    const matchesCohort = cohortLabelMatches(ord.batchCohort, fromCohortName);

    const isPending = ord.status !== 'paid' && ord.crmStatus !== '5. Đã đóng phí';

    if (matchesCohort && isPending) {
      migratedCount++;
      const activityLog = {
        id: `act-rollover-${Date.now()}-${migratedCount}`,
        type: 'note' as const,
        title: 'Tự động chuyển tiếp lớp (Auto-Rollover)',
        content: `Lớp ${fromCohortName} đã đóng tuyển sinh. Hồ sơ ứng viên được tự động chuyển sang ${toCohort.name} (Khai giảng ${toCohort.startDate}).`,
        actor: 'Hệ thống Quản lý Vòng đời Lớp học (CRM Engine)',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay'
      };

      return {
        ...ord,
        batchCohort: toCohort.name,
        timelineActivities: [activityLog, ...(ord.timelineActivities || [])]
      };
    }

    return ord;
  });

  return { updatedOrders, migratedCount };
}
