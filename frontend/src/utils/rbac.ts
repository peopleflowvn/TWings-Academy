import { AdminUser, UserRole, PermissionDefinition, RolePermissionConfig } from '../types';

// -----------------------------------------------------------------
// 1. SYSTEM GRANULAR PERMISSION DEFINITIONS (All 7 Categories)
// -----------------------------------------------------------------
export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Category 1: CRM & Đơn hàng
  {
    id: 'perm-crm-1',
    code: 'crm.view_leads',
    name: 'Xem danh sách khách hàng & lead',
    description: 'Truy cập tab CRM, xem thông tin khách đăng ký và lịch sử chăm sóc',
    category: 'crm',
    categoryLabel: '1. CRM & Quản Lý Đơn Hàng',
    riskLevel: 'low'
  },
  {
    id: 'perm-crm-2',
    code: 'crm.edit_status',
    name: 'Cập nhật tiến trình tư vấn (Pipeline)',
    description: 'Chuyển đổi trạng thái từ 1. Mới đến 5. Đã đóng phí và 7. Đã hủy',
    category: 'crm',
    categoryLabel: '1. CRM & Quản Lý Đơn Hàng',
    riskLevel: 'medium'
  },
  {
    id: 'perm-crm-3',
    code: 'crm.assign_pic',
    name: 'Phân công nhân sự phụ trách (PIC)',
    description: 'Chỉ định chuyên viên tư vấn tiếp nhận và chăm sóc hồ sơ',
    category: 'crm',
    categoryLabel: '1. CRM & Quản Lý Đơn Hàng',
    riskLevel: 'low'
  },
  {
    id: 'perm-crm-4',
    code: 'crm.export_excel',
    name: 'Xuất dữ liệu báo cáo Excel / CSV',
    description: 'Tải toàn bộ danh sách số điện thoại, email và hồ sơ học viên ra file ngoài',
    category: 'crm',
    categoryLabel: '1. CRM & Quản Lý Đơn Hàng',
    riskLevel: 'high'
  },
  {
    id: 'perm-crm-5',
    code: 'crm.delete_lead',
    name: 'Xóa hoặc hủy vĩnh viễn hồ sơ lead',
    description: 'Xóa dữ liệu khách hàng trùng lặp hoặc đăng ký thử nghiệm (Không thể hoàn tác)',
    category: 'crm',
    categoryLabel: '1. CRM & Quản Lý Đơn Hàng',
    riskLevel: 'high'
  },

  // Category 2: Khóa học & YouTube Embed
  {
    id: 'perm-courses-1',
    code: 'courses.view',
    name: 'Xem danh mục khóa học nội bộ',
    description: 'Truy cập danh sách khóa học và giáo trình đào tạo',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'low'
  },
  {
    id: 'perm-courses-2',
    code: 'courses.edit_info',
    name: 'Chỉnh sửa học phí & thông tin chung',
    description: 'Sửa tiêu đề, tóm tắt, học phí ưu đãi và địa điểm đào tạo',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'medium'
  },
  {
    id: 'perm-courses-3',
    code: 'courses.embed_youtube',
    name: 'Nhúng & thay đổi video YouTube học thử',
    description: 'Cấu hình link hoặc ID YouTube bài giảng mẫu cho học viên xem trước',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'medium'
  },
  {
    id: 'perm-courses-4',
    code: 'courses.instructors',
    name: 'Quản lý đội ngũ giảng viên MSB',
    description: 'Thêm, sửa thông tin Giám đốc Khối, avatar và chứng chỉ thâm niên',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'medium'
  },
  {
    id: 'perm-courses-5',
    code: 'courses.curriculum',
    name: 'Biên tập Module & lộ trình bài học',
    description: 'Thêm module, sửa bài học, cấu hình tag "Học thử miễn phí"',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'medium'
  },
  {
    id: 'perm-courses-6',
    code: 'courses.reviews',
    name: 'Kiểm duyệt review & đánh giá cựu học viên',
    description: 'Quản lý danh sách phản hồi, số sao và xác thực cựu học viên',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'low'
  },
  {
    id: 'perm-courses-7',
    code: 'courses.delete',
    name: 'Xóa hoặc gỡ bỏ khóa học',
    description: 'Gỡ khóa học khỏi website hoặc xóa bỏ vĩnh viễn dữ liệu học liệu',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'high'
  },
  {
    id: 'perm-lms-1',
    code: 'lms.view',
    name: 'Xem tiến độ học tập (LMS)',
    description: 'Xem tài khoản, khóa đã ghi danh, % hoàn thành, điểm và lần truy cập của học viên trên Moodle',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'low'
  },
  {
    id: 'perm-lms-2',
    code: 'lms.manage',
    name: 'Quản lý học viên trên LMS',
    description: 'Ghi danh / hủy ghi danh, tạm khóa tài khoản, gửi email hướng dẫn vào học',
    category: 'courses',
    categoryLabel: '2. Khóa Học & Nhúng YouTube',
    riskLevel: 'medium'
  },

  // Category 3: Banner & Trang chủ
  {
    id: 'perm-home-1',
    code: 'banner.carousel',
    name: 'Quản lý Banner cuộn ngang (Carousel)',
    description: 'Tải lên banner đồ họa toàn phần và cấu hình hyperlink liên kết',
    category: 'homepage',
    categoryLabel: '3. Banner & Nội Dung Trang Chủ',
    riskLevel: 'medium'
  },
  {
    id: 'perm-home-2',
    code: 'homepage.intro_about',
    name: 'Biên tập Section Intro & Về Chúng Tôi',
    description: 'Thay đổi khẩu hiệu, giới thiệu học viện và các con số thống kê',
    category: 'homepage',
    categoryLabel: '3. Banner & Nội Dung Trang Chủ',
    riskLevel: 'medium'
  },
  {
    id: 'perm-home-3',
    code: 'homepage.partners',
    name: 'Quản lý logo đối tác doanh nghiệp & viện đào tạo',
    description: 'Thêm, xóa logo MSB, ROX Group, Techcombank, VPBank',
    category: 'homepage',
    categoryLabel: '3. Banner & Nội Dung Trang Chủ',
    riskLevel: 'low'
  },

  // Category 4: Bài viết & SEO
  {
    id: 'perm-articles-1',
    code: 'articles.create_edit',
    name: 'Soạn thảo & chấm điểm SEO bài viết',
    description: 'Viết bài, tối ưu từ khóa mục tiêu, mật độ từ khóa và heading',
    category: 'articles_seo',
    categoryLabel: '4. Bài Viết & Chấm Điểm SEO',
    riskLevel: 'low'
  },
  {
    id: 'perm-articles-2',
    code: 'articles.publish',
    name: 'Xuất bản hoặc gỡ bài viết tin tức',
    description: 'Chuyển trạng thái xuất bản bài viết lên trang tin tức học viện',
    category: 'articles_seo',
    categoryLabel: '4. Bài Viết & Chấm Điểm SEO',
    riskLevel: 'medium'
  },
  {
    id: 'perm-articles-3',
    code: 'seo.settings',
    name: 'Cấu hình Sitemap, Analytics & Meta Robots',
    description: 'Thiết lập Google Analytics G4, Facebook Pixel và file robots.txt',
    category: 'articles_seo',
    categoryLabel: '4. Bài Viết & Chấm Điểm SEO',
    riskLevel: 'high'
  },

  // Category 5: Kế toán & VietQR
  {
    id: 'perm-finance-1',
    code: 'finance.transactions',
    name: 'Theo dõi giao dịch VietQR thanh toán tự động',
    description: 'Xem sao kê số tiền học phí chuyển khoản và mã đơn hàng',
    category: 'finance',
    categoryLabel: '5. Kế Toán & Đối Soát Tài Chính',
    riskLevel: 'low'
  },
  {
    id: 'perm-finance-2',
    code: 'finance.confirm_manual',
    name: 'Xác nhận thu học phí & gạch nợ thủ công',
    description: 'Chuyển trạng thái đơn hàng sang "Đã đóng phí" khi nhận tiền mặt',
    category: 'finance',
    categoryLabel: '5. Kế Toán & Đối Soát Tài Chính',
    riskLevel: 'high'
  },
  {
    id: 'perm-finance-3',
    code: 'finance.referral_bonus',
    name: 'Phê duyệt chi trả hoa hồng người giới thiệu',
    description: 'Đối soát và duyệt lệnh chi trả thưởng cho nhân sự giới thiệu học viên',
    category: 'finance',
    categoryLabel: '5. Kế Toán & Đối Soát Tài Chính',
    riskLevel: 'high'
  },

  // Category 6: Quản trị hệ thống & RBAC
  {
    id: 'perm-rbac-1',
    code: 'rbac.view_users',
    name: 'Xem danh sách thành viên nội bộ',
    description: 'Xem danh sách nhân sự vận hành hệ thống',
    category: 'rbac',
    categoryLabel: '6. Quản Trị Hệ Thống & Phân Quyền (RBAC)',
    riskLevel: 'low'
  },
  {
    id: 'perm-rbac-2',
    code: 'rbac.manage_roles',
    name: 'Phân vai trò & khóa/mở khóa tài khoản',
    description: 'Chỉ định vai trò hoặc tạm khóa quyền truy cập của nhân viên',
    category: 'rbac',
    categoryLabel: '6. Quản Trị Hệ Thống & Phân Quyền (RBAC)',
    riskLevel: 'high'
  },
  {
    id: 'perm-rbac-3',
    code: 'rbac.edit_matrix',
    name: 'Chỉnh sửa ma trận phân quyền hệ thống',
    description: 'Toàn quyền cấu hình các hành vi được phép của từng nhóm vai trò',
    category: 'rbac',
    categoryLabel: '6. Quản Trị Hệ Thống & Phân Quyền (RBAC)',
    riskLevel: 'high'
  },

  // Category 7: Hạ tầng & Kiến trúc Hệ thống
  {
    id: 'perm-sys-1',
    code: 'system.architecture',
    name: 'Xem & Phân tích Kiến trúc Django Backend',
    description: 'Truy cập sơ đồ Database PostgreSQL, ORM Models và API Endpoints',
    category: 'system',
    categoryLabel: '7. Hạ Tầng & Cấu Hình Hệ Thống',
    riskLevel: 'high'
  },
  {
    id: 'perm-sys-2',
    code: 'system.sections_toggle',
    name: 'Bật / Tắt Khối Section Trang Chủ',
    description: 'Ẩn hiện linh hoạt các khối component trên giao diện Portal',
    category: 'system',
    categoryLabel: '7. Hạ Tầng & Cấu Hình Hệ Thống',
    riskLevel: 'medium'
  }
];

