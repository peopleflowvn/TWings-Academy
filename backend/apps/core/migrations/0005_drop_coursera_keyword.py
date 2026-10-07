"""Seeded SEO keywords still advertised "chứng chỉ Coursera": TWings does not issue Coursera certificates."""

from django.db import migrations


def drop_keyword(apps, schema_editor):
    doc = apps.get_model("core", "SiteConfig").objects.filter(key="site_seo").first()
    if doc is None or not isinstance(doc.data, dict) or not isinstance(doc.data.get("defaultKeywords"), list):
        return
    keywords = [k for k in doc.data["defaultKeywords"] if "coursera" not in str(k).lower()]
    if keywords != doc.data["defaultKeywords"]:
        doc.data = {**doc.data, "defaultKeywords": keywords}
        doc.save(update_fields=["data", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("core", "0004_fix_seo_settings")]

    operations = [migrations.RunPython(drop_keyword, migrations.RunPython.noop)]
