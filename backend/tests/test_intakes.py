"""Journey step 2 – intakes: early bird price, automatic status, rollover, sessions on the Moodle calendar."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.intakes import overview, refresh_statuses
from apps.catalog.models import Cohort, CohortSession
from apps.crm.models import AdmissionCampaign, CampaignPosition, Order
from apps.lms import moodle
from tests.conftest import Role

pytestmark = pytest.mark.django_db


def _paid(course, cohort, email="a@example.com"):
    order = Order.objects.create(
        customer_name="A", customer_email=email, course=course, cohort=cohort, amount=1
    )
    order.status = "paid"
    order.save()
    return order


def test_early_bird_price_applies_until_the_deadline(api, registration_payload, course):
    today = timezone.localdate()
    cohort = Cohort.objects.create(
        course=course,
        name="Khóa 12",
        status="opening",
        early_bird_price=7_000_000,
        early_bird_deadline=today,
        schedule_text="Tối thứ 2-4-6",
    )
    res = api.post(
        "/api/v1/public/checkout/", {**registration_payload, "batchCohort": "Khóa 12"}, format="json"
    )
    body = res.json()
    assert res.status_code == 201 and body["amount"] == 7_000_000
    assert body["discountAmount"] == course.price - 7_000_000
    public = api.get(f"/api/v1/public/courses/{course.slug}/").json()["upcomingCohorts"][0]
    assert public["price"] == 7_000_000 and public["scheduleText"] == "Tối thứ 2-4-6"
    assert public["earlyBirdDeadline"] == today.isoformat()
    cohort.early_bird_deadline = today - timedelta(days=1)
    cohort.save()
    res = api.post(
        "/api/v1/public/checkout/", {**registration_payload, "batchCohort": "Khóa 12"}, format="json"
    )
    assert res.json()["amount"] == course.price


def test_intake_closes_when_full_and_rolls_applicants_over(course, django_capture_on_commit_callbacks):
    nxt = Cohort.objects.create(course=course, name="Khóa 13", status="upcoming")
    cohort = Cohort.objects.create(
        course=course, name="Khóa 12", status="opening", capacity=1, next_cohort=nxt
    )
    waiting = Order.objects.create(customer_name="B", course=course, cohort=cohort, amount=1)
    with django_capture_on_commit_callbacks(execute=True):
        _paid(course, cohort)
    cohort.refresh_from_db()
    waiting.refresh_from_db()
    assert cohort.status == "full" and waiting.cohort == nxt
    assert waiting.timeline_activities.filter(title="Tự động chuyển tiếp lớp").exists()


def test_daily_refresh_closes_after_deadline_and_starts_classes(course):
    today = timezone.localdate()
    late = Cohort.objects.create(
        course=course, name="Hết hạn", status="opening", registration_deadline=today - timedelta(days=1)
    )
    started = Cohort.objects.create(course=course, name="Khai giảng", status="full", start_date=today)
    open_ = Cohort.objects.create(
        course=course, name="Còn mở", status="opening", start_date=today + timedelta(days=20)
    )
    assert refresh_statuses() == {"full": 0, "closed": 1, "in_progress": 1, "rolled_over": 0}
    statuses = dict(Cohort.objects.values_list("name", "status"))
    assert statuses == {late.name: "closed", started.name: "in_progress", open_.name: "opening"}
    assert refresh_statuses() == {"full": 0, "closed": 0, "in_progress": 0, "rolled_over": 0}  # idempotent


def test_overview_counts_seats_and_campaign_quotas(course, staff_client, api):
    cohort = Cohort.objects.create(course=course, name="Khóa 12", status="opening", capacity=10)
    camp = AdmissionCampaign.objects.create(code="C1", name="Q4", status="active", target_headcount=20)
    CampaignPosition.objects.create(
        campaign=camp, course=course, position_title="RM", short_name="RM", target_quota=5
    )
    order = _paid(course, cohort)
    order.campaign = camp
    order.save()
    Order.objects.create(customer_name="C", course=course, cohort=cohort, amount=1)  # still to pay
    data = staff_client(Role.SALES_CRM).get("/api/v1/staff/intakes/").json()
    row = next(r for r in data["intakes"] if r["id"] == cohort.pk)
    assert (row["paid"], row["pending"], row["seatsLeft"], row["fillRate"]) == (1, 1, 9, 10)
    assert data["campaigns"][0]["positions"][0] == {
        "title": "RM",
        "courseTitle": course.title,
        "target": 5,
        "enrolled": 1,
        "rate": 20,
    }
    assert api.get("/api/v1/staff/intakes/").status_code in (401, 403)


class FakeCalendar:
    def __init__(self):
        self.created, self.deleted, self.next_id = [], [], 900

    def __call__(self, function, **params):
        if function == "core_course_get_courses_by_field":
            return {"courses": [{"id": 77, "startdate": 0}]}
        if function == "core_calendar_create_calendar_events":
            out = []
            for event in params["events"]:
                self.next_id += 1
                self.created.append(event)
                out.append({"id": self.next_id})
            return {"events": out}
        if function == "core_calendar_delete_calendar_events":
            self.deleted += [e["eventid"] for e in params["events"]]
            return None
        if function == "core_course_update_courses":
            return None
        raise AssertionError(function)


def test_sessions_are_pushed_to_the_moodle_calendar(course, staff_client, settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL, settings.MOODLE_WS_TOKEN = "http://lms:8080/learn", "t" * 32
    fake = FakeCalendar()
    monkeypatch.setattr(moodle, "call", fake)
    cohort = Cohort.objects.create(course=course, name="Khóa 12", status="opening", location="ROX Tower")
    start = timezone.now().replace(microsecond=0) + timedelta(days=7)
    sessions = [
        {
            "startsAt": (start + timedelta(days=2 * i)).isoformat(),
            "endsAt": (start + timedelta(days=2 * i, hours=2)).isoformat(),
        }
        for i in range(3)
    ]
    editor = staff_client(Role.ACADEMIC_MANAGEMENT)
    url = f"/api/v1/staff/cohorts/{cohort.pk}/sessions/"
    res = editor.put(url, {"sessions": sessions, "scheduleText": "Tối thứ 2-4-6, 19:00–21:00"}, format="json")
    assert res.status_code == 200, res.content
    assert res.json()["sync"] == {"synced": 3, "moodleCourseId": 77}
    assert all(s["synced"] for s in res.json()["sessions"])
    assert fake.created[0]["courseid"] == 77 and fake.created[0]["description"] == "Địa điểm: ROX Tower"
    first_ids = list(CohortSession.objects.values_list("moodle_event_id", flat=True))

    res = editor.put(url, {"sessions": sessions[:1]}, format="json")  # reschedule: old events removed
    assert set(fake.deleted) == set(first_ids) and res.json()["sync"]["synced"] == 1
    cohort.refresh_from_db()
    assert cohort.calendar_cleanup == [] and cohort.schedule_text == "Tối thứ 2-4-6, 19:00–21:00"
    bad = {"sessions": [{"startsAt": start.isoformat(), "endsAt": start.isoformat()}]}
    assert editor.put(url, bad, format="json").status_code == 400
    assert staff_client(Role.SALES_CRM).put(url, {"sessions": []}, format="json").status_code == 403
    assert overview()["intakes"][0]["sessions_synced"] == 1
