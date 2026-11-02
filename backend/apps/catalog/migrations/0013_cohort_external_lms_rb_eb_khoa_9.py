"""
Classes taught on another platform (the eight RB / EB classes run before this system) and the first RB / EB
class opened here renamed to "Khóa 9", the number it really is (Khóa 1–8 ran elsewhere).
"""

import unicodedata

from django.db import migrations, models
from django.utils.text import slugify

RENAMES = {"RB-K1": "RB-K9", "EB-K1": "EB-K9"}
OLD_TEXT = "Đợt tuyển sinh đầu tiên của chương trình"


def _ascii(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()


def rename_to_khoa_9(apps, schema_editor):
    Cohort = apps.get_model("catalog", "Cohort")
    renamed = []
    for old, new in RENAMES.items():
        cohort = Cohort.objects.filter(code=old, name="Khóa 1").select_related("course").first()
        if cohort is None or Cohort.objects.filter(code=new).exists():
            continue
        cohort.name, cohort.code = "Khóa 9", new
        if cohort.description.startswith(OLD_TEXT):
            cohort.description = (
                "Khóa 9 của chương trình"
                + cohort.description[len(OLD_TEXT) :].rstrip(".")
                + ". Chương trình đã đào tạo 8 khóa trước đó."
            )
        if cohort.slug:  # the class's web address follows its name (Cohort.save's rule)
            base = slugify(_ascii(f"{cohort.course.title} {cohort.name}"))[:80] or "lop"
            slug, n = base, 2
            while Cohort.objects.filter(slug=slug).exclude(pk=cohort.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            cohort.slug = slug
        cohort.save(update_fields=["name", "code", "description", "slug"])
        # Registrations show the class by name.
        cohort.orders.update(batch_cohort=cohort.name)
        renamed.append(cohort.pk)
    if renamed:
        try:  # the class's Moodle course takes the new name (queued for the worker; never blocks the deploy)
            from apps.lms import moodle, tasks

            if moodle.is_configured():
                for pk in renamed:
                    tasks.provision_cohort.enqueue(pk)
        except Exception:  # noqa: BLE001
            pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0012_remove_demo_catalog"),
        ("crm", "0018_drop_campaigns"),
    ]

    operations = [
        migrations.AddField(
            model_name="cohort",
            name="external_lms",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(rename_to_khoa_9, migrations.RunPython.noop),
    ]
