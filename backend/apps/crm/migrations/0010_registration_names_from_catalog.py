"""
Registrations show the current name of their course / program / intake: names copied when a lead was
created (or typed by staff in the old hard-coded course picker) are replaced by the catalogue's.
"""

from django.db import migrations
from django.db.models import F, OuterRef, Subquery


def forwards(apps, schema_editor):
    Order = apps.get_model("crm", "Order")
    Course = apps.get_model("catalog", "Course")
    Program = apps.get_model("catalog", "Program")
    Cohort = apps.get_model("catalog", "Cohort")

    course_title = Subquery(Course.objects.filter(pk=OuterRef("course_id")).values("title")[:1])
    Order.objects.filter(course__isnull=False).exclude(course_title=F("course__title")).update(
        course_title=course_title
    )
    Order.objects.filter(course__isnull=False, parent__isnull=True).exclude(
        interested_course=F("course__title")
    ).update(interested_course=course_title)
    program_title = Subquery(Program.objects.filter(pk=OuterRef("program_id")).values("title")[:1])
    Order.objects.filter(program__isnull=False, course__isnull=True, parent__isnull=True).update(
        course_title=program_title, interested_course=program_title
    )
    cohort_name = Subquery(Cohort.objects.filter(pk=OuterRef("cohort_id")).values("name")[:1])
    Order.objects.filter(cohort__isnull=False).exclude(batch_cohort=F("cohort__name")).update(
        batch_cohort=cohort_name
    )


class Migration(migrations.Migration):
    dependencies = [("crm", "0009_campaign_cleanup"), ("catalog", "0007_learning_signals")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
