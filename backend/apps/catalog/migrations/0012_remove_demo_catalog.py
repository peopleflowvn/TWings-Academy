"""Remove bundled sample products that were accidentally published in production."""

from django.db import migrations


DEMO_COURSE_IDS = [
    "e2e-draft",
    "e2e-gdv",
    "e2e-rm",
    "twings-qhkh-doanh-nghiep",
    "twings-qhkh-ca-nhan",
    "google-data-analytics",
    "meta-frontend-developer",
    "deeplearning-ai-agents",
    "deeplearning-machine-learning",
    "illinois-mba-degree",
]


def remove_demo_catalog(apps, schema_editor):
    Course = apps.get_model("catalog", "Course")
    Cohort = apps.get_model("catalog", "Cohort")
    from django.db.models import Q

    demo_courses = Course.objects.filter(Q(id__in=DEMO_COURSE_IDS) | Q(slug__startswith="e2e-"))
    demo_ids = list(demo_courses.values_list("id", flat=True))

    # Cohorts protect their course. These IDs belong to the bundled fixture, while orders use
    # SET_NULL and retain their historical course title if test/demo orders happened to exist.
    Cohort.objects.filter(course_id__in=demo_ids).delete()
    demo_courses.delete()


class Migration(migrations.Migration):
    dependencies = [("catalog", "0011_classes_listed_by_default")]

    operations = [migrations.RunPython(remove_demo_catalog, migrations.RunPython.noop)]
