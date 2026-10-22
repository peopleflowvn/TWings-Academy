"""
What happened to a corporate class, from the audit log: the class itself and everything that belongs
to it (learners, results, e-mail batches, documents, attendance corrections, expenses) and the
acceptance batches that bill it. Read-only; the audit log is written by every action (core.audit).
"""

from apps.core.models import AuditLog

ACTIONS = {
    "corporate.class_create": "Tạo lớp",
    "corporate.class_update": "Sửa thông tin lớp",
    "corporate.enrollment_add": "Thêm học viên",
    "corporate.enrollment_cancel": "Hủy ghi danh",
    "corporate.enrollment_transfer": "Chuyển lớp",
    "corporate.employee_change": "Đổi CBQL / đơn vị / chức danh",
    "corporate.import_preview": "Tải file nhập (xem trước)",
    "corporate.import_confirm": "Xác nhận nhập file",
    "corporate.invitations_send": "Gửi thư mời",
    "corporate.attendance_adjust": "Đề nghị điều chỉnh điểm danh",
    "corporate.attendance_decide": "Duyệt / từ chối điều chỉnh điểm danh",
    "corporate.attendance_selfmark": "Bật / tắt QR điểm danh",
    "corporate.results_publish": "Phát hành kết quả",
    "corporate.results_reopen": "Mở lại kết quả để sửa",
    "corporate.results_export": "Xuất Excel kết quả",
    "corporate.results_print": "In kết quả",
    "corporate.batch_create": "Tạo lô thư",
    "corporate.batch_approve": "Duyệt lô thư",
    "corporate.batch_send": "Gửi lô thư",
    "corporate.document_upload": "Tải lên hồ sơ",
    "corporate.document_download": "Tải xuống hồ sơ",
    "corporate.expense_create": "Ghi nhận chi phí",
    "corporate.expense_update": "Sửa chi phí",
    "corporate.expense_delete": "Xóa chi phí",
    "corporate.expense_approve_first": "Duyệt cấp 1 chi phí",
    "corporate.expense_approve": "Duyệt chi phí",
    "corporate.acceptance_create": "Lập đợt nghiệm thu",
    "corporate.acceptance_submitted": "Gửi duyệt nghiệm thu",
    "corporate.acceptance_approved": "Duyệt nghiệm thu",
    "corporate.acceptance_accepted": "Khách hàng đã nghiệm thu",
    "corporate.acceptance_draft": "Trả nghiệm thu về Đang lập",
    "corporate.acceptance_cancelled": "Hủy đợt nghiệm thu",
    "corporate.acceptance_export": "Xuất Excel nghiệm thu",
    "corporate.acceptance_print": "In biên bản nghiệm thu",
    "corporate.share_create": "Tạo link báo cáo cho khách hàng",
    "corporate.request_create": "Ghi nhận yêu cầu",
    "corporate.request_update": "Cập nhật yêu cầu",
}
LIMIT = 300


def class_history(corporate_class) -> list[dict]:
    ids = {str(corporate_class.pk)}
    for related in (
        corporate_class.enrollments,
        corporate_class.results,
        corporate_class.communications,
        corporate_class.documents,
        corporate_class.expenses,
        corporate_class.requests,
        corporate_class.cohort.sessions,  # QR check-in switched on / off
    ):
        ids.update(str(pk) for pk in related.values_list("pk", flat=True))
    ids.update(
        str(pk) for pk in corporate_class.acceptance_lines.values_list("batch_id", flat=True).distinct()
    )
    from .models import AttendanceAdjustment, ImportBatch

    ids.update(
        str(pk)
        for pk in AttendanceAdjustment.objects.filter(
            enrollment__corporate_class=corporate_class
        ).values_list("pk", flat=True)
    )
    ids.update(
        str(pk)
        for pk in ImportBatch.objects.filter(corporate_class=corporate_class).values_list("pk", flat=True)
    )
    rows = (
        AuditLog.objects.filter(object_id__in=ids, action__startswith="corporate.")
        .select_related("actor")
        .order_by("-at")[:LIMIT]
    )
    return [
        {
            "at": r.at,
            "actor": (r.actor.name or r.actor.email) if r.actor_id else r.actor_label,
            "action": ACTIONS.get(r.action, r.action),
            "details": r.details,
        }
        for r in rows
    ]


def class_acceptance(corporate_class) -> list[dict]:
    """The acceptance lines billing this class, with their batch (the class's Nghiệm thu tab)."""
    lines = corporate_class.acceptance_lines.select_related("batch").order_by(
        "-batch__created_at", "sort_order"
    )
    return [
        {
            "batch": line.batch_id,
            "batch_title": line.batch.title,
            "status": line.batch.status,
            "status_label": line.batch.get_status_display(),
            "description": line.description,
            "unit": line.unit,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "amount": line.amount,
            "vat_amount": line.vat_amount,
            "invoice_number": line.batch.invoice_number,
        }
        for line in lines
    ]
