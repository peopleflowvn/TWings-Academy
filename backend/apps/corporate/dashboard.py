"""
Corporate training overview (/app → Đào tạo doanh nghiệp → Tổng quan): activity, quality and
management finance per class, and the reconciliation alerts that need someone. Money figures are
management figures: contract value, accepted (billed) value and recorded costs, never mixed with
B2C tuition collected.
"""

from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import (
    AcceptanceBatch,
    AcceptanceLine,
    AttendanceAdjustment,
    CommunicationRecipient,
    CorporateClass,
    CorporateEnrollment,
    Expense,
    ServiceContract,
)

# One definition per figure, shown next to it on the dashboard and in exports.
KPI_DICTIONARY = {
    "learner_enrolments": (
        "Lượt học viên: số lần học viên được cử vào một lớp (một người học 2 lớp = 2 lượt)."
    ),
    "unique_learners": "Học viên duy nhất: số người khác nhau đã được cử đi học.",
    "completion_rate": (
        "Tỷ lệ hoàn thành: học viên đạt / học viên trong danh sách, theo bản kết quả đã phát hành."
    ),
    "attendance_rate": (
        "Chuyên cần: buổi có mặt / buổi đã điểm danh, sau điều chỉnh đã duyệt; không đếm số lần quét."
    ),
    "satisfaction": "Mức hài lòng: điểm trung bình các câu hỏi thang điểm của khảo sát, quy ra % thang.",
    "survey_response_rate": "Tỷ lệ phản hồi: số phản hồi khảo sát / học viên trong danh sách.",
    "contract_value": "Giá trị hợp đồng: tổng giá trị trước thuế của hợp đồng đang hiệu lực.",
    "accepted_amount": (
        "Giá trị nghiệm thu: tổng trước thuế các đợt khách hàng đã nghiệm thu (gồm điều chỉnh)."
    ),
    "costs": "Chi phí: chi phí và quyết toán tạm ứng đã ghi nhận (tạm ứng chưa quyết toán không tính).",
    "margin": "Biên đóng góp: giá trị nghiệm thu − chi phí của lớp (số quản trị, không phải sổ kế toán).",
}

STALE_APPROVED_DAYS = 14


def _class_rows(classes) -> list[dict]:
    accepted = dict(
        AcceptanceLine.objects.filter(batch__status="accepted", corporate_class__in=classes)
        .values("corporate_class")
        .annotate(total=Sum("amount"))
        .values_list("corporate_class", "total")
    )
    costs = dict(
        Expense.objects.filter(kind__in=Expense.COSTS, corporate_class__in=classes)
        .values("corporate_class")
        .annotate(total=Sum("amount"))
        .values_list("corporate_class", "total")
    )
    rows = []
    for c in classes:
        published = next((s for s in c.results.all() if s.status == "published"), None)
        k = published.kpis if published else {}
        acc, cost = accepted.get(c.pk) or 0, costs.get(c.pk) or 0
        rows.append(
            {
                "id": c.pk,
                "client_code": c.client.code,
                "name": c.cohort.name,
                "course_title": c.cohort.course.title,
                "status": c.status,
                "start_date": c.cohort.start_date,
                "learners": c.learners,
                "results_published": published is not None,
                "completion_rate": k.get("completion_rate"),
                "attendance_rate": k.get("attendance_rate"),
                "satisfaction": k.get("satisfaction"),
                "accepted_amount": acc,
                "costs": cost,
                "margin": acc - cost if acc or cost else None,
            }
        )
    return rows


def _avg(values) -> float | None:
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 1) if values else None


