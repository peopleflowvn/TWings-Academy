"""
Learners and their registrations.

A Learner is one person; each registration to a course or program is an Order linked to it (a person
can study any number of courses). Personal details (identity, addresses, education, emergency
contact, CV) exist on the Learner only. A registration keeps the contact typed for it (name, phone,
e-mail): SSO, journeys and payment e-mails use it, and the learner page shows both.

- A new registration (website, checkout, staff) is matched to a learner (apps.crm.matching): CCCD, or
  e-mail / phone with a compatible name; a new learner is created otherwise, and a record that may be the
  same person (shared phone with another name, a typo in the phone / e-mail…) goes to staff review
  (LearnerMatch). What the form brings fills what the learner lacks.
- Staff editing the learner's name / phone / e-mail updates every registration of the person.
- A registration is a duplicate only when the same learner already has an active registration for the
  same course / program; a returning learner on another course is not one.
"""

import re

from django.db import transaction
from django.db.models import Q

from . import stages
from .models import Activity, Learner, Order

# Learner field -> Order field: the contact kept on each registration.
CONTACT_FIELDS = {"full_name": "customer_name", "phone": "customer_phone", "email": "customer_email"}
# Personal details a form may bring for the learner (public registration, enrolment file).
PERSON_FIELDS = [
    "birth_date",
    "gender",
    "area",
    "citizen_id",
    "issued_place",
    "permanent_address",
    "current_residence",
    "education_level",
    "major",
    "university",
    "graduation_year",
    "contact_person_name",
    "contact_person_phone",
    "contact_relation",
    "cv_link",
]
# What the learner must provide before studying (enrolment file).
DOSSIER_REQUIRED = ["birth_date", "citizen_id", "permanent_address", "education_level"]
# Still being worked on: not refunded, not in a closed stage. A cancelled order in an open stage is a
# checkout whose hold passed (expire_checkouts): the consultant still follows it up, so it counts.
ACTIVE = ~Q(status="refunded") & ~Q(crm_status__in=stages.in_groups(stages.G_CLOSED))


def phone_key(phone: str) -> str:
    """Digits of a Vietnamese phone number, +84 / 84 written as 0 (0912 345 678 == +84912345678)."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("84") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits


def find_learner(
    *, email: str = "", phone: str = "", citizen_id: str = "", full_name: str = "", birth_date=None
) -> Learner | None:
    """The learner surely this person (CCCD, or e-mail / phone with a compatible name), else None."""
    from .matching import candidates

    found = candidates(
        full_name=full_name, email=email, phone=phone, citizen_id=citizen_id, birth_date=birth_date
    )
    return found[0].learner if found and found[0].sure else None


def fill_missing(learner: Learner, values: dict) -> None:
    """Set the learner's empty details from `values` (a form never overwrites what is known)."""
    missing = {f: v for f, v in values.items() if v not in (None, "") and not getattr(learner, f)}
    for field, value in missing.items():
        setattr(learner, field, value)
    if missing:
        learner.save(update_fields=[*missing, "updated_at"])


@transaction.atomic
def attach_learner(order: Order, details: dict | None = None) -> Learner:
    """
    Link a new registration to its learner (matched or created); `details` are personal details the
    form brought (birth date, education…). Program courses follow the program registration.
    """
    details = {k: v for k, v in (details or {}).items() if k in PERSON_FIELDS}
    contact = {lf: getattr(order, of) for lf, of in CONTACT_FIELDS.items()}
    if order.parent_id:
        learner = order.parent.learner or attach_learner(order.parent)
    elif order.learner_id:
        learner = order.learner
        fill_missing(learner, {**contact, **details})
    else:
        from .matching import candidates, record_possible

        found = candidates(
            full_name=order.customer_name,
            email=order.customer_email,
            phone=order.customer_phone,
            citizen_id=details.get("citizen_id", ""),
            birth_date=details.get("birth_date"),
        )
        if found and found[0].sure:
            learner = found[0].learner
            fill_missing(learner, {**contact, **details})
        else:
            learner = Learner(**contact, **details, owner=order.assigned_to)
            learner.full_name = learner.full_name or order.order_code
            learner.save()
        # Anyone else who may be this person (another sure match: e-mail of one record, phone of another).
        record_possible(learner, [m for m in found if m.learner.pk != learner.pk])
    if order.learner_id != learner.pk:
        order.learner = learner
        order.save(update_fields=["learner", "updated_at"])
    return learner


