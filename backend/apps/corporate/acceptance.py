"""
Acceptance (nghiệm thu) of corporate training contracts. A batch covers a contract and a period; each
class with published results gives one line per applicable contract rate, its quantity taken from the
results and schedule (never typed in):

    per_class   1 class
    per_learner learners by the batch's basis: listed / attended at least one session / passed
    per_session sessions held up to the end of the period
    per_hour    total hours of those sessions
    lump_sum    1 package

Accepted batches are final: a correction is an adjustment line (signed amount, reason) in a new batch,
pointing at the line it corrects. Money is in đồng; amounts are rounded per line.
"""

from datetime import date, datetime, time
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import AcceptanceBatch, AcceptanceLine, ContractRate, CorporateClass
from .services import CorporateError

UNIT = {
    "per_class": "lớp",
    "per_learner": "học viên",
    "per_session": "buổi",
    "per_hour": "giờ",
    "lump_sum": "gói",
}
# status -> statuses it may move to
FLOW = {
    "draft": ("submitted", "cancelled"),
    "submitted": ("approved", "draft", "cancelled"),
    "approved": ("accepted", "draft", "cancelled"),
}


def _money(value) -> int:
    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _period_end(period_to):
    if period_to is None:
        return timezone.now()
    return timezone.make_aware(datetime.combine(period_to, time.max))


def billed_class_ids(contract) -> set[str]:
    """Classes already on a (not cancelled) batch of this contract as a service line."""
    return set(
        AcceptanceLine.objects.filter(batch__contract=contract, kind="service")
        .exclude(batch__status="cancelled")
        .values_list("corporate_class_id", flat=True)
    )


def eligible_classes(contract):
    """Classes of the contract with published results, not billed yet."""
    return (
        CorporateClass.objects.filter(contract=contract, results__status="published")
        .exclude(pk__in=billed_class_ids(contract))
        .select_related("cohort__course")
        .distinct()
    )


def rates_for(contract, corporate_class) -> list[ContractRate]:
    """The contract's rates for this class: a course-specific rate beats a general one of the same kind."""
    start = corporate_class.cohort.start_date
    rates = contract.rates.filter(Q(course=corporate_class.cohort.course) | Q(course__isnull=True))
    if start:
        rates = rates.exclude(valid_from__gt=start).exclude(valid_to__lt=start)
    chosen: dict[str, ContractRate] = {}
    for rate in sorted(rates, key=lambda r: r.course_id is not None):  # general first, specific overrides
        chosen[rate.kind] = rate
    return list(chosen.values())


def quantity(rate, corporate_class, snapshot, basis: str, period_to) -> Decimal:
    if rate.kind in ("per_class", "lump_sum"):
        return Decimal(1)
    if rate.kind == "per_learner":
        learners = snapshot.learners
        if basis == "attended":
            learners = [r for r in learners if r.get("sessions_attended")]
        elif basis == "passed":
            learners = [r for r in learners if r.get("result") == "passed"]
        return Decimal(len(learners))
    sessions = corporate_class.cohort.sessions.filter(starts_at__lte=_period_end(period_to))
    if rate.kind == "per_session":
        return Decimal(sessions.count())
    seconds = sum((s.ends_at - s.starts_at).total_seconds() for s in sessions)
    return (Decimal(seconds) / Decimal(3600)).quantize(Decimal("0.01"))


def _with_amounts(line: AcceptanceLine) -> AcceptanceLine:
    line.amount = _money(Decimal(line.quantity) * Decimal(line.unit_price))
    line.vat_amount = _money(Decimal(line.amount) * Decimal(line.vat_rate or 0) / 100)
    return line


def _class_line(batch, corporate_class, snapshot, rate, order: int) -> AcceptanceLine:
    contract = batch.contract
    title = f"{corporate_class.cohort.course.title} – {corporate_class.cohort.name}"
    return _with_amounts(
        AcceptanceLine(
            batch=batch,
            kind="service",
            corporate_class=corporate_class,
            snapshot=snapshot,
            rate=rate,
            description=title + (f" ({rate.description})" if rate.description else ""),
            unit=UNIT[rate.kind],
            quantity=quantity(rate, corporate_class, snapshot, batch.learner_basis, batch.period_to),
            unit_price=rate.unit_price,
            vat_rate=rate.vat_rate if rate.vat_rate is not None else contract.vat_rate,
            sort_order=order,
        )
    )


