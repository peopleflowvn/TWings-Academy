"""/app → Tình trạng tích hợp: failed background tasks, overdue queue, periodic schedule, retry."""

from datetime import timedelta

import pytest
from django.tasks import TaskResultStatus
from django.utils import timezone

from apps.core.schedule import ensure_schedule
from apps.lms import tasks
from tests.conftest import Role

pytestmark = pytest.mark.django_db


@pytest.fixture
def db_queue(settings):
    settings.TASKS_QUEUE = "database"
    settings.TASKS = {"default": {"BACKEND": "django_tasks_db.DatabaseBackend", "QUEUES": ["default"]}}


def _failed(email="learner@example.vn"):
    from django_tasks_db.models import DBTaskResult

    result = tasks.sync_account.enqueue(email)
    row = DBTaskResult.objects.get(pk=result.id)
    row.status, row.finished_at = TaskResultStatus.FAILED, timezone.now()
    row.exception_class_path = "apps.lms.moodle.MoodleError"
    row.traceback = (
        "Traceback (most recent call last):\n  ...\napps.lms.moodle.MoodleError: Moodle trả lỗi HTTP 502"
    )
    row.save()
    return row


def test_failed_tasks_are_listed_masked_and_can_be_retried(db_queue, staff_client):
    ensure_schedule()
    row = _failed()
    admin = staff_client(Role.SUPER_ADMIN)

    health = {c["key"]: c for c in admin.get("/api/v1/staff/system/health/").json()["checks"]}
    assert health["worker"]["status"] == "warning" and "1 việc lỗi" in health["worker"]["detail"]

    data = admin.get("/api/v1/staff/system/tasks/").json()
    [failed] = data["failed"]
    assert failed["label"] == "Đồng bộ tài khoản Moodle" and failed["args"] == ["lea***@example.vn"]
    assert failed["error"].endswith("Moodle trả lỗi HTTP 502")
    assert len(data["schedule"]) == 7 and all(job["nextRun"] for job in data["schedule"])

    assert admin.post(f"/api/v1/staff/system/tasks/{row.id}/retry/").status_code == 200
    assert admin.get("/api/v1/staff/system/tasks/").json()["failed"] == []  # superseded by the new run
    assert staff_client(Role.SALES_CRM).get("/api/v1/staff/system/tasks/").status_code == 403


def test_a_stuck_queue_is_an_error_on_the_health_page(db_queue, staff_client):
    from django_tasks_db.models import DBTaskResult

    result = tasks.enroll_order.enqueue("order-1")
    DBTaskResult.objects.filter(pk=result.id).update(run_after=timezone.now() - timedelta(hours=1))
    health = {
        c["key"]: c
        for c in staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/system/health/").json()["checks"]
    }
    assert health["worker"]["status"] == "error" and "quá hạn" in health["worker"]["detail"]


def test_inline_mode_is_reported(staff_client):
    health = {
        c["key"]: c
        for c in staff_client(Role.SUPER_ADMIN).get("/api/v1/staff/system/health/").json()["checks"]
    }
    assert health["worker"]["status"] == "warning" and "chưa có worker" in health["worker"]["detail"]
