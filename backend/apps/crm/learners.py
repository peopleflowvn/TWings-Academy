"""
Learners and their registrations.

A Learner is one person; each registration to a course or program is an Order linked to it (a person
can study any number of courses). Personal details (identity, addresses, education, emergency
contact, CV) exist on the Learner only. A registration keeps the contact typed for it (name, phone,
e-mail): SSO, journeys and payment e-mails use it, and the learner page shows both.

- A new registration (website, checkout, staff) is matched to a learner by e-mail, then phone, then
  CCCD; a new learner is created otherwise. What the form brings fills what the learner lacks.
- Staff editing the learner's name / phone / e-mail updates every registration of the person.
- A registration is a duplicate only when the same learner already has an active registration for the
  same course / program; a returning learner on another course is not one.
"""

import re

from django.db import transaction
from django.db.models import Q

from apps.core.crypto import blind_index

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
    else:
        learner = order.learner or find_learner(
            email=order.customer_email, phone=order.customer_phone, citizen_id=details.get("citizen_id", "")
        )
        if learner is None:
            learner = Learner(**contact, **details, owner=order.assigned_to)
            learner.full_name = learner.full_name or order.order_code
            learner.save()
        else:
            fill_missing(learner, {**contact, **details})
    if order.learner_id != learner.pk:
        order.learner = learner
        order.save(update_fields=["learner", "updated_at"])
    return learner


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


def dossier_missing(learner: Learner | None) -> list[str]:
    return (
        list(DOSSIER_REQUIRED)
        if learner is None
        else [f for f in DOSSIER_REQUIRED if not getattr(learner, f)]
    )


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
    other.delete()
    return keep
