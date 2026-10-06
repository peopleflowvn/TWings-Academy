"""Demo hero banners in English or promoting the foreign-brand demo courses: taken off the homepage."""

from django.db import migrations

DEMO_TITLES = [
    "Learn AI from the companies building it",
    "Start, switch, or advance your career",
    "Xây dựng & Triển khai các AI Agents",
    "Tốt nghiệp Cử nhân & Thạc sĩ Quốc tế",
]


def hide_demo_banners(apps, schema_editor):
    apps.get_model("cms", "HeroBanner").objects.filter(title__in=DEMO_TITLES).update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [("cms", "0001_initial")]

    operations = [migrations.RunPython(hide_demo_banners, migrations.RunPython.noop)]
