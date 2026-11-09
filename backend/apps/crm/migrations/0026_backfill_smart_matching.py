"""
Smart matching on the data already there: the learners' e-mail / name keys, then every learner looked at
for other records that may be the same person (LearnerMatch, for staff review), then the duplicate flags
of the registrations ("same" / "possible").
"""

from django.db import migrations


def backfill(apps, schema_editor):
    from apps.crm.learners import refresh_duplicate_flags
    from apps.crm.matching import email_key, name_key, scan_all
    from apps.crm.models import Learner, Order

    for learner in Learner.objects.only("pk", "email", "full_name").iterator():
        Learner.objects.filter(pk=learner.pk).update(
            email_index=email_key(learner.email), name_index=name_key(learner.full_name)[:200]
        )
    scan_all()
    learners = Order.objects.filter(parent__isnull=True, learner__isnull=False).values_list("learner_id", flat=True)
    for learner_id in set(learners):
        refresh_duplicate_flags(learner_id, _partners=False)
    Order.objects.filter(is_duplicate=True, duplicate_kind="").update(duplicate_kind="same")


class Migration(migrations.Migration):
    dependencies = [("crm", "0025_smart_matching")]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
