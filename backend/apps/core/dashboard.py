"""
CMS home (/app): one summary endpoint whose sections depend on the caller's permissions, and an
integrations health check for administrators.
"""

from datetime import timedelta

from django.conf import settings
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.accounts.rbac import has_perm_code


class DashboardView(APIView):
    permission_classes = [
        require_perms("crm.view_leads", "finance.transactions", "courses.view", "lms.view", "seo.settings")
    ]

    def get(self, request):
        from apps.catalog.models import Cohort
        from apps.crm.models import FollowupTask, Installment, Order
        from apps.lms.models import LmsEnrollment
        from apps.payments.models import BankTransaction, Payment, Refund

        user, now = request.user, timezone.now()
        today, month_start = timezone.localdate(), timezone.localdate().replace(day=1)
        data: dict = {"generatedAt": now}

        if has_perm_code(user, "crm.view_leads"):
            orders = Order.objects.filter(parent__isnull=True)  # program components are not sales
            last30 = orders.filter(created_at__gte=now - timedelta(days=30))
            data["sales"] = {
                "pipeline": dict(orders.values_list("crm_status").annotate(n=Count("id")).order_by()),
                "newLeads7d": orders.filter(created_at__gte=now - timedelta(days=7)).count(),
                "leads30d": last30.count(),
                "paid30d": last30.filter(status="paid").count(),
                "tasksDueToday": FollowupTask.objects.filter(is_completed=False, due_date__lte=today).count(),
                **_lead_service(user, now),
                "upcomingTasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "dueDate": t.due_date,
                        "priority": t.priority,
                        "orderId": t.order_id,
                        "customerName": t.order.customer_name,
                    }
                    for t in FollowupTask.objects.filter(is_completed=False)
                    .select_related("order")
                    .order_by(F("due_date").asc(nulls_last=True))[:8]
                ],
            }

        if has_perm_code(user, "finance.transactions"):
            pending = Order.objects.filter(status="pending").exclude(total_receivable=0)
            data["finance"] = {
                "revenueMonth": Payment.objects.filter(created_at__date__gte=month_start).aggregate(
                    s=Sum("amount")
                )["s"]
                or 0,
                "revenueToday": Payment.objects.filter(created_at__date=today).aggregate(s=Sum("amount"))["s"]
                or 0,
                "receivable": sum(
                    max(0, o.total_receivable - o.total_paid_amount)
                    for o in pending.only("total_receivable", "total_paid_amount")
                ),
                "unmatchedTransactions": BankTransaction.objects.filter(match_status="unmatched").count(),
                "refundsMonth": Refund.objects.filter(created_at__date__gte=month_start).aggregate(
                    s=Sum("amount")
                )["s"]
                or 0,
                "overdueInstallments": Installment.objects.filter(
                    paid_at__isnull=True, due_date__lt=today, order__status="pending"
                ).count(),
            }

        if has_perm_code(user, "courses.view") or has_perm_code(user, "lms.view"):
            soon = Cohort.objects.filter(
                start_date__gte=today, start_date__lte=today + timedelta(days=45)
            ).annotate(paid=Count("orders", filter=Q(orders__learning_access=True)))
            data["training"] = {
                "atRisk": LmsEnrollment.objects.filter(
                    status="done", completed_at__isnull=True, risk_level="risk", order__learning_access=True
                ).count(),
                "watch": LmsEnrollment.objects.filter(
                    status="done", completed_at__isnull=True, risk_level="watch", order__learning_access=True
                ).count(),
                "certificateHolds": LmsEnrollment.objects.filter(
                    status="done", certificate__isnull=True, order__learning_access=True
                )
                .exclude(certificate_hold="")
                .count(),
                "enrollments": dict(
                    LmsEnrollment.objects.values_list("status").annotate(n=Count("id")).order_by()
                ),
                "upcomingCohorts": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "courseTitle": c.course.title,
                        "startDate": c.start_date,
                        "capacity": c.capacity,
                        "paid": c.paid,
                        "status": c.status,
                    }
                    for c in soon.select_related("course").order_by("start_date")[:8]
                ],
            }
        return Response(data)


