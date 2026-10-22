"""Class documents: private uploads with versions, checklist ticked by the system or by an upload."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.rbac import Role
from apps.corporate import services
from apps.crm.models import Learner

pytestmark = pytest.mark.django_db


@pytest.fixture
def cls(course):
    client = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    corporate_class = services.create_class(
        client=client, course=course, name="NHM – Lớp 1", cohort_fields={}
    )
    services.list_learner(corporate_class, Learner.objects.create(full_name="An", email="an@nhm.test"))
    return corporate_class


def _pdf(name="diem-danh.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 signed sheet", content_type="application/pdf")


def test_upload_versions_checklist_and_download(cls, staff_client):
    corp = staff_client(Role.CORPORATE_TRAINING)
    url = f"/api/v1/staff/corporate/classes/{cls.pk}/documents/"
    checklist = {row["kind"]: row for row in corp.get(url).json()["checklist"]}
    assert checklist["roster"]["done"] and checklist["roster"]["source"] == "system"  # the class list exists
    assert not checklist["attendance"]["done"] and not checklist["results"]["done"]

    first = corp.post(
        url, {"kind": "attendance", "title": "Điểm danh có ký", "file": _pdf()}, format="multipart"
    )
    assert first.status_code == 201, first.content
    second = corp.post(
        url, {"kind": "attendance", "title": "Điểm danh có ký", "file": _pdf()}, format="multipart"
    )
    assert (first.json()["version"], second.json()["version"]) == (1, 2)
    bad = corp.post(url, {"kind": "other", "file": SimpleUploadedFile("x.exe", b"MZ")}, format="multipart")
    assert bad.status_code == 400

    data = corp.get(url).json()
    assert len(data["documents"]) == 2 and "fileKey" not in data["documents"][0]
    checklist = {row["kind"]: row for row in data["checklist"]}
    assert checklist["attendance"]["done"] and checklist["attendance"]["source"] == "upload"

    finance = staff_client(Role.FINANCE_ACCOUNTANT)
    download = finance.get(f"/api/v1/staff/corporate/documents/{first.json()['id']}/download/")
    assert download.status_code == 200 and b"".join(download.streaming_content).startswith(b"%PDF")
    assert finance.post(url, {"kind": "other", "file": _pdf()}, format="multipart").status_code == 403


def test_contract_and_acceptance_documents(cls, staff_client):
    from apps.corporate.models import AcceptanceBatch, ClassDocument, ServiceContract

    contract = ServiceContract.objects.create(client=cls.client, number="HD-01")
    batch = AcceptanceBatch.objects.create(contract=contract, title="Đợt 1")
    corp = staff_client(Role.CORPORATE_TRAINING)
    base = "/api/v1/staff/corporate"

    signed = corp.post(
        f"{base}/contracts/{contract.pk}/documents/",
        {"kind": "contract", "file": _pdf("hop-dong-da-ky.pdf")},
        format="multipart",
    )
    assert signed.status_code == 201, signed.content
    record = corp.post(
        f"{base}/acceptances/{batch.pk}/documents/",
        {"kind": "acceptance_record", "file": _pdf("bien-ban-da-ky.pdf")},
        format="multipart",
    )
    assert record.status_code == 201, record.content

    assert [
        d["fileName"] for d in corp.get(f"{base}/contracts/{contract.pk}/documents/").json()["documents"]
    ] == ["hop-dong-da-ky.pdf"]
    doc = ClassDocument.objects.get(acceptance=batch)
    assert doc.client_id == cls.client_id and doc.corporate_class_id is None
    assert corp.get(f"{base}/documents/{doc.pk}/download/").status_code == 200
    # Uploading to a contract needs the client right; seeing documents needs view only.
    sales = staff_client(Role.ACADEMIC_MANAGEMENT)
    assert sales.get(f"{base}/contracts/{contract.pk}/documents/").status_code == 200
    assert (
        sales.post(
            f"{base}/contracts/{contract.pk}/documents/", {"kind": "contract", "file": _pdf()}
        ).status_code
        == 403
    )
