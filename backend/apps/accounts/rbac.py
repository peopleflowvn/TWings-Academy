"""
Role-based access control. Permission codes and role defaults mirror frontend/src/utils/rbac.ts,
but only this server-side copy is authoritative: the UI merely hides what the API refuses anyway.
"""

PERMISSIONS: dict[str, str] = {
    "crm.view_leads": "Xem danh sách khách hàng & lead",
    "crm.edit_status": "Cập nhật tiến trình tư vấn (Pipeline)",
    "crm.assign_pic": "Phân công nhân sự phụ trách (PIC)",
    "crm.export_excel": "Xuất dữ liệu báo cáo Excel / CSV",
    "crm.delete_lead": "Xóa hồ sơ lead",
    "courses.view": "Xem khóa học",
    "courses.edit_info": "Sửa thông tin khóa học",
    "courses.embed_youtube": "Nhúng video YouTube",
    "courses.instructors": "Quản lý giảng viên",
    "courses.curriculum": "Sửa đề cương / bài giảng",
    "courses.reviews": "Quản lý đánh giá",
    "courses.delete": "Xóa khóa học",
    "courses.programs": "Quản lý chương trình (gói khóa học)",
    "courses.publish": "Duyệt & xuất bản / ngừng bán khóa học (chốt giá khi duyệt)",
    "courses.pricing": "Định giá: đổi học phí, trả góp của khóa đang bán",
    "banner.carousel": "Quản lý banner trang chủ",
    "homepage.intro_about": "Biên tập nội dung trang chủ",
    "homepage.partners": "Quản lý đối tác",
    "articles.create_edit": "Soạn / sửa bài viết",
    "articles.publish": "Xuất bản bài viết",
    "seo.settings": "Cài đặt SEO website",
    "finance.transactions": "Xem giao dịch & đối soát",
    "finance.confirm_manual": "Xác nhận thanh toán thủ công",
    "finance.referral_bonus": "Duyệt thưởng giới thiệu",
    "finance.refund": "Hoàn tiền & kết thúc ghi danh",
    "rbac.view_users": "Xem người dùng",
    "rbac.manage_roles": "Gán vai trò người dùng",
    "rbac.edit_matrix": "Sửa quyền tùy chỉnh",
    "system.architecture": "Xem kiến trúc hệ thống",
    "system.sections_toggle": "Bật/tắt section trang chủ",
    "lms.view": "Xem tiến độ học tập (LMS)",
    "lms.manage": "Quản lý học viên trên LMS (ghi danh, khóa, gửi email vào học)",
    "placement.view": "Xem giới thiệu việc làm & kết quả việc làm",
    "placement.manage": "Giới thiệu việc làm: đề cử, gửi đối tác, cập nhật phỏng vấn / nhận việc / thử việc",
    # Corporate training (B2B): see docs/KE_HOACH_TICH_HOP_TMS_VAO_TWINGS_ACADEMY_V6.md, section 8.
    "corporate.view": "Xem đào tạo doanh nghiệp (khách hàng, lớp, học viên, kết quả)",
    "corporate.clients": "Quản lý khách hàng doanh nghiệp, hợp đồng, đơn giá",
    "corporate.classes": "Quản lý kế hoạch, lớp doanh nghiệp, danh sách học viên",
    "corporate.import": "Nhập file kế hoạch / danh sách học viên / nghiệm thu",
    "corporate.attendance_adjust": "Điều chỉnh điểm danh lớp doanh nghiệp (có lý do, bằng chứng)",
    "corporate.results_publish": "Chốt và phát hành kết quả lớp doanh nghiệp",
    "corporate.communications_send": "Gửi email lớp doanh nghiệp (học viên, CC cán bộ quản lý)",
    "corporate.acceptance": "Lập và xuất hồ sơ nghiệm thu",
    "corporate.approve": "Duyệt kết quả, điều chỉnh, lô email, nghiệm thu",
    "corporate.approve_final": "Duyệt cấp cuối nghiệm thu / chi phí vượt ngưỡng (cấp 2)",
    "corporate.share": "Tạo link xem báo cáo cho khách hàng",
}


class Role:
    SUPER_ADMIN = "super_admin"
    CONTENT_SEO = "content_seo"
    SALES_CRM = "sales_crm"
    ACADEMIC_MANAGEMENT = "academic_management"
    FINANCE_ACCOUNTANT = "finance_accountant"
    CORPORATE_TRAINING = "corporate_training"

    CHOICES = [
        (SUPER_ADMIN, "Quản trị tối cao"),
        (CONTENT_SEO, "Biên tập Nội dung & SEO"),
        (SALES_CRM, "Tư vấn Tuyển sinh & CRM"),
        (ACADEMIC_MANAGEMENT, "Vận hành Đào tạo & LMS"),
        (FINANCE_ACCOUNTANT, "Kế toán & Tài chính"),
        (CORPORATE_TRAINING, "Đào tạo doanh nghiệp"),
    ]


ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    Role.SUPER_ADMIN: frozenset(PERMISSIONS),
    Role.CORPORATE_TRAINING: frozenset(
        {
            "corporate.view",
            "corporate.clients",
            "corporate.classes",
            "corporate.import",
            "corporate.attendance_adjust",
            "corporate.results_publish",
            "corporate.communications_send",
            "corporate.acceptance",
            "corporate.approve",
            "corporate.share",
            "courses.view",
            "lms.view",
        }
    ),
    Role.ACADEMIC_MANAGEMENT: frozenset(
        {
            "courses.view",
            "courses.edit_info",
            "courses.programs",
            "courses.embed_youtube",
            "courses.instructors",
            "courses.curriculum",
            "courses.reviews",
            "crm.view_leads",
            "crm.edit_status",
            "rbac.view_users",
            "lms.view",
            "lms.manage",
            "placement.view",
            "placement.manage",
            "corporate.view",
        }
    ),
    Role.SALES_CRM: frozenset(
        {
            "crm.view_leads",
            "crm.edit_status",
            "crm.assign_pic",
            "crm.export_excel",
            "courses.view",
            "lms.view",
            "placement.view",
        }
    ),
    Role.CONTENT_SEO: frozenset(
        {
            "banner.carousel",
            "homepage.intro_about",
            "homepage.partners",
            "articles.create_edit",
            "articles.publish",
            "seo.settings",
            "courses.view",
        }
    ),
    Role.FINANCE_ACCOUNTANT: frozenset(
        {
            "crm.view_leads",
            "crm.export_excel",
            "finance.transactions",
            "finance.confirm_manual",
            "finance.referral_bonus",
            "finance.refund",
            "courses.pricing",
            "courses.view",
            "corporate.view",
            "corporate.acceptance",
        }
    ),
}


def effective_permissions(user) -> frozenset[str]:
    if not user or not user.is_authenticated or not user.is_active:
        return frozenset()
    if user.is_superuser or user.role == Role.SUPER_ADMIN:
        return ROLE_PERMISSIONS[Role.SUPER_ADMIN]
    perms = set(ROLE_PERMISSIONS.get(user.role, frozenset()))
    overrides = user.permission_overrides or {}
    perms |= {c for c in overrides.get("granted", []) if c in PERMISSIONS}
    perms -= set(overrides.get("revoked", []))
    return frozenset(perms)


def has_perm_code(user, code: str) -> bool:
    return code in effective_permissions(user)