def same_person(learner: Learner | None, email: str) -> bool:
    """The learner record carries this e-mail (what the learner portal's one-time code proves)."""
    return bool(learner and email and (learner.email or "").strip().lower() == email.strip().lower())


@transaction.atomic
def portal_learner(order: Order) -> Learner:
    """
    The learner record the person signed in with the registration's e-mail may read and edit (learner
    portal: enrolment file, CV).

    Registrations are matched to a learner by phone or CCCD as well, and anyone can type another
    person's phone number into the public form. Owning the registration's e-mail is therefore no proof
    of being the person on the matched record: when that record carries another e-mail, the
    registration (with its program courses) moves to a learner of its own, so a stranger can never read
    or overwrite someone else's identity details, addresses or CV. Staff merge the two records when they
    really are the same person.
    """
    learner = order.learner or attach_learner(order)
    email = order.customer_email
    if same_person(learner, email):
        return learner
    own = find_learner(email=email) if email else None
    if own is None or own.pk == learner.pk:
        own = Learner(**{lf: getattr(order, of) for lf, of in CONTACT_FIELDS.items()}, owner=learner.owner)
        own.full_name = own.full_name or order.order_code
        own.save()
    Order.objects.filter(Q(pk=order.pk) | Q(parent_id=order.pk)).update(learner=own)
    order.learner = own
    refresh_duplicate_flags(learner.pk)
    refresh_duplicate_flags(own.pk)
    Activity.objects.create(
        order=order,
        type="note",
        title=f"Tách khỏi hồ sơ học viên {learner.code} sang {own.code}",
        content=(
            "Đăng ký khớp hồ sơ cũ theo số điện thoại / CCCD nhưng email khác, nên học viên đăng nhập bằng "
            "email của đăng ký không được xem hồ sơ cũ. Nếu đúng là cùng một người, hãy gộp hai hồ sơ."
        ),
        actor="Hệ thống",
    )
    return own


@transaction.atomic
def update_learner(learner: Learner, values: dict) -> None:
    """Change the learner's details; a new name / phone / e-mail reaches every registration."""
    fields = [f for f in values if f in PERSON_FIELDS or f in CONTACT_FIELDS]
    for field in fields:
        setattr(learner, field, values[field])
    if fields:
        learner.save(update_fields=[*fields, "updated_at"])
    contact = {CONTACT_FIELDS[f]: getattr(learner, f) for f in fields if f in CONTACT_FIELDS}
    if contact:
        learner.orders.update(**contact)
    if contact or {"citizen_id", "birth_date"} & set(fields):
        from .matching import scan

        scan(learner)  # new details may show another record of the person
        refresh_duplicate_flags(learner.pk)


def dossier_missing(learner: Learner | None) -> list[str]:
    return (
        list(DOSSIER_REQUIRED)
        if learner is None
        else [f for f in DOSSIER_REQUIRED if not getattr(learner, f)]
    )


def _same_item(course_id, program_id) -> Q:
    if program_id and not course_id:
        return Q(program_id=program_id, course__isnull=True)
    return Q(course_id=course_id)


def _overlapping(course_id, program_id) -> Q:
    """The same course / program, or a program containing the course (a course of the program)."""
    from apps.catalog.models import ProgramCourse

    if program_id and not course_id:
        courses = ProgramCourse.objects.filter(program_id=program_id).values("course_id")
        return _same_item(None, program_id) | Q(course_id__in=courses)
    programs = ProgramCourse.objects.filter(course_id=course_id).values("program_id")
    return _same_item(course_id, None) | Q(course__isnull=True, program_id__in=programs)


def active_duplicates(order: Order):
    """
    Other active registrations of the same learner for the same course / program, or overlapping it
    (a program and one of its courses bought on its own).
    """
    if not order.learner_id or not (order.course_id or order.program_id):
        return Order.objects.none()
    return (
        Order.objects.filter(learner_id=order.learner_id, parent__isnull=True)
        .filter(_overlapping(order.course_id, order.program_id))
        .filter(ACTIVE)
        .exclude(pk=order.pk)
    )


