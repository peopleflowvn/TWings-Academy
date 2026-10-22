"""
The English demo banners were switched back on twice after being hidden (0002, 0004). They are deleted
so they cannot return to the homepage; real banners are made in /app/content/banners.
"""

from importlib import import_module

from django.db import migrations

DEMO_TITLES = import_module("apps.cms.migrations.0002_hide_demo_banners").DEMO_TITLES


def delete_demo_banners(apps, schema_editor):
    apps.get_model("cms", "HeroBanner").objects.filter(title__in=DEMO_TITLES).delete()


class Migration(migrations.Migration):
    dependencies = [("cms", "0004_hide_demo_banners_again")]

    operations = [migrations.RunPython(delete_demo_banners, migrations.RunPython.noop)]
