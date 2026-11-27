"""Training locations: a list (/app → Danh mục) a course picks several of; renames reach the courses."""

import pytest

from apps.accounts.rbac import Role
from apps.catalog.models import Course
from apps.crm import lists
from apps.crm.models import ListItem

pytestmark = pytest.mark.django_db


def test_a_course_picks_several_locations(course, staff_client):
    ListItem.objects.get_or_create(kind="training_location", value="TP. Hồ Chí Minh – 123 Lê Lợi")
    admin = staff_client(Role.SUPER_ADMIN)
    res = admin.patch(
        f"/api/v1/staff/courses/{course.pk}/",
        {"locations": ["học trực tuyến (lms)", "TP. Hồ Chí Minh – 123 Lê Lợi", "Học trực tuyến (LMS)"]},
        format="json",
    )
    assert res.status_code == 200, res.content
    course.refresh_from_db()
    assert course.locations == ["Học trực tuyến (LMS)", "TP. Hồ Chí Minh – 123 Lê Lợi"]
    assert course.location_text == "Học trực tuyến (LMS) · TP. Hồ Chí Minh – 123 Lê Lợi"
    assert "trainingLocations" in admin.get("/api/v1/staff/crm/lists/").json()

    assert lists.usage("training_location")["Học trực tuyến (LMS)"] == 1
    assert lists.replace_in_records("training_location", "Học trực tuyến (LMS)", "Online (LMS)") == 1
    renamed = Course.objects.get(pk=course.pk)
    assert renamed.locations == ["Online (LMS)", "TP. Hồ Chí Minh – 123 Lê Lợi"]
    assert renamed.location_text == "Online (LMS) · TP. Hồ Chí Minh – 123 Lê Lợi"

    admin.patch(f"/api/v1/staff/courses/{course.pk}/", {"locations": []}, format="json")
    course.refresh_from_db()
    assert course.locations == [] and course.location_text == ""
