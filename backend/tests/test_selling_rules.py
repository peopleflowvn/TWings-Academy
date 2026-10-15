"""Selling rules: computed social proof, honest list price, intake seats with checkout holds, coupons."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.models import Cohort, Coupon, CourseReview
from apps.crm.models import FollowupTask, Order
from apps.payments.management.commands.expire_checkouts import expire_checkouts
from tests.test_commerce import _checkout, _fresh_rate_limits, _transfer, fake_moodle  # noqa: F401

pytestmark = pytest.mark.django_db


def _public(api, course):
    return api.get(f"/api/v1/public/courses/{course.slug}/").json()


def _paid_learner(course, email):
    order = Order.objects.create(customer_name="Hà", customer_email=email, course=course, amount=1)
    Order.objects.filter(pk=order.pk).update(status="paid", learning_access=True)
    return order


def test_rating_and_learner_count_come_from_real_learners(api, course):
    body = _public(api, course)
    assert body["rating"] is None or body["rating"] == 0
    assert body["reviewsCount"] == 0 and body["learnersCount"] == 0

    for i, (stars, status) in enumerate([(5, "approved"), (4, "approved"), (1, "pending")]):
        order = _paid_learner(course, f"hv{i}@example.com")
        CourseReview.objects.create(
            course=course, order=order, display_name="HV", rating=stars, comment="ok", status=status
        )
    body = _public(api, course)
    assert body["rating"] == 4.5 and body["reviewsCount"] == 2  # pending review not counted
    assert body["learnersCount"] == 3


def test_struck_through_price_only_during_a_dated_promotion(api, course):
    # The fixture's 12,000,000 "original" price has no end date: no fake discount on the page.
    assert _public(api, course)["originalPrice"] == course.price
    course.sale_ends_on = timezone.localdate() + timedelta(days=3)
    course.save()
    assert _public(api, course)["originalPrice"] == 12_000_000
    course.sale_ends_on = timezone.localdate() - timedelta(days=1)
    course.save()
    assert _public(api, course)["originalPrice"] == course.price


def test_promotion_over_half_off_is_refused(staff_client, course):
    from tests.conftest import Role

    staff = staff_client(Role.SUPER_ADMIN)
    res = staff.patch(
        f"/api/v1/staff/courses/{course.pk}/",
        {"originalPrice": 20_000_000, "saleEndsOn": (timezone.localdate() + timedelta(days=5)).isoformat()},
        format="json",
    )
    assert res.status_code == 400, res.content


def test_announced_intake_takes_registrations(api, registration_payload, course):
    upcoming = Cohort.objects.create(course=course, name="K11", status="upcoming")
    _, order = _checkout(api, registration_payload)
    assert order.cohort == upcoming


def test_unpaid_holds_take_seats_until_they_expire(api, registration_payload, course):
    first = Cohort.objects.create(course=course, name="K1", status="opening", capacity=1)
    second = Cohort.objects.create(course=course, name="K2", status="opening", capacity=5)
    _, held = _checkout(api, registration_payload)
    assert held.cohort == first and held.hold_expires_at is not None
    _, other = _checkout(
        api, {**registration_payload, "customerEmail": "b@example.com", "customerPhone": "0912345679"}
    )
    assert other.cohort == second  # K1's only seat is held

    Order.objects.filter(pk=held.pk).update(hold_expires_at=timezone.now() - timedelta(minutes=1))
    assert expire_checkouts() == 1
    held.refresh_from_db()
    assert held.status == "cancelled" and held.hold_expires_at is None
    assert FollowupTask.objects.filter(order=held).exists()
    _, again = _checkout(
        api, {**registration_payload, "customerEmail": "c@example.com", "customerPhone": "0912345670"}
    )
    assert again.cohort == first  # the seat came back


def test_checkout_refused_when_no_intake_takes_registrations(api, registration_payload, course):
    Cohort.objects.create(course=course, name="K1", status="closed")
    res = api.post("/api/v1/public/checkout/", registration_payload, format="json")
    assert res.status_code == 400
    assert Order.objects.count() == 0


def test_coupon_counted_on_payment_and_limited_by_open_holds(api, registration_payload, fake_moodle):  # noqa: F811
    coupon = Coupon.objects.create(code="ONE", discount_percent=10, max_usage=1)
    body, order = _checkout(api, registration_payload, couponCode="one")
    coupon.refresh_from_db()
    assert coupon.usage_count == 0
    # the single use is held by the open checkout
    res = api.post(
        "/api/v1/public/checkout/",
        {**registration_payload, "customerEmail": "b@example.com", "couponCode": "ONE"},
        format="json",
    )
    assert res.status_code == 400

    _transfer(api, order, body["amount"], "TXN-ONE")
    coupon.refresh_from_db()
    assert order.learning_access and order.hold_expires_at is None and coupon.usage_count == 1


def test_seo_links_follow_the_public_domain_reached(client, course, settings):
    settings.ALLOWED_HOSTS = ["testserver", "thu.twings.edu.vn"]
    xml = client.get("/sitemap.xml", HTTP_HOST="thu.twings.edu.vn", secure=True).content.decode()
    assert f"https://thu.twings.edu.vn/khoa-hoc/{course.slug}" in xml
    # internal callers (container name, loopback) get the configured site address
    xml = client.get("/sitemap.xml").content.decode()
    assert "https://tuyensinh.twings.edu.vn/" in xml and "testserver" not in xml
