"""Registrations and learners written with the CRM's option lists (apps.crm.lists): "Rất cao" -> "Cao", "GTNB"…"""

from django.db import migrations

ORDER_FIELDS = {
    "source": "source",
    "interest_level": "interest_level",
    "training_status": "training_status",
}
LEARNER_FIELDS = {"gender": "gender", "education_level": "education_level", "area": "province"}


def normalize_values(apps, schema_editor):
    from apps.crm.lists import normalize

    for model, fields in (("Order", ORDER_FIELDS), ("Learner", LEARNER_FIELDS)):
        Model = apps.get_model("crm", model)
        for field, kind in fields.items():
            for value in Model.objects.exclude(**{field: ""}).values_list(field, flat=True).distinct():
                new = normalize(kind, value)
                if new != value:
                    Model.objects.filter(**{field: value}).update(**{field: new})


class Migration(migrations.Migration):
    dependencies = [("crm", "0018_drop_campaigns")]

    operations = [migrations.RunPython(normalize_values, migrations.RunPython.noop)]
