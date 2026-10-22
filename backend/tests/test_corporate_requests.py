"""Client requests: SLA deadline in working hours, state, summary, dashboard alerts, owner reminders."""

from datetime import datetime, timedelta

import pytest
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.corporate import requests as sla
from apps.corporate import services
from apps.corporate.models import TrainingRequest
from tests.conftest import make_staff

pytestmark = pytest.mark.django_db

URL = "/api/v1/staff/corporate/requests/"


def vn(*args):
    return datetime(*args, tzinfo=sla.VN)


@pytest.mark.parametrize(
    ("start", "hours", "due"),
    [
        (vn(2026, 10, 21, 9, 0), 4, vn(2026, 10, 21, 13, 0)),  # Wednesday, same day
        (vn(2026, 10, 23, 16, 0), 4, vn(2026, 10, 26, 11, 0)),  # Friday 16:00 -> Monday 11:00
        (vn(2026, 10, 24, 10, 0), 9, vn(2026, 10, 26, 17, 0)),  # received Saturday: Monday counts
        (vn(2026, 10, 21, 20, 0), 27, vn(2026, 10, 24 + 2, 17, 0)),  # evening: Thu, Fri, Mon
        (vn(2026, 10, 21, 6, 30), 1, vn(2026, 10, 21, 9, 0)),  # before opening
    ],
)
def test_working_hours(start, hours, due):
    assert sla.add_working_hours(start, hours) == due
    assert sla.working_hours_between(start, due) == hours


@pytest.fixture
def client_co():
    return services.create_client(name="Ngân hàng Mẫu", code="NHM")


def test_create_update_resolve(client_co, staff_client, course):
    corp = staff_client(Role.CORPORATE_TRAINING)
    received = vn(2026, 10, 16, 16, 0).isoformat()
    req = corp.post(
        URL,
        {"client": client_co.pk, "title": "Thêm 5 học viên", "priority": "high", "receivedAt": received},
        format="json",
    ).json()
    assert datetime.fromisoformat(req["dueAt"]) == vn(2026, 10, 19, 16, 0)  # 9 working hours
    assert req["sla"] == "overdue" and req["statusLabel"] == "Mới"  # a Friday in the past

    url = f"{URL}{req['id']}/"
    urgent = corp.patch(url, {"priority": "urgent"}, format="json").json()
    assert datetime.fromisoformat(urgent["dueAt"]) == vn(2026, 10, 19, 11, 0)  # recomputed
    by_hand = vn(2026, 10, 20, 17, 0).isoformat()
    kept = corp.patch(url, {"dueAt": by_hand, "title": "Thêm 6 học viên"}, format="json").json()
    assert datetime.fromisoformat(kept["dueAt"]) == vn(2026, 10, 20, 17, 0)
    assert datetime.fromisoformat(corp.patch(url, {"title": "x"}, format="json").json()["dueAt"]) == vn(
        2026, 10, 20, 17, 0
    )  # nothing about timing changed: the hand-set deadline stays

    done = corp.patch(url, {"status": "done", "resolution": "Đã thêm"}, format="json").json()
    assert done["resolvedAt"] and done["sla"] == "missed"
    assert corp.patch(url, {"status": "in_progress"}, format="json").json()["resolvedAt"] is None

    other = services.create_client(name="Khác", code="KH2")
    cls = services.create_class(client=other, course=course, name="Lớp khác", cohort_fields={})
    assert corp.patch(url, {"corporateClass": cls.pk}, format="json").status_code == 400
    owners = corp.get(f"{URL}owners/").json()
    assert owners and all(o["name"] for o in owners)
    assert staff_client(Role.SALES_CRM).get(URL).status_code == 403
    assert staff_client(Role.ACADEMIC_MANAGEMENT).post(URL, {}, format="json").status_code == 403


def _req(client, *, due, status="open", resolved=None, owner=None, title="Yêu cầu"):
    return TrainingRequest.objects.create(
        client=client,
        title=title,
        received_at=due - timedelta(days=1),
        due_at=due,
        status=status,
        resolved_at=resolved,
        owner=owner,
    )


def test_summary_and_dashboard_alerts(client_co, staff_client):
    now = timezone.now()
    owner = make_staff(Role.CORPORATE_TRAINING)
    _req(client_co, due=now - timedelta(hours=2), owner=owner, title="Báo cáo quý")
    _req(client_co, due=now + timedelta(days=10), title="Còn lâu")
    _req(client_co, due=now - timedelta(days=3), status="done", resolved=now - timedelta(days=4))
    _req(client_co, due=now - timedelta(days=3), status="done", resolved=now - timedelta(days=2))

    corp = staff_client(Role.CORPORATE_TRAINING)
    assert corp.get(f"{URL}summary/").json() == {
        "open": 2,
        "overdue": 1,
        "resolved90d": 2,
        "onTimeRate": 50.0,
    }
    data = corp.get("/api/v1/staff/corporate/dashboard/").json()
    assert data["requests"]["overdue"] == 1
    alert = data["alerts"][0]
    assert alert["level"] == "error" and "Báo cáo quý" in alert["text"] and owner.name in alert["text"]
    assert not any("Còn lâu" in a["text"] for a in data["alerts"])


def test_remind_owners(client_co, monkeypatch, settings):
    sent = []
    monkeypatch.setattr("apps.notifications.resend.send_email", lambda **kw: sent.append(kw))
    settings.CORPORATE_CONTACT_EMAIL = "daotao@tntalent.test"
    monday = vn(2026, 10, 26, 8, 15)
    owner = make_staff(Role.CORPORATE_TRAINING)
    _req(client_co, due=monday - timedelta(hours=1), owner=owner, title="A")
    _req(client_co, due=monday + timedelta(hours=2), owner=owner, title="B")
    _req(client_co, due=monday + timedelta(hours=1), title="Chưa giao")
    _req(client_co, due=monday + timedelta(days=5), owner=owner, title="Xa")

    assert sla.remind_owners(monday) == 2
    by_to = {m["to"]: m for m in sent}
    assert "QUÁ HẠN" in by_to[owner.email]["html"] and "Xa" not in by_to[owner.email]["html"]
    assert (
        by_to[owner.email]["subject"].startswith("2 yêu cầu") and by_to[owner.email]["brand"] == "corporate"
    )
    assert "Chưa giao" in by_to["daotao@tntalent.test"]["html"]
    assert sla.remind_owners(vn(2026, 10, 25, 8, 15)) == 0  # Sunday

    # No contact address: unowned requests go to everyone who may handle requests.
    settings.CORPORATE_CONTACT_EMAIL = ""
    sent.clear()
    sla.remind_owners(monday + timedelta(days=1))
    to_owner = next(m for m in sent if m["to"] == owner.email)
    assert "Chưa giao" in to_owner["html"] and "daotao@tntalent.test" not in {m["to"] for m in sent}


def test_internal_task_keeps_its_own_deadline(client_co, staff_client):
    corp = staff_client(Role.CORPORATE_TRAINING)
    due = vn(2026, 11, 3, 17, 0)
    task = corp.post(
        URL,
        {"client": client_co.pk, "kind": "internal", "title": "In tài liệu lớp", "dueAt": due.isoformat()},
        format="json",
    ).json()
    assert task["kindLabel"] == "Việc nội bộ (PIC)" and datetime.fromisoformat(task["dueAt"]) == due
