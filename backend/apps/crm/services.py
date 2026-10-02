from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Cohort, Coupon, Course
from apps.core.models import audit

from .models import Activity, Order


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
def price_with_coupon(course: Course, coupon_code: str) -> tuple[int, int, str]:
    """Server-side pricing. Returns (final_amount, discount, applied_code). Locks the coupon row."""
    amount = course.price
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


@transaction.atomic
def create_public_order(data: dict, consent: dict, *, with_payment: bool) -> Order:
    course: Course = data.pop("course_id")
    coupon_code = data.pop("coupon_code", "")
    data.pop("privacy_consent", None)
    data.pop("website", None)
    preferred_cohort = data.pop("batch_cohort", "")
    source = data.pop("source", "") or "Website"

    amount, discount, applied = (
        price_with_coupon(course, coupon_code) if with_payment else (course.price, 0, "")
    )
    cohort, rerouted = resolve_cohort(course, preferred_cohort)

    order = Order(
        **data,
        **consent,
        course=course,
        course_title=course.title,
        interested_course=course.title,
        cohort=cohort,
        batch_cohort=cohort.name if cohort else preferred_cohort,
        original_amount=course.price,
        discount_amount=discount,
        discount_code=applied,
        amount=amount,
        tuition_fee=course.price,
        total_receivable=amount,
        payment_method="free" if amount == 0 else "vietqr",
        source=source,
        crm_status="1. Mới",
    )
    if amount == 0 and with_payment:
        order.status = "paid"
        order.payment_status_detail = "Đã đóng phí"
        order.crm_status = "5. Đã đóng phí"
    order.save()

    duplicates = order.find_duplicates()
    if duplicates.exists():
        order.is_duplicate = True
        order.duplicate_note = f"Trùng SĐT/email/CCCD với {duplicates.count()} hồ sơ khác"
        order.save(update_fields=["is_duplicate", "duplicate_note", "updated_at"])

    Activity.objects.create(
        order=order,
        type="note",
        title="Đăng ký từ website" + (" (thanh toán VietQR)" if with_payment else ""),
        content=(f"Lớp mong muốn đã đủ/đóng, tự chuyển sang {cohort.name}." if rerouted and cohort else ""),
        actor="Website",
    )
    return order


@transaction.atomic
def rollover_cohort(request, cohort: Cohort) -> int:
    """Move every unpaid applicant of a closed cohort to its successor cohort."""
    target = cohort.next_cohort
    if target is None:
        raise CheckoutError("Lớp này chưa có lớp kế nhiệm.")
    pending = Order.objects.select_for_update().filter(cohort=cohort).exclude(status="paid")
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
            actor=request.user.email,
            actor_user=request.user,
        )
        moved += 1
    audit(request, "cohort.rollover", cohort, to=target.pk, moved=moved)
    return moved
