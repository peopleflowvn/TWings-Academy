"""
Was: recompute the duplicate flags on both sides. Now done by 0026_backfill_smart_matching (the flags
need the fields 0025 adds), so this step does nothing.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("crm", "0023_stages_list")]

    operations = []
