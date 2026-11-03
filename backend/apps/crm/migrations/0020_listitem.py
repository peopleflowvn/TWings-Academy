"""The option lists move into the database (ListItem), editable in /app → Hệ thống → Danh mục."""

import apps.core.models
from django.db import migrations, models

# Lists whose records were typed freely until now: the values already used join the list.
FROM_RECORDS = {
    "course_category": (("catalog", "Course", "category"), ("cms", "Article", "category")),
    "course_level": (("catalog", "Course", "level"),),
}


def load(apps, schema_editor):
    from apps.crm.lists import defaults, plain

    ListItem = apps.get_model("crm", "ListItem")
    for kind, items in defaults().items():
        items = list(dict.fromkeys(items))
        known = {plain(v) for v in items}
        for app, model, field in FROM_RECORDS.get(kind, ()):
            used = apps.get_model(app, model).objects.exclude(**{field: ""}).values_list(field, flat=True)
            for value in sorted(set(used)):
                if plain(value) not in known:
                    known.add(plain(value))
                    items.append(value)
        ListItem.objects.bulk_create(
            [ListItem(kind=kind, value=value, position=i) for i, value in enumerate(items)],
            ignore_conflicts=True,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0019_normalize_lists"),
        ("catalog", "0013_cohort_external_lms_rb_eb_khoa_9"),
        ("cms", "0007_herobanner_card_template"),
    ]

    operations = [
        migrations.CreateModel(
            name="ListItem",
            fields=[
                (
                    "id",
                    models.CharField(
                        default=apps.core.models.new_id,
                        editable=False,
                        max_length=64,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("kind", models.CharField(db_index=True, max_length=40)),
                ("value", models.CharField(max_length=300)),
                ("position", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["kind", "position", "value"]},
        ),
        migrations.AddConstraint(
            model_name="listitem",
            constraint=models.UniqueConstraint(fields=("kind", "value"), name="crm_listitem_kind_value"),
        ),
        migrations.RunPython(load, migrations.RunPython.noop),
    ]
