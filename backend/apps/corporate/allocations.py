"""
Allocation of shared costs: an expense recorded on a contract (not on one class) is split over that
contract's classes by an explicit basis. Shares are whole đồng and add up exactly to the expense
(largest remainder), so nothing is counted twice or lost. Class costs = its own expenses + its shares.
"""

from django.db import transaction
from django.db.models import Count, Q, Sum

from .models import CorporateClass, CorporateEnrollment, CostAllocation, Expense
from .services import CorporateError


def _weights(classes, basis: str) -> dict[str, float]:
    if basis == "equal":
        return {c.pk: 1.0 for c in classes}
    if basis == "learners":
        counts = dict(
            CorporateClass.objects.filter(pk__in=[c.pk for c in classes])
            .annotate(n=Count("enrollments", filter=Q(enrollments__status__in=CorporateEnrollment.STUDYING)))
            .values_list("pk", "n")
        )
        return {c.pk: float(counts.get(c.pk, 0)) for c in classes}
    out = {}
    for c in classes:
        sessions = list(c.cohort.sessions.all())
        if basis == "sessions":
            out[c.pk] = float(len(sessions))
        else:  # hours
            out[c.pk] = sum((s.ends_at - s.starts_at).total_seconds() for s in sessions) / 3600
    return out


def split(amount: int, weights: dict[str, float]) -> dict[str, int]:
    """Whole-đồng shares proportional to the weights, adding up exactly to `amount`."""
    total = sum(weights.values())
    if total <= 0:
        raise CorporateError("Không có cơ sở để phân bổ (các lớp chưa có học viên / buổi học).")
    raw = {k: amount * w / total for k, w in weights.items()}
    shares = {k: int(v) for k, v in raw.items()}
    left = amount - sum(shares.values())
    for k in sorted(raw, key=lambda k: raw[k] - shares[k], reverse=True)[:left]:
        shares[k] += 1
    return shares


def allocate(expense: Expense, *, basis: str, classes=None) -> list[CostAllocation]:
    """(Re)allocate a shared cost; default classes: every class of the expense's contract."""
    if expense.corporate_class_id:
        raise CorporateError("Khoản chi đã gắn một lớp: không cần phân bổ.")
    if expense.kind not in Expense.COSTS:
        raise CorporateError("Tạm ứng chưa là chi phí: phân bổ khoản quyết toán.")
    if classes is None:
        if expense.contract_id is None:
            raise CorporateError("Chọn các lớp để phân bổ.")
        classes = list(expense.contract.classes.exclude(status="cancelled"))
    if not classes:
        raise CorporateError("Không có lớp nào để phân bổ.")
    if any(c.client_id != expense.client_id for c in classes):
        raise CorporateError("Chỉ phân bổ cho lớp của cùng khách hàng.")
    shares = split(expense.amount, _weights(classes, basis))
    with transaction.atomic():
        expense.allocations.all().delete()
        return CostAllocation.objects.bulk_create(
            CostAllocation(expense=expense, corporate_class_id=pk, basis=basis, amount=amount)
            for pk, amount in shares.items()
            if amount
        )


def class_costs(class_ids) -> dict[str, int]:
    """{class id: own costs + allocated shares} (advances not counted until settled)."""
    out: dict[str, int] = {}
    own = (
        Expense.objects.filter(corporate_class__in=class_ids, kind__in=Expense.COSTS)
        .values("corporate_class")
        .annotate(total=Sum("amount"))
    )
    for row in own:
        out[row["corporate_class"]] = out.get(row["corporate_class"], 0) + row["total"]
    shared = (
        CostAllocation.objects.filter(corporate_class__in=class_ids)
        .values("corporate_class")
        .annotate(total=Sum("amount"))
    )
    for row in shared:
        out[row["corporate_class"]] = out.get(row["corporate_class"], 0) + row["total"]
    return out