def build_batch(
    contract, *, title, period_from, period_to, learner_basis, classes=None, user, adjustment_only=False
) -> AcceptanceBatch:
    """A new batch with every eligible class (or the chosen ones); empty when it is for adjustments only."""
    if adjustment_only:
        return AcceptanceBatch.objects.create(
            contract=contract,
            title=title,
            period_from=period_from,
            period_to=period_to,
            learner_basis=learner_basis,
            created_by=user,
        )
    eligible = {c.pk: c for c in eligible_classes(contract)}
    picked = [eligible[c.pk] for c in classes if c.pk in eligible] if classes else list(eligible.values())
    if classes and len(picked) != len(classes):
        raise CorporateError("Có lớp chưa phát hành kết quả, không thuộc hợp đồng hoặc đã nghiệm thu.")
    if not picked:
        raise CorporateError("Không có lớp nào đã chốt kết quả mà chưa nghiệm thu.")
    picked.sort(key=lambda c: (c.cohort.start_date or date.max, c.cohort.name))
    with transaction.atomic():
        batch = AcceptanceBatch.objects.create(
            contract=contract,
            title=title,
            period_from=period_from,
            period_to=period_to,
            learner_basis=learner_basis,
            created_by=user,
        )
        lines = []
        for corporate_class in picked:
            rates = rates_for(contract, corporate_class)
            if not rates:
                raise CorporateError(
                    f"Hợp đồng chưa có đơn giá áp dụng cho lớp “{corporate_class.cohort.name}”."
                )
            snapshot = corporate_class.results.filter(status="published").first()
            lines += [
                _class_line(batch, corporate_class, snapshot, r, len(lines) + i) for i, r in enumerate(rates)
            ]
        AcceptanceLine.objects.bulk_create(lines)
    return batch


def add_adjustment(batch, *, adjusts=None, description: str, amount: int, vat_rate=None) -> AcceptanceLine:
    """A signed correction (e.g. -2 learners on an accepted batch), with its reason in the description."""
    if batch.status != "draft":
        raise CorporateError("Chỉ thêm điều chỉnh vào đợt nghiệm thu đang lập.")
    if not description.strip():
        raise CorporateError("Ghi rõ nội dung / lý do điều chỉnh.")
    if adjusts is not None and (
        adjusts.batch.contract_id != batch.contract_id or adjusts.batch.status != "accepted"
    ):
        raise CorporateError("Chỉ điều chỉnh dòng của đợt đã nghiệm thu thuộc cùng hợp đồng.")
    order = (batch.lines.order_by("-sort_order").values_list("sort_order", flat=True).first() or 0) + 1
    vat = vat_rate if vat_rate is not None else adjusts.vat_rate if adjusts else batch.contract.vat_rate
    line = AcceptanceLine(
        batch=batch,
        kind="adjustment",
        adjusts=adjusts,
        corporate_class=adjusts.corporate_class if adjusts else None,
        description=description.strip(),
        unit="",
        quantity=Decimal(1),
        unit_price=amount,
        vat_rate=vat,
        sort_order=order,
    )
    _with_amounts(line).save()
    return line


def remove_line(line: AcceptanceLine) -> None:
    if line.batch.status != "draft":
        raise CorporateError("Chỉ bỏ dòng của đợt đang lập.")
    line.delete()


def move(batch, to: str, *, user, invoice_number: str = "", invoice_date=None) -> AcceptanceBatch:
    with transaction.atomic():
        batch = AcceptanceBatch.objects.select_for_update().get(pk=batch.pk)
        if to not in FLOW.get(batch.status, ()):
            raise CorporateError(f"Không chuyển được từ “{batch.get_status_display()}”.")
        if to == "submitted" and not batch.lines.exists():
            raise CorporateError("Đợt nghiệm thu chưa có dòng nào.")
        fields = ["status", "updated_at"]
        if to == "approved":
            batch.approved_by, batch.approved_at = user, timezone.now()
            fields += ["approved_by", "approved_at"]
        if to == "accepted":
            batch.accepted_at = timezone.now()
            batch.invoice_number, batch.invoice_date = invoice_number, invoice_date
            from .receivables import due_date_for

            batch.due_date = due_date_for(batch, invoice_date)
            fields += ["accepted_at", "invoice_number", "invoice_date", "due_date"]
        batch.status = to
        batch.save(update_fields=fields)
    return batch


def totals(batch) -> dict:
    lines = list(batch.lines.all())
    amount = sum(line.amount for line in lines)
    vat = sum(line.vat_amount for line in lines)
    return {"amount": amount, "vat": vat, "total": amount + vat, "lines": len(lines)}