// -----------------------------------------------------------------
// 2. DEFAULT ROLE CONFIGS
// -----------------------------------------------------------------
export const DEFAULT_ROLE_CONFIGS: Record<UserRole, RolePermissionConfig> = {
  super_admin: {
    role: 'super_admin',
    roleName: 'Quản trị tối cao (Super Admin)',
    department: 'Ban Giám Đốc Điều Hành (BOD)',
    description: 'Toàn quyền cấu hình hệ thống, doanh thu, phân quyền và cơ sở dữ liệu',
    color: 'text-red-700 bg-red-50 border-red-200',
    badgeBg: 'bg-red-600 text-white',
    allowedPermissionCodes: SYSTEM_PERMISSIONS.map((p) => p.code)
  },
  academic_management: {
    role: 'academic_management',
    roleName: 'Vận hành Đào tạo & LMS',
    department: 'Ban Đào Tạo & Nghiệp Vụ Ngân Hàng',
    description: 'Quản lý khóa học, module bài giảng, video YouTube, giảng viên MSB và cấp tài khoản LMS',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    badgeBg: 'bg-purple-600 text-white',
    allowedPermissionCodes: [
      'courses.view',
      'courses.edit_info',
      'courses.embed_youtube',
      'courses.instructors',
      'courses.curriculum',
      'courses.reviews',
      'crm.view_leads',
      'crm.edit_status',
      'rbac.view_users',
      'lms.view',
      'lms.manage'
    ]
  },
  sales_crm: {
    role: 'sales_crm',
    roleName: 'Tư vấn Tuyển sinh & CRM',
    department: 'Phòng Phát Triển Tuyển Sinh (Sales)',
    description: 'Tiếp nhận lead, gọi điện tư vấn, chuyển trạng thái pipeline và theo dõi học phí học viên',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    allowedPermissionCodes: [
      'crm.view_leads',
      'crm.edit_status',
      'crm.assign_pic',
      'crm.export_excel',
      'courses.view',
      'lms.view'
    ]
  },
  content_seo: {
    role: 'content_seo',
    roleName: 'Biên tập Nội dung & SEO',
    department: 'Phòng Marketing & Truyền Thông Số',
    description: 'Soạn thảo bài viết, chấm điểm SEO On-page, cấu hình banner carousel và sitemap',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    allowedPermissionCodes: [
      'banner.carousel',
      'homepage.intro_about',
      'homepage.partners',
      'articles.create_edit',
      'articles.publish',
      'seo.settings',
      'courses.view'
    ]
  },
  finance_accountant: {
    role: 'finance_accountant',
    roleName: 'Kế toán & Tài chính',
    department: 'Phòng Kế Toán & Quản Trị Tài Chính',
    description: 'Đối soát dòng tiền VietQR, xuất hóa đơn, duyệt chi trả hoa hồng và báo cáo doanh số',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
    allowedPermissionCodes: [
      'crm.view_leads',
      'crm.export_excel',
      'finance.transactions',
      'finance.confirm_manual',
      'finance.referral_bonus',
      'courses.view'
    ]
  }
};

