"""
Background tasks seen from /app (Tình trạng tích hợp): is the worker keeping up, what failed, when the
periodic jobs run next. Reads django-tasks-db's table; nothing here runs tasks except an explicit retry.
"""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.utils.module_loading import import_string

from .schedule import SCHEDULE, run_periodic

LABELS = {
    "apps.lms.tasks.enroll_order": "Ghi danh Moodle cho đơn",
    "apps.lms.tasks.revoke_order": "Hủy ghi danh Moodle (hoàn/hủy đơn)",
    "apps.lms.tasks.provision_cohort": "Tạo / cập nhật khóa Moodle của đợt",
    "apps.lms.tasks.sync_account": "Đồng bộ tài khoản Moodle",
    "apps.lms.tasks.moodle_event": "Sự kiện học tập từ Moodle",
}
JOB_LABELS = {
    "sync_lms_enrollments": "Thử lại ghi danh lỗi",
    "sync_lms_completion": "Đồng bộ tiến độ, chuyên cần, điểm, chứng chỉ",
    "refresh_intakes": "Cập nhật trạng thái đợt khai giảng",
    "remind_installments": "Nhắc trả góp",
    "run_journeys": "Email theo hành trình",
    "remind_appointments": "Nhắc lịch hẹn tư vấn",
    "prune_db_task_results": "Dọn lịch sử tác vụ cũ",
}
OVERDUE_AFTER = timedelta(minutes=10)  # a due task still waiting this long: the worker is not running
FAILED_WINDOW = timedelta(days=7)


def queue_enabled() -> bool:
    return settings.TASKS_QUEUE == "database"


def _mask(value):
    """E-mail addresses (sync_account) are shown as abc***@domain."""
    if isinstance(value, str) and "@" in value:
        local, _, domain = value.partition("@")
        return f"{local[:3]}***@{domain}"
    return value


def label(row) -> str:
    args = row.args_kwargs.get("args", [])
    if row.task_path == run_periodic.module_path and args:
        return f"Việc định kỳ: {JOB_LABELS.get(args[0], args[0])}"
    return LABELS.get(row.task_path, row.task_path.rsplit(".", 1)[-1])


def _error(row) -> str:
    lines = [line for line in (row.traceback or "").strip().splitlines() if line.strip()]
    return (lines[-1] if lines else row.exception_class_path.rsplit(".", 1)[-1])[:300]


def summary() -> dict:
    """Counts for the health check: due tasks waiting too long, failures of the last 24 hours."""
    if not queue_enabled():
        return {"enabled": False}
    from django.tasks import TaskResultStatus
    from django_tasks_db.models import DBTaskResult

    now = timezone.now()
    rows = DBTaskResult.objects
    return {
        "enabled": True,
        "overdue": rows.filter(status=TaskResultStatus.READY, run_after__lt=now - OVERDUE_AFTER).count(),
        "failed_24h": len(
            unresolved(rows.filter(status=TaskResultStatus.FAILED, finished_at__gte=now - timedelta(days=1)))
        ),
        "running": rows.filter(status=TaskResultStatus.RUNNING).count(),
    }


def unresolved(failed_rows) -> list:
    """Failures with no newer run of the same task and arguments (retried, or a later periodic run)."""
    from django.tasks import TaskResultStatus
    from django_tasks_db.models import DBTaskResult

    out = []
    for row in failed_rows:
        newer = DBTaskResult.objects.filter(
            task_path=row.task_path, args_kwargs=row.args_kwargs, enqueued_at__gt=row.enqueued_at
        ).exclude(status=TaskResultStatus.FAILED)
        if not newer.exists():
            out.append(row)
    return out


def details() -> dict:
    if not queue_enabled():
        return {"enabled": False, "failed": [], "schedule": []}
    from django.tasks import TaskResultStatus
    from django_tasks_db.models import DBTaskResult

    now = timezone.now()
    failed = unresolved(
        DBTaskResult.objects.filter(
            status=TaskResultStatus.FAILED, finished_at__gte=now - FAILED_WINDOW
        ).order_by("-finished_at")[:200]
    )[:50]
    periodic = DBTaskResult.objects.filter(task_path=run_periodic.module_path)
    schedule = []
    for name in SCHEDULE:
        runs = periodic.filter(args_kwargs__args=[name])
        upcoming = runs.filter(status=TaskResultStatus.READY).order_by("run_after").first()
        last = runs.exclude(status=TaskResultStatus.READY).order_by("-enqueued_at").first()
        schedule.append(
            {
                "job": name,
                "label": JOB_LABELS.get(name, name),
                "next_run": upcoming.run_after if upcoming else None,
                "last_run": (last.finished_at or last.started_at) if last else None,
                "last_status": last.status if last else None,
            }
        )
    return {
        "enabled": True,
        **summary(),
        "failed": [
            {
                "id": str(row.id),
                "label": label(row),
                "args": [_mask(a) for a in row.args_kwargs.get("args", [])],
                "error": _error(row),
                "finished_at": row.finished_at,
                "attempts": len(row.worker_ids),
            }
            for row in failed
        ],
        "schedule": schedule,
    }


def retry(task_id: str):
    """
    Queue the same task with the same arguments again. The failed row stays as history and leaves the
    /app list because a newer run of the same task and arguments now exists (see unresolved()).
    """
    from django.tasks import TaskResultStatus
    from django_tasks_db.models import DBTaskResult

    row = DBTaskResult.objects.get(pk=task_id, status=TaskResultStatus.FAILED)
    if not row.task_path.startswith("apps."):  # only TWings' own tasks
        raise ValueError(row.task_path)
    task = import_string(row.task_path)
    return task.enqueue(*row.args_kwargs.get("args", []), **row.args_kwargs.get("kwargs", {}))
