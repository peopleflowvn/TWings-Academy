"""
Duplicate flags on both sides: until now only the later registration of a person for a course was
flagged, so the earlier one showed nothing in the pipeline. Recompute them for every learner involved.
"""

from django.db import migrations


def refresh(apps, schema_editor):
    from apps.crm.learners import refresh_duplicate_flags

    Order = apps.get_model("crm", "Order")
    learners = set(Order.objects.filter(is_duplicate=True).values_list("learner_id", flat=True))
    for learner_id in learners:
        refresh_duplicate_flags(learner_id)


class Migration(migrations.Migration):
    dependencies = [("crm", "0023_stages_list")]

    operations = [migrations.RunPython(refresh, migrations.RunPython.noop)]
