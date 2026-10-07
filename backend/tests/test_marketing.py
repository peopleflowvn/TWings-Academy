"""Journey step 3 – website & marketing: attribution, cookie-less funnel, verified learner reviews."""

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import CourseReview
from apps.cms.models import PageViewDaily
from apps.crm.models import AdmissionCampaign, Order
from apps.lms.models import LmsEnrollment
from tests.conftest import Role

pytestmark = pytest.mark.django_db

TOUCHES = {
    "first": {
        "source": "facebook",
        "medium": "cpc",
        "campaign": "camp-q4",
        "landing": "/khoa-hoc/x",
        "x": "drop",
    },
    "last": {"referrer": "https://l.facebook.com/", "ref": "HUONGNT22", "landing": "/"},
}


def test_registration_keeps_attribution_and_links_the_campaign(api, registration_payload):
    camp = AdmissionCampaign.objects.create(code="CAMP-Q4", name="Q4")
    payload = {
        **registration_payload,
        "attribution": {**TOUCHES, "last": {**TOUCHES["last"], "campaign": "camp-q4"}},
    }
    res = api.post("/api/v1/public/registrations/", payload, format="json")
    assert res.status_code == 201, res.content
    order = Order.objects.get()
    assert order.campaign == camp and order.campaign_code == "CAMP-Q4"
    assert order.source == "Website · Facebook" and order.referrer_staff_code == "HUONGNT22"
    assert order.attribution["first"]["source"] == "facebook" and "x" not in order.attribution["first"]


def test_unknown_campaign_code_is_kept_as_text(api, registration_payload):
    api.post(
        "/api/v1/public/registrations/",
        {**registration_payload, "attribution": {"last": {"source": "zalo", "campaign": "tet-2027"}}},
        format="json",
    )
    order = Order.objects.get()
    assert order.campaign is None and order.campaign_code == "tet-2027" and order.source.endswith("Zalo")


def test_page_views_are_counted_per_day_without_personal_data(api):
    for _ in range(3):
        assert (
            api.post(
                "/api/v1/public/track/", {"path": "/khoa-hoc/rm/", "source": "Facebook"}, format="json"
            ).status_code
            == 204
        )
    api.post(
        "/api/v1/public/track/", {"path": "/app/sales/crm", "source": "x"}, format="json"
    )  # not a public page
    api.post("/api/v1/public/track/", {"path": "/"}, format="json", HTTP_USER_AGENT="Googlebot/2.1")  # bot
    rows = list(PageViewDaily.objects.values_list("path", "source", "views"))
    assert rows == [("/khoa-hoc/rm", "facebook", 3)]


def test_marketing_funnel_in_reports(api, registration_payload, course, staff_client):
    api.post(
        "/api/v1/public/track/", {"path": f"/khoa-hoc/{course.slug}", "source": "facebook"}, format="json"
    )
    api.post(
        "/api/v1/public/track/", {"path": f"/khoa-hoc/{course.slug}", "source": "facebook"}, format="json"
    )
    api.post(
        "/api/v1/public/registrations/",
        {**registration_payload, "attribution": {"last": {"source": "facebook"}}},
        format="json",
    )
    data = staff_client(Role.SALES_CRM).get("/api/v1/staff/reports/").json()["marketing"]
    page = next(p for p in data["pages"] if p["path"] == f"/khoa-hoc/{course.slug}")
    assert (page["views"], page["leads"], page["leadRate"]) == (2, 1, 50.0)
    fb = next(c for c in data["channels"] if c["key"] == "facebook")
    assert (fb["label"], fb["views"], fb["leads"]) == ("Facebook", 2, 1)


def _learner(course, email="hv@example.com"):
    order = Order.objects.create(customer_name="Hà", customer_email=email, course=course, amount=1)
    order.status = "paid"
    order.save()
    LmsEnrollment.objects.create(order=order, status="done", progress=100)
    return order


def _signed_in(email, monkeypatch):
    client = APIClient(enforce_csrf_checks=True)
    sent = {}
    monkeypatch.setattr("apps.sso.account._send_code", lambda e, code: sent.update(code=code))
    token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
    client.post("/api/v1/public/account/send-code/", {"email": email}, format="json", HTTP_X_CSRFTOKEN=token)
    client.post(
        "/api/v1/public/account/verify/",
        {"email": email, "code": sent["code"]},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    return client, token


def test_learner_review_is_published_only_after_approval(api, course, staff_client, monkeypatch):
    from django.core.cache import cache

    cache.clear()
    order = _learner(course)
    client, token = _signed_in("hv@example.com", monkeypatch)
    body = {
        "orderCode": order.order_code,
        "rating": 5,
        "comment": "Giảng viên thực chiến, bài tập sát công việc ngân hàng.",
        "displayName": "Hà N.",
        "role": "Chuyên viên QHKH",
        "consent": True,
    }
    res = client.post("/api/v1/public/account/reviews/", body, format="json", HTTP_X_CSRFTOKEN=token)
    assert res.status_code == 200, res.content
    assert res.json()["review"]["status"] == "pending"
    public = api.get(f"/api/v1/public/courses/{course.slug}/").json()
    assert all(not r.get("verifiedStudent") for r in public["reviews"])

    review = CourseReview.objects.get()
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    assert (
        staff.patch(f"/api/v1/staff/reviews/{review.pk}/", {"status": "approved"}, format="json").status_code
        == 200
    )
    public = api.get(f"/api/v1/public/courses/{course.slug}/").json()["reviews"][0]
    assert public["studentName"] == "Hà N." and public["verifiedStudent"] and public["rating"] == 5
    assert "email" not in str(public).lower()

    no_consent = {**body, "consent": False}
    res = client.post("/api/v1/public/account/reviews/", no_consent, format="json", HTTP_X_CSRFTOKEN=token)
    assert res.status_code == 400


def test_only_learners_of_the_course_can_review(course, monkeypatch):
    from django.core.cache import cache

    cache.clear()
    unpaid = Order.objects.create(customer_name="B", customer_email="b@example.com", course=course, amount=1)
    client, token = _signed_in("b@example.com", monkeypatch)
    res = client.post(
        "/api/v1/public/account/reviews/",
        {
            "orderCode": unpaid.order_code,
            "rating": 1,
            "comment": "x" * 30,
            "displayName": "B",
            "consent": True,
        },
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 403


def test_home_page_reviews_are_approved_learner_reviews_only(api, course):
    def review(email, status, comment):
        order = _learner(course, email)
        return CourseReview.objects.create(
            course=course, order=order, display_name="Hà N.", rating=5, comment=comment, status=status
        )

    review("a@example.com", "approved", "Bài tập sát thực tế.")
    review("b@example.com", "pending", "Chưa duyệt.")
    review("c@example.com", "rejected", "Không đăng.")

    rows = api.get("/api/v1/public/reviews/").json()
    assert [r["comment"] for r in rows] == ["Bài tập sát thực tế."]
    assert rows[0]["courseSlug"] == course.slug and rows[0]["displayName"] == "Hà N."
    assert "email" not in str(rows).lower() and "order" not in str(rows).lower()

    course.status = "draft"  # unpublished course: its reviews leave the home page too
    course.save()
    assert api.get("/api/v1/public/reviews/").json() == []