def _lock_email(email: str) -> None:
    """
    Two forms of one person sent at the same moment (double click, two tabs) wait for each other, so
    the second finds the registration the first created (PostgreSQL; until the transaction ends).
    """
    import hashlib

    from django.db import connection

    if connection.vendor != "postgresql":
        return
    key = int.from_bytes(hashlib.sha256(email.lower().encode()).digest()[:8], "big", signed=True)
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [key])


def reusable_registration(email: str, course, program) -> Order | None:
    """
    The open registration a new website form should continue instead of creating a second one: same
    e-mail (the public form requires it; a phone or CCCD match alone could be someone else's), same
    course / program, nothing paid yet and not closed (an expired checkout still followed up counts).
    Locked until the request ends.
    """
    email = (email or "").strip()
    if not email or not (course or program):
        return None
    _lock_email(email)
    return (
        Order.objects.select_for_update()
        .filter(_same_item(getattr(course, "pk", None), getattr(program, "pk", None)))
        .filter(
            parent__isnull=True,
            customer_email__iexact=email,
            status__in=("pending", "cancelled"),
            total_paid_amount=0,
            learning_access=False,
        )
        .filter(ACTIVE)
        .order_by("-created_at")
        .first()
    )


def open_matches(learner_id) -> dict:
    """{other learner id: LearnerMatch} of the pairs with this learner still waiting for staff."""
    from .models import LearnerMatch

    rows = LearnerMatch.objects.filter(status="open").filter(
        Q(learner_a_id=learner_id) | Q(learner_b_id=learner_id)
    )
    return {(m.learner_b_id if str(m.learner_a_id) == str(learner_id) else m.learner_a_id): m for m in rows}


def refresh_duplicate_flags(learner_id, _partners: bool = True) -> None:
    """
    Flags of the learner's registrations follow what is still open: "same" (the learner has another
    open registration for the course), else "possible" (a record that may be the same person has one);
    a duplicate closed, merged or dismissed: flag gone. Also refreshes the possible partners.
    """
    if not learner_id:
        return
    mine = Order.objects.filter(learner_id=learner_id, parent__isnull=True)
    active = set(mine.filter(ACTIVE).values_list("pk", flat=True))
    partners = open_matches(learner_id)
    for order in mine:
        kind, note, match = "", "", None
        if order.pk in active:
            others = list(active_duplicates(order).values_list("order_code", flat=True)[:5])
            if others:
                kind, note = "same", f"Học viên còn đăng ký đang mở cho khóa này: {', '.join(others)}"
            elif order.course_id or order.program_id:
                for partner, pair in partners.items():
                    theirs = list(
                        Order.objects.filter(learner_id=partner, parent__isnull=True)
                        .filter(_overlapping(order.course_id, order.program_id))
                        .filter(ACTIVE)
                        .values_list("order_code", flat=True)[:5]
                    )
                    if theirs:
                        kind, match = "possible", pair
                        note = f"Nghi cùng một người với {', '.join(theirs)}: {pair.reason}"
                        break
        state = (bool(kind), kind, note[:300], getattr(match, "pk", None))
        current = (order.is_duplicate, order.duplicate_kind, order.duplicate_note, order.duplicate_match_id)
        if current != state:
            Order.objects.filter(pk=order.pk).update(
                is_duplicate=state[0], duplicate_kind=kind, duplicate_note=state[2], duplicate_match=match
            )
    if _partners:
        for partner in partners:
            refresh_duplicate_flags(partner, _partners=False)


@transaction.atomic
def decide_match(match, *, same: bool, user=None, request=None) -> Learner | None:
    """
    Staff decide a pair: same person -> the newer record merges into the older one (returned); other
    people -> dismissed for good. The registrations' flags follow.
    """
    a, b = match.learner_a, match.learner_b
    if not same:
        match.status, match.decided_by = "dismissed", user
        match.save(update_fields=["status", "decided_by", "updated_at"])
        refresh_duplicate_flags(a.pk)
        refresh_duplicate_flags(b.pk)
        return None
    keep, other = sorted([a, b], key=lambda x: x.created_at)
    return merge_learners(keep, other, request)


