"""Phase 4: automated journey e-mails and management reports."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.models import Cohort
from apps.crm import journeys
from apps.crm.models import Order
from apps.lms.models import Certificate, LmsEnrollment
from apps.notifications.models import EmailLog
from apps.payments.models import Payment, Refund
from tests.conftest import Role

pytestmark = pytest.mark.django_db


def _order(course, **extra):
    data = {
        "customer_name": "Trần Thị B",
        "customer_email": "b@example.com",
        "course": course,
        "amount": 1000,
    }
    data.update(extra)
    return Order.objects.create(**data)


def _age(order, days):
    Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(days=days))


def _sent(key):
    return EmailLog.objects.filter(template_code=journeys.template_code(key))


def test_abandoned_checkout_is_sent_once_with_the_qr(course):
    order = _order(course, total_receivable=1000)
    fresh = _order(course, total_receivable=1000, customer_email="new@example.com")
    _age(order, 2)
    assert journeys.run(["abandoned_checkout"]) == {"abandoned_checkout": {"sent": 1, "failed": 0}}
    log = _sent("abandoned_checkout").get()
    assert (
        log.order == order and order.order_code in log.rendered_html and "img.vietqr.io" in log.rendered_html
    )
    assert journeys.run(["abandoned_checkout"])["abandoned_checkout"]["sent"] == 0  # never twice
    assert not _sent("abandoned_checkout").filter(order=fresh).exists()  # too recent


def test_paid_orders_get_no_payment_reminder(course):
    order = _order(course, total_receivable=1000)
    order.status = "paid"
    order.save()
    _age(order, 2)
    assert journeys.run(["abandoned_checkout"])["abandoned_checkout"]["sent"] == 0


def test_intake_starting_and_not_started(course):
    soon = Cohort.objects.create(
        course=course, name="Khóa 12", status="opening", start_date=timezone.localdate() + timedelta(days=2)
    )
    started = Cohort.objects.create(
        course=course,
        name="Khóa 11",
        status="in_progress",
        start_date=timezone.localdate() - timedelta(days=10),
    )
    a = _order(course, cohort=soon, customer_email="a@example.com")
    b = _order(course, cohort=started, customer_email="c@example.com")
    for order in (a, b):
        LmsEnrollment.objects.create(
            order=order, status="done", progress=0, enrolled_at=timezone.now() - timedelta(days=8)
        )
    result = journeys.run(["intake_starting", "not_started"])
    assert result == {"intake_starting": {"sent": 1, "failed": 0}, "not_started": {"sent": 1, "failed": 0}}
    assert _sent("intake_starting").get().order == a  # starts in 2 days
    assert _sent("not_started").get().order == b  # a's intake has not started: no nudge yet


def test_completed_next_links_certificate_and_suggests(course):
    order = _order(course, status="paid")
    enrollment = LmsEnrollment.objects.create(
        order=order, status="done", progress=100, completed_at=timezone.now() - timedelta(days=3)
    )
    cert = Certificate.objects.create(
        enrollment=enrollment, learner_name="B", course_title=course.title, issued_at=timezone.now()
    )
    journeys.run(["completed_next"])
    assert cert.code in _sent("completed_next").get().rendered_html


def test_switched_off_journey_sends_nothing_and_api_toggles(course, staff_client):
    order = _order(course, total_receivable=1000)
    _age(order, 2)
    sales = staff_client(Role.SALES_CRM)
    res = sales.patch(
        "/api/v1/staff/journeys/", {"key": "abandoned_checkout", "enabled": False}, format="json"
    )
    assert res.status_code == 200
    assert next(j for j in res.json() if j["key"] == "abandoned_checkout")["enabled"] is False
    assert journeys.run(["abandoned_checkout"]) == {"abandoned_checkout": "off"}
    rows = sales.get("/api/v1/staff/journeys/").json()
    assert {r["key"] for r in rows} == set(journeys.JOURNEYS)
    assert staff_client(Role.CONTENT_SEO).get("/api/v1/staff/journeys/").status_code == 403
    finance = staff_client(Role.FINANCE_ACCOUNTANT)  # can view leads but not edit the pipeline
    assert finance.post("/api/v1/staff/journeys/").status_code == 403


def test_reports_sections_follow_permissions(course, staff_client):
    order = _order(course, total_receivable=1000, source="Facebook")
    Payment.objects.create(order=order, amount=1000, source="manual")
    order.recompute_payment_totals()
    order.save()
    Refund.objects.create(order=order, amount=200, reason="x")
    LmsEnrollment.objects.create(order=order, status="done", progress=100, completed_at=timezone.now())

    admin = staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/reports/?months=3").json()
    month = timezone.localdate().strftime("%Y-%m")
    assert admin["months"][-1] == month and len(admin["months"]) == 3
    assert admin["finance"]["monthly"][-1] == {"month": month, "revenue": 1000, "refunds": 200, "net": 800}
    assert admin["sales"]["sources"][0] == {"source": "Facebook", "leads": 1, "converted": 1}
    assert admin["sales"]["items"][0]["title"] == course.title
    row = admin["learning"]["courses"][0]
    assert row["enrolled"] == 1 and row["completionRate"] == 100

    sales = staff_client(Role.SALES_CRM).get("/api/v1/staff/reports/").json()
    assert "finance" not in sales and "sales" in sales
    assert staff_client(Role.CONTENT_SEO).get("/api/v1/staff/reports/").status_code == 403
