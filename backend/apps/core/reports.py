"""Management reports for /app (sections shown according to the user's permissions)."""

from datetime import date, timedelta

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import require_perms
from apps.accounts.rbac import has_perm_code


def _months(n: int) -> list[date]:
    today = timezone.localdate().replace(day=1)
    out = []
    y, m = today.year, today.month
    for _ in range(n):
        out.append(date(y, m, 1))
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    return list(reversed(out))


def _by_month(queryset, field: str, value) -> dict[str, int]:
    rows = queryset.annotate(month=TruncMonth(field)).values("month").annotate(v=value).order_by()
    return {r["month"].strftime("%Y-%m"): r["v"] or 0 for r in rows if r["month"]}


def finance_report(start, months) -> dict:
    from apps.crm.models import Installment, Order
    from apps.payments.models import Payment, Refund

    paid = _by_month(Payment.objects.filter(created_at__date__gte=start), "created_at", Sum("amount"))
    refunded = _by_month(Refund.objects.filter(created_at__date__gte=start), "created_at", Sum("amount"))
    pending = Order.objects.filter(parent__isnull=True, status="pending")
    outstanding = pending.aggregate(s=Sum(F("total_receivable") - F("total_paid_amount")))["s"] or 0
    overdue = Installment.objects.filter(
        paid_at__isnull=True, due_date__lt=timezone.localdate(), order__status="pending"
    )
    return {
        "monthly": [
            {
                "month": m,
                "revenue": paid.get(m, 0),
                "refunds": refunded.get(m, 0),
                "net": paid.get(m, 0) - refunded.get(m, 0),
            }
            for m in months
        ],
        "outstanding": max(outstanding, 0),
        "installmentOrders": pending.filter(installment_count__gt=1, learning_access=True).count(),
        "overdueInstallments": overdue.count(),
        "overdueAmount": overdue.aggregate(s=Sum("amount"))["s"] or 0,
    }


def sales_report(start, months) -> dict:
    from apps.crm.models import Order

    orders = Order.objects.filter(parent__isnull=True)
    recent = orders.filter(created_at__date__gte=start)
    leads = _by_month(recent, "created_at", Count("id"))
    converted = _by_month(recent.filter(learning_access=True), "created_at", Count("id"))
    sources = (
        recent.values("source")
        .annotate(leads=Count("id"), converted=Count("id", filter=Q(learning_access=True)))
        .order_by("-leads")[:12]
    )
    items = (
        orders.filter(Q(learning_access=True) | Q(status="refunded"))
        .values("course_title")
        .annotate(
            orders=Count("id", filter=Q(learning_access=True)),
            refunded=Count("id", filter=Q(status="refunded")),
            collected=Sum("total_paid_amount"),
            refundedAmount=Sum("refunded_amount"),
            isProgram=Count("id", filter=Q(program__isnull=False)),
        )
        .order_by("-collected")[:20]
    )
    return {
        "monthly": [{"month": m, "leads": leads.get(m, 0), "converted": converted.get(m, 0)} for m in months],
        "pipeline": dict(orders.values_list("crm_status").annotate(n=Count("id")).order_by()),
        "sources": [
            {"source": s["source"] or "(không rõ)", "leads": s["leads"], "converted": s["converted"]}
            for s in sources
        ],
        "items": [
            {
                "title": i["course_title"] or "(không tên)",
                "kind": "program" if i["isProgram"] else "course",
                "orders": i["orders"],
                "refunded": i["refunded"],
                "net": (i["collected"] or 0) - (i["refundedAmount"] or 0),
            }
            for i in items
        ],
    }


def learning_report() -> dict:
    from apps.lms.models import Certificate, LmsEnrollment

    rows = (
        LmsEnrollment.objects.values(title=F("order__course_title"))
        .annotate(
            enrolled=Count("id", filter=Q(status="done")),
            waiting=Count("id", filter=Q(status__in=("waiting", "pending", "failed"))),
            completed=Count("id", filter=Q(completed_at__isnull=False, status="done")),
            removed=Count("id", filter=Q(status="removed")),
            avgProgress=Avg("progress", filter=Q(status="done")),
        )
        .order_by("-enrolled")
    )
    certificates = Certificate.objects.filter(revoked=False)
    return {
        "courses": [
            {
                **r,
                "avgProgress": round(r["avgProgress"]) if r["avgProgress"] is not None else None,
                "completionRate": round(100 * r["completed"] / r["enrolled"]) if r["enrolled"] else None,
            }
            for r in rows
        ],
        "certificates": certificates.count(),
        "certificates30d": certificates.filter(issued_at__gte=timezone.now() - timedelta(days=30)).count(),
    }


class ReportsQuery(serializers.Serializer):
    months = serializers.IntegerField(min_value=1, max_value=24, default=6)


class ReportsView(APIView):
    permission_classes = [require_perms("finance.transactions", "crm.view_leads", "lms.view")]

    def get(self, request):
        q = ReportsQuery(data=request.query_params)
        q.is_valid(raise_exception=True)
        months = _months(q.validated_data["months"])
        keys, start = [m.strftime("%Y-%m") for m in months], months[0]
        user = request.user
        data: dict = {"months": keys, "generatedAt": timezone.now()}
        if has_perm_code(user, "finance.transactions"):
            data["finance"] = finance_report(start, keys)
        if has_perm_code(user, "crm.view_leads"):
            data["sales"] = sales_report(start, keys)
        if has_perm_code(user, "lms.view"):
            data["learning"] = learning_report()
        return Response(data)
