"""Journey steps 7-8: attendance & grades from Moodle, at-risk learners, graduation rule, certificates."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.models import Cohort, CohortSession
from apps.crm.models import Order
from apps.lms import moodle
from apps.lms.completion import release_holds, sync_enrollment
from apps.lms.learning import refresh_learning
from apps.lms.models import Certificate, LmsEnrollment
from tests.conftest import Role

pytestmark = pytest.mark.django_db
NOW = timezone.now()


class FakeLearning:
    """Moodle answers for one intake course (id 77) with two learners (501 active, 502 drifting)."""

    def __init__(self):
        self.marks = {}  # attendance session id -> {student: status id}

    def __call__(self, function, **params):
        if function == "core_enrol_get_enrolled_users":
            return [
                {"id": 501, "lastcourseaccess": int(NOW.timestamp())},
                {"id": 502, "lastcourseaccess": int((NOW - timedelta(days=12)).timestamp())},
            ]
        if function == "gradereport_user_get_grade_items":

            def items(quiz, total):
                return [
                    {
                        "itemname": "Kiểm tra chương 1",
                        "itemtype": "mod",
                        "itemmodule": "quiz",
                        "graderaw": quiz,
                        "grademin": 0,
                        "grademax": 10,
                    },
                    {"itemname": "", "itemtype": "course", "graderaw": total, "grademin": 0, "grademax": 100},
                ]

            return {
                "usergrades": [
                    {"userid": 501, "userfullname": "A", "gradeitems": items(9, 90)},
                    {"userid": 502, "userfullname": "B", "gradeitems": items(3, 30)},
                ]
            }
        if function == "core_user_get_users_by_field":
            return []
        if function == "core_course_get_courses_by_field":
            return {"courses": [{"id": 77}]}
        if function == "mod_attendance_get_session":
            marks = self.marks.get(params["sessionid"], {})
            return {
                "lasttaken": 1 if marks else 0,
                "statuses": [{"id": 1, "acronym": "P", "grade": 2}, {"id": 4, "acronym": "A", "grade": 0}],
                "attendance_log": [{"studentid": uid, "statusid": str(st)} for uid, st in marks.items()],
            }
        raise AssertionError(function)


@pytest.fixture
def klass(course, settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL, settings.MOODLE_WS_TOKEN = "http://lms:8080/learn", "t" * 32
    fake = FakeLearning()
    monkeypatch.setattr(moodle, "call", fake)
    cohort = Cohort.objects.create(
        course=course,
        name="Khóa 12",
        status="in_progress",
        start_date=timezone.localdate() - timedelta(days=20),
        moodle_attendance_id=55,
    )
    for i in range(4):  # 3 sessions held, 1 ahead
        start = NOW - timedelta(days=15 - 5 * i)
        CohortSession.objects.create(
            cohort=cohort,
            starts_at=start,
            ends_at=start + timedelta(hours=2),
            moodle_attendance_session_id=900 + i,
        )
    fake.marks = {900: {501: 1, 502: 4}, 901: {501: 1, 502: 4}, 902: {501: 1, 502: 1}}
    learners = []
    for uid, name in ((501, "An"), (502, "Bình")):
        order = Order.objects.create(
            customer_name=name, customer_email=f"{uid}@x.vn", course=course, cohort=cohort, amount=1
        )
        order.status = "paid"
        order.save()
        learners.append(
            LmsEnrollment.objects.create(
                order=order,
                status="done",
                moodle_user_id=uid,
                moodle_course_id=77,
                cohort=cohort,
                progress=60 if uid == 501 else 5,
            )
        )
    return cohort, fake, learners


def test_attendance_grades_and_risk_from_moodle(klass):
    cohort, fake, (good, drifting) = klass
    assert refresh_learning() == {"learners": 2, "courses": 1}
    good.refresh_from_db()
    drifting.refresh_from_db()
    assert (good.attendance_rate, good.attendance_taken, good.grade_percent, good.risk_level) == (
        100,
        3,
        90,
        "ok",
    )
    assert (drifting.attendance_rate, drifting.grade_percent) == (33, 30)
    assert (
        drifting.risk_level == "risk" and len(drifting.risk_flags) == 4
    )  # inactive, attendance, behind, grade
    assert any("Không vào học 12 ngày" in f for f in drifting.risk_flags)


def test_certificate_waits_for_attendance_then_is_released(klass):
    cohort, fake, (good, drifting) = klass
    refresh_learning()
    drifting.refresh_from_db()
    sync_enrollment(drifting, [{"id": 77, "progress": 100, "completed": True}])
    drifting.refresh_from_db()
    assert drifting.completed_at and "Chuyên cần 33%" in drifting.certificate_hold
    assert not Certificate.objects.filter(enrollment=drifting).exists()
    # the teacher corrects the missing marks in Moodle -> next sync issues it
    fake.marks = {900: {502: 1}, 901: {502: 1}, 902: {502: 1}}
    refresh_learning()
    assert release_holds() == 1
    assert Certificate.objects.filter(enrollment=drifting).exists()
    good.refresh_from_db()
    sync_enrollment(good, [{"id": 77, "progress": 100, "completed": True}])
    assert Certificate.objects.filter(enrollment=good).exists()  # eligible straight away


def test_staff_override_needs_a_reason(klass, staff_client):
    cohort, fake, (good, drifting) = klass
    url = f"/api/v1/staff/lms/orders/{drifting.order_id}/actions/"
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    assert staff.post(url, {"action": "issue_certificate"}, format="json").status_code == 400
    res = staff.post(
        url, {"action": "issue_certificate", "note": "Bù buổi học online đã duyệt"}, format="json"
    )
    assert res.status_code == 200, res.content
    cert = Certificate.objects.get(enrollment=drifting)
    assert drifting.order.timeline_activities.filter(
        title__contains="ngoại lệ", content__contains="Bù buổi"
    ).exists()
    page = staff.get(f"/xac-minh/{cert.code}/in/")
    assert (
        page.status_code == 200
        and "CHỨNG NHẬN HOÀN THÀNH" in page.content.decode()
        and "Bình" in page.content.decode()
    )


def test_intake_learning_summary_links_to_moodle_and_at_risk(klass, staff_client, monkeypatch):
    cohort, fake, learners = klass
    refresh_learning()
    original = fake.__call__
    calls = []

    def moodle_call(function, **params):
        calls.append(function)
        if function == "mod_forum_get_forums_by_courses":
            return [{"id": 31, "type": "general"}, {"id": 9, "type": "news"}]
        return original(function, **params)

    monkeypatch.setattr(moodle, "call", moodle_call)
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    book = staff.get(f"/api/v1/staff/lms/cohorts/{cohort.pk}/gradebook/").json()
    # Synced figures only: the per-activity gradebook stays in Moodle.
    assert calls == ["mod_forum_get_forums_by_courses"]
    assert "columns" not in book and book["attendanceEnabled"] and book["expectedProgress"] == 75
    row = next(r for r in book["rows"] if r["name"] == "Bình")
    assert row["coursePercent"] == 30 and row["attendance"] == "1/3" and "items" not in row
    assert book["links"]["grades"] == "/learn/grade/report/grader/index.php?id=77"
    assert book["links"]["announcements"] == "/learn/mod/forum/post.php?forum=9"
    assert row["links"]["userCourse"].startswith("/learn/user/view.php?id=")

    risky = staff.get("/api/v1/staff/lms/at-risk/").json()
    assert [r["name"] for r in risky] == ["Bình"] and risky[0]["riskLevel"] == "risk"
    # Class announcements are posted in Moodle: TWings no longer e-mails the class itself.
    assert (
        staff.post(f"/api/v1/staff/lms/cohorts/{cohort.pk}/announce/", {}, format="json").status_code == 404
    )
    dash = staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/dashboard/").json()["training"]
    assert dash["atRisk"] == 1


def test_schedule_edit_keeps_marked_attendance(klass, staff_client):
    from apps.catalog.intakes import ScheduleError, replace_sessions

    cohort, fake, learners = klass
    future = NOW + timedelta(days=3)
    CohortSession.objects.filter(moodle_attendance_session_id=903).update(
        starts_at=future, ends_at=future + timedelta(hours=2)
    )
    sessions = list(cohort.sessions.order_by("starts_at"))
    rows = [{"starts_at": s.starts_at, "ends_at": s.ends_at, "title": "Đổi phòng"} for s in sessions]
    rows[-1]["starts_at"] += timedelta(days=1)  # move only the future class
    rows[-1]["ends_at"] += timedelta(days=1)
    replace_sessions(cohort, rows)
    kept = sorted(
        cohort.sessions.exclude(moodle_attendance_session_id=None).values_list(
            "moodle_attendance_session_id", flat=True
        )
    )
    cohort.refresh_from_db()
    assert kept == [900, 901, 902] and cohort.attendance_cleanup == [903]
    # a class that already took place cannot be dropped
    with pytest.raises(ScheduleError):
        replace_sessions(cohort, rows[1:])
    staff = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = staff.put(
        f"/api/v1/staff/cohorts/{cohort.pk}/sessions/",
        {
            "sessions": [
                {"startsAt": r["starts_at"].isoformat(), "endsAt": r["ends_at"].isoformat()} for r in rows[1:]
            ],
            "sync": False,
        },
        format="json",
    )
    assert res.status_code == 400 and "đã diễn ra" in res.json()["detail"]


def test_at_risk_lists_risk_before_watch(klass):
    cohort, fake, (good, drifting) = klass
    LmsEnrollment.objects.filter(pk=good.pk).update(risk_level="watch", risk_flags=["x"])
    LmsEnrollment.objects.filter(pk=drifting.pk).update(risk_level="risk", risk_flags=["x", "y"])
    from apps.lms.learning import at_risk_rows

    assert [r["risk_level"] for r in at_risk_rows()] == ["risk", "watch"]
