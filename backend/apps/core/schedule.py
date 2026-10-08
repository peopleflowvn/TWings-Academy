"""
Periodic jobs, run by the worker container (python manage.py db_worker): no host cron.

Each job is a management command. Its run is a queued task (run_periodic) that first queues its own next
run, then runs the command, so the chain survives a failing command; ensure_schedule() (run when the
worker starts and on every deploy) re-creates any missing link. At most one future run per job is queued.
Times are Vietnam time, whatever the server's time zone.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.management import call_command
from django.tasks import task
from django.utils import timezone

logger = logging.getLogger(__name__)

VN = ZoneInfo("Asia/Ho_Chi_Minh")


@dataclass(frozen=True)
class Every:
    """Every N minutes, aligned on the clock (every 10 min: :00, :10, :20...)."""

    minutes: int

    def next_after(self, now: datetime) -> datetime:
        local = now.astimezone(VN).replace(second=0, microsecond=0)
        step = self.minutes - (local.hour * 60 + local.minute) % self.minutes
        return local + timedelta(minutes=step)


@dataclass(frozen=True)
class Daily:
    """Every day at hour:minute; with `hours`, every one of those hours at :minute."""

    minute: int
    hour: int = 0
    hours: tuple[int, ...] = ()

    def next_after(self, now: datetime) -> datetime:
        local = now.astimezone(VN).replace(second=0, microsecond=0)
        hours = self.hours or (self.hour,)
        for day in range(2):
            base = (local + timedelta(days=day)).replace(minute=self.minute)
            for hour in hours:
                candidate = base.replace(hour=hour)
                if candidate > local:
                    return candidate
        raise AssertionError("unreachable: a run always exists within two days")


# Same times as the former /etc/cron.d/twings-* files (backup.sh stays a host cron: it needs Docker).
SCHEDULE: dict[str, Every | Daily] = {
    "sync_lms_enrollments": Every(minutes=10),  # Moodle enrolments that failed: retry
    "sync_lms_completion": Every(minutes=30),  # progress, attendance, grades, certificates
    "refresh_intakes": Daily(hour=0, minute=15),  # intake statuses (full, closed, started)
    "remind_installments": Daily(hour=9, minute=0),
    "run_journeys": Daily(hour=9, minute=30),  # journey e-mails
    "remind_appointments": Daily(minute=5, hours=tuple(range(7, 22))),  # every hour 7:05-21:05
    "prune_db_task_results": Daily(hour=3, minute=30),  # finished task rows older than 14 days
}
COMMAND_OPTIONS = {"prune_db_task_results": {"min_age_days": 14, "failed_min_age_days": 60}}


def _pending(name: str) -> bool:
    from django.tasks import TaskResultStatus
    from django_tasks_db.models import DBTaskResult

    return DBTaskResult.objects.filter(
        task_path=run_periodic.module_path,
        status=TaskResultStatus.READY,
        args_kwargs__args=[name],
    ).exists()


def schedule_next(name: str, now: datetime | None = None) -> bool:
    """Queue the next run of a job unless one is already waiting. Returns True if queued."""
    if _pending(name):
        return False
    when = SCHEDULE[name].next_after(now or timezone.now())
    run_periodic.using(run_after=when).enqueue(name)
    return True


def ensure_schedule() -> list[str]:
    """Every job has its next run queued (worker start, deploy). Returns the jobs that were missing one."""
    return [name for name in SCHEDULE if schedule_next(name)]


@task
def run_periodic(name: str) -> None:
    if name not in SCHEDULE:
        logger.error("Unknown periodic job %s (removed from SCHEDULE): not rescheduled", name)
        return
    schedule_next(name)  # first, so a failing command does not break the chain
    call_command(name, **COMMAND_OPTIONS.get(name, {}))
