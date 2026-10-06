"""Seeded SEO settings: placeholder analytics ids, wrong canonical domain and a robots.txt for /cms/."""

from django.conf import settings
from django.db import migrations

PLACEHOLDERS = {"google_analytics_id": "G-TWINGS2026", "facebook_pixel_id": "1098245582910"}
ROBOTS = "User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api/\nDisallow: /learn\nDisallow: /tai-khoan"


def fix_seo_settings(apps, schema_editor):
    doc = apps.get_model("core", "SiteConfig").objects.filter(key="site_seo").first()
    if doc is None or not isinstance(doc.data, dict):
        return
    data = dict(doc.data)
    for key, placeholder in PLACEHOLDERS.items():
        if data.get(key) == placeholder:
            data[key] = ""
    if data.get("canonical_domain") in ("", "https://twings.edu.vn", None):
        data["canonical_domain"] = settings.PUBLIC_SITE_URL
    if "/cms/" in str(data.get("robots_txt", "")) or "twings.edu.vn/sitemap" in str(data.get("robots_txt", "")):
        data["robots_txt"] = ROBOTS
    if data != doc.data:
        doc.data = data
        doc.save(update_fields=["data", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("core", "0003_clear_demo_brand_images")]

    operations = [migrations.RunPython(fix_seo_settings, migrations.RunPython.noop)]
