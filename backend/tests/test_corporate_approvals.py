"""Two-level approval: from the threshold up, a second, different person with corporate.approve_final."""

from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.rbac import Role
from tests.conftest import make_staff
from tests.test_corporate_acceptance import URL, setup  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def people():
    return (
        _client(make_staff(Role.CORPORATE_TRAINING)),
        _client(make_staff(Role.CORPORATE_TRAINING)),
        _client(make_staff(Role.SUPER_ADMIN)),
    )


def test_acceptance_above_threshold_needs_two_people(setup, people, settings):  # noqa: F811
    settings.CORPORATE_SECOND_APPROVAL_FROM = {"acceptance": 10_000_000, "expense": 0}
    contract, _ = setup
    corp, other, boss = people
    batch = corp.post(URL, {"contract": contract.pk, "title": "Đợt 1"}, format="json").json()
    b = f"{URL}{batch['id']}/"
    assert batch["approval"]["levels"] == 2  # 17.480.000 đ
    corp.post(f"{b}submit/")

    first = corp.post(f"{b}approve/").json()
    assert (first["status"], first["approval"]["firstBy"]) == ("submitted", "corporate_training")
    assert boss.post(f"{b}accept/", {"invoiceNumber": "1"}, format="json").status_code == 400

    again = boss.post(f"{b}approve/")  # a different person holding approve_final (super admin)
    assert again.json()["status"] == "approved"

    # The first approver cannot also give the final approval; nor can someone without approve_final.
    batch2 = _second_batch(corp, contract)
    corp.post(f"{batch2}approve/")
    assert "người khác" in corp.post(f"{batch2}approve/").json()["detail"]
    assert "Duyệt cấp cuối" in other.post(f"{batch2}approve/").json()["detail"]

    # Back to draft: approvals start over.
    assert corp.post(f"{batch2}back-to-draft/").json()["approval"]["firstBy"] == ""


def _second_batch(corp, contract):
    from apps.corporate.models import AcceptanceBatch, AcceptanceLine

    batch = AcceptanceBatch.objects.create(contract=contract, title="Điều chỉnh", status="submitted")
    AcceptanceLine.objects.create(batch=batch, kind="adjustment", description="Bổ sung", amount=20_000_000)
    return f"{URL}{batch.pk}/"


def test_below_threshold_one_approver(setup, people):  # noqa: F811
    contract, _ = setup
    corp, _, _ = people
    batch = corp.post(URL, {"contract": contract.pk, "title": "Đợt 1"}, format="json").json()
    assert batch["approval"]["levels"] == 1  # default threshold 100.000.000 đ
    corp.post(f"{URL}{batch['id']}/submit/")
    assert corp.post(f"{URL}{batch['id']}/approve/").json()["status"] == "approved"


def test_expense_two_levels_and_edit_resets(setup, people, settings):  # noqa: F811
    settings.CORPORATE_SECOND_APPROVAL_FROM = {"acceptance": 0, "expense": 5_000_000}
    _, cls = setup
    corp, other, boss = people
    url = "/api/v1/staff/corporate/expenses/"
    body = {
        "corporateClass": cls.pk,
        "incurredOn": date.today().isoformat(),
        "description": "Thuê hội trường",
    }
    small = corp.post(url, {**body, "amount": 1_000_000}, format="json").json()
    assert corp.post(f"{url}{small['id']}/approve/").json()["approvedByName"] == "corporate_training"

    big = corp.post(url, {**body, "amount": 4_000_000, "vatAmount": 1_000_000}, format="json").json()
    first = corp.post(f"{url}{big['id']}/approve/").json()
    assert (first["approvedAt"], first["approval"]["levels"], first["approval"]["firstBy"]) == (
        None,
        2,
        "corporate_training",
    )
    assert other.post(f"{url}{big['id']}/approve/").status_code == 400  # no approve_final

    edited = corp.put(
        f"{url}{big['id']}/", {**body, "amount": 4_500_000, "vatAmount": 1_000_000}, format="json"
    )
    assert edited.json()["approval"]["firstBy"] == ""  # changed after the first approval
    corp.post(f"{url}{big['id']}/approve/")
    assert boss.post(f"{url}{big['id']}/approve/").json()["approvedAt"]
