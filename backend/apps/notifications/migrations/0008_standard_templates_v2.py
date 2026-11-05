"""
The standard templates (apps/notifications/defaults.py) replace the stored ones: one look (logo frame,
heading, info tables, one button), contact details from the website settings instead of a hard-coded
hotline, the data the automatic e-mails were missing (receipt link, appointment place, placement
employer...). Templates created by staff (other codes) are kept. Corporate e-mails already logged get
brand "corporate", so a retry by the worker keeps the TNTalent frame.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    from apps.notifications.defaults import TEMPLATES

    EmailTemplate = apps.get_model("notifications", "EmailTemplate")
    EmailLog = apps.get_model("notifications", "EmailLog")
    for t in TEMPLATES:
        EmailTemplate.objects.update_or_create(
            code=t["code"],
            defaults={
                "name": t["name"],
                "category": t["category"],
                "subject": t["subject"],
                "body": t["body"],
                "variables": t["variables"],
                "description": t["description"],
                "is_default": True,
            },
        )
    EmailLog.objects.filter(template_code__startswith="corporate").update(brand="corporate")
    EmailLog.objects.filter(corporate_enrollment__isnull=False).update(brand="corporate")


class Migration(migrations.Migration):
    dependencies = [("notifications", "0007_emaillog_brand")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
