from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import Cohort, Coupon, Course, Program
from apps.core.models import audit

from .models import Activity, Installment, Order


class CheckoutError(Exception):
    pass


def resolve_cohort(course: Course, preferred_label: str = "") -> tuple[Cohort | None, bool]:
    """
    Pick the intake for a new applicant: the one asked for if it takes registrations and has a seat,
    else (following its successors) the next that does, else the earliest joinable intake with a
    seat. Open and announced (upcoming) intakes take registrations. Returns (cohort, was_rerouted).
    """
    from apps.catalog.intakes import JOINABLE, has_seat

    today = timezone.localdate()
    cohorts = Cohort.objects.public().filter(course=course)

    def joinable(c: Cohort) -> bool:
        return c.status in JOINABLE and (c.start_date is None or c.start_date >= today) and has_seat(c)

    preferred = cohorts.filter(name__iexact=preferred_label.strip()).first() if preferred_label else None
    seen = set()
    candidate = preferred
    while candidate is not None and candidate.pk not in seen:
        if joinable(candidate):
            return candidate, candidate != preferred
        seen.add(candidate.pk)
        candidate = candidate.next_cohort
    for cohort in cohorts.filter(status__in=JOINABLE).order_by(F("start_date").asc(nulls_last=True)):
        if joinable(cohort):
            return cohort, preferred is not None
    return None, preferred is not None


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
    # A use is counted when the money arrives (count_coupon_use); checkouts still holding the code
    # keep a place so a limited code cannot be oversold.
    held = (
        Order.objects.filter(discount_code=coupon.code, status="pending", hold_expires_at__gt=timezone.now())
        .exclude(learning_access=True)
        .count()
        if coupon is not None
        else 0
    )
    if (
        coupon is None
        or (coupon.valid_until and coupon.valid_until < timezone.localdate())
        or (coupon.max_usage is not None and coupon.usage_count + held >= coupon.max_usage)
        or amount < coupon.min_order_amount
    ):
        raise CheckoutError("Mã giảm giá không hợp lệ hoặc đã hết hạn.")
    discount = coupon.discount_for(amount)
    return amount - discount, discount, coupon.code


def count_coupon_use(order: Order) -> None:
    """The order's coupon is used once its learner may study (first payment / full payment)."""
    if not order.discount_code:
        return
    Coupon.objects.filter(code=order.discount_code).update(usage_count=F("usage_count") + 1)


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
    attribution = data.pop("attribution", None) or {}
    terms_accepted = data.pop("terms_accepted", False)
    invoice = data.pop("invoice", None)
    source = data.pop("source", "") or "Website"
    from .learners import PERSON_FIELDS

    details = {f: data.pop(f) for f in PERSON_FIELDS if f in data}
    item = course or program
    if item is None:
        raise CheckoutError("Vui lòng chọn khóa học hoặc chương trình.")

    cohort, rerouted = resolve_cohort(course, preferred_cohort) if course else (None, False)
    if with_payment and course is not None and cohort is None and course.cohorts.public().exists():
        raise CheckoutError(
            "Các đợt khai giảng của khóa này đã đủ chỗ hoặc đã đóng. "
            "Vui lòng để lại thông tin để được tư vấn đợt sau."
        )
    # The intake decides the price (early bird until its deadline), then the coupon applies.
    list_price = cohort.price() if cohort else item.price
    amount, discount, applied = (
        price_with_coupon(item, coupon_code, base=list_price) if with_payment else (list_price, 0, "")
    )
    installments = item.installment_count if with_payment and pay_in_installments and amount > 0 else 1

    from .attribution import apply as apply_attribution

    data = apply_attribution({**data, "source": source}, attribution)
    source = data.pop("source")
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
    if with_payment and amount > 0:
        order.hold_expires_at = timezone.now() + timedelta(hours=settings.CHECKOUT_HOLD_HOURS)
    if amount == 0 and with_payment:
        order.status = "paid"
        order.crm_status = "5. Đã đóng phí"
        order.paid_at = timezone.now()
    order.save()
    if installments > 1:
        create_installments(order, item.installment_interval_days)
    if with_payment and terms_accepted:
        from apps.cms.legal import UPDATED

        order.terms_accepted_at, order.terms_version = timezone.now(), UPDATED
        order.save(update_fields=["terms_accepted_at", "terms_version", "updated_at"])
    if invoice:
        from .models import InvoiceRequest

        InvoiceRequest.objects.create(order=order, **invoice)

    flag_duplicates(order, details)

    Activity.objects.create(
        order=order,
        type="note",
        title="Đăng ký từ website"
        + (" (thanh toán VietQR)" if with_payment else "")
        + (f" – trả góp {installments} kỳ" if installments > 1 else ""),
        content=(f"Lớp mong muốn đã đủ/đóng, tự chuyển sang {cohort.name}." if rerouted and cohort else ""),
        actor="Website",
    )
    from .assignment import assign_new_lead

    assign_new_lead(order)  # step 4: a consultant and a response deadline right away
    return order