// -----------------------------------------------------------------
// 3. TAB TO PERMISSION REQUIREMENT MAPPING
// -----------------------------------------------------------------
export const TAB_PERMISSION_MAP: Record<string, { codes: string[]; label: string; minRoleDesc: string }> = {
  crm_orders: {
    codes: ['crm.view_leads', 'finance.transactions'],
    label: 'CRM & Quản Lý Đơn Hàng',
    minRoleDesc: 'Tư vấn Tuyển sinh, Kế toán hoặc Super Admin'
  },
  lms: {
    codes: ['lms.view'],
    label: 'Học Tập Trực Tuyến (LMS)',
    minRoleDesc: 'Vận hành Đào tạo, Tư vấn Tuyển sinh hoặc Super Admin'
  },
  courses: {
    codes: ['courses.view'],
    label: 'Khóa Học & Nhúng YouTube',
    minRoleDesc: 'Đào tạo LMS hoặc Super Admin'
  },
  banners: {
    codes: ['banner.carousel'],
    label: 'Quản Lý Banner Trang Chủ',
    minRoleDesc: 'Biên tập Nội dung / SEO hoặc Super Admin'
  },
  partners: {
    codes: ['homepage.partners'],
    label: 'Đối Tác Doanh Nghiệp',
    minRoleDesc: 'Nội dung / Marketing hoặc Super Admin'
  },
  homepage_content: {
    codes: ['homepage.intro_about'],
    label: 'Biên Tập Nội Dung Trang Chủ',
    minRoleDesc: 'Nội dung / Marketing hoặc Super Admin'
  },
  articles: {
    codes: ['articles.create_edit', 'articles.publish'],
    label: 'Bài Viết & Chấm Điểm SEO',
    minRoleDesc: 'Biên tập viên SEO hoặc Super Admin'
  },
  users: {
    codes: ['rbac.view_users'],
    label: 'Quản Lý User & Vai Trò (RBAC)',
    minRoleDesc: 'Nhân sự vận hành nội bộ (Cần quyền rbac.edit_matrix để sửa)'
  },
  seo_settings: {
    codes: ['seo.settings'],
    label: 'Cài Đặt Chuẩn SEO Website',
    minRoleDesc: 'Chuyên gia SEO hoặc Super Admin'
  },
  architecture: {
    codes: ['system.architecture'],
    label: 'Kiến Trúc Django & Database',
    minRoleDesc: 'Chỉ Quản trị tối cao (Super Admin)'
  },
  sections: {
    codes: ['system.sections_toggle'],
    label: 'Bật / Tắt Khối Section Trang Chủ',
    minRoleDesc: 'Quản trị viên hệ thống'
  },
  instructors: {
    codes: ['courses.view', 'courses.instructors'],
    label: 'Profile Giảng Viên & Chuyên Gia',
    minRoleDesc: 'Đào tạo LMS, Quản trị viên hoặc Super Admin'
  },
  email_templates: {
    codes: ['crm.view_leads', 'crm.edit_status'],
    label: 'Email Resend & Quản Lý Template',
    minRoleDesc: 'Tư vấn Tuyển sinh, Quản trị viên hoặc Super Admin'
  }
};

