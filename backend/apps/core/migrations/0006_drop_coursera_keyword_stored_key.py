"""0005 looked for "defaultKeywords" (the API's camelCase); the stored key is snake_case. Same fix, right key."""

from django.db import migrations


def drop_keyword(apps, schema_editor):
    doc = apps.get_model("core", "SiteConfig").objects.filter(key="site_seo").first()
    if doc is None or not isinstance(doc.data, dict):
        return
    data = dict(doc.data)
    for key in ("default_keywords", "defaultKeywords"):
        if isinstance(data.get(key), list):
            data[key] = [k for k in data[key] if "coursera" not in str(k).lower()]
    if data != doc.data:
        doc.data = data
        doc.save(update_fields=["data", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("core", "0005_drop_coursera_keyword")]

    operations = [migrations.RunPython(drop_keyword, migrations.RunPython.noop)]
