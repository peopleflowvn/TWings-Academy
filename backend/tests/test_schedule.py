"""Periodic jobs run by the worker (apps.core.schedule): next run times, one queued run per job."""

from datetime import datetime

import pytest

from apps.core.schedule import SCHEDULE, VN, Daily, Every, ensure_schedule, run_periodic

pytestmark = pytest.mark.django_db


def at(*args):
    return datetime(*args, tzinfo=VN)


def test_next_run_times_are_vietnam_clock_times():
    assert Every(minutes=10).next_after(at(2026, 10, 8, 10, 3, 59)) == at(2026, 10, 8, 10, 10)
    assert Every(minutes=30).next_after(at(2026, 10, 8, 10, 30)) == at(2026, 10, 8, 11, 0)
    assert Daily(hour=9, minute=0).next_after(at(2026, 10, 8, 9, 0)) == at(2026, 10, 9, 9, 0)
    assert Daily(hour=0, minute=15).next_after(at(2026, 10, 8, 23, 50)) == at(2026, 10, 9, 0, 15)
    hourly = Daily(minute=5, hours=tuple(range(7, 22)))
    assert hourly.next_after(at(2026, 10, 8, 13, 10)) == at(2026, 10, 8, 14, 5)
    assert hourly.next_after(at(2026, 10, 8, 21, 30)) == at(2026, 10, 9, 7, 5)
    # A UTC "now" is read on the Vietnam clock (UTC+7).
    utc_now = datetime.fromisoformat("2026-10-08T01:59:00+00:00")  # 08:59 in Vietnam
    assert Daily(hour=9, minute=0).next_after(utc_now) == at(2026, 10, 8, 9, 0)


@pytest.fixture
def db_queue(settings):
    """The real Postgres queue (tests otherwise run tasks inline, which cannot defer)."""
    settings.TASKS = {"default": {"BACKEND": "django_tasks_db.DatabaseBackend", "QUEUES": ["default"]}}


def test_every_job_gets_exactly_one_queued_next_run(db_queue):
    from django_tasks_db.models import DBTaskResult

    assert sorted(ensure_schedule()) == sorted(SCHEDULE)
    assert ensure_schedule() == []  # already queued: worker restarts and deploys add nothing
    queued = DBTaskResult.objects.filter(task_path=run_periodic.module_path)
    assert sorted(r.args_kwargs["args"][0] for r in queued) == sorted(SCHEDULE)
    assert all(r.run_after > r.enqueued_at for r in queued)


def test_a_run_queues_the_next_one_before_its_work(db_queue, monkeypatch):
    from django_tasks_db.models import DBTaskResult

    calls = []
    monkeypatch.setattr("apps.core.schedule.call_command", lambda name, **kw: calls.append(name))
    run_periodic.call("refresh_intakes")
    assert calls == ["refresh_intakes"]
    assert DBTaskResult.objects.filter(args_kwargs__args=["refresh_intakes"]).count() == 1

    def boom(name, **kw):
        raise RuntimeError("command failed")

    monkeypatch.setattr("apps.core.schedule.call_command", boom)
    DBTaskResult.objects.all().delete()
    with pytest.raises(RuntimeError):
        run_periodic.call("sync_lms_completion")
    # The chain survives a failing command: its next run was queued first.
    assert DBTaskResult.objects.filter(args_kwargs__args=["sync_lms_completion"]).count() == 1
