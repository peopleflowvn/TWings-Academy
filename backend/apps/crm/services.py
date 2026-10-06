from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Cohort, Coupon, Course, Program
from apps.core.models import audit

from .models import Activity, Installment, Order


class CheckoutError(Exception):
    pass


def resolve_cohort(course: Course, preferred_label: str = "") -> tuple[Cohort | None, bool]:
    """
    Pick the cohort for a new applicant. A full/closed preferred cohort routes to its successor.
    Returns (cohort, was_rerouted).
    """
    cohorts = Cohort.objects.filter(course=course)
    preferred = cohorts.filter(name__iexact=preferred_label.strip()).first() if preferred_label else None
    if preferred:
        if preferred.status == "opening":
            return preferred, False
        if preferred.next_cohort_id:
            return preferred.next_cohort, True
    opening = cohorts.filter(status="opening").order_by("start_date").first()
    return opening, False


@transaction.atomic
def price_with_coupon(
    item: Course | Program, coupon_code: str, base: int | None = None
) -> tuple[int, int, str]:
    """
    Server-side pricing of a course or program. `base` overrides the list price (an intake's
    early-bird price). Returns (final_amount, discount, applied_code).
    """
    amount = item.price if base is None else base
    code = (coupon_code or "").strip().upper()
    if not code:
        return amount, 0, ""
    coupon = Coupon.objects.select_for_update().filter(code=code, is_active=True).first()
    if (
        coupon is None
        or (coupon.valid_until and coupon.valid_until < timezone.localdate())
        or (coupon.max_usage is not None and coupon.usage_count >= coupon.max_usage)
        or amount < coupon.min_order_amount
    ):
        raise CheckoutError("Mã giảm giá không hợp lệ hoặc đã hết hạn.")
    discount = coupon.discount_for(amount)
    coupon.usage_count += 1
    coupon.save(update_fields=["usage_count", "updated_at"])
    return amount - discount, discount, coupon.code


