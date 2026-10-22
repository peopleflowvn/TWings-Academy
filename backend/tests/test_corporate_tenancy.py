"""
Tenant isolation of corporate training: with a staff member's scope narrowed to one client (the
single function apps.corporate.permissions.scoped_clients), no endpoint reads or writes another
client's data. Today everyone with corporate.view sees every client (TMS question B7); this keeps the
narrowing safe whenever it is switched on.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.rbac import Role
from apps.corporate import permissions, services
from apps.corporate.models import (
    AcceptanceBatch,
    ClassDocument,
    ClientShare,
    CorporateClient,
    Expense,
    ResultSnapshot,
    ServiceContract,
    TrainingPlan,
)
from apps.crm.models import Learner

pytestmark = pytest.mark.django_db

BASE = "/api/v1/staff/corporate"


@pytest.fixture
def two_clients(course, monkeypatch):
    mine = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    other = services.create_client(name="Ngân hàng Khác", code="NHK")
    theirs = services.create_class(client=other, course=course, name="NHK – Lớp", cohort_fields={})
    listing = services.list_learner(theirs, Learner.objects.create(full_name="Người NHK", email="x@nhk.test"))
    contract = ServiceContract.objects.create(client=other, number="NHK-01")
    objects = {
        "classes": theirs,
        "contracts": contract,
        "plans": TrainingPlan.objects.create(client=other, name="KH NHK"),
        "results": ResultSnapshot.objects.create(corporate_class=theirs, status="published"),
        "acceptances": AcceptanceBatch.objects.create(contract=contract, title="NT NHK"),
        "expenses": Expense.objects.create(
            client=other, corporate_class=theirs, description="x", amount=1, incurred_on="2026-10-01"
        ),
        "shares": ClientShare.objects.create(
            client=other, token_hash="h" * 64, title="x", expires_at="2030-01-01T00:00:00Z"
        ),
    }
    doc = ClassDocument.objects.create(
        client=other, corporate_class=theirs, kind="other", title="x", file_key="k", file_name="x.pdf"
    )
    # Narrow every staff member's scope to "mine".
    monkeypatch.setattr(
        permissions,
        "scoped_clients",
        lambda user: (
            CorporateClient.objects.filter(pk=mine.pk)
            if permissions.has_perm_code(user, "corporate.view")
            else CorporateClient.objects.none()
        ),
    )
    return mine, other, objects, listing, doc


def test_lists_and_details_hide_the_other_client(two_clients, staff_client):
    mine, other, objects, listing, doc = two_clients
    corp = staff_client(Role.CORPORATE_TRAINING)
    ids = {c["id"] for c in corp.get(f"{BASE}/clients/").json()["results"]}
    assert ids == {mine.pk}
    for prefix, obj in objects.items():
        listed = corp.get(f"{BASE}/{prefix}/").json()
        rows = listed["results"] if isinstance(listed, dict) else listed
        assert obj.pk not in {r["id"] for r in rows}, prefix
        assert corp.get(f"{BASE}/{prefix}/{obj.pk}/").status_code == 404, prefix
    assert corp.get(f"{BASE}/clients/{other.pk}/").status_code == 404
    theirs = objects["classes"]
    for path in ("enrollments", "attendance", "surveys", "documents", "invitations"):
        assert corp.get(f"{BASE}/classes/{theirs.pk}/{path}/").status_code == 404, path
    assert corp.get(f"{BASE}/documents/{doc.pk}/download/").status_code == 404
    assert corp.get(f"/api/v1/staff/cohorts/{theirs.cohort_id}/sessions/").status_code == 403
    dashboard = corp.get(f"{BASE}/dashboard/").json()
    assert all(r["clientCode"] == "NHM" for r in dashboard["classes"])


def test_writes_cannot_target_the_other_client(two_clients, staff_client, course):
    mine, other, objects, listing, doc = two_clients
    corp = staff_client(Role.CORPORATE_TRAINING)
    theirs = objects["classes"]
    assert (
        corp.post(f"{BASE}/contracts/", {"client": other.pk, "number": "X"}, format="json").status_code == 403
    )
    assert corp.post(f"{BASE}/plans/", {"client": other.pk, "name": "X"}, format="json").status_code == 403
    new_class = {"client": other.pk, "courseId": course.pk, "name": "Lớp lạ"}
    assert corp.post(f"{BASE}/classes/", new_class, format="json").status_code == 403
    assert (
        corp.post(
            f"{BASE}/classes/{theirs.pk}/enrollments/", {"fullName": "A", "email": "a@a.vn"}, format="json"
        ).status_code
        == 404
    )
    assert corp.post(f"{BASE}/enrollments/{listing.pk}/cancel/", {}, format="json").status_code == 404
    upload = {
        "kind": "roster",
        "corporateClass": theirs.pk,
        "file": SimpleUploadedFile("a.xlsx", b"PK\x03\x04"),
    }
    assert corp.post(f"{BASE}/imports/", upload, format="multipart").status_code == 403
    assert (
        corp.post(f"{BASE}/communications/", {"corporateClass": theirs.pk}, format="json").status_code == 403
    )
    assert (
        corp.post(
            f"{BASE}/acceptances/", {"contract": objects["contracts"].pk, "title": "X"}, format="json"
        ).status_code
        == 403
    )
    expense = {"corporateClass": theirs.pk, "description": "x", "amount": 1, "incurredOn": "2026-10-01"}
    assert corp.post(f"{BASE}/expenses/", expense, format="json").status_code == 403
    assert corp.post(f"{BASE}/shares/", {"client": other.pk, "title": "x"}, format="json").status_code == 403
    assert corp.get(f"{BASE}/acceptances/eligible/", {"contract": objects["contracts"].pk}).status_code == 404
