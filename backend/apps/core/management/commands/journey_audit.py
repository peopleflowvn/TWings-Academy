"""
Health of the learner journey (steps 1-6) on live data: counts only, no personal data.
Used by the ops task `journey-audit` to check what staff still have to set up.
"""

import json
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone


class Command(BaseCommand):
    help = "Print a JSON summary of journey steps 1-6 (setup gaps and service levels)."

    def handle(self, *args, **options):
        from apps.accounts.models import User
        from apps.catalog.models import Cohort, Course, CourseReview, Program
        from apps.catalog.publishing import readiness
        from apps.cms.models import PageViewDaily
        from apps.crm.assignment import overdue_leads
        from apps.crm.models import Appointment, InvoiceRequest, Order
        from apps.payments.models import Payment

        now, today = timezone.now(), timezone.localdate()
        since = now - timedelta(days=30)
        leads = Order.objects.filter(parent__isnull=True)
        courses = {}
        for course in Course.objects.all():
            missing = [i["key"] for i in readiness(course) if i["required"] and not i["ok"]]
            courses[course.slug] = {"status": course.status, "missing_required": missing}
        intakes = Cohort.objects.exclude(status="completed").annotate(
            n_sessions=Count("sessions"), seats=Count("orders", filter=Q(orders__learning_access=True))
        )
        report = {
            "step1_courses": courses,
            "step1_programs": list(Program.objects.values_list("slug", "is_published")),
            "step2_intakes": [
                {
                    "course": c.course.slug,
                    "name": c.name,
                    "status": c.status,
                    "start": c.start_date.isoformat() if c.start_date else None,
                    "deadline": c.registration_deadline.isoformat() if c.registration_deadline else None,
                    "sessions": c.n_sessions,
                    "paid": c.seats,
                    "capacity": c.capacity,
                    "early_bird": bool(c.early_bird_price),
                }
                for c in intakes.select_related("course")
            ],
            "step3": {
                "page_views_30d": sum(
                    PageViewDaily.objects.filter(date__gte=today - timedelta(days=29)).values_list(
                        "views", flat=True
                    )
                ),
                "leads_30d_with_attribution": leads.filter(created_at__gte=since)
                .exclude(attribution={})
                .count(),
                "leads_30d": leads.filter(created_at__gte=since).count(),
                "reviews": dict(
                    CourseReview.objects.values_list("status").annotate(n=Count("id")).order_by()
                ),
            },
            "step4": {
                "consultants_receiving_leads": User.objects.filter(
                    is_active=True, role="sales_crm", receives_leads=True
                ).count(),
                "open_leads_without_consultant": leads.filter(
                    status="pending",
                    assigned_to__isnull=True,
                    crm_status__in=["1. Mới", "2. Đã tiếp cận", "3. Đang tư vấn"],
                ).count(),
                "overdue_first_response": overdue_leads().count(),
                "appointments_upcoming": Appointment.objects.filter(
                    status="planned", starts_at__gte=now
                ).count(),
            },
            "step5": {
                "payments_30d": Payment.objects.filter(created_at__gte=since).count(),
                "invoice_requests_open": InvoiceRequest.objects.filter(status="requested").count(),
                "checkouts_30d_without_terms": leads.filter(
                    created_at__gte=since, payment_method="vietqr", terms_accepted_at__isnull=True
                ).count(),
            },
            "step6": {
                "learners_with_access": leads.filter(learning_access=True).count(),
                "dossiers_complete": leads.filter(
                    learning_access=True, dossier_submitted_at__isnull=False
                ).count(),
                "with_cv": leads.filter(learning_access=True, cv_link__startswith="private:").count(),
            },
        }
        self.stdout.write(json.dumps(report, ensure_ascii=False, indent=1, default=str))
