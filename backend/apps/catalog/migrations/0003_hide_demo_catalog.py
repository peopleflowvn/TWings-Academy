"""
The first catalog came from a demo: courses sold under Google / Meta / DeepLearning.AI / Stanford /
University of Illinois brands, their logos as "partners", and empty draft courses. Selling them under
those names without a contract misleads visitors, so they are taken off the public site (unpublished /
deactivated, never deleted: orders and LMS data stay intact, staff can re-publish in /app).
"""

from django.db import migrations

FOREIGN_BRANDS = [
    "DeepLearning.AI",
    "Google",
    "Google Career Certificates",
    "IBM Skills Network",
    "Meta",
    "Stanford Online",
    "University of Illinois",
]


def hide_demo_catalog(apps, schema_editor):
    Course = apps.get_model("catalog", "Course")
    Partner = apps.get_model("catalog", "Partner")
    Course.objects.filter(partner__name__in=FOREIGN_BRANDS).update(is_published=False)
    for course in Course.objects.filter(slug__startswith="khoa-hoc-moi-", is_published=True):
        lessons = sum(len(m.get("lessons", [])) for m in course.syllabus or [] if isinstance(m, dict))
        if not course.description and lessons == 0:  # untouched "new course" drafts
            # the editor used to pre-fill sample reviews
            Course.objects.filter(pk=course.pk).update(is_published=False, reviews=[])
    Partner.objects.filter(name__in=FOREIGN_BRANDS).update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0002_program_course_installment_count_and_more")]

    operations = [migrations.RunPython(hide_demo_catalog, migrations.RunPython.noop)]
