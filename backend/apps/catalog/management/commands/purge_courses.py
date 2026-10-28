"""
Delete courses for good (demo / test courses), with everything that only existed for them: their
classes, the orders and leads on them (payments, installments, LMS enrolments, reviews …), the
learners left with no registration, and the instructors / partners no other course uses. Hero
banners can be removed in the same run.

    manage.py purge_courses --course <slug> [--course …] [--banner <id> …]           # preview
    manage.py purge_courses --course <slug> … --apply                                # delete

The preview runs the very same deletion inside a transaction and rolls it back, so it shows exactly
what --apply removes. Orders with payments, refunds or certificates are refused unless
--with-payments is given (money records are deleted only on purpose). Moodle is not touched.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import ProtectedError

from apps.catalog.models import Cohort, Course, Instructor, Partner, ProgramCourse


class _Preview(Exception):
    pass


class Command(BaseCommand):
    help = "Delete demo / test courses and what only existed for them (preview unless --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--course", action="append", default=[], help="slug of a course to delete")
        parser.add_argument("--banner", action="append", default=[], help="id of a hero banner to delete")
        parser.add_argument("--apply", action="store_true", help="delete (default: preview, nothing changes)")
        parser.add_argument("--with-payments", action="store_true", help="also delete orders with payments")

    def handle(self, *args, **opts):
        try:
            with transaction.atomic():
                self.purge(opts)
                if not opts["apply"]:
                    raise _Preview
        except _Preview:
            self.stdout.write(self.style.WARNING("PREVIEW: nothing was deleted (add --apply to delete)."))
            return
        self.stdout.write(self.style.SUCCESS("Deleted."))

    def purge(self, opts):
        from apps.cms.models import HeroBanner
        from apps.crm.models import Learner, Order

        out = self.stdout.write
        courses = list(Course.objects.filter(slug__in=opts["course"]))
        missing = set(opts["course"]) - {c.slug for c in courses}
        if missing:
            raise CommandError(f"Unknown course(s): {', '.join(sorted(missing))}")
        if not courses and not opts["banner"]:
            raise CommandError("Nothing to delete: give --course and/or --banner.")
        in_programs = ProgramCourse.objects.filter(course__in=courses).select_related("program", "course")
        if in_programs:
            raise CommandError(
                "Part of a program, remove it from the program first: "
                + ", ".join(f"{p.course.slug} in {p.program.slug}" for p in in_programs)
            )

        instructors = set(Instructor.objects.filter(courses__in=courses).values_list("pk", flat=True))
        partners = {c.partner_id for c in courses if c.partner_id}
        cohorts = Cohort.objects.filter(course__in=courses)
        orders = Order.objects.filter(course__in=courses) | Order.objects.filter(cohort__in=cohorts)
        orders = orders.distinct().select_related("course", "learner")
        learners = {o.learner_id for o in orders if o.learner_id}

        for c in courses:
            out(f"course {c.slug} | {c.title[:60]} | {c.status}")
        for k in cohorts.select_related("course"):
            out(f"  class {k.course.slug} | {k.name[:50]} | {k.status} | start {k.start_date}")
        money = []
        for o in orders:
            paid = o.payments.count() + o.refunds.count()
            certs = sum(1 for e in [getattr(o, "lms_enrollment", None)] if e and hasattr(e, "certificate"))
            out(
                f"  order {o.order_code} | {o.course.slug if o.course else '-'} | {o.customer_name[:30]} | "
                f"{o.status} / {o.crm_status} | access {o.learning_access} | paid {o.total_paid_amount}"
                f" | payments/refunds {paid}"
                f" | certificate {certs}"
            )
            if paid or certs:
                money.append(o.order_code)
        if money and not opts["with_payments"]:
            raise CommandError(
                f"Orders with payments / certificates: {', '.join(money)}. Re-run with --with-payments."
            )

        from apps.lms.models import Certificate
        from apps.payments.models import Payment, Refund

        Certificate.objects.filter(enrollment__order__in=orders).delete()
        Refund.objects.filter(order__in=orders).delete()
        Payment.objects.filter(order__in=orders).delete()
        n_orders = Order.objects.filter(pk__in=[o.pk for o in orders]).delete()[1]
        Cohort.objects.filter(next_cohort__in=cohorts).update(next_cohort=None)
        n_classes = cohorts.delete()[1]
        n_courses = Course.objects.filter(pk__in=[c.pk for c in courses]).delete()[1]
        out(f"deleted: orders {n_orders}, classes {n_classes}, courses {n_courses}")

        # Left behind with nothing: the people registered only on these courses, their teachers and partners.
        gone = []
        leads = lambda x: Cohort.objects.filter(lead_instructor=x).exists()  # noqa: E731
        for model, pks, still_used in (
            (Learner, learners, lambda x: x.orders.exists()),
            (Instructor, instructors, lambda x: x.courses.exists() or leads(x)),
            (Partner, partners, lambda x: x.courses.exists()),
        ):
            for obj in model.objects.filter(pk__in=pks):
                if still_used(obj):
                    continue
                try:
                    with transaction.atomic():
                        obj.delete()
                    gone.append(f"{model.__name__} {obj}")
                except ProtectedError:
                    out(f"  kept {model.__name__} {obj}: still used elsewhere")
        for line in gone:
            out(f"  deleted {line}")

        for pk in opts["banner"]:
            banner = HeroBanner.objects.filter(pk=pk).first()
            if banner is None:
                raise CommandError(f"Unknown banner: {pk}")
            out(f"banner {pk} | {banner.title} | deleted")
            banner.delete()