# Details of a closed duplicate the registration kept takes when it has none.
MERGED_FIELDS = [
    "customer_phone",
    "consult_need",
    "consult_detail",
    "campaign_code",
    "referrer_name",
    "referrer_phone",
    "referrer_staff_code",
    "interest_level",
]


@transaction.atomic
def merge_registrations(keep: Order, user) -> list[str]:
    """
    One person, one course, several open registrations: `keep` stays, the others (nothing paid) close as
    "Đăng ký nhầm" and bring their history, open tasks and planned appointments to it. Returns their codes.
    """
    from .assignment import NEW_LEAD_TASK

    actor = (user.name or user.email) if user else "Hệ thống"
    others = list(
        active_duplicates(keep).select_for_update().filter(total_paid_amount=0, learning_access=False)
    )
    keep_fields = set()
    for other in others:
        for field in MERGED_FIELDS:
            if getattr(other, field) and not getattr(keep, field):
                setattr(keep, field, getattr(other, field))
                keep_fields.add(field)
        if other.first_response_at and not keep.first_response_at:
            keep.first_response_at = other.first_response_at
            keep_fields.add("first_response_at")
        other.timeline_activities.update(order=keep)
        tasks = other.followup_tasks.filter(is_completed=False)
        if keep.followup_tasks.filter(is_completed=False, title__startswith=NEW_LEAD_TASK).exists():
            tasks.filter(title__startswith=NEW_LEAD_TASK).update(is_completed=True)
        tasks.filter(is_completed=False).update(order=keep)
        other.appointments.filter(status="planned").update(order=keep)
        was = stages.name(other.crm_status)
        other.crm_status = stages.MISTAKEN
        other.lost_reason = stages.CLOSED_REASON[stages.MISTAKEN]
        other.status = "cancelled"
        other.hold_expires_at = None
        other.save(update_fields=["crm_status", "lost_reason", "status", "hold_expires_at", "updated_at"])
        Activity.objects.create(
            order=other,
            type="note",
            title=f"Đăng ký trùng: đã gộp vào {keep.order_code}",
            content="Lịch sử, công việc và lịch hẹn đang mở đã chuyển sang đăng ký được giữ lại.",
            actor=actor,
            actor_user=user,
        )
        Activity.objects.create(
            order=keep,
            type="note",
            title=f"Gộp đăng ký trùng {other.order_code} vào đăng ký này",
            content=f"{other.order_code}: {was}, tạo {other.created_at:%d/%m/%Y %H:%M}.",
            actor=actor,
            actor_user=user,
        )
    if keep_fields:
        keep.save(update_fields=[*keep_fields, "updated_at"])
    refresh_duplicate_flags(keep.learner_id)
    return [o.order_code for o in others]


@transaction.atomic
def merge_learners(keep: Learner, other: Learner, request=None) -> Learner:
    """Two records of the same person: registrations move to `keep`, empty details are filled from `other`."""
    from apps.core.models import audit

    fill_missing(keep, {f: getattr(other, f) for f in [*PERSON_FIELDS, *CONTACT_FIELDS, "note"]})
    if not keep.owner_id and other.owner_id:
        keep.owner_id = other.owner_id
        keep.save(update_fields=["owner", "updated_at"])
    moved = list(other.orders.all())
    for order in moved:
        order.learner = keep
        order.save(update_fields=["learner", "updated_at"])
        Activity.objects.create(
            order=order,
            type="note",
            title=f"Gộp hồ sơ học viên {other.code} vào {keep.code}",
            actor=(request.user.name or request.user.email) if request else "Hệ thống",
            actor_user=request.user if request else None,
        )
    if request is not None:
        audit(request, "learner.merge", keep, merged=other.code, orders=len(moved))
    partners = list(open_matches(other.pk))
    other.delete()  # its pairs go with it
    from .matching import scan

    scan(keep)  # the merged details may show another record of the person
    refresh_duplicate_flags(keep.pk)  # one person now: their registrations of one course are duplicates
    for partner in partners:
        refresh_duplicate_flags(partner, _partners=False)
    return keep
