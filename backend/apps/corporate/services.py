"""
Corporate training rules, shared by the staff API and (later) the Excel imports: one place decides how
a client, an employee record, a class, a listing or a plan version comes to exist or changes.
"""

from datetime import date

from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Cohort
from apps.crm.learners import fill_missing, find_learner
from apps.crm.models import Learner

from .models import (
    ClientUnit,
    CorporateClass,
    CorporateClient,
    CorporateEmployee,
    CorporateEnrollment,
    PlanLine,
    TrainingPlan,
)


class CorporateError(Exception):
    """A business rule refused the change; the message is shown to staff as is."""


# ---------------------------------------------------------------- clients
def create_client(**fields) -> CorporateClient:
    """A client always has at least one legal entity (employee codes are unique per legal entity)."""
    with transaction.atomic():
        client = CorporateClient.objects.create(**fields)
        ClientUnit.objects.create(client=client, kind="legal_entity", name=client.name)
    return client


def default_legal_entity(client: CorporateClient) -> ClientUnit:
    entity = client.units.filter(kind="legal_entity").order_by("created_at").first()
    if entity is None:
        entity = ClientUnit.objects.create(client=client, kind="legal_entity", name=client.name)
    return entity


# ---------------------------------------------------------------- people
EMPLOYMENT_FIELDS = ("legal_entity", "unit", "employee_code", "job_title", "manager_name", "manager_email")


def find_or_create_learner(*, full_name: str, email: str = "", phone: str = "") -> Learner:
    """The same person as everywhere in TWings (e-mail, then phone); empty details are filled in."""
    learner = find_learner(email=email, phone=phone)
    if learner is None:
        return Learner.objects.create(full_name=full_name, email=email.strip().lower(), phone=phone)
    fill_missing(learner, {"full_name": full_name, "email": email.strip().lower(), "phone": phone})
    return learner


def ensure_employee(
    client: CorporateClient, learner: Learner, *, on: date | None = None, **details
) -> CorporateEmployee:
    """
    The learner's current employment at the client, matching `details` (legal entity, unit, code,
    job title, line manager). A change closes the current row and opens a new one from `on`, so who
    the manager was at any date stays known. Fields not given keep their current value.
    """
    on = on or timezone.localdate()
    if details.get("legal_entity") is None:
        details.pop("legal_entity", None)  # never unset: employee codes are unique per legal entity
    current = CorporateEmployee.objects.filter(client=client, learner=learner, valid_to__isnull=True).first()
    if current is not None:
        changed = {k: v for k, v in details.items() if k in EMPLOYMENT_FIELDS and getattr(current, k) != v}
        if not changed:
            return current
        values = {k: getattr(current, k) for k in EMPLOYMENT_FIELDS} | changed
        values["extra_cc"] = current.extra_cc
        if current.valid_from >= on:  # changed again the same day: correct the row instead
            for k, v in changed.items():
                setattr(current, k, v)
            current.save()
            return current
        current.valid_to = on
        current.save(update_fields=["valid_to", "updated_at"])
    else:
        values = {k: v for k, v in details.items() if k in EMPLOYMENT_FIELDS}
        values.setdefault("legal_entity", default_legal_entity(client))
    return CorporateEmployee.objects.create(client=client, learner=learner, valid_from=on, **values)


def employment_on(client: CorporateClient, learner: Learner, day: date) -> CorporateEmployee | None:
    """The employment row valid on `day` (whose manager is CC'd for things sent that day)."""
    return (
        CorporateEmployee.objects.filter(client=client, learner=learner, valid_from__lte=day)
        .exclude(valid_to__lte=day)
        .order_by("-valid_from")
        .first()
    )


# ---------------------------------------------------------------- classes
def create_class(*, client: CorporateClient, course, name: str, cohort_fields: dict, **class_fields):
    """A corporate class: a private intake (Cohort, audience=corporate) plus its B2B side."""
    if Cohort.objects.filter(course=course, name=name).exists():
        raise CorporateError(f"Khóa học này đã có lớp / đợt tên “{name}”.")
    contract = class_fields.get("contract")
    if contract is not None and contract.client_id != client.pk:
        raise CorporateError("Hợp đồng không thuộc khách hàng này.")
    line = class_fields.get("plan_line")
    if line is not None and line.plan.client_id != client.pk:
        raise CorporateError("Dòng kế hoạch không thuộc khách hàng này.")
    with transaction.atomic():
        cohort = Cohort.objects.create(
            course=course, name=name, audience=Cohort.AUDIENCE_CORPORATE, status="upcoming", **cohort_fields
        )
        return CorporateClass.objects.create(cohort=cohort, client=client, **class_fields)


