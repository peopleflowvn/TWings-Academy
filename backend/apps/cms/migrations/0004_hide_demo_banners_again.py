"""The English demo banners came back on the live homepage after 0002: take them off again."""

from importlib import import_module

from django.db import migrations

DEMO_TITLES = import_module("apps.cms.migrations.0002_hide_demo_banners").DEMO_TITLES


def hide_demo_banners(apps, schema_editor):
    apps.get_model("cms", "HeroBanner").objects.filter(title__in=DEMO_TITLES).update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [("cms", "0003_pageviewdaily")]

    operations = [migrations.RunPython(hide_demo_banners, migrations.RunPython.noop)]
