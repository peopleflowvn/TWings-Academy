"""Installments: a course's own split, and staff re-planning a registration's installments."""

from datetime import date, timedelta

import pytest

from apps.accounts.rbac import Role
from apps.crm.models import Order
from apps.crm.services import create_installments, installment_amounts
from apps.payments.services import _credit

pytestmark = pytest.mark.django_db


def test_a_course_split_is_kept_or_scaled():
    assert installment_amounts(10_000_000, 2, [6_000_000, 4_000_000]) == [6_000_000, 4_000_000]
    # A class price / coupon: same proportions, rounded to 1.000đ, the first one carries the rest.
    assert installment_amounts(9_000_000, 2, [6_000_000, 4_000_000]) == [5_400_000, 3_600_000]
    assert installment_amounts(10_000_000, 3, [6_000_000, 4_000_000]) == [3_334_000, 3_333_000, 3_333_000]


def test_course_plan_must_match_the_price(course, staff_client):
    admin = staff_client(Role.SUPER_ADMIN)
    url = f"/api/v1/staff/courses/{course.pk}/"
    bad = admin.patch(url, {"installmentCount": 2, "installmentAmounts": [1, 2]}, format="json")
    assert bad.status_code == 400 and "installmentAmounts" in bad.json()
    plan = [course.price - 1_000_000, 1_000_000]
    assert (
        admin.patch(url, {"installmentCount": 2, "installmentAmounts": plan}, format="json").status_code
        == 200
    )
    course.refresh_from_db()
    assert course.installment_amounts == plan


def _order(course):
    order = Order.objects.create(
        customer_name="A", course=course, amount=10_000_000, total_receivable=10_000_000, installment_count=2
    )
    create_installments(order, 30)
    return order


def test_staff_replan_a_registration(course, staff_client):
    order = _order(course)
    sales = staff_client(Role.SALES_CRM)
    url = f"/api/v1/staff/orders/{order.pk}/installments/"
    d = date.today()
    rows = [
        {"amount": 2_000_000, "dueDate": d.isoformat()},
        {"amount": 3_000_000, "dueDate": (d + timedelta(days=20)).isoformat()},
        {"amount": 5_000_000, "dueDate": (d + timedelta(days=60)).isoformat()},
    ]
    res = sales.put(url, {"installments": rows}, format="json")
    assert res.status_code == 200, res.content
    order.refresh_from_db()
    assert order.installment_count == 3 and [i.amount for i in order.installments.all()] == [2e6, 3e6, 5e6]
    assert res.json()["installments"][1]["amount"] == 3_000_000

    wrong_total = [{**rows[0], "amount": 1_000_000}, *rows[1:]]
    assert sales.put(url, {"installments": wrong_total}, format="json").status_code == 400
    unordered = [rows[1], rows[0], rows[2]]
    assert sales.put(url, {"installments": unordered}, format="json").status_code == 400

    _credit(order, 2_000_000, source="manual")  # first installment paid: the learner studies
    order.refresh_from_db()
    assert order.learning_access
    bigger_first = [{**rows[0], "amount": 4_000_000}, {**rows[1], "amount": 1_000_000}, rows[2]]
    res = sales.put(url, {"installments": bigger_first}, format="json")
    assert res.status_code == 400 and "kỳ 1" in res.json()["detail"]

    # In class: one payment would take the access away.
    one = [{"amount": 10_000_000, "dueDate": d.isoformat()}]
    assert sales.put(url, {"installments": one}, format="json").status_code == 400
    two = [{"amount": 2_000_000, "dueDate": d.isoformat()}, {**rows[2], "amount": 8_000_000}]
    assert sales.put(url, {"installments": two}, format="json").status_code == 200
    order.refresh_from_db()
    assert order.installment_count == 2 and order.learning_access
    assert staff_client(Role.CONTENT_SEO).put(url, {"installments": two}, format="json").status_code == 403

    # Not in class yet: a full payment instead of installments.
    other = _order(course)
    res = sales.put(f"/api/v1/staff/orders/{other.pk}/installments/", {"installments": one}, format="json")
    assert res.status_code == 200
    other.refresh_from_db()
    assert other.installment_count == 1 and not other.installments.exists()
