"""Staff API of corporate training: clients, contracts, plans (versions), classes, class lists."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.catalog.models import Cohort
from apps.corporate import services
from apps.corporate.models import CorporateEmployee, CorporateEnrollment, TrainingPlan
from apps.crm.models import Learner

pytestmark = pytest.mark.django_db

BASE = "/api/v1/staff/corporate"


@pytest.fixture
def corp(staff_client):
    return staff_client(Role.CORPORATE_TRAINING)


@pytest.fixture
def client_id(corp):
    res = corp.post(
        f"{BASE}/clients/",
        {"name": "Ngân hàng Mẫu", "code": "NHM", "emailDomains": ["@NHM.test"]},
        format="json",
    )
    assert res.status_code == 201, res.content
    return res.json()["id"]


def _class(corp, client_id, course, name="NHM – Lớp 1", **extra):
    res = corp.post(
        f"{BASE}/classes/",
        {"client": client_id, "courseId": course.pk, "name": name, "location": "Hội sở", **extra},
        format="json",
    )
    return res


# ---------------------------------------------------------------- clients & permissions
def test_client_gets_a_legal_entity_and_roles_are_enforced(corp, client_id, staff_client):
    units = corp.get(f"{BASE}/units/", {"client": client_id}).json()
    assert [(u["kind"], u["name"]) for u in units] == [("legal_entity", "Ngân hàng Mẫu")]
    assert corp.get(f"{BASE}/clients/{client_id}/").json()["emailDomains"] == ["nhm.test"]

    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    assert finance.get(f"{BASE}/clients/").status_code == 200
    assert finance.post(f"{BASE}/clients/", {"name": "X", "code": "X"}).status_code == 403
    assert staff_client(Role.CONTENT_SEO).get(f"{BASE}/clients/").status_code == 403
    assert staff_client(Role.SALES_CRM).get(f"{BASE}/classes/").status_code == 403


# ---------------------------------------------------------------- contracts
def test_contract_with_rates_replaced_as_a_whole(corp, client_id, course):
    res = corp.post(
        f"{BASE}/contracts/",
        {
            "client": client_id,
            "number": "01/2026/HĐĐT",
            "validFrom": "2026-01-01",
            "validTo": "2026-12-31",
            "value": 500_000_000,
            "rates": [
                {"kind": "per_learner", "course": course.pk, "unitPrice": 2_000_000, "vatRate": 8},
                {"kind": "per_session", "unitPrice": 5_000_000},
            ],
        },
        format="json",
    )
    assert res.status_code == 201, res.content
    contract = res.json()
    assert len(contract["rates"]) == 2 and contract["rates"][0]["courseTitle"] in (course.title, "")
    res = corp.patch(
        f"{BASE}/contracts/{contract['id']}/",
        {"rates": [{"kind": "lump_sum", "unitPrice": 1}]},
        format="json",
    )
    assert [r["kind"] for r in res.json()["rates"]] == ["lump_sum"]
    bad = corp.post(
        f"{BASE}/contracts/",
        {"client": client_id, "number": "X", "validFrom": "2026-02-01", "validTo": "2026-01-01"},
    )
    assert bad.status_code == 400 and "validTo" in bad.json()


# ---------------------------------------------------------------- plans and versions
def test_plan_is_frozen_once_approved_and_revised_as_a_new_version(corp, client_id, course, staff_client):
    res = corp.post(
        f"{BASE}/plans/",
        {
            "client": client_id,
            "name": "Kế hoạch đào tạo 2026",
            "period": "2026",
            "lines": [
                {
                    "title": "Kỹ năng bán hàng",
                    "course": course.pk,
                    "plannedClasses": 2,
                    "plannedLearners": 60,
                },
                {"title": "Quản trị rủi ro", "plannedClasses": 1},
            ],
        },
        format="json",
    )
    assert res.status_code == 201, res.content
    plan = res.json()
    assert [line["title"] for line in plan["lines"]] == ["Kỹ năng bán hàng", "Quản trị rủi ro"]
    assert (
        staff_client(Role.ACADEMIC_MANAGEMENT).post(f"{BASE}/plans/{plan['id']}/approve/").status_code == 403
    )
    assert corp.post(f"{BASE}/plans/{plan['id']}/approve/").json()["status"] == "approved"
    assert corp.patch(f"{BASE}/plans/{plan['id']}/", {"name": "Đổi tên"}, format="json").status_code == 400

    v2 = corp.post(f"{BASE}/plans/{plan['id']}/revise/").json()
    assert v2["version"] == 2 and v2["status"] == "draft" and len(v2["lines"]) == 2
    assert corp.post(f"{BASE}/plans/{plan['id']}/revise/").status_code == 400  # one successor only
    corp.post(f"{BASE}/plans/{v2['id']}/approve/")
    assert TrainingPlan.objects.get(pk=plan["id"]).status == "superseded"


# ---------------------------------------------------------------- classes
def test_class_is_a_private_intake_with_its_b2b_side(corp, client_id, course):
    res = _class(corp, client_id, course, capacity=30, issueCertificate=True)
    assert res.status_code == 201, res.content
    body = res.json()
    cohort = Cohort.objects.get(pk=body["cohort"])
    assert cohort.audience == "corporate" and cohort.location == "Hội sở" and cohort.capacity == 30
    assert body["name"] == "NHM – Lớp 1" and body["courseTitle"] == course.title and body["issueCertificate"]

    assert _class(corp, client_id, course).status_code == 400  # same name on the same course
    res = corp.patch(
        f"{BASE}/classes/{body['id']}/", {"name": "NHM – Lớp 1A", "status": "running"}, format="json"
    )
    assert (
        res.status_code == 200 and res.json()["name"] == "NHM – Lớp 1A" and res.json()["status"] == "running"
    )

    other = corp.post(f"{BASE}/clients/", {"name": "Khác", "code": "KH"}).json()["id"]
    contract = corp.post(f"{BASE}/contracts/", {"client": other, "number": "K1"}).json()["id"]
    res = _class(corp, client_id, course, name="Lớp 2", contract=contract)
    assert res.status_code == 400 and "contract" in res.json()


def test_corporate_sessions_are_managed_by_corporate_staff(corp, client_id, course, staff_client):
    class_id = _class(corp, client_id, course).json()["id"]
    cohort = Cohort.objects.get(corporate_class=class_id)
    start = timezone.now() + timedelta(days=3)
    payload = {
        "sessions": [
            {
                "title": "Buổi 1",
                "startsAt": start.isoformat(),
                "endsAt": (start + timedelta(hours=3)).isoformat(),
            }
        ],
        "sync": False,
    }
    url = f"/api/v1/staff/cohorts/{cohort.pk}/sessions/"
    assert corp.put(url, payload, format="json").status_code == 200
    assert cohort.sessions.count() == 1
    # Training staff edit public intakes, not a client's class; corporate staff not public intakes.
    assert staff_client(Role.ACADEMIC_MANAGEMENT).put(url, payload, format="json").status_code == 403
    public = Cohort.objects.create(course=course, name="Khóa 1")
    assert corp.put(f"/api/v1/staff/cohorts/{public.pk}/sessions/", payload, format="json").status_code == 403


# ---------------------------------------------------------------- class lists
def test_listing_learners_matches_people_and_keeps_manager_history(corp, client_id, course):
    class_id = _class(corp, client_id, course).json()["id"]
    known = Learner.objects.create(full_name="Trần Thị Bình", email="binh@nhm.test", phone="0912000111")
    url = f"{BASE}/classes/{class_id}/enrollments/"
    row = {
        "fullName": "Trần Thị Bình",
        "email": "BINH@nhm.test",
        "employeeCode": "NV01",
        "managerEmail": "ql1@nhm.test",
    }
    res = corp.post(url, row, format="json")
    assert res.status_code == 201, res.content
    assert res.json()["learnerCode"] == known.code and res.json()["managerEmail"] == "ql1@nhm.test"

    # Listed again with a new manager: same listing, the employment history keeps both managers.
    corp.post(url, {**row, "managerEmail": "ql2@nhm.test"}, format="json")
    assert CorporateEnrollment.objects.count() == 1
    rows = corp.get(url).json()
    assert len(rows) == 1 and rows[0]["managerEmail"] in ("ql1@nhm.test", "ql2@nhm.test")
    employment = CorporateEmployee.objects.get(learner=known, valid_to__isnull=True)
    assert employment.manager_email == "ql2@nhm.test"


def test_cancel_and_transfer(corp, client_id, course):
    first = _class(corp, client_id, course).json()["id"]
    second = _class(corp, client_id, course, name="NHM – Lớp 2").json()["id"]
    listing = corp.post(
        f"{BASE}/classes/{first}/enrollments/",
        {"fullName": "Lê Văn Cường", "email": "cuong@nhm.test"},
        format="json",
    ).json()
    moved = corp.post(f"{BASE}/enrollments/{listing['id']}/transfer/", {"targetClass": second}, format="json")
    assert moved.status_code == 201 and moved.json()["transferredFrom"] == listing["id"]
    assert CorporateEnrollment.objects.get(pk=listing["id"]).status == "transferred"
    assert corp.get(f"{BASE}/classes/{second}/").json()["learners"] == 1
    res = corp.post(f"{BASE}/enrollments/{moved.json()['id']}/cancel/", {"note": "Nghỉ việc"}, format="json")
    assert res.json()["status"] == "cancelled"
    assert corp.get(f"{BASE}/classes/{second}/").json()["learners"] == 0


# ---------------------------------------------------------------- employment history
def test_employment_rows_follow_the_dates(client_id):
    from apps.corporate.models import CorporateClient

    client = CorporateClient.objects.get(pk=client_id)
    learner = Learner.objects.create(full_name="Phạm An", email="an@nhm.test")
    jan, mar = date(2026, 1, 1), date(2026, 3, 1)
    first = services.ensure_employee(client, learner, on=jan, manager_email="a@nhm.test")
    assert services.ensure_employee(client, learner, on=jan, manager_email="a@nhm.test") == first
    second = services.ensure_employee(client, learner, on=mar, manager_email="b@nhm.test")
    first.refresh_from_db()
    assert first.valid_to == mar and second.valid_from == mar
    assert services.employment_on(client, learner, date(2026, 2, 1)) == first
    assert services.employment_on(client, learner, date(2026, 3, 15)) == second
    # A second change on the same day corrects that day's row instead of opening another one.
    third = services.ensure_employee(client, learner, on=mar, manager_email="c@nhm.test")
    assert third == second and CorporateEmployee.objects.filter(learner=learner).count() == 2


def test_plan_execution_against_actual(corp, client_id, course):
    from apps.corporate.models import CorporateClass, Expense

    plan = corp.post(
        f"{BASE}/plans/",
        {
            "client": client_id,
            "name": "KH 2026",
            "lines": [
                {
                    "title": "Bán hàng",
                    "course": course.pk,
                    "plannedClasses": 2,
                    "plannedLearners": 60,
                    "budget": 10_000_000,
                }
            ],
        },
        format="json",
    ).json()
    corp.post(f"{BASE}/plans/{plan['id']}/approve/")
    line_id = corp.get(f"{BASE}/plans/{plan['id']}/").json()["lines"][0]["id"]
    class_id = _class(corp, client_id, course, planLine=line_id).json()["id"]
    for email in ("a@nhm.test", "b@nhm.test"):
        corp.post(
            f"{BASE}/classes/{class_id}/enrollments/", {"fullName": email, "email": email}, format="json"
        )
    cls = CorporateClass.objects.get(pk=class_id)
    Expense.objects.create(
        client=cls.client, corporate_class=cls, description="GV", amount=3_000_000, incurred_on="2026-10-01"
    )
    Expense.objects.create(
        client=cls.client,
        corporate_class=cls,
        kind="advance",
        description="TU",
        amount=9,
        incurred_on="2026-10-01",
    )

    data = corp.get(f"{BASE}/plans/{plan['id']}/execution/").json()
    row = data["rows"][0]
    assert (row["plannedClasses"], row["classes"], row["plannedLearners"], row["learners"]) == (2, 1, 60, 2)
    assert (row["budget"], row["costs"], row["budgetUsed"]) == (
        10_000_000,
        3_000_000,
        30.0,
    )  # advance not a cost
    assert data["total"]["learners"] == 2
