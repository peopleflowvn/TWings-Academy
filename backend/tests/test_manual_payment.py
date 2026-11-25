"""
Money received outside the bank webhook (cash, card, a transfer with a wrong memo) is recorded by hand by
the consultant or finance: any amount up to the balance, so a part payment (deposit) is fine.
"""

import pytest

from apps.accounts.rbac import Role
from apps.crm import stages
from apps.crm.models import Order
from apps.crm.services import create_installments
from apps.payments.models import Payment

pytestmark = pytest.mark.django_db


def _url(order):
    return f"/api/v1/staff/orders/{order.pk}/confirm-payment/"


@pytest.fixture
def order(course):
    return Order.objects.create(
        customer_name="Hà", course=course, customer_email="ha@example.com", amount=8_000_000
    )


def test_consultant_records_a_part_payment_then_the_rest(order, staff_client):
    sales = staff_client(Role.SALES_CRM)
    res = sales.post(_url(order), {"amount": 3_000_000, "method": "cash", "note": "PT-01 cọc"}, format="json")
    assert res.status_code == 201, res.content
    order.refresh_from_db()
    assert order.total_paid_amount == 3_000_000 and order.status == "pending"
    payment = Payment.objects.get(order=order)
    assert payment.source == "manual" and payment.note == "Tiền mặt – PT-01 cọc"
    assert payment.confirmed_by.role == Role.SALES_CRM

    billing = sales.get(f"/api/v1/staff/orders/{order.pk}/billing/").json()
    assert billing["balance"] == 5_000_000 and billing["payments"][0]["by"]

    too_much = sales.post(_url(order), {"amount": 5_000_001, "method": "transfer"}, format="json")
    assert too_much.status_code == 400 and "5.000.000" in too_much.json()["detail"]
    assert (
        sales.post(_url(order), {"amount": 5_000_000, "method": "transfer"}, format="json").status_code == 201
    )
    order.refresh_from_db()
    assert order.status == "paid" and order.total_paid_amount == 8_000_000
    done = sales.post(_url(order), {"amount": 1, "method": "cash"}, format="json")
    assert done.status_code == 400 and "đủ" in done.json()["detail"]


def test_who_may_record_and_on_which_orders(order, staff_client):
    body = {"amount": 1_000_000, "method": "cash"}
    assert staff_client(Role.FINANCE_ACCOUNTANT).post(_url(order), body, format="json").status_code == 201
    assert staff_client(Role.SUPER_ADMIN).post(_url(order), body, format="json").status_code == 201
    assert staff_client(Role.CONTENT_SEO).post(_url(order), body, format="json").status_code == 403

    order.status = "cancelled"
    order.save(update_fields=["status"])
    res = staff_client(Role.SALES_CRM).post(_url(order), body, format="json")
    assert res.status_code == 400 and "hủy" in res.json()["detail"]
    assert staff_client(Role.SALES_CRM).post(_url(order), {"amount": 0}, format="json").status_code == 400


# --------------------------------------------------------------- super admin: several stages at once
def _fast(client, order, **body):
    data = {"method": "cash", "note": "PT-09", **body}
    data.setdefault("amount_confirm", data.get("amount"))
    return client.post(f"/api/v1/staff/orders/{order.pk}/fast-track/", data, format="json")


def test_only_the_super_admin_fast_tracks(order, staff_client):
    for role in (Role.SALES_CRM, Role.FINANCE_ACCOUNTANT):
        assert _fast(staff_client(role), order, stage="paid", amount=8_000_000).status_code == 403
    assert not Payment.objects.exists()


def test_fast_track_checks_the_tuition(order, staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    mistyped = _fast(admin, order, stage="paid", amount=8_000_000, amount_confirm=800_000)
    assert mistyped.status_code == 400 and "amountConfirm" in mistyped.json()
    # A note is required.
    assert _fast(admin, order, stage="paid", amount=8_000_000, note="").status_code == 400
    short = _fast(admin, order, stage="paid", amount=7_000_000)
    assert short.status_code == 400 and "8.000.000" in short.json()["detail"]
    # Not paid in installments: a part payment does not open the course.
    part = _fast(admin, order, stage="part_paid", amount=3_000_000)
    assert part.status_code == 400 and "8.000.000" in part.json()["detail"]
    assert not Payment.objects.exists()

    order.crm_status, order.status = stages.MISTAKEN, "cancelled"  # closed: reopened by the fast track
    order.save(update_fields=["crm_status", "status"])
    res = _fast(admin, order, stage="onboard", amount=8_000_000)
    assert res.status_code == 201, res.content
    order.refresh_from_db()
    assert order.crm_status == stages.ONBOARD and order.status == "paid" and order.learning_access
    assert Payment.objects.get(order=order).note == "Tiền mặt – PT-09"
    assert order.timeline_activities.filter(title__contains="chuyển nhanh").exists()
    assert _fast(admin, order, stage="paid", amount=1).status_code == 400  # nothing left to pay


def test_fast_track_an_installment_order_to_part_paid(course, staff_client):
    order = Order.objects.create(
        customer_name="A", course=course, amount=10_000_000, total_receivable=10_000_000, installment_count=2
    )
    create_installments(order, 30)
    first = order.installments.get(sequence=1).amount
    admin = staff_client(Role.SUPER_ADMIN)
    assert _fast(admin, order, stage="part_paid", amount=first - 1).status_code == 400
    assert _fast(admin, order, stage="part_paid", amount=first).status_code == 201
    order.refresh_from_db()
    assert order.crm_status == stages.PART_PAID and order.learning_access