def list_learner(corporate_class: CorporateClass, learner: Learner, **employment) -> CorporateEnrollment:
    """
    Put a learner on the class list (Moodle access follows, see apps.lms.signals). Listing someone
    again after a cancellation reopens the same listing.
    """
    if corporate_class.status in ("closed", "cancelled"):
        raise CorporateError("Lớp đã chốt hồ sơ hoặc đã hủy: không thêm học viên.")
    employee = ensure_employee(corporate_class.client, learner, **employment)
    listing = CorporateEnrollment.objects.filter(corporate_class=corporate_class, learner=learner).first()
    if listing is None:
        return CorporateEnrollment.objects.create(
            corporate_class=corporate_class, learner=learner, employee=employee
        )
    if listing.status in ("cancelled", "transferred"):
        listing.status, listing.employee = "enrolled", employee
        listing.save(update_fields=["status", "employee", "updated_at"])
    return listing


def cancel_listing(listing: CorporateEnrollment, note: str = "") -> CorporateEnrollment:
    if listing.status in ("cancelled", "transferred"):
        return listing
    listing.status = "cancelled"
    if note:
        listing.note = f"{listing.note}\n{note}".strip()
    listing.save(update_fields=["status", "note", "updated_at"])
    return listing


def transfer_listing(listing: CorporateEnrollment, target: CorporateClass) -> CorporateEnrollment:
    """Move a learner to another class of the same client: the old listing stays as history."""
    if target.pk == listing.corporate_class_id:
        raise CorporateError("Học viên đã ở lớp này.")
    if target.client_id != listing.corporate_class.client_id:
        raise CorporateError("Chỉ chuyển sang lớp của cùng khách hàng.")
    if not listing.may_study:
        raise CorporateError("Học viên không còn trong danh sách lớp.")
    with transaction.atomic():
        new = list_learner(target, listing.learner)
        new.transferred_from = listing
        new.save(update_fields=["transferred_from", "updated_at"])
        listing.status = "transferred"
        listing.save(update_fields=["status", "updated_at"])
    return new


# ---------------------------------------------------------------- plans
def approve_plan(plan: TrainingPlan, user) -> TrainingPlan:
    if plan.status != "draft":
        raise CorporateError("Chỉ duyệt được kế hoạch đang soạn.")
    with transaction.atomic():
        plan.status, plan.approved_by, plan.approved_at = "approved", user, timezone.now()
        plan.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        if plan.previous_id:
            TrainingPlan.objects.filter(pk=plan.previous_id).update(status="superseded")
    return plan


def revise_plan(plan: TrainingPlan) -> TrainingPlan:
    """A new draft version of an approved plan, lines copied; classes stay linked to the old lines."""
    if plan.status != "approved":
        raise CorporateError("Chỉ tạo phiên bản mới từ kế hoạch đã duyệt.")
    if TrainingPlan.objects.filter(previous=plan).exists():
        raise CorporateError("Kế hoạch này đã có phiên bản mới.")
    with transaction.atomic():
        new = TrainingPlan.objects.create(
            client=plan.client,
            contract=plan.contract,
            name=plan.name,
            period=plan.period,
            version=plan.version + 1,
            previous=plan,
            note=plan.note,
        )
        PlanLine.objects.bulk_create(
            PlanLine(
                plan=new,
                **{
                    f.name: getattr(line, f.name)
                    for f in PlanLine._meta.concrete_fields
                    if f.name not in ("id", "plan", "created_at", "updated_at")
                },
            )
            for line in plan.lines.all()
        )
    return new


def plan_execution(plan) -> dict:
    """
    Plan vs actual, line by line: classes opened from the line (not cancelled), learners listed in
    them, accepted value and recorded costs (advances not counted until settled) against the planned
    classes, learners and budget.
    """
    from django.db.models import Count, Q, Sum

    from .allocations import class_costs
    from .models import AcceptanceLine

    rows = []
    for line in plan.lines.select_related("course", "unit"):
        classes = line.classes.exclude(status="cancelled")
        ids = list(classes.values_list("pk", flat=True))
        learners = (
            classes.aggregate(
                n=Count("enrollments", filter=Q(enrollments__status__in=CorporateEnrollment.STUDYING))
            )["n"]
            or 0
        )
        accepted = (
            AcceptanceLine.objects.filter(corporate_class__in=ids, batch__status="accepted").aggregate(
                v=Sum("amount")
            )["v"]
            or 0
        )
        costs = sum(class_costs(ids).values())  # own costs + shares of shared costs
        rows.append(
            {
                "line": line.pk,
                "title": line.title,
                "unit": line.unit.name if line.unit else "",
                "planned_classes": line.planned_classes,
                "classes": len(ids),
                "classes_done": classes.filter(status__in=("finished", "closed")).count(),
                "planned_learners": line.planned_learners,
                "learners": learners,
                "budget": line.budget,
                "accepted": accepted,
                "costs": costs,
                "budget_used": round(100 * costs / line.budget, 1) if line.budget else None,
            }
        )
    keys = ("planned_classes", "classes", "classes_done", "learners", "accepted", "costs")
    total = {k: sum(r[k] for r in rows) for k in keys}
    total["planned_learners"] = sum(r["planned_learners"] or 0 for r in rows)
    total["budget"] = sum(r["budget"] or 0 for r in rows)
    return {"rows": rows, "total": total}
