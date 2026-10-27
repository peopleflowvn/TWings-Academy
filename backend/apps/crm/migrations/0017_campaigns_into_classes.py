"""
Each admission campaign becomes the admissions of a class (one class = one campaign). For every course a
campaign offered: the class of that course nearest the campaign's dates (else a new one) takes the code,
web page (slug, switch, featured, image, summary, description, views), scholarship, recruiter, the job
the course leads to and its quota. Leads of the campaign without a class go to that class; referrals to
a campaign position point to the class. A campaign with several courses: the first class keeps the
code and slug, the others get "-2", "-3"... Nothing is deleted here (0018 removes the old tables).
"""

from django.db import migrations

STATUS = {"active": "opening", "planning": "upcoming", "paused": "upcoming", "full": "full"}


def _target_cohort(Cohort, course, camp):
    pick = Cohort.objects.filter(course=course, audience="public").exclude(status="completed")
    anchor = camp.deadline or camp.start_date
    rows = list(pick)
    if not rows:
        return None
    if anchor:
        rows.sort(key=lambda c: abs((c.start_date or c.registration_deadline or anchor) - anchor).days)
    return rows[0]


def _free(Cohort, field, value, pk):
    base, n, out = value, 2, value
    while out and Cohort.objects.filter(**{field: out}).exclude(pk=pk).exists():
        out, n = f"{base}-{n}", n + 1
    return out


def move(apps, schema_editor):
    AdmissionCampaign = apps.get_model("crm", "AdmissionCampaign")
    Cohort = apps.get_model("catalog", "Cohort")
    Order = apps.get_model("crm", "Order")
    Placement = apps.get_model("crm", "Placement")
    for camp in AdmissionCampaign.objects.all().order_by("created_at"):
        positions = list(camp.positions.all().order_by("created_at"))
        for i, pos in enumerate(positions):
            cohort = _target_cohort(Cohort, pos.course, camp)
            if cohort is None:
                name, n = camp.name[:190], 2
                while Cohort.objects.filter(course=pos.course, name=name).exists():
                    name, n = f"{camp.name[:185]} ({n})", n + 1
                cohort = Cohort.objects.create(
                    course=pos.course,
                    name=name,
                    registration_deadline=camp.deadline,
                    capacity=pos.target_quota or camp.target_headcount or 25,
                    status=STATUS.get(camp.status, "closed"),
                    location=camp.location[:300],
                )
            suffix = "" if i == 0 else f"-{i + 1}"
            if not cohort.code:
                cohort.code = _free(Cohort, "code", f"{camp.code}{suffix}".upper()[:50], cohort.pk)
            if not cohort.slug and camp.slug:
                cohort.slug = _free(Cohort, "slug", f"{camp.slug}{suffix}"[:90], cohort.pk)
            live = camp.is_published and camp.status == "active" and cohort.status in ("opening", "upcoming")
            cohort.is_published = cohort.is_published or live
            cohort.is_featured = cohort.is_featured or camp.is_featured
            cohort.show_quota = camp.show_quota
            cohort.summary = cohort.summary or camp.summary
            cohort.image = cohort.image or camp.image
            cohort.description = cohort.description or camp.description
            cohort.view_count += camp.view_count if i == 0 else 0
            cohort.scholarship_budget = cohort.scholarship_budget or camp.scholarship_budget
            cohort.recruiter = cohort.recruiter or camp.lead_recruiter[:200]
            cohort.job_title = cohort.job_title or pos.position_title[:300]
            cohort.job_department = cohort.job_department or pos.department[:200]
            cohort.salary_range = cohort.salary_range or pos.salary_range[:100]
            if pos.position_title:
                cohort.job_quota = cohort.job_quota or pos.target_quota
            cohort.registration_deadline = cohort.registration_deadline or camp.deadline
            cohort.location = cohort.location or camp.location[:300]
            cohort.save()
            Order.objects.filter(campaign=camp, course=pos.course, cohort__isnull=True).update(cohort=cohort)
            Order.objects.filter(campaign=camp, course=pos.course, campaign_code="").update(campaign_code=cohort.code)
            Placement.objects.filter(position=pos).update(opening=cohort)
        Order.objects.filter(campaign=camp, campaign_code="").update(campaign_code=camp.code)


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0016_placement_opening"),
        ("catalog", "0010_class_admissions"),
    ]

    operations = [migrations.RunPython(move, migrations.RunPython.noop)]
