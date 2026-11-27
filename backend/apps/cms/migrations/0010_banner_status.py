"""Banners get the article states: draft (hidden), shown, scheduled from a time, and an optional end."""

from django.db import migrations, models


def from_is_active(apps, schema_editor):
    HeroBanner = apps.get_model("cms", "HeroBanner")
    HeroBanner.objects.filter(is_active=True).update(status="published")
    HeroBanner.objects.filter(is_active=False).update(status="draft")


def to_is_active(apps, schema_editor):
    HeroBanner = apps.get_model("cms", "HeroBanner")
    HeroBanner.objects.update(is_active=False)
    HeroBanner.objects.filter(status__in=["published", "scheduled"]).update(is_active=True)


class Migration(migrations.Migration):
    dependencies = [("cms", "0009_article_editor")]

    operations = [
        migrations.AddField(
            model_name="herobanner",
            name="status",
            field=models.CharField(
                choices=[("draft", "Nháp / ẩn"), ("published", "Đang hiện"), ("scheduled", "Hẹn giờ hiện")],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.AddField(model_name="herobanner", name="starts_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="herobanner", name="ends_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.RunPython(from_is_active, to_is_active),
        migrations.RemoveField(model_name="herobanner", name="is_active"),
    ]
