"""
Learners and their registrations.

A Learner is one person; each registration to a course or program is an Order linked to it (a person
can study any number of courses). The Learner holds the person's details; the same fields on Order
are a copy kept in step from here, because SSO, Moodle enrolment, class lists and exports read them
from the order.

- A new registration (website, checkout, staff) is matched to a learner by e-mail, then phone, then
  CCCD; a new learner is created otherwise. The form only fills what the learner record lacks.
- Edits by staff (learner page or lead workspace) and the learner's own enrolment file update the
  learner and every registration of the person.
- A registration is a duplicate only when the same learner already has an active registration for the
  same course / program; a returning learner on another course is not one.
"""

import re

from django.db import transaction
from django.db.models import Q

from apps.core.crypto import blind_index

from .models import Activity, Learner, Order

# Learner field -> Order field.
PERSON_FIELDS = {
    "full_name": "customer_name",
    "phone": "customer_phone",
    "email": "customer_email",
    "birth_date": "birth_date",
    "gender": "gender",
    "area": "area",
    "citizen_id": "citizen_id",
    "issued_place": "issued_place",
    "permanent_address": "permanent_address",
    "current_residence": "current_residence",
    "education_level": "education_level",
    "major": "major",
    "university": "university",
    "graduation_year": "graduation_year",
    "contact_person_name": "contact_person_name",
    "contact_person_phone": "contact_person_phone",
    "contact_relation": "contact_relation",
    "cv_link": "cv_link",
}
ORDER_PERSON_FIELDS = {v: k for k, v in PERSON_FIELDS.items()}
ACTIVE = ~Q(status__in=("cancelled", "refunded")) & ~Q(crm_status="7. Đã hủy")


def phone_key(phone: str) -> str:
    """Digits of a Vietnamese phone number, +84 / 84 written as 0 (0912 345 678 == +84912345678)."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("84") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits


def find_learner(*, email: str = "", phone: str = "", citizen_id: str = "") -> Learner | None:
    """The person with this e-mail, else this phone, else this CCCD (most recent first)."""
    if email:
        found = Learner.objects.filter(email__iexact=email.strip()).order_by("-created_at").first()
        if found:
            return found
    key = phone_key(phone)
    if key:
        found = Learner.objects.filter(phone_index=key).order_by("-created_at").first()
        if found:
            return found
    index = blind_index(citizen_id or "")
    if index:
        return Learner.objects.filter(citizen_id_index=index).order_by("-created_at").first()
    return None


def _order_values(order: Order) -> dict:
    return {lf: getattr(order, of) for lf, of in PERSON_FIELDS.items()}


@transaction.atomic
def attach_learner(order: Order) -> Learner:
    """
    Link a new registration to its learner (matched or created). Program courses follow the program
    registration. The registration's details fill what the learner lacks, and the learner's fill what
    the registration lacks (CCCD, address, education are not asked again); what the person typed on
    this registration (e.g. a newer e-mail) is kept.
    """
    if order.parent_id:
        learner = order.parent.learner or attach_learner(order.parent)
    elif order.learner_id:
        learner = order.learner  # registered from the learner's page
        missing = {f: v for f, v in _order_values(order).items() if v and not getattr(learner, f)}
        for field, value in missing.items():
            setattr(learner, field, value)
        if missing:
            learner.save(update_fields=[*missing, "updated_at"])
    else:
        learner = find_learner(
            email=order.customer_email, phone=order.customer_phone, citizen_id=order.citizen_id
        )
        if learner is None:
            learner = Learner(**_order_values(order), owner=order.assigned_to)
            learner.save()
        else:
            missing = {f: v for f, v in _order_values(order).items() if v and not getattr(learner, f)}
            if missing:
                for field, value in missing.items():
                    setattr(learner, field, value)
                learner.save(update_fields=[*missing, "updated_at"])
    order.learner = learner
    copy_to_order(learner, order, only_empty=True)
    order.save()
    return learner


def copy_to_order(learner: Learner, order: Order, fields=None, *, only_empty=False) -> list[str]:
    """Set the registration's person fields from the learner; returns the order fields changed."""
    changed = []
    for lf in fields or PERSON_FIELDS:
        of = PERSON_FIELDS[lf]
        value = getattr(learner, lf)
        if only_empty and (getattr(order, of) or not value):
            continue
        if getattr(order, of) != value:
            setattr(order, of, value)
            changed.append(of)
    return changed


@transaction.atomic
def update_learner(learner: Learner, values: dict, *, skip: Order | None = None) -> None:
    """Change the learner's details and copy them to every registration of the person."""
    fields = [f for f in values if f in PERSON_FIELDS]
    for field in fields:
        setattr(learner, field, values[field])
    if fields:
        learner.save(update_fields=[*fields, "updated_at"])
    for order in learner.orders.exclude(pk=getattr(skip, "pk", None)):
        changed = copy_to_order(learner, order, fields)
        if changed:
            order.save(update_fields=[*changed, "updated_at"])


def sync_from_order(order: Order, order_fields) -> None:
    """Person fields edited on one registration (staff, enrolment file) become the learner's."""
    values = {ORDER_PERSON_FIELDS[f]: getattr(order, f) for f in order_fields if f in ORDER_PERSON_FIELDS}
    if not values:
        return
    learner = order.learner or attach_learner(order)
    update_learner(learner, values, skip=order)


def active_duplicates(order: Order):
    """Other active registrations of the same learner for the same course / program."""
    if not order.learner_id or not (order.course_id or order.program_id):
        return Order.objects.none()
    same = (
        Q(program_id=order.program_id)
        if order.program_id and not order.course_id
        else Q(course_id=order.course_id)
    )
    return (
        Order.objects.filter(learner_id=order.learner_id, parent__isnull=True)
        .filter(same)
        .filter(ACTIVE)
        .exclude(pk=order.pk)
    )


@transaction.atomic
def merge_learners(keep: Learner, other: Learner, request=None) -> Learner:
    """Two records of the same person: registrations move to `keep`, empty details are filled from `other`."""
    from apps.core.models import audit

    missing = {f: getattr(other, f) for f in PERSON_FIELDS if getattr(other, f) and not getattr(keep, f)}
    if missing:
        for field, value in missing.items():
            setattr(keep, field, value)
        keep.save(update_fields=[*missing, "updated_at"])
    if not keep.owner_id and other.owner_id:
        keep.owner_id = other.owner_id
        keep.save(update_fields=["owner", "updated_at"])
    moved = list(other.orders.all())
    for order in moved:
        order.learner = keep
        changed = copy_to_order(keep, order)
        order.save(update_fields=["learner", *changed, "updated_at"])
        Activity.objects.create(
            order=order,
            type="note",
            title=f"Gộp hồ sơ học viên {other.code} vào {keep.code}",
            actor=(request.user.name or request.user.email) if request else "Hệ thống",
            actor_user=request.user if request else None,
        )
    if request is not None:
        audit(request, "learner.merge", keep, merged=other.code, orders=len(moved))
    other.delete()
    return keep
