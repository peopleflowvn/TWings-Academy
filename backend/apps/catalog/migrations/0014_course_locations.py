"""
Training locations become a list (/app → Hệ thống → Danh mục, "Địa điểm / địa chỉ đào tạo") a course picks
one or several of. The address each course had is kept: it joins the list (once) and the course picks it.
"""

from django.db import migrations, models

FIRST = ["Học trực tuyến (LMS)", "Tòa ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội"]


def forwards(apps, schema_editor):
    from apps.crm.lists import plain

    ListItem = apps.get_model("crm", "ListItem")
    Course = apps.get_model("catalog", "Course")
    known = {plain(v): v for v in ListItem.objects.filter(kind="training_location").values_list("value", flat=True)}
    position = ListItem.objects.filter(kind="training_location").count()

    def add(value):
        nonlocal position
        value = " ".join(value.split())[:200]
        if plain(value) not in known:
            ListItem.objects.create(kind="training_location", value=value, position=position)
            known[plain(value)] = value
            position += 1
        return known[plain(value)]

    for value in FIRST:
        add(value)
    for course in Course.objects.exclude(location_text=""):
        if not course.locations:
            course.locations = [add(course.location_text)]
            course.save(update_fields=["locations"])


class Migration(migrations.Migration):
    dependencies = [("catalog", "0013_cohort_external_lms_rb_eb_khoa_9"), ("crm", "0026_backfill_smart_matching")]

    operations = [
        migrations.AddField(model_name="course", name="locations", field=models.JSONField(blank=True, default=list)),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
