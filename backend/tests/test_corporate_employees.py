"""Học viên & CBQL: people per client, a manager change from a date keeps the history and the CC."""

from datetime import date, timedelta

import pytest

from apps.accounts.rbac import Role
from apps.corporate import services
from apps.corporate.communications import recipients
from apps.crm.models import Learner

pytestmark = pytest.mark.django_db

URL = "/api/v1/staff/corporate/employees/"


@pytest.fixture
def listing(course):
    client = services.create_client(name="Ngân hàng Mẫu", code="NHM", email_domains=["nhm.test"])
    cls = services.create_class(client=client, course=course, name="NHM – Lớp 1", cohort_fields={})
    learner = Learner.objects.create(full_name="Trần Thị Bình", email="binh@nhm.test")
    start = date.today() - timedelta(days=30)
    return services.list_learner(
        cls, learner, on=start, employee_code="NV01", manager_name="Lê Cũ", manager_email="cu@nhm.test"
    )


def test_list_change_manager_and_history(listing, staff_client):
    corp = staff_client(Role.CORPORATE_TRAINING)
    [row] = corp.get(URL, {"search": "NV01"}).json()["results"]
    assert (row["fullName"], row["managerEmail"], row["classes"], row["clientCode"]) == (
        "Trần Thị Bình",
        "cu@nhm.test",
        1,
        "NHM",
    )

    today = date.today()
    res = corp.post(
        f"{URL}{row['id']}/change/",
        {"effectiveFrom": today.isoformat(), "managerName": "Phạm Mới", "managerEmail": "moi@nhm.test"},
        format="json",
    )
    assert res.status_code == 200, res.content
    new = res.json()
    assert new["managerEmail"] == "moi@nhm.test" and new["employeeCode"] == "NV01"  # other fields kept

    history = corp.get(f"{URL}{new['id']}/history/").json()
    assert [h["managerEmail"] for h in history] == ["moi@nhm.test", "cu@nhm.test"]
    assert history[1]["validTo"] is not None
    assert [r["managerEmail"] for r in corp.get(URL).json()["results"]] == ["moi@nhm.test"]  # current only
    assert len(corp.get(URL, {"all": 1}).json()["results"]) == 2

    # E-mails follow the manager of the day they are sent.
    assert recipients(listing, today - timedelta(days=1))["cc"] == ["cu@nhm.test"]
    assert recipients(listing, today)["cc"] == ["moi@nhm.test"]

    old = history[1]["id"]
    assert (
        corp.post(f"{URL}{old}/change/", {"effectiveFrom": today.isoformat()}, format="json").status_code
        == 400
    )
    assert (
        staff_client(Role.ACADEMIC_MANAGEMENT)
        .post(f"{URL}{new['id']}/change/", {"effectiveFrom": today.isoformat()}, format="json")
        .status_code
        == 403
    )