def installment_amounts(amount: int, count: int) -> list[int]:
    """Equal installments rounded down to 1.000đ; the first one carries the remainder."""
    if count <= 1 or amount <= 0:
        return [amount]
    base = (amount // count) // 1000 * 1000
    return [amount - base * (count - 1)] + [base] * (count - 1)


def create_installments(order: Order, interval_days: int) -> None:
    start = timezone.localdate()
    Installment.objects.bulk_create(
        Installment(
            order=order, sequence=i + 1, amount=part, due_date=start + timedelta(days=interval_days * i)
        )
        for i, part in enumerate(installment_amounts(order.total_receivable, order.installment_count))
    )


@transaction.atomic
def create_public_order(data: dict, consent: dict, *, with_payment: bool) -> Order:
    course: Course | None = data.pop("course_id", None)
    program: Program | None = data.pop("program_id", None)
    pay_in_installments = data.pop("pay_in_installments", False)
    coupon_code = data.pop("coupon_code", "")
    data.pop("privacy_consent", None)
    data.pop("website", None)
    preferred_cohort = data.pop("batch_cohort", "")
    source = data.pop("source", "") or "Website"
    item = course or program
    if item is None:
        raise CheckoutError("Vui lòng chọn khóa học hoặc chương trình.")

    cohort, rerouted = resolve_cohort(course, preferred_cohort) if course else (None, False)
    # The intake decides the price (early bird until its deadline), then the coupon applies.
    list_price = cohort.price() if cohort else item.price
    amount, discount, applied = (
        price_with_coupon(item, coupon_code, base=list_price) if with_payment else (list_price, 0, "")
    )
    installments = item.installment_count if with_payment and pay_in_installments and amount > 0 else 1

    order = Order(
        **data,
        **consent,
        course=course,
        program=program,
        course_title=item.title,
        interested_course=item.title,
        cohort=cohort,
        batch_cohort=cohort.name if cohort else preferred_cohort,
        original_amount=item.price,
        discount_amount=discount + (item.price - list_price),
        discount_code=applied,
        amount=amount,
        tuition_fee=item.price,
        total_receivable=amount,
        installment_count=installments,
        payment_method="free" if amount == 0 else "vietqr",
        source=source,
        crm_status="1. Mới",
    )
    if amount == 0 and with_payment:
        order.status = "paid"
        order.payment_status_detail = "Đã đóng phí"
        order.crm_status = "5. Đã đóng phí"
        order.paid_at = timezone.now()
    order.save()
    if installments > 1:
        create_installments(order, item.installment_interval_days)

    duplicates = order.find_duplicates()
    if duplicates.exists():
        order.is_duplicate = True
        order.duplicate_note = f"Trùng SĐT/email/CCCD với {duplicates.count()} hồ sơ khác"
        order.save(update_fields=["is_duplicate", "duplicate_note", "updated_at"])

    Activity.objects.create(
        order=order,
        type="note",
        title="Đăng ký từ website"
        + (" (thanh toán VietQR)" if with_payment else "")
        + (f" – trả góp {installments} kỳ" if installments > 1 else ""),
        content=(f"Lớp mong muốn đã đủ/đóng, tự chuyển sang {cohort.name}." if rerouted and cohort else ""),
        actor="Website",
    )
    return order


@transaction.atomic
def rollover_cohort(request, cohort: Cohort) -> int:
    """
    Move every unpaid applicant of a closed / full cohort to its successor cohort. `request` is None
    when the system does it (intake auto-close, see apps.catalog.intakes).
    """
    target = cohort.next_cohort
    if target is None:
        raise CheckoutError("Lớp này chưa có lớp kế nhiệm.")
    pending = (
        Order.objects.select_for_update()
        .filter(cohort=cohort)
        .exclude(learning_access=True)
        .exclude(status__in=("cancelled", "refunded"))
    )
    user = getattr(request, "user", None)
    moved = 0
    for order in pending:
        order.cohort = target
        order.batch_cohort = target.name
        order.save(update_fields=["cohort", "batch_cohort", "updated_at"])
        Activity.objects.create(
            order=order,
            type="note",
            title="Tự động chuyển tiếp lớp",
            content=f"{cohort.name} đã đóng tuyển sinh. Hồ sơ được chuyển sang {target.name}.",
            actor=user.email if user else "Hệ thống tuyển sinh",
            actor_user=user,
        )
        moved += 1
    audit(request, "cohort.rollover", cohort, to=target.pk, moved=moved)
    return moved


COMPONENT_STATUS = {"paid": "paid", "refunded": "refunded", "cancelled": "cancelled"}


def sync_program_components(order: Order) -> int:
    """
    Program orders: one component order per course of the program, created once the learner may
    study, then kept in step with the program order (status, learner details). Each component flows
    through intakes and LMS enrolment like a single-course order. Returns the number of components.
    """
    if not order.is_program_order:
        return 0
    existing = {c.course_id: c for c in order.components.all()}
    if not existing and not order.learning_access:
        return 0
    status = COMPONENT_STATUS.get(order.status, "pending")
    links = order.program.program_courses.select_related("course") if order.program_id else []
    for link in links:
        component = existing.get(link.course_id)
        if component is None:
            cohort, _ = resolve_cohort(link.course)
            component = Order(
                parent=order,
                program=order.program,
                course=link.course,
                course_title=link.course.title,
                interested_course=link.course.title,
                cohort=cohort,
                batch_cohort=cohort.name if cohort else "",
                payment_method="bundle",
                source=f"Chương trình: {order.program.title}"[:100],
                privacy_consent_at=order.privacy_consent_at,
                privacy_consent_version=order.privacy_consent_version,
            )
        component.customer_name = order.customer_name
        component.customer_email = order.customer_email
        component.customer_phone = order.customer_phone
        if component.status != status:
            component.status = status
            component.paid_at = order.paid_at if status == "paid" else component.paid_at
            component.crm_status = order.crm_status
            component.payment_status_detail = order.payment_status_detail
        component.save()
        existing[link.course_id] = component
    return len(existing)