class SystemHealthView(APIView):
    """Is every integration configured and answering? (No secret value is ever returned.)"""

    permission_classes = [require_perms("system.architecture", "rbac.manage_roles")]

    def get(self, request):
        from apps.lms import moodle
        from apps.lms.models import LmsEnrollment
        from apps.notifications.models import EmailLog
        from apps.payments.models import BankTransaction

        checks = []

        def add(key, label, ok, detail, level="error"):
            checks.append({"key": key, "label": label, "status": "ok" if ok else level, "detail": detail})

        add("database", "Cơ sở dữ liệu", True, "Kết nối bình thường")

        if moodle.is_configured():
            try:
                info = moodle.call("core_webservice_get_site_info")
                add("moodle", "LMS Moodle", True, f"{info.get('sitename')} – Moodle {info.get('release')}")
            except moodle.MoodleError as exc:
                add("moodle", "LMS Moodle", False, str(exc))
        else:
            add(
                "moodle",
                "LMS Moodle",
                False,
                "Chưa cấu hình MOODLE_INTERNAL_URL / MOODLE_WS_TOKEN",
                "warning",
            )
        failed = LmsEnrollment.objects.filter(status="failed").count()
        add(
            "lms_enrollments",
            "Ghi danh tự động",
            failed == 0,
            f"{failed} lượt ghi danh lỗi đang chờ thử lại",
            "warning",
        )

        add(
            "sso",
            "Đăng nhập một lần (SSO)",
            bool(settings.SSO_CLIENT_SECRET and settings.SSO_REDIRECT_URIS),
            f"{len(settings.SSO_REDIRECT_URIS)} địa chỉ callback Moodle"
            if settings.SSO_CLIENT_SECRET
            else "Chưa bật",
            "warning",
        )
        last_mail = EmailLog.objects.order_by("-created_at").first()
        add(
            "email",
            "Email (Resend)",
            bool(settings.RESEND_API_KEY),
            ("Đã cấu hình" if settings.RESEND_API_KEY else "Chế độ mô phỏng: email không được gửi thật")
            + (
                f" · thư gần nhất: {timezone.localtime(last_mail.created_at):%d/%m %H:%M}"
                f" ({last_mail.status})"
                if last_mail
                else ""
            ),
            "warning",
        )
        add(
            "email_webhook",
            "Webhook trạng thái email",
            bool(settings.RESEND_WEBHOOK_SECRET),
            "Đã cấu hình"
            if settings.RESEND_WEBHOOK_SECRET
            else "Chưa cấu hình: không theo dõi được đã nhận/đã mở",
            "warning",
        )
        last_txn = BankTransaction.objects.order_by("-created_at").first()
        add(
            "bank",
            "Webhook ngân hàng (SePay)",
            bool(settings.BANK_WEBHOOK_API_KEY),
            ("Đã cấu hình" if settings.BANK_WEBHOOK_API_KEY else "Chưa cấu hình")
            + (
                f" · giao dịch gần nhất: {timezone.localtime(last_txn.created_at):%d/%m %H:%M}"
                if last_txn
                else " · chưa nhận giao dịch nào"
            ),
            "warning",
        )
        storage = settings.STORAGES["default"]["BACKEND"]
        add(
            "storage",
            "Lưu trữ file",
            True,
            "Cloudflare R2" if "s3" in storage.lower() else "Ổ đĩa máy chủ (chưa dùng R2)",
        )
        return Response({"checks": checks, "checkedAt": timezone.now()})


def _lead_service(user, now) -> dict:
    """Step 4 service level: leads past their first-response deadline, mine, today's consultations."""
    from apps.crm.assignment import OPEN_STAGES, overdue_leads
    from apps.crm.models import Appointment, Order

    overdue = overdue_leads().select_related("assigned_to").order_by("response_due_at")
    end_of_day = timezone.localtime(now).replace(hour=23, minute=59)
    return {
        "overdueLeads": overdue.count(),
        "overdueList": [
            {
                "id": o.id,
                "customerName": o.customer_name,
                "course": o.course_title,
                "pic": o.pic,
                "dueAt": o.response_due_at,
            }
            for o in overdue[:8]
        ],
        "myOpenLeads": Order.objects.filter(
            assigned_to=user, crm_status__in=OPEN_STAGES, status="pending", parent__isnull=True
        ).count(),
        "appointmentsToday": Appointment.objects.filter(
            status="planned", starts_at__gte=now - timezone.timedelta(hours=1), starts_at__lte=end_of_day
        ).count(),
    }
