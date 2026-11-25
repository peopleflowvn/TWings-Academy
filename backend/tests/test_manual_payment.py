"""
Money received outside the bank webhook (cash, card, a transfer with a wrong memo) is recorded by hand by
the consultant or finance: any amount up to the balance, so a part payment (deposit) is fine.
"""

import pytest

from apps.accounts.rbac import Role
from apps.crm.models import Order
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
