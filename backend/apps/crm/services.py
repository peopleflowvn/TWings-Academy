from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import Cohort, Coupon, Course, Program
from apps.core.models import audit

from . import stages
from .models import Activity, Installment, Order


class CheckoutError(Exception):
    pass


def resolve_cohort(course: Course, preferred_label: str = "") -> tuple[Cohort | None, bool]:
    """
    Pick the intake for a new applicant: the one asked for (by name or code, internal classes too) if it
    takes registrations and has a seat, else (following its successors) the next that does, else the
    earliest class offered on the site (Cohort.listed) with a seat. Returns (cohort, was_rerouted).
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
    for cohort in cohorts.listed(today).order_by(F("start_date").asc(nulls_last=True)):
        if joinable(cohort):
            return cohort, preferred is not None
    return None, preferred is not None


CLASSROOM_FORMATS = ("offline", "hybrid")


def billed(orders):
    """
    Orders the learner was asked to pay (what finance counts as receivable): a checkout, an installment
    plan, money received or a tuition invoice e-mailed. A consultation lead with a price is not one.
    """
    from django.db.models import Q

    return orders.filter(
        Q(terms_accepted_at__isnull=False)
        | Q(total_paid_amount__gt=0)
        | Q(installments__isnull=False)
        | Q(emails__template_code="vietqr_tuition_invoice")
    ).distinct()


def checkout_open(course: Course) -> bool:
    """
    Whether the course can be bought online now: an intake must take the learner. A classroom course
    without any intake has no date or place to sell, so visitors leave their details instead.
    """
    if resolve_cohort(course)[0] is not None:
        return True
    if course.cohorts.public().exists():
        return False  # every intake is full, closed or started
    return course.delivery_format not in CLASSROOM_FORMATS


@transaction.atomic
def price_with_coupon(
    item: Course | Program, coupon_code: str, base: int | None = None, exclude_pk=None
) -> tuple[int, int, str]:
    """
    Server-side pricing of a course or program. `base` overrides the list price (an intake's
    early-bird price); `exclude_pk`: the registration being repriced (its own hold is not counted).
    Returns (final_amount, discount, applied_code).
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
        .exclude(pk=exclude_pk)
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
    from .learners import PERSON_FIELDS, reusable_registration
    from .lists import values

    # A visitor's form names its source only among the list's (anything else: "Website").
    source = data.pop("source", "") or "Website"
    if source not in values("source", include_hidden=True):
        source = "Website"

    details = {f: data.pop(f) for f in PERSON_FIELDS if f in data}
    item = course or program
    if item is None:
        raise CheckoutError("Vui lòng chọn khóa học hoặc chương trình.")

    # Registering from a class page (or a link carrying its code): that class is the one asked for.
    code = (data.get("campaign_code") or (attribution.get("last") or {}).get("campaign") or "").strip()
    if course and code and not preferred_cohort:
        tagged = Cohort.objects.public().filter(course=course, code__iexact=code).first()
        preferred_cohort = tagged.name if tagged else ""
    # The same person (e-mail) with an open registration for this course: continue it, no second lead.
    existing = reusable_registration(data.get("customer_email", ""), course, program)
    cohort, rerouted = resolve_cohort(course, preferred_cohort) if course else (None, False)
    if with_payment and course is not None and cohort is None and not checkout_open(course):
        raise CheckoutError(
            "Khóa này chưa có đợt khai giảng nhận học viên. Vui lòng để lại thông tin để được báo khi mở lớp."
        )
    # The intake decides the price (early bird until its deadline), then the coupon applies.
    list_price = cohort.price() if cohort else item.price
    amount, discount, applied = (
        price_with_coupon(item, coupon_code, base=list_price, exclude_pk=getattr(existing, "pk", None))
        if with_payment
        else (list_price, 0, "")
    )
    installments = item.installment_count if with_payment and pay_in_installments and amount > 0 else 1

    from .attribution import apply as apply_attribution

    data = apply_attribution({**data, "source": source}, attribution)
    source = data.pop("source")
    # One class = one campaign: the class the visitor chose tags the lead.
    chosen = cohort is not None and cohort.code and cohort.name == preferred_cohort
    if chosen and not data.get("campaign_code"):
        data["campaign_code"] = cohort.code
    priced = dict(
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
    )
    if existing is not None:
        order = existing
        changes = _continue_registration(existing, data, consent, priced if with_payment else None)
    else:
        changes = []
        order = Order(
            **data,
            **consent,
            **priced,
            source=source,
            # An online checkout asks for the payment; a consultation request is a new lead.
            crm_status=stages.TO_PAY if with_payment and amount > 0 else stages.POTENTIAL,
        )
    if with_payment and amount > 0:
        order.crm_status = stages.TO_PAY
        order.hold_expires_at = timezone.now() + timedelta(hours=settings.CHECKOUT_HOLD_HOURS)
    if amount == 0 and with_payment:
        order.status = "paid"
        order.crm_status = stages.PAID
        order.paid_at = timezone.now()
    order.save()
    if existing is not None and with_payment:
        order.installments.all().delete()  # the plan follows the new checkout
    if installments > 1:
        create_installments(order, item.installment_interval_days)
    if with_payment and terms_accepted:
        from apps.cms.legal import UPDATED

        order.terms_accepted_at, order.terms_version = timezone.now(), UPDATED
        order.save(update_fields=["terms_accepted_at", "terms_version", "updated_at"])
    if invoice:
        from .models import InvoiceRequest

        InvoiceRequest.objects.update_or_create(order=order, defaults=invoice)

    if existing is not None:
        from .learners import attach_learner

        attach_learner(order, details)  # what the form brought fills what the learner lacks
        moved = [f"Lớp mong muốn đã đủ/đóng, tự chuyển sang {cohort.name}."] if rerouted and cohort else []
        Activity.objects.create(
            order=order,
            type="note",
            title=(
                "Thanh toán online (VietQR) trên đăng ký đang mở"
                if with_payment
                else "Gửi lại form đăng ký trên website"
            ),
            content="\n".join(
                [
                    "Cùng email, cùng khóa với đăng ký đang mở: cập nhật đăng ký này, không tạo lead mới.",
                    *changes,
                    *(moved if with_payment else []),
                ]
            ),
            actor="Website",
        )
        if with_payment:
            from .confirmations import send_order_received

            transaction.on_commit(lambda: send_order_received(order.pk))
        return order

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
    from .confirmations import send_order_received

    transaction.on_commit(lambda: send_order_received(order.pk))  # payment details / next steps by e-mail
    return order


