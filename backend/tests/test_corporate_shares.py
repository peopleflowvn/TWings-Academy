"""Client report links: read-only, one client's published results only, expire and can be revoked."""

from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.accounts.rbac import Role
from apps.corporate import services
from apps.corporate.models import ClientShare, ResultSnapshot

pytestmark = pytest.mark.django_db


@pytest.fixture
def clients(course):
    mine = services.create_client(name="Ngân hàng Mẫu", code="NHM")
    other = services.create_client(name="Ngân hàng Khác", code="NHK")
    published = services.create_class(client=mine, course=course, name="NHM – Lớp đã chốt", cohort_fields={})
    learners = [
        {
            "name": "Trần Thị Bình",
            "employee_code": "NV01",
            "unit": "Bán lẻ",
            "sessions_attended": 3,
            "sessions_taken": 4,
            "attendance_rate": 75,
            "grade_percent": 82,
            "result": "passed",
        }
    ]
    kpis = {"learners": 1, "passed": 1, "completion_rate": 100.0, "attendance_rate": 75.0, "sessions": 4}
    ResultSnapshot.objects.create(corporate_class=published, status="published", learners=learners, kpis=kpis)
    services.create_class(client=mine, course=course, name="NHM – Lớp chưa chốt", cohort_fields={})
    theirs = services.create_class(client=other, course=course, name="NHK – Lớp khác", cohort_fields={})
    ResultSnapshot.objects.create(corporate_class=theirs, status="published", learners=[], kpis={})
    return mine, other


def test_link_shows_only_this_clients_published_results(clients, staff_client):
    mine, other = clients
    corp = staff_client(Role.CORPORATE_TRAINING)
    url = "/api/v1/staff/corporate/shares/"
    assert (
        staff_client(Role.ACADEMIC_MANAGEMENT)
        .post(url, {"client": mine.pk, "title": "x"}, format="json")
        .status_code
        == 403
    )
    res = corp.post(url, {"client": mine.pk, "title": "Báo cáo quý 4", "days": 30}, format="json")
    assert res.status_code == 201, res.content
    link = res.json()["url"]
    path = link[link.index("/doi-tac/dn/") :]
    assert "tokenHash" not in res.json()

    page = Client().get(path)
    html = page.content.decode()
    assert page.status_code == 200 and "Trần Thị Bình" in html and "NHM – Lớp đã chốt" in html
    assert "NHM – Lớp chưa chốt" not in html and "NHK – Lớp khác" not in html  # unpublished / other client
    assert page["Cache-Control"] == "private, no-store" and "noindex" in page["X-Robots-Tag"]
    share = ClientShare.objects.get()
    assert share.view_count == 1

    corp.post(f"{url}{share.pk}/revoke/")
    assert Client().get(path).status_code == 404
    assert Client().get("/doi-tac/dn/not-a-token/").status_code == 404


def test_expired_link_and_class_only_figures(clients, staff_client):
    mine, other = clients
    corp = staff_client(Role.CORPORATE_TRAINING)
    res = corp.post(
        "/api/v1/staff/corporate/shares/",
        {"client": mine.pk, "title": "Chỉ số liệu lớp", "includeLearners": False},
        format="json",
    ).json()
    path = res["url"][res["url"].index("/doi-tac/dn/") :]
    html = Client().get(path).content.decode()
    assert "NHM – Lớp đã chốt" in html and "Trần Thị Bình" not in html  # class figures only
    ClientShare.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    assert Client().get(path).status_code == 404
