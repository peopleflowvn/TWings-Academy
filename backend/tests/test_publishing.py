"""Journey step 1 – authoring and pricing: draft -> review -> published, checklist, price control, preview."""

import pytest

from apps.catalog.models import Cohort, Course, Instructor, Program
from apps.core.models import AuditLog
from tests.conftest import Role

pytestmark = pytest.mark.django_db
URL = "/api/v1/staff/courses/"


@pytest.fixture
def ready_course(db):
    course = Course.objects.create(
        slug="giao-dich-vien",
        title="Giao dịch viên ngân hàng thực chiến",
        subtitle="Nghiệp vụ quầy, sản phẩm, chăm sóc khách hàng",
        description="Khóa học " * 40,
        thumbnail="https://cdn.example/gdv.jpg",
        category="Ngân Hàng & Tín Dụng",
        level="Fresher",
        delivery_format="online_external_lms",
        price=5_000_000,
        syllabus=[
            {
                "id": "m",
                "title": "M",
                "lessons": [{"id": str(i), "title": "L", "type": "video"} for i in range(3)],
            }
        ],
    )
    course.instructors.add(Instructor.objects.create(name="GV A", title="Trưởng phòng"))
    return course


def _flow(client, course, action, **extra):
    return client.post(f"{URL}{course.pk}/workflow/", {"action": action, **extra}, format="json")


def test_new_courses_start_as_unpublished_drafts(staff_client, api):
    res = staff_client(Role.ACADEMIC_MANAGEMENT).post(
        URL, {"slug": "moi", "title": "Khóa mới", "status": "published", "isPublished": True}, format="json"
    )
    assert res.status_code == 201
    course = Course.objects.get(slug="moi")
    assert course.status == "draft" and not course.is_published  # cannot be self-published
    assert api.get("/api/v1/public/courses/moi/").status_code == 404


def test_checklist_blocks_incomplete_courses(staff_client, ready_course):
    empty = Course.objects.create(slug="trong", title="Trống")
    editor = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = _flow(editor, empty, "submit")
    assert res.status_code == 400 and "Giới thiệu khóa học" in res.json()["detail"]
    items = {i["key"]: i for i in editor.get(f"{URL}{ready_course.pk}/readiness/").json()}
    assert all(i["ok"] for i in items.values() if i["required"])


def test_offline_course_needs_an_open_intake(staff_client, ready_course):
    ready_course.delivery_format = "offline"
    ready_course.save()
    editor = staff_client(Role.ACADEMIC_MANAGEMENT)
    assert _flow(editor, ready_course, "submit").status_code == 400
    Cohort.objects.create(course=ready_course, name="Khóa 1", status="opening")
    assert _flow(editor, ready_course, "submit").status_code == 200


def test_review_then_publish_by_approver_only(staff_client, api, ready_course):
    editor = staff_client(Role.ACADEMIC_MANAGEMENT)
    assert _flow(editor, ready_course, "submit").json()["status"] == "review"
    assert _flow(editor, ready_course, "publish").status_code == 403  # editors cannot publish
    admin = staff_client(Role.SUPER_ADMIN)
    res = _flow(admin, ready_course, "return", note="Bổ sung lịch học")
    assert res.json()["status"] == "draft" and res.json()["reviewNote"] == "Bổ sung lịch học"
    _flow(editor, ready_course, "submit")
    res = _flow(admin, ready_course, "publish")
    assert res.status_code == 200 and res.json()["status"] == "published" and res.json()["isPublished"]
    assert api.get(f"/api/v1/public/courses/{ready_course.slug}/").status_code == 200
    assert _flow(admin, ready_course, "unpublish").json()["status"] == "archived"
    assert api.get(f"/api/v1/public/courses/{ready_course.slug}/").status_code == 404
    actions = list(AuditLog.objects.filter(object_id=ready_course.pk).values_list("action", flat=True))
    assert {"course.submit", "course.return", "course.publish", "course.unpublish"} <= set(actions)


def test_live_price_needs_pricing_permission_and_is_logged(staff_client, ready_course):
    ready_course.status = "published"
    ready_course.save()
    editor = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = editor.patch(f"{URL}{ready_course.pk}/", {"price": 1}, format="json")
    assert res.status_code == 400 and "Định giá" in res.json()["price"][0]
    assert editor.patch(f"{URL}{ready_course.pk}/", {"subtitle": "Mới"}, format="json").status_code == 200
    admin = staff_client(Role.SUPER_ADMIN)
    assert admin.patch(f"{URL}{ready_course.pk}/", {"price": 4_500_000}, format="json").status_code == 200
    log = AuditLog.objects.get(action="course.price_change", object_id=ready_course.pk)
    assert log.details["price"] == {"from": 5_000_000, "to": 4_500_000}
    history = admin.get(f"{URL}{ready_course.pk}/history/").json()
    assert {"course.price_change", "course.update"} <= {h["action"] for h in history}


def test_preview_link_shows_a_draft_without_publishing(staff_client, api, ready_course):
    url = staff_client(Role.ACADEMIC_MANAGEMENT).post(f"{URL}{ready_course.pk}/preview-link/").json()["url"]
    token = url.split("preview=")[1]
    res = api.get(f"/api/v1/public/courses/{ready_course.slug}/", {"preview": token})
    assert res.status_code == 200 and res["X-Robots-Tag"] == "noindex"
    assert api.get(f"/api/v1/public/courses/{ready_course.slug}/", {"preview": "forged"}).status_code == 404
    assert api.get(f"/api/v1/public/courses/{ready_course.slug}/").status_code == 404


def test_program_publish_and_live_price_need_permissions(staff_client, course):
    editor = staff_client(Role.ACADEMIC_MANAGEMENT)
    res = editor.post(
        "/api/v1/staff/programs/",
        {"slug": "goi", "title": "Gói", "price": 1000, "courseIds": [course.pk], "isPublished": True},
        format="json",
    )
    assert res.status_code == 400  # editors prepare programs, approvers put them on sale
    program = Program.objects.create(slug="goi2", title="Gói 2", price=1000, is_published=True)
    res = editor.patch(f"/api/v1/staff/programs/{program.pk}/", {"price": 1}, format="json")
    assert res.status_code == 400