def alerts(classes) -> list[dict]:
    """What needs attention, each with the class or batch to open."""
    from .documents import checklist

    out = []
    now = timezone.now()
    for c in classes:
        held_all = c.sessions_total and c.sessions_past == c.sessions_total
        published = any(s.status == "published" for s in c.results.all())
        if held_all and not published:
            out.append(
                {
                    "level": "warning",
                    "class": c.pk,
                    "text": f"{c.cohort.name}: đã học hết buổi, chưa chốt kết quả",
                }
            )
        if published and c.contract_id and not c.acceptance_lines.exclude(batch__status="cancelled").exists():
            out.append(
                {
                    "level": "info",
                    "class": c.pk,
                    "text": f"{c.cohort.name}: đã chốt kết quả, chưa đưa vào đợt nghiệm thu",
                }
            )
        if c.learners and not c.contract_id:
            out.append({"level": "info", "class": c.pk, "text": f"{c.cohort.name}: chưa gắn hợp đồng"})
        if c.locked_at:
            missing = [row["label"] for row in checklist(c) if not row["done"]]
            if missing:
                out.append(
                    {
                        "level": "info",
                        "class": c.pk,
                        "text": f"{c.cohort.name}: hồ sơ còn thiếu {', '.join(missing)}",
                    }
                )
    pending = AttendanceAdjustment.objects.filter(decision="pending", enrollment__corporate_class__in=classes)
    for row in pending.values(
        "enrollment__corporate_class", "enrollment__corporate_class__cohort__name"
    ).annotate(n=Count("id")):
        out.append(
            {
                "level": "warning",
                "class": row["enrollment__corporate_class"],
                "text": f"{row['enrollment__corporate_class__cohort__name']}: "
                f"{row['n']} điều chỉnh điểm danh chờ duyệt",
            }
        )
    bounced = CommunicationRecipient.objects.filter(
        batch__corporate_class__in=classes, email_log__status__in=("bounced", "failed")
    ).select_related("batch__corporate_class__cohort")
    for r in bounced:
        out.append(
            {
                "level": "error",
                "class": r.batch.corporate_class_id,
                "text": f"{r.batch.corporate_class.cohort.name}: thư tới {r.to} không đến được"
                " (bị dội / lỗi)",
            }
        )
    stale = AcceptanceBatch.objects.filter(
        status="approved",
        approved_at__lt=now - timedelta(days=STALE_APPROVED_DAYS),
        contract__classes__in=classes,
    ).distinct()
    for b in stale:
        out.append(
            {
                "level": "warning",
                "acceptance": b.pk,
                "text": f"{b.title}: đã duyệt hơn {STALE_APPROVED_DAYS} ngày, khách hàng chưa nghiệm thu",
            }
        )
    order = {"error": 0, "warning": 1, "info": 2}
    return sorted(out, key=lambda a: order[a["level"]])


def overview(clients, *, client=None) -> dict:
    now = timezone.now()
    classes = (
        CorporateClass.objects.filter(client__in=clients)
        .exclude(status="cancelled")
        .select_related("client", "cohort__course")
        .prefetch_related("results")
        .annotate(
            learners=Count(
                "enrollments", filter=Q(enrollments__status__in=CorporateEnrollment.STUDYING), distinct=True
            ),
            sessions_total=Count("cohort__sessions", distinct=True),
            sessions_past=Count(
                "cohort__sessions", filter=Q(cohort__sessions__starts_at__lte=now), distinct=True
            ),
        )
        .order_by("-cohort__start_date", "cohort__name")
    )
    if client:
        classes = classes.filter(client=client)
    classes = list(classes)
    rows = _class_rows(classes)
    listings = CorporateEnrollment.objects.filter(
        corporate_class__in=classes, status__in=CorporateEnrollment.STUDYING
    )
    contracts = ServiceContract.objects.filter(client__in=clients, status="active")
    if client:
        contracts = contracts.filter(client=client)
    awaiting = AcceptanceLine.objects.filter(
        batch__status__in=("submitted", "approved"), batch__contract__client__in=clients
    )
    if client:
        awaiting = awaiting.filter(batch__contract__client=client)
    accepted_total = sum(r["accepted_amount"] for r in rows)
    costs_total = sum(r["costs"] for r in rows)
    return {
        "activity": {
            "classes": len(classes),
            "classes_running": sum(1 for c in classes if c.status == "running"),
            "learner_enrolments": listings.count(),
            "unique_learners": listings.values("learner").distinct().count(),
            "sessions_held": sum(c.sessions_past for c in classes),
        },
        "quality": {
            "completion_rate": _avg(r["completion_rate"] for r in rows),
            "attendance_rate": _avg(r["attendance_rate"] for r in rows),
            "satisfaction": _avg(r["satisfaction"] for r in rows),
        },
        "finance": {
            "contract_value": contracts.aggregate(v=Sum("value"))["v"] or 0,
            "accepted_amount": accepted_total,
            "awaiting_acceptance": awaiting.aggregate(v=Sum("amount"))["v"] or 0,
            "costs": costs_total,
            "margin": accepted_total - costs_total,
        },
        "classes": rows,
        "alerts": alerts(classes),
        "kpi_dictionary": KPI_DICTIONARY,
    }
