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
