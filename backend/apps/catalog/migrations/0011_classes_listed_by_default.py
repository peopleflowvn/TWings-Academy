"""
"Hiện trên website" now decides whether a class is offered anywhere on the site (homepage, course
page, online checkout), not only on /tuyen-sinh. Classes taking registrations were already sold on
their course page, so they are switched on (with their page address) to keep showing.
"""

from django.db import migrations, models
from django.utils.text import slugify

JOINABLE = ("opening", "upcoming")


def _plain(text):
    import unicodedata

    text = text.replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()


def list_open_classes(apps, schema_editor):
    Cohort = apps.get_model("catalog", "Cohort")
    taken = set(Cohort.objects.exclude(slug="").values_list("slug", flat=True))
    for c in Cohort.objects.filter(audience="public", status__in=JOINABLE, is_published=False).select_related("course"):
        slug = c.slug
        if not slug:
            base = slugify(_plain(f"{c.course.title} {c.name}"))[:80] or "lop"
            slug, n = base, 2
            while slug in taken:
                slug, n = f"{base}-{n}", n + 1
            taken.add(slug)
        Cohort.objects.filter(pk=c.pk).update(is_published=True, slug=slug)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0010_class_admissions")]

    operations = [
        migrations.AlterField(
            model_name="cohort",
            name="is_published",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.RunPython(list_open_classes, migrations.RunPython.noop),
    ]
