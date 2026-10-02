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
    "banner.carousel": "Quản lý banner trang chủ",
    "homepage.intro_about": "Biên tập nội dung trang chủ",
    "homepage.partners": "Quản lý đối tác",
    "articles.create_edit": "Soạn / sửa bài viết",
    "articles.publish": "Xuất bản bài viết",
    "seo.settings": "Cài đặt SEO website",
    "finance.transactions": "Xem giao dịch & đối soát",
    "finance.confirm_manual": "Xác nhận thanh toán thủ công",
    "finance.referral_bonus": "Duyệt thưởng giới thiệu",
    "rbac.view_users": "Xem người dùng",
    "rbac.manage_roles": "Gán vai trò người dùng",
    "rbac.edit_matrix": "Sửa quyền tùy chỉnh",
    "system.architecture": "Xem kiến trúc hệ thống",
    "system.sections_toggle": "Bật/tắt section trang chủ",
}


class Role:
    SUPER_ADMIN = "super_admin"
    CONTENT_SEO = "content_seo"
    SALES_CRM = "sales_crm"
    ACADEMIC_MANAGEMENT = "academic_management"
    FINANCE_ACCOUNTANT = "finance_accountant"

    CHOICES = [
        (SUPER_ADMIN, "Quản trị tối cao"),
        (CONTENT_SEO, "Biên tập Nội dung & SEO"),
        (SALES_CRM, "Tư vấn Tuyển sinh & CRM"),
        (ACADEMIC_MANAGEMENT, "Vận hành Đào tạo & LMS"),
        (FINANCE_ACCOUNTANT, "Kế toán & Tài chính"),
    ]


ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    Role.SUPER_ADMIN: frozenset(PERMISSIONS),
    Role.ACADEMIC_MANAGEMENT: frozenset(
        {
            "courses.view",
            "courses.edit_info",
            "courses.embed_youtube",
            "courses.instructors",
            "courses.curriculum",
            "courses.reviews",
            "crm.view_leads",
            "crm.edit_status",
            "rbac.view_users",
        }
    ),
    Role.SALES_CRM: frozenset(
        {
            "crm.view_leads",
            "crm.edit_status",
            "crm.assign_pic",
            "crm.export_excel",
            "courses.view",
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
            "courses.view",
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
