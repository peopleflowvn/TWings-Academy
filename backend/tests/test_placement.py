"""Journey steps 9-10: job referrals to the partner bank, partner HR link, post-placement, outcomes."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.crm.models import AdmissionCampaign, CampaignPosition, FollowupTask, Order, Placement
from apps.lms.completion import issue_certificate
from apps.lms.models import LmsEnrollment
from apps.notifications.models import EmailLog
from tests.conftest import Role

pytestmark = pytest.mark.django_db


@pytest.fixture
def graduate(course):
    order = Order.objects.create(
        customer_name="Lan", customer_email="lan@x.vn", customer_phone="0901234567", course=course, amount=1
    )
    order.status = "paid"
    order.save()
    enrollment = LmsEnrollment.objects.create(
        order=order,
        status="done",
        moodle_user_id=7,
        moodle_course_id=3,
        completed_at=timezone.now(),
        grade_percent=86,
        attendance_rate=95,
    )
    issue_certificate(enrollment)
    return order


@pytest.fixture
def position(course):
    campaign = AdmissionCampaign.objects.create(code="MSB-2026", name="MSB 2026", status="active")
    return CampaignPosition.objects.create(
        campaign=campaign,
        course=course,
        position_title="RM KHDN",
        short_name="RM",
        department="MSB Hà Nội",
        target_quota=10,
    )


def test_candidate_referral_to_hire_and_followups(
    graduate, position, staff_client, django_capture_on_commit_callbacks
):
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    cands = staff.get("/api/v1/staff/placements/candidates/").json()
    assert [c["name"] for c in cands] == ["Lan"] and cands[0]["positions"][0]["title"] == "RM KHDN"
    res = staff.post(
        "/api/v1/staff/placements/", {"orderId": graduate.id, "positionId": position.id}, format="json"
    )
    assert res.status_code == 201, res.content
    pid = res.json()["id"]
    assert res.json()["unit"] == "MSB Hà Nội" and res.json()["jobTitle"] == "RM KHDN"
    # one open referral at a time; no longer a candidate
    again = staff.post("/api/v1/staff/placements/", {"orderId": graduate.id}, format="json")
    assert again.status_code == 400
    assert staff.get("/api/v1/staff/placements/candidates/").json() == []

    move = f"/api/v1/staff/placements/{pid}/move/"
    assert staff.post(move, {"stage": "hired"}, format="json").status_code == 400  # not from shortlist
    assert staff.post(move, {"stage": "interview"}, format="json").status_code == 400  # needs a time
    when = (timezone.now() + timedelta(days=2)).isoformat()
    with django_capture_on_commit_callbacks(execute=True):
        res = staff.post(
            move, {"stage": "interview", "interviewAt": when, "interviewLocation": "MSB HO"}, format="json"
        )
    assert res.status_code == 200 and res.json()["stage"] == "interview"
    assert EmailLog.objects.filter(template_code="placement_interview", recipient_email="lan@x.vn").exists()
    staff.post(move, {"stage": "offer"}, format="json")
    with django_capture_on_commit_callbacks(execute=True):
        res = staff.post(move, {"stage": "hired", "startDate": "2026-11-02"}, format="json")
    body = res.json()
    assert body["probationEnd"] == "2027-01-01" and body["guaranteeUntil"] == "2027-11-02"
    graduate.refresh_from_db()
    assert graduate.placement_status == "Đã nhận việc" and graduate.work_start_date == date(2026, 11, 2)
    assert FollowupTask.objects.filter(order=graduate, title__startswith="Việc làm:").count() == 5
    assert EmailLog.objects.filter(template_code="placement_hired").exists()

    # step 10: leaves during the guarantee -> back on the referral list with a task
    out = f"/api/v1/staff/placements/{pid}/outcome/"
    assert staff.post(out, {"leftAt": "2027-02-01"}, format="json").status_code == 400  # needs a reason
    res = staff.post(
        out, {"probationResult": "passed", "leftAt": "2027-02-01", "leftReason": "Chuyển nhà"}, format="json"
    )
    assert res.status_code == 200
    cands = staff.get("/api/v1/staff/placements/candidates/").json()
    assert cands and cands[0]["rereferral"]
    assert FollowupTask.objects.filter(order=graduate, title__contains="giới thiệu lại").exists()
    report = staff.get("/api/v1/staff/placements/outcomes/").json()
    row = report["courses"][0]
    assert (row["graduates"], row["hired"], row["placementRate"], row["passedProbation"], row["working"]) == (
        1,
        1,
        100,
        1,
        0,
    )
    assert report["quotas"][0]["hired"] == 1


def test_only_graduates_can_be_referred(course, staff_client):
    order = Order.objects.create(customer_name="Minh", customer_email="m@x.vn", course=course, amount=1)
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = staff.post("/api/v1/staff/placements/", {"orderId": order.id}, format="json")
    assert res.status_code == 400 and "tốt nghiệp" in res.json()["detail"]
    # sales can look, not act
    sales = staff_client(Role.SALES_CRM)
    assert sales.get("/api/v1/staff/placements/").status_code == 200
    assert sales.post("/api/v1/staff/placements/", {"orderId": order.id}, format="json").status_code == 403
    assert staff_client(Role.CONTENT_SEO).get("/api/v1/staff/placements/").status_code == 403


def test_partner_link_lets_hr_record_results(graduate, staff_client, client):
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    pid = staff.post("/api/v1/staff/placements/", {"orderId": graduate.id}, format="json").json()["id"]
    res = staff.post(
        "/api/v1/staff/placements/shares/",
        {"title": "Đợt RM tháng 11", "placementIds": [pid], "allowCv": False},
        format="json",
    )
    assert res.status_code == 201, res.content
    url = res.json()["url"]
    path = url[url.index("/doi-tac/") :]
    assert Placement.objects.get(pk=pid).stage == "submitted"  # sending = submitted

    page = client.get(path)
    html = page.content.decode()
    assert page.status_code == 200 and "Lan" in html and "86%" in html and "Tải CV" not in html
    assert page["X-Robots-Tag"].startswith("noindex") and "no-store" in page["Cache-Control"]
    assert client.get(f"{path}cv/{pid}/").status_code == 404  # CV not shared on this link

    bad = client.post(path, {"placement": pid, "action": "hired", "start_date": "2026-12-01"})
    assert bad.status_code == 400  # submitted -> hired is not a valid step
    ok = client.post(
        path,
        {
            "placement": pid,
            "action": "interview",
            "interview_at": "2026-11-20T09:30",
            "interview_location": "Tầng 5 MSB",
        },
    )
    assert ok.status_code == 302
    p = Placement.objects.get(pk=pid)
    assert p.stage == "interview" and p.interview_location == "Tầng 5 MSB"
    assert graduate.timeline_activities.filter(actor__startswith="HR MSB").exists()
    # unknown actions / candidates not on the link are refused
    other = Order.objects.create(customer_name="X", customer_email="x@x.vn", amount=1)
    stranger = Placement.objects.create(order=other)
    assert client.post(path, {"placement": stranger.pk, "action": "offer"}).status_code == 404

    share_id = res.json()["id"]
    staff.post(f"/api/v1/staff/placements/shares/{share_id}/revoke/")
    assert client.get(path).status_code == 404
    assert client.get("/doi-tac/not-a-token/").status_code == 404


def test_learner_sees_job_progress(graduate, staff_client):
    from apps.crm.placement import learner_items

    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    pid = staff.post("/api/v1/staff/placements/", {"orderId": graduate.id}, format="json").json()["id"]
    assert learner_items([graduate]) == []  # a shortlist is internal
    staff.post(
        f"/api/v1/staff/placements/{pid}/move/",
        {"stage": "interview", "interviewAt": "2026-11-20T09:30:00+07:00", "notify": False},
        format="json",
    )
    [item] = learner_items([graduate])
    assert item["stage_label"] == "Phỏng vấn" and item["interview_at"]
