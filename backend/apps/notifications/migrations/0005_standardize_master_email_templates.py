"""
Data migration to update all seeded EmailTemplate records in the database to the
unified Master Email Layout with the TWings logo monogram badge and standardized footer.
"""

import json
from pathlib import Path
from django.conf import settings
from django.db import migrations


def forwards(apps, schema_editor):
    EmailTemplate = apps.get_model("notifications", "EmailTemplate")
    fixture_path = Path(settings.BASE_DIR) / "fixtures" / "seed_content.json"
    if not fixture_path.exists():
        return
    try:
        data = json.loads(fixture_path.read_text(encoding="utf-8"))
    except Exception:
        return

    templates = data.get("emailTemplates", [])
    for t in templates:
        code = t.get("code")
        if not code:
            continue
        EmailTemplate.objects.filter(code=code).update(
            name=t.get("name", ""),
            subject=t.get("subject", ""),
            body=t.get("body", ""),
            description=t.get("description", ""),
            variables=t.get("variables", []),
        )


class Migration(migrations.Migration):
    dependencies = [("notifications", "0004_emaillog_cc_corporate")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
