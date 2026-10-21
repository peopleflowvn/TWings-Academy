"""Corporate attendance: Moodle marks per session, corrections counted once approved, QR check-in."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.catalog.models import CohortSession
from apps.corporate import services
from apps.corporate.models import AttendanceRecord
from apps.crm.models import Learner
from apps.lms import moodle
from apps.lms.learning import refresh_learning, sync_attendance_sessions
from apps.lms.models import LmsEnrollment
from tests.test_learning import NOW, FakeLearning

pytestmark = pytest.mark.django_db


@pytest.fixture
def corp_class(course, settings, monkeypatch):
    """A corporate class on Moodle course 77: 3 sessions held (501 always present, 502 absent twice)."""
    settings.MOODLE_INTERNAL_URL, settings.MOODLE_WS_TOKEN = "http://lms:8080/learn", "t" * 32
    fake = FakeLearning()
    monkeypatch.setattr(moodle, "call", fake)
    client = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    cls = services.create_class(
        client=client, course=course, name="NHM – Lớp 1", cohort_fields={"moodle_attendance_id": 55}
    )
    sessions = []
    for i in range(4):
        start = NOW - timedelta(days=15 - 5 * i)
        sessions.append(
            CohortSession.objects.create(
                cohort=cls.cohort,
                title=f"Buổi {i + 1}",
                starts_at=start,
                ends_at=start + timedelta(hours=2),
                moodle_attendance_session_id=900 + i,
            )
        )
    fake.marks = {900: {501: 1, 502: 4}, 901: {501: 1, 502: 4}, 902: {501: 1, 502: 1}}
    listings = []
    for uid, name in ((501, "An"), (502, "Bình")):
        listing = services.list_learner(cls, Learner.objects.create(full_name=name, email=f"{uid}@nhm.test"))
        LmsEnrollment.objects.create(
            corporate_enrollment=listing,
            status="done",
            moodle_user_id=uid,
            moodle_course_id=77,
            cohort=cls.cohort,
        )
        listings.append(listing)
    return cls, sessions, listings


def test_moodle_marks_are_kept_per_session(corp_class):
    cls, sessions, (an, binh) = corp_class
    refresh_learning()
    assert AttendanceRecord.objects.filter(enrollment=binh, attended=False).count() == 2
    assert LmsEnrollment.objects.get(corporate_enrollment=binh).attendance_rate == 33


def test_sheet_and_approved_correction(corp_class, staff_client):
    cls, sessions, (an, binh) = corp_class
    refresh_learning()
    corp = staff_client(Role.CORPORATE_TRAINING)
    url = f"/api/v1/staff/corporate/classes/{cls.pk}/attendance/"
    sheet = corp.get(url).json()
    assert [s["qrUrl"] for s in sheet["sessions"]][0] == "/learn/mod/attendance/password.php?session=900"
    row = next(r for r in sheet["rows"] if r["name"] == "Bình")
    assert (row["taken"], row["attended"], row["rate"]) == (3, 1, 33)
    assert row["cells"][sessions[3].pk]["source"] == "missing"  # held, not marked on Moodle

    payload = {"enrollment": binh.pk, "session": sessions[0].pk, "status": "excused", "reason": "Công tác"}
    assert staff_client(Role.FINANCE_ACCOUNTANT).post(url, payload, format="json").status_code == 403
    assert corp.post(url, {**payload, "reason": " "}, format="json").status_code == 400
    late = corp.post(
        url, {**payload, "status": "late", "reason": "Quét mã lỗi, có mặt từ 8:20"}, format="json"
    )
    assert late.status_code == 201, late.content
    row = next(r for r in corp.get(url).json()["rows"] if r["name"] == "Bình")
    assert row["cells"][sessions[0].pk]["pending"] and row["attended"] == 1  # not counted before approval

    decide = f"/api/v1/staff/corporate/attendance-adjustments/{late.json()['id']}/"
    assert staff_client(Role.ACADEMIC_MANAGEMENT).post(f"{decide}approve/").status_code == 403
    assert corp.post(f"{decide}approve/").json()["decision"] == "approved"
    assert corp.post(f"{decide}reject/").status_code == 400  # decided once
    row = next(r for r in corp.get(url).json()["rows"] if r["name"] == "Bình")
    cell = row["cells"][sessions[0].pk]
    assert (cell["source"], cell["status"], row["attended"], row["rate"]) == ("adjusted", "Đi muộn", 2, 67)

    cls.locked_at = timezone.now()
    cls.save()
    assert corp.post(url, payload, format="json").status_code == 400  # results locked


def test_corporate_sessions_get_qr_self_check_in(course, settings, monkeypatch):
    settings.MOODLE_INTERNAL_URL, settings.MOODLE_WS_TOKEN = "http://lms:8080/learn", "t" * 32
    calls = []

    def fake(function, **params):
        calls.append((function, params))
        if function == "mod_attendance_add_attendance":
            return {"attendanceid": 55}
        if function == "mod_attendance_add_session":
            return {"sessionid": 900 + len([c for c in calls if c[0] == function])}
        return {"sessionid": params.get("sessionid"), "studentscanmark": True, "rotateqrcode": True}

    monkeypatch.setattr(moodle, "call", fake)
    client = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    cls = services.create_class(client=client, course=course, name="NHM – Lớp 1", cohort_fields={})
    start = timezone.now() + timedelta(days=1)
    CohortSession.objects.create(cohort=cls.cohort, starts_at=start, ends_at=start + timedelta(hours=2))
    sync_attendance_sessions(cls.cohort, 77)
    selfmark = [p for f, p in calls if f == "local_twings_attendance_selfmark"]
    assert selfmark == [{"sessionid": 901, "enabled": 1, "rotateqrcode": 1, "autoassignstatus": 1}]