def flag_duplicates(order: Order, details: dict | None = None) -> None:
    """
    Link a new registration to its learner, then flag it when the learner already has an active
    registration for the same course / program (a returning learner on another course is not one).
    """
    from .learners import active_duplicates, attach_learner

    attach_learner(order, details)
    duplicates = list(active_duplicates(order).values_list("order_code", flat=True)[:5])
    if duplicates:
        order.is_duplicate = True
        order.duplicate_note = f"Học viên đã có đăng ký đang mở cho khóa này: {', '.join(duplicates)}"[:300]
        order.save(update_fields=["is_duplicate", "duplicate_note", "updated_at"])


def check_sellable(course: Course | None, program: Program | None) -> None:
    """New or changed registrations: a course or a program on sale, not both."""
    from rest_framework.exceptions import ValidationError

    if course is not None and program is not None:
        raise ValidationError({"course_id": "Chọn một khóa học hoặc một chương trình."})
    item = course or program
    if item is not None and not item.sellable:
        raise ValidationError(
            {"course_id": f"“{item.title}” chưa mở bán (đang nháp, chờ duyệt hoặc đã lưu trữ)."}
        )


def price_registration(order: Order, course: Course | None, program: Program | None) -> list[str]:
    """
    Course / program, intake and fees of an unpaid registration from the catalogue (the open intake's
    price for a course). Returns the fields set.
    """
    item = course or program
    cohort = resolve_cohort(course)[0] if course is not None else None
    price = (
        (cohort.price() if cohort else course.price)
        if course is not None
        else (program.price if program else 0)
    )
    order.course, order.program, order.cohort = course, program, cohort
    order.course_title = item.title if item else ""
    order.interested_course = item.title if item else order.interested_course
    order.batch_cohort = cohort.name if cohort else ""
    list_price = item.price if item else 0
    order.amount = order.total_receivable = price
    order.tuition_fee = order.original_amount = list_price
    order.discount_amount = max(list_price - price, 0)
    order.discount_code = ""
    order.installment_count = 1
    return [
        "course",
        "program",
        "cohort",
        "course_title",
        "interested_course",
        "batch_cohort",
        "amount",
        "total_receivable",
        "tuition_fee",
        "original_amount",
        "discount_amount",
        "discount_code",
        "installment_count",
    ]


@transaction.atomic
def change_registration_item(order: Order, course: Course | None, program: Program | None, user) -> None:
    """Staff moves an unpaid registration to another course / program: repriced, intake reset."""
    from rest_framework.exceptions import ValidationError

    if order.total_paid_amount or order.status != "pending" or order.parent_id:
        raise ValidationError(
            {
                "course_id": "Đăng ký đã thu học phí (hoặc là khóa của chương trình): "
                "tạo đăng ký mới thay vì đổi khóa."
            }
        )
    check_sellable(course, program)
    before = order.course_title
    order.installments.all().delete()
    fields = price_registration(order, course, program)
    order.save(update_fields=[*fields, "updated_at"])
    Activity.objects.create(
        order=order,
        type="note",
        title=f"Đổi khóa: {before or '–'} → {order.course_title or '–'}",
        actor=user.name or user.email,
        actor_user=user,
    )


@transaction.atomic
def create_staff_lead(request, serializer) -> Order:
    """
    A lead entered by staff (phone call, walk-in, event): priced from the course / open intake like a
    website lead, deduplicated, given a consultant and a response deadline.
    """
    from .assignment import assign_new_lead

    data = serializer.validated_data
    extra = {"source": data.get("source") or "Nhập tay", "crm_status": data.get("crm_status") or "1. Mới"}
    course, program = data.get("course"), data.get("program")
    check_sellable(course, program)
    if course is not None or program is not None:
        draft = Order()
        price_registration(draft, course, program)
        extra.update(
            {
                f: getattr(draft, f)
                for f in ("course", "program", "cohort", "course_title", "batch_cohort", "interested_course")
            }
        )
        if data.get("cohort") is not None:
            extra.update(cohort=data["cohort"], batch_cohort=data["cohort"].name)
        if not data.get("amount"):
            extra.update(
                {
                    f: getattr(draft, f)
                    for f in (
                        "amount",
                        "total_receivable",
                        "tuition_fee",
                        "original_amount",
                        "discount_amount",
                    )
                }
            )
    campaign = data.get("campaign")
    if campaign is not None and not data.get("campaign_code"):
        extra["campaign_code"] = campaign.code
    order = serializer.save(**extra)
    flag_duplicates(order)
    user = request.user
    Activity.objects.create(
        order=order,
        type="note",
        title="Tạo lead thủ công",
        content=f"Nguồn: {order.source}",
        actor=user.name or user.email,
        actor_user=user,
    )
    assign_new_lead(order)
    audit(request, "order.create", order, order_code=order.order_code)
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
                learner=order.learner,
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
        component.save()
        existing[link.course_id] = component
    return len(existing)
