"""Existing follow-up tasks get their owner: the staff member named on the task, else the lead's consultant."""

from django.db import migrations


def backfill(apps, schema_editor):
    FollowupTask = apps.get_model("crm", "FollowupTask")
    User = apps.get_model("accounts", "User")
    by_name = {}
    for u in User.objects.filter(is_staff=True):
        for key in (u.name, u.email):
            if key:
                by_name.setdefault(key.strip().lower(), u.pk)
    for task in FollowupTask.objects.filter(owner__isnull=True).select_related("order"):
        owner = by_name.get((task.assigned_to or "").strip().lower()) or task.order.assigned_to_id
        if owner:
            FollowupTask.objects.filter(pk=task.pk).update(owner_id=owner)


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0014_lead_follow_up"),
        ("accounts", "0004_lead_follow_up"),
    ]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
