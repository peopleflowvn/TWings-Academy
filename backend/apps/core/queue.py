"""Helpers for django.tasks (see config TASKS and apps/core/schedule.py)."""

from django.conf import settings


def enqueue_once(task, *args):
    """
    Queue a task unless the same task with the same arguments is already waiting (Postgres queue).
    A burst of identical requests (e.g. a teacher grading a whole class) then costs one run.
    """
    if settings.TASKS_QUEUE == "database":
        from django.tasks import TaskResultStatus
        from django_tasks_db.models import DBTaskResult

        waiting = DBTaskResult.objects.filter(
            task_path=task.module_path, status=TaskResultStatus.READY, args_kwargs__args=list(args)
        )
        if waiting.exists():
            return None
    return task.enqueue(*args)
