"""TWings e-mails around learning: course open (how to sign in) and course completed (certificate)."""

from django.conf import settings
from django.utils.html import escape

from apps.notifications.outbox import send_logged


def site_url() -> str:
    return f"https://{settings.MOODLE_HOST or 'twings.edu.vn'}"


def learn_url() -> str:
    return f"{site_url()}/learn/"


# The learner portal is /learn: Moodle (courses, grades) plus this TWings page (fees, installments,
# invoices, enrolment documents, certificates), linked from Moodle's navigation.
ACCOUNT_PATH = "/learn/tai-khoan"


def account_url() -> str:
    return f"{site_url()}{ACCOUNT_PATH}"


def class_details(cohort, *, with_start: bool = True, accent: str = "") -> str:
    """Start date, schedule, place and next sessions of an intake, as an info table ("" when none)."""
    from django.utils import timezone

    from apps.notifications.components import TWINGS, info_table

    if cohort is None:
        return ""
    rows = []
    if with_start and cohort.start_date:
        rows.append(("Khai giảng", f"{cohort.start_date:%d/%m/%Y}"))
    if cohort.schedule_text:
        rows.append(("Lịch học", escape(cohort.schedule_text)))
    if cohort.location:
        rows.append(("Địa điểm", escape(cohort.location)))
    sessions = cohort.sessions.filter(starts_at__gte=timezone.now())[:3]
    upcoming = "<br>".join(
        f"{timezone.localtime(s.starts_at):%H:%M %d/%m} – {escape(s.title or 'Buổi học')}" for s in sessions
    )
    if upcoming:
        rows.append(("Buổi học sắp tới", upcoming))
    return info_table(rows, accent or TWINGS)


def send_access_email(order, *, sent_by=None):
    from apps.notifications.engine import render_template

    subject, html = render_template(
        "lms_access",
        context={
            "customer_name": escape(order.customer_name),
            "course": escape(order.course.title if order.course else order.course_title),
            "intake": f" – {escape(order.cohort.name)}" if order.cohort_id else "",
            "url": learn_url(),
            "customer_email": escape(order.customer_email),
            "intake_block": class_details(order.cohort),
            "account_url": account_url(),
            "order_code": escape(order.order_code),
        },
    )
    return send_logged(
        to=order.customer_email,
        subject=subject,
        html=html,
        order=order,
        sent_by=sent_by,
        template_code="lms_access",
        name=order.customer_name,
    )


def send_corporate_access_email(enrollment, *, sent_by=None):
    """'Your class is open' for a learner listed by their company: no fees, no order, no admission file."""
    from apps.notifications.components import CORPORATE
    from apps.notifications.engine import render_template

    cohort = enrollment.target_cohort
    email = enrollment.learner_email
    subject, html = render_template(
        "corporate_lms_access",
        context={
            "learner_name": escape(enrollment.learner_name),
            "course_title": escape(enrollment.course_title),
            "cohort_name": escape(cohort.name),
            "url": learn_url(),
            "email": escape(email),
            "intake_block": class_details(cohort, accent=CORPORATE),
        },
        brand="corporate",
    )
    return send_logged(
        to=email,
        subject=subject,
        html=html,
        sent_by=sent_by,
        template_code="corporate_lms_access",
        name=enrollment.learner_name,
        brand="corporate",
    )


def send_certificate_email(enrollment, certificate):
    from apps.notifications.engine import render_template

    from .completion import certificate_url

    subject, html = render_template(
        "lms_certificate",
        context={
            "learner_name": escape(enrollment.learner_name),
            "course_title": escape(certificate.course_title),
            "cohort_name": escape(certificate.cohort_name or ""),
            # Old variable, for templates edited before {{#if}} existed.
            "cohort_suffix": f" – {escape(certificate.cohort_name)}" if certificate.cohort_name else "",
            "certificate_code": escape(certificate.code),
            "url": certificate_url(certificate.code),
        },
    )
    return send_logged(
        to=enrollment.learner_email,
        subject=subject,
        html=html,
        order=enrollment.order,
        template_code="lms_certificate",
        name=enrollment.learner_name,
    )
