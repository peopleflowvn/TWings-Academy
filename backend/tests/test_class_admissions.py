"""One class = one admission campaign: web page, code, quota (capacity), staff rights, the data move."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.models import Cohort
from apps.crm.models import Order
from tests.conftest import Role

pytestmark = pytest.mark.django_db


def _class(course, **extra):
    fields = {
        "name": "Khóa 10 Đà Nẵng",
        "status": "opening",
        "capacity": 20,
        "code": "camp-web",
        "is_published": True,
        "registration_deadline": timezone.localdate() + timedelta(days=5),
    }
    return Cohort.objects.create(course=course, **{**fields, **extra})


def test_a_class_is_posted_on_the_website_like_a_job(api, course):
    k10 = _class(course)
    assert k10.code == "CAMP-WEB" and k10.slug == "rm-doanh-nghiep-khoa-10-da-nang"
    listed = api.get("/api/v1/public/campaigns/").json()
    assert [c["slug"] for c in listed] == [k10.slug]
    assert listed[0]["placesLeft"] == 20 and listed[0]["name"] == f"{course.title} · {k10.name}"
    detail = api.get(f"/api/v1/public/campaigns/{k10.slug}/").json()
    assert (
        detail["courses"][0]["title"] == course.title
        and detail["courses"][0]["nextIntake"]["name"] == k10.name
    )
    k10.refresh_from_db()
    assert k10.view_count == 1
    page = api.get(f"/_seo/tuyen-sinh/{k10.slug}").content.decode()
    assert k10.display_name in page
    assert f"/tuyen-sinh/{k10.slug}</loc>" in api.get("/sitemap.xml").content.decode()

    learner = Order.objects.create(customer_name="A", course=course, cohort=k10)
    Order.objects.filter(pk=learner.pk).update(learning_access=True)  # save() derives it from payments
    assert api.get("/api/v1/public/campaigns/").json()[0]["placesLeft"] == 19  # the capacity is the quota
    k10.show_quota = False
    k10.save()
    assert "placesLeft" not in api.get("/api/v1/public/campaigns/").json()[0]

    Cohort.objects.filter(pk=k10.pk).update(registration_deadline=timezone.localdate() - timedelta(days=1))
    assert api.get("/api/v1/public/campaigns/").json() == []  # past its deadline: off the same day
    k10.refresh_from_db()
    assert k10.website_state()[0] == "off"

    k10.registration_deadline, k10.status = None, "closed"  # a class not taking registrations comes off
    k10.save()
    k10.refresh_from_db()
    assert not k10.is_published
    assert api.get(f"/api/v1/public/campaigns/{k10.slug}/").status_code == 404


def test_registering_with_the_code_joins_that_class(api, course, registration_payload):
    Cohort.objects.create(course=course, name="K9", status="opening")
    k10 = _class(course, is_published=False)
    res = api.post(
        "/api/v1/public/registrations/", {**registration_payload, "campaignCode": "camp-web"}, format="json"
    )
    assert res.status_code == 201, res.content
    order = Order.objects.get(order_code=res.json()["registrationCode"])
    assert order.cohort == k10 and order.campaign_code == "CAMP-WEB"


def test_admissions_staff_edit_the_recruiting_part_only(staff_client, course):
    k10 = _class(course, is_published=False)
    sales = staff_client(Role.SALES_CRM)
    url = f"/api/v1/staff/cohorts/{k10.pk}/"
    res = sales.patch(url, {"isPublished": True, "summary": "Học xong đi làm MSB"}, format="json")
    assert res.status_code == 200, res.content
    assert sales.patch(url, {"capacity": 99}, format="json").status_code == 403
    assert (
        sales.post("/api/v1/staff/cohorts/", {"courseId": course.pk, "name": "X"}, format="json").status_code
        == 403
    )
    other = Cohort.objects.create(course=course, name="K11", status="upcoming")
    dup = staff_client(Role.SUPER_ADMIN).patch(
        f"/api/v1/staff/cohorts/{other.pk}/", {"code": "camp-web"}, format="json"
    )
    assert dup.status_code == 400 and "code" in dup.json()


def test_a_class_of_a_course_off_sale_is_not_on_the_website(api, staff_client, course):
    k10 = _class(course)
    course.status = "draft"
    course.save()
    k10.refresh_from_db()
    state, label = k10.website_state()
    assert state == "off" and "khóa học" in label  # staff see why, not "Đang hiện trên website"
    assert api.get("/api/v1/public/campaigns/").json() == []
    assert f"/tuyen-sinh/{k10.slug}" not in api.get("/sitemap.xml").content.decode()
    row = staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/intakes/").json()["intakes"][0]
    assert row["courseStatus"] == "draft" and row["websiteState"] == "off"


def test_class_dates_and_early_bird_price_are_checked(staff_client, course):
    admin = staff_client(Role.SUPER_ADMIN)
    today = timezone.localdate()
    base = {"course": course.pk, "name": "K12", "startDate": str(today + timedelta(days=10))}
    late = admin.post(
        "/api/v1/staff/cohorts/",
        {**base, "registrationDeadline": str(today + timedelta(days=11))},
        format="json",
    )
    assert late.status_code == 400 and "registrationDeadline" in late.json()
    dear = admin.post("/api/v1/staff/cohorts/", {**base, "earlyBirdPrice": course.price}, format="json")
    assert dear.status_code == 400 and "earlyBirdPrice" in dear.json()
    ok = admin.post(
        "/api/v1/staff/cohorts/",
        {**base, "registrationDeadline": str(today + timedelta(days=10)), "earlyBirdPrice": course.price - 1},
        format="json",
    )
    assert ok.status_code == 201, ok.content


@pytest.mark.django_db(transaction=True)
def test_campaigns_move_into_their_classes():
    """crm 0017 on data as it was: each course of a campaign becomes (or joins) a class."""
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor

    before = [("crm", "0016_placement_opening")]
    executor = MigrationExecutor(connection)
    executor.migrate(before)
    old = executor.loader.project_state(before).apps
    Course = old.get_model("catalog", "Course")
    Cohort_ = old.get_model("catalog", "Cohort")
    Campaign = old.get_model("crm", "AdmissionCampaign")
    Position = old.get_model("crm", "CampaignPosition")
    Order_ = old.get_model("crm", "Order")
    rm = Course.objects.create(slug="rm", title="RM", status="published", price=1)
    gdv = Course.objects.create(slug="gdv", title="GDV", status="published", price=1)
    k9 = Cohort_.objects.create(course=rm, name="K9", status="opening", capacity=25)
    camp = Campaign.objects.create(
        code="CAMP-DN",
        name="Tuyển sinh Đà Nẵng",
        slug="tuyen-sinh-da-nang",
        status="active",
        is_published=True,
        summary="Học xong đi làm",
        view_count=7,
        lead_recruiter="Lan",
    )
    Position.objects.create(campaign=camp, course=rm, position_title="RM KHDN", target_quota=10)
    Position.objects.create(campaign=camp, course=gdv, target_quota=5)
    lead = Order_.objects.create(customer_name="A", course=rm, campaign=camp)

    executor = MigrationExecutor(connection)
    executor.migrate([("crm", "0017_campaigns_into_classes")])
    new = executor.loader.project_state([("crm", "0017_campaigns_into_classes")]).apps
    C = new.get_model("catalog", "Cohort")
    k9 = C.objects.get(pk=k9.pk)
    assert (k9.code, k9.slug, k9.is_published, k9.summary, k9.view_count, k9.recruiter) == (
        "CAMP-DN",
        "tuyen-sinh-da-nang",
        True,
        "Học xong đi làm",
        7,
        "Lan",
    )
    assert k9.job_title == "RM KHDN" and k9.job_quota == 10
    created = C.objects.get(course__slug="gdv")  # no class yet: one is opened for the leads
    assert created.code == "CAMP-DN-2" and created.capacity == 5 and created.status == "opening"
    lead = new.get_model("crm", "Order").objects.get(pk=lead.pk)
    assert lead.cohort_id == k9.pk and lead.campaign_code == "CAMP-DN"

    executor = MigrationExecutor(connection)
    executor.migrate(executor.loader.graph.leaf_nodes())  # back to today's schema