def flag_duplicates(order: Order, details: dict | None = None) -> None:
    """
    Link a new registration to its learner, then flag it (and the earlier ones) when the learner has
    another active registration for the same course / program (another course is not a duplicate).
    """
    from .learners import attach_learner, refresh_duplicate_flags

    attach_learner(order, details)
    refresh_duplicate_flags(order.learner_id)
    order.refresh_from_db(fields=["is_duplicate", "duplicate_note"])


# What a visitor's new form adds to an open registration (contact and source stay as first recorded).
FORM_FILLS = ["customer_phone", "campaign_code", "referrer_name", "referrer_phone", "referrer_staff_code"]


def _continue_registration(order: Order, data: dict, consent: dict, priced: dict | None) -> list[str]:
    """
    A form sent again for an open registration: the visitor's new need is added, empty details filled,
    consent renewed; a checkout (`priced`) reprices it to what the visitor was shown. Returns the changes.
    """
    changes = []
    need = (data.get("consult_need") or "").strip()
    if need and need not in order.consult_need:
        order.consult_need = f"{order.consult_need}\n{need}".strip()
        changes.append(f"Nhu cầu: {need}")
    for field in FORM_FILLS:
        if data.get(field) and not getattr(order, field):
            setattr(order, field, data[field])
    if not order.attribution and data.get("attribution"):
        order.attribution = data["attribution"]
    for field, value in consent.items():
        setattr(order, field, value)
    if priced is not None:
        if order.status == "cancelled":  # a checkout whose hold passed: paying again reopens it
            order.status = "pending"
            changes.append("Mở lại đăng ký (lần thanh toán trước đã hết hạn giữ chỗ).")
        before_amount, before_cohort = order.amount, order.batch_cohort
        for field, value in priced.items():
            setattr(order, field, value)
        if order.batch_cohort != before_cohort:
            changes.append(f"Lớp: {before_cohort or '–'} → {order.batch_cohort or '–'}")
        if order.amount != before_amount:
            change = f"Học phí: {before_amount:,} → {order.amount:,} ₫ (giá trên website)"
            changes.append(change.replace(",", "."))
    return changes


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
    extra = {
        "source": data.get("source") or "Nhập tay",
        "crm_status": data.get("crm_status") or stages.POTENTIAL,
    }
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
    cohort = data.get("cohort")
    if cohort is not None and cohort.code and not data.get("campaign_code"):
        extra["campaign_code"] = cohort.code
    order = serializer.save(**extra)
    flag_duplicates(order)
    if order.is_duplicate and not request.data.get("allow_duplicate"):
        # Usually the same person already in the pipeline: staff open that lead instead (the new one is
        # rolled back), or confirm a second registration on purpose.
        from rest_framework.exceptions import ValidationError

        from .learners import active_duplicates

        others = active_duplicates(order).order_by("-created_at")[:5]
        raise ValidationError(
            {
                "non_field_errors": [
                    "Học viên này đã có đăng ký đang mở cho khóa này: "
                    + ", ".join(f"{o.order_code} ({stages.name(o.crm_status)})" for o in others)
                    + ". Mở đăng ký đó thay vì tạo lead mới."
                ],
                "duplicate_orders": [
                    {"id": str(o.pk), "order_code": o.order_code, "crm_status": o.crm_status} for o in others
                ],
            }
        )
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
