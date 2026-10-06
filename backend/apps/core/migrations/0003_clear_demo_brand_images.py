from django.db import migrations

DEMO_PREFIX = "https://images.unsplash.com/"
FIELDS = ("favicon_url", "logo_url", "logo_dark_url", "og_image_url", "faviconUrl", "logoUrl", "ogImageUrl")


def clear_demo_images(apps, schema_editor):
    """The seeded SEO settings used stock photos as favicon/logo; the public site now applies them."""
    SiteConfig = apps.get_model("core", "SiteConfig")
    doc = SiteConfig.objects.filter(key="site_seo").first()
    if doc is None or not isinstance(doc.data, dict):
        return
    data = {k: ("" if k in FIELDS and str(v).startswith(DEMO_PREFIX) else v) for k, v in doc.data.items()}
    if data != doc.data:
        doc.data = data
        doc.save(update_fields=["data", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("core", "0002_alter_siteconfig_key")]

    operations = [migrations.RunPython(clear_demo_images, migrations.RunPython.noop)]
