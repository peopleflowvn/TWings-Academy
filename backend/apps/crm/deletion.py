"""
Deleting for good (super admin): a course, a class, a lead in the pipeline, a learner.

Other staff keep the safe rules of each screen (a course with registrations is taken off sale, a lead
with payments stays). The super admin may delete anyway, with what only existed for it:

- a lead: its payments, refunds, certificate and LMS enrolment record (its course components too);
- a learner: the person and every registration (as for a lead);
- a class: the class; its registrations stay on the course, without a class;
- a course: the course, its classes and its place in programs; its registrations stay, under the
  course name they keep.

Corporate data (contracts, corporate classes and employees) is never deleted this way: a delete that
would touch it is refused with the reason (core.exceptions turns ProtectedError into a 400). Moodle
courses and accounts are left as they are.
"""

from django.db import transaction
from django.db.models import Q

from apps.accounts.rbac import Role


def is_super_admin(user) -> bool:
    return bool(user and user.is_authenticated and (user.is_superuser or user.role == Role.SUPER_ADMIN))


@transaction.atomic
def delete_orders(orders) -> int:
    """Leads / registrations with their money records; returns the number of registrations deleted."""
    from apps.lms.models import Certificate
    from apps.payments.models import Payment, Refund

    from .models import Order

    ids = list(orders.values_list("pk", flat=True))
    every = Order.objects.filter(Q(pk__in=ids) | Q(parent__in=ids))
    Certificate.objects.filter(enrollment__order__in=every).delete()
    Refund.objects.filter(order__in=every).delete()
    Payment.objects.filter(order__in=every).delete()
    deleted = every.count()
    every.delete()
    return deleted


@transaction.atomic
def delete_learner(learner) -> int:
    """The person and all their registrations; returns the number of registrations deleted."""
    n = delete_orders(learner.orders.all())
    learner.delete()
    return n


@transaction.atomic
def delete_cohort(cohort) -> int:
    """The class; its registrations stay on the course. Returns how many registrations it had."""
    from apps.catalog.models import Cohort

    n = cohort.orders.count()
    Cohort.objects.filter(next_cohort=cohort).update(next_cohort=None)
    cohort.delete()
    return n


@transaction.atomic
def delete_course(course) -> dict:
    """The course, its classes and its place in programs; registrations stay (course name kept)."""
    from apps.catalog.models import Cohort, ProgramCourse

    classes = Cohort.objects.filter(course=course)
    Cohort.objects.filter(next_cohort__in=classes).update(next_cohort=None)
    summary = {"classes": classes.count(), "registrations": course.orders.count()}
    ProgramCourse.objects.filter(course=course).delete()
    classes.delete()
    course.delete()
    return summary