// -----------------------------------------------------------------
// 4. PERMISSION EVALUATION HELPERS
// -----------------------------------------------------------------
export function checkUserHasPermission(
  user: AdminUser,
  permissionCode: string,
  roleConfigs: Record<UserRole, RolePermissionConfig> = DEFAULT_ROLE_CONFIGS
): boolean {
  if (!user || user.status === 'suspended') return false;
  if (user.role === 'super_admin') return true;

  // 1. Check custom overrides
  if (user.customOverrides?.revokedCodes?.includes(permissionCode)) return false;
  if (user.customOverrides?.grantedCodes?.includes(permissionCode)) return true;

  // 2. Check role default allowed list
  const userRoleConfig = roleConfigs[user.role];
  if (!userRoleConfig) return false;

  return userRoleConfig.allowedPermissionCodes.includes(permissionCode);
}

export function checkUserCanAccessTab(
  user: AdminUser,
  tabId: string,
  roleConfigs: Record<UserRole, RolePermissionConfig> = DEFAULT_ROLE_CONFIGS
): boolean {
  if (!user || user.status === 'suspended') return false;
  if (user.role === 'super_admin') return true;

  const mapping = TAB_PERMISSION_MAP[tabId];
  if (!mapping) return true; // Default allow if not mapped

  // If any of the required codes is satisfied, access is granted
  return mapping.codes.some((code) => checkUserHasPermission(user, code, roleConfigs));
}

