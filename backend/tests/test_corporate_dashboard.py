"""Corporate costs (advances count once settled) and the overview: KPIs, margin per class, alerts."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.catalog.models import CohortSession
from apps.corporate import services
from apps.corporate.models import AcceptanceBatch, AcceptanceLine, ResultSnapshot, ServiceContract

pytestmark = pytest.mark.django_db

BASE = "/api/v1/staff/corporate"


@pytest.fixture
def world(course):
    client = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    contract = ServiceContract.objects.create(
        client=client, number="HD-01", value=100_000_000, status="active"
    )
    billed = services.create_class(
        client=client,
        course=course,
        name="Lớp đã nghiệm thu",
        cohort_fields={"start_date": date.today()},
        contract=contract,
    )
    ResultSnapshot.objects.create(
        corporate_class=billed,
        status="published",
        kpis={"completion_rate": 50.0, "attendance_rate": 80.0, "satisfaction": 90.0},
    )
    batch = AcceptanceBatch.objects.create(contract=contract, title="Đợt 1", status="accepted")
    AcceptanceLine.objects.create(
        batch=batch, corporate_class=billed, description="x", unit_price=6_000_000, amount=6_000_000
    )
    done = services.create_class(
        client=client, course=course, name="Lớp học xong chưa chốt", cohort_fields={}
    )
    start = timezone.now() - timedelta(days=2)
    CohortSession.objects.create(cohort=done.cohort, starts_at=start, ends_at=start + timedelta(hours=2))
    return client, contract, billed, done


def test_costs_advances_and_settlements(world, staff_client):
    client, contract, billed, done = world
    corp = staff_client(Role.CORPORATE_TRAINING)
    url = f"{BASE}/expenses/"
    today = date.today().isoformat()
    base = {"corporateClass": billed.pk, "incurredOn": today}
    assert (
        corp.post(
            url,
            {**base, "category": "trainer", "description": "Thù lao GV", "amount": 2_000_000},
            format="json",
        ).status_code
        == 201
    )
    advance = corp.post(
        url, {**base, "kind": "advance", "description": "Tạm ứng ăn trưa", "amount": 1_000_000}, format="json"
    ).json()
    bad = corp.post(
        url, {**base, "kind": "settlement", "description": "Quyết toán", "amount": 800_000}, format="json"
    )
    assert bad.status_code == 400  # a settlement closes an advance
    settle = {
        **base,
        "kind": "settlement",
        "category": "catering",
        "description": "Quyết toán ăn trưa",
        "amount": 800_000,
    }
    assert corp.post(url, {**settle, "advance": advance["id"]}, format="json").status_code == 201
    assert corp.get(f"{url}{advance['id']}/").json()["settled"] == 800_000
    assert (
        corp.post(
            url, {"incurredOn": today, "description": "Không gắn", "amount": 1}, format="json"
        ).status_code
        == 400
    )

    approved = corp.post(f"{url}{advance['id']}/approve/").json()
    assert approved["approvedByName"]
    assert corp.patch(f"{url}{advance['id']}/", {"amount": 5}, format="json").status_code == 400  # frozen

    data = corp.get(f"{BASE}/dashboard/").json()
    row = next(r for r in data["classes"] if r["id"] == billed.pk)
    # Costs = expense 2.000.000 + settlement 800.000; the advance itself is not a cost.
    assert (row["acceptedAmount"], row["costs"], row["margin"]) == (6_000_000, 2_800_000, 3_200_000)
    assert data["finance"]["contractValue"] == 100_000_000 and data["finance"]["margin"] == 3_200_000


def test_overview_kpis_alerts_and_access(world, staff_client):
    client, contract, billed, done = world
    data = staff_client(Role.FINANCE_ACCOUNTANT).get(f"{BASE}/dashboard/").json()
    assert data["activity"]["classes"] == 2 and data["quality"]["satisfaction"] == 90.0
    texts = [a["text"] for a in data["alerts"]]
    assert any("Lớp học xong chưa chốt: đã học hết buổi, chưa chốt kết quả" in t for t in texts)
    assert "completionRate" in data["kpiDictionary"]  # same keys as the figures
    assert staff_client(Role.SALES_CRM).get(f"{BASE}/dashboard/").status_code == 403
    only = staff_client(Role.CORPORATE_TRAINING).get(f"{BASE}/dashboard/", {"client": client.pk}).json()
    assert only["activity"]["classes"] == 2
