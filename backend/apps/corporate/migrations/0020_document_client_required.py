import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("corporate", "0019_document_owners"),
    ]

    operations = [
        migrations.AlterField(
            model_name="classdocument",
            name="client",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name="documents", to="corporate.corporateclient"
            ),
        ),
        migrations.AlterModelOptions(
            name="classdocument",
            options={"ordering": ["kind", "title", "-version"]},
        ),
        migrations.AddConstraint(
            model_name="classdocument",
            constraint=models.CheckConstraint(
                condition=models.Q(corporate_class__isnull=False, contract__isnull=True, acceptance__isnull=True)
                | models.Q(corporate_class__isnull=True, contract__isnull=False, acceptance__isnull=True)
                | models.Q(corporate_class__isnull=True, contract__isnull=True, acceptance__isnull=False),
                name="document_has_one_owner",
            ),
        ),
    ]