// -----------------------------------------------------------------
// 5. SECURITY AUDIT ENGINE (RBAC Compliance Analysis)
// -----------------------------------------------------------------
export interface RBACOverviewAudit {
  score: number; // 0 - 100
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  superAdminCount: number;
  usersWithOverridesCount: number;
  highRiskPermissionsAssigned: number;
  sodCompliance: {
    passed: boolean;
    issues: string[];
  };
  polpCompliance: {
    passed: boolean;
    issues: string[];
  };
  recommendations: string[];
}

export function runRBACSecurityAudit(
  users: AdminUser[],
  roleConfigs: Record<UserRole, RolePermissionConfig> = DEFAULT_ROLE_CONFIGS
): RBACOverviewAudit {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
  const superAdmins = users.filter((u) => u.role === 'super_admin');
  const usersWithOverrides = users.filter(
    (u) => (u.customOverrides?.grantedCodes?.length || 0) > 0 || (u.customOverrides?.revokedCodes?.length || 0) > 0
  );

  const sodIssues: string[] = [];
  const polpIssues: string[] = [];
  const recommendations: string[] = [];

  // Check 1: Separation of Duties (SoD)
  // Sales should NOT have manual finance confirmation or system architecture
  users.forEach((u) => {
    if (u.role === 'sales_crm' && checkUserHasPermission(u, 'finance.confirm_manual', roleConfigs)) {
      sodIssues.push(`Cảnh báo SoD: Nhân sự "${u.name}" (Sales) được cấp quyền xác nhận thu học phí (finance.confirm_manual). Nguy cơ xung đột lợi ích.`);
    }
    if (u.role === 'finance_accountant' && checkUserHasPermission(u, 'courses.curriculum', roleConfigs)) {
      sodIssues.push(`Cảnh báo SoD: Kế toán "${u.name}" có quyền chỉnh sửa giáo trình đào tạo.`);
    }
    if (u.role !== 'super_admin' && checkUserHasPermission(u, 'rbac.edit_matrix', roleConfigs)) {
      sodIssues.push(`Cảnh báo rủi ro cao: Nhân sự "${u.name}" không phải Super Admin nhưng có quyền sửa Ma trận Phân Quyền (rbac.edit_matrix).`);
    }
  });

  // Check 2: Principle of Least Privilege (PoLP)
  // Non-super admins with too many high-risk permissions
  const highRiskCodes = SYSTEM_PERMISSIONS.filter((p) => p.riskLevel === 'high').map((p) => p.code);
  let totalHighRiskAssignments = 0;

  users.forEach((u) => {
    if (u.role !== 'super_admin') {
      const userHighRiskCount = highRiskCodes.filter((c) => checkUserHasPermission(u, c, roleConfigs)).length;
      totalHighRiskAssignments += userHighRiskCount;
      if (userHighRiskCount >= 4) {
        polpIssues.push(`Nhân sự "${u.name}" nắm giữ tới ${userHighRiskCount} quyền nhạy cảm cao, vượt ngưỡng khuyến nghị tối thiểu.`);
      }
    } else {
      totalHighRiskAssignments += highRiskCodes.length;
    }
  });

  // Check 3: Super Admin count health
  if (superAdmins.length > 2) {
    recommendations.push('Hiện có hơn 2 tài khoản Super Admin. Khuyến nghị chỉ duy trì tối đa 2 tài khoản quản trị tối cao để phòng ngừa rò rỉ.');
  } else if (superAdmins.length === 1) {
    recommendations.push('Nên thiết lập 1 tài khoản Super Admin dự phòng (Emergency Break-Glass) với xác thực 2 bước 2FA.');
  }

  if (usersWithOverrides.length > 0) {
    recommendations.push(`Có ${usersWithOverrides.length} nhân sự đang áp dụng phân quyền đặc cách riêng. Định kỳ 30 ngày cần rà soát lại để tránh tồn đọng quyền thừa.`);
  }

  recommendations.push('Ma trận quyền hiện tại đã tách biệt rõ rệt 5 vai trò theo phòng ban: BOD, Đào tạo, Sales, Marketing và Kế toán.');

  // Score calculation
  let score = 100;
  if (sodIssues.length > 0) score -= sodIssues.length * 8;
  if (polpIssues.length > 0) score -= polpIssues.length * 5;
  if (superAdmins.length > 3) score -= 10;
  score = Math.max(70, Math.min(100, score));

  return {
    score,
    totalUsers,
    activeUsers,
    suspendedUsers,
    superAdminCount: superAdmins.length,
    usersWithOverridesCount: usersWithOverrides.length,
    highRiskPermissionsAssigned: totalHighRiskAssignments,
    sodCompliance: {
      passed: sodIssues.length === 0,
      issues: sodIssues
    },
    polpCompliance: {
      passed: polpIssues.length === 0,
      issues: polpIssues
    },
    recommendations
  };
}
