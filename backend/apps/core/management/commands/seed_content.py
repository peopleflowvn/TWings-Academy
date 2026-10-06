"""
Load public demo content (catalogue, CMS, email templates) from fixtures/seed_content.json.

Idempotent: records are upserted by id, so it can be re-run safely. CRM leads and staff users are
never seeded. Regenerate the fixture from the frontend with `node frontend/scripts/export-seed.mjs`.
"""

import json
from datetime import date, datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from djangorestframework_camel_case.util import underscoreize

from apps.catalog.models import Cohort, Coupon, Course, Instructor, Partner
from apps.cms.models import Article, HeroBanner
from apps.core.models import SiteConfig
from apps.crm.models import AdmissionCampaign, CampaignPosition
from apps.notifications.models import EmailTemplate

DEFAULT_FIXTURE = Path(settings.BASE_DIR) / "fixtures" / "seed_content.json"


def parse_date(value) -> date | None:
    if not value:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(value)[:10], fmt).date()
        except ValueError:
            continue
    return None


def model_fields(model) -> set[str]:
    return {f.name for f in model._meta.get_fields() if getattr(f, "concrete", False)}


def pick(model, data: dict, exclude=()) -> dict:
    fields = model_fields(model) - {"id", "created_at", "updated_at", *exclude}
    return {k: v for k, v in data.items() if k in fields and v is not None}


class Command(BaseCommand):
    help = "Seed public demo content (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(DEFAULT_FIXTURE))

    @transaction.atomic
    def handle(self, *args, **opts):
        data = underscoreize(json.loads(Path(opts["file"]).read_text(encoding="utf-8")))
        stats: dict[str, int] = {}

        def bump(key):
            stats[key] = stats.get(key, 0) + 1

        def upsert_partner(p):
            if p and p.get("id"):
                Partner.objects.update_or_create(id=p["id"], defaults=pick(Partner, p))
                bump("partners")
                return p["id"]
            return None

        def upsert_instructor(i):
            Instructor.objects.update_or_create(id=i["id"], defaults=pick(Instructor, i, exclude={"courses"}))
            bump("instructors")
            return i["id"]

        for p in data.get("partners", []):
            upsert_partner(p)
        for i in data.get("instructors", []):
            upsert_instructor(i)

        for c in data.get("courses", []):
            defaults = pick(Course, c, exclude={"partner", "instructors"})
            defaults["syllabus"] = c.get("syllabus") or c.get("chapters") or []
            defaults["partner_id"] = upsert_partner(c.get("partner"))
            # Seeded courses are the real catalogue: on sale when first created, untouched afterwards.
            course, _ = Course.objects.update_or_create(
                id=c["id"], defaults=defaults, create_defaults={**defaults, "status": "published"}
            )
            people = c.get("instructors") or ([c["instructor"]] if c.get("instructor") else [])
            course.instructors.set([upsert_instructor(i) for i in people if i.get("id")])
            bump("courses")

        known_courses = set(Course.objects.values_list("id", flat=True))
        cohorts = [c for c in data.get("cohorts", []) if c.get("course_id") in known_courses]
        for skipped in [c for c in data.get("cohorts", []) if c.get("course_id") not in known_courses]:
            self.stdout.write(
                self.style.WARNING(f"Skip cohort {skipped['id']}: unknown course {skipped['course_id']}")
            )
        for c in cohorts:
            Cohort.objects.update_or_create(
                id=c["id"],
                defaults={
                    **pick(Cohort, c, exclude={"course", "next_cohort", "lead_instructor"}),
                    "course_id": c["course_id"],
                    "start_date": parse_date(c.get("start_date")),
                    "registration_deadline": parse_date(c.get("registration_deadline")),
                    "lead_instructor_id": c.get("lead_instructor_id")
                    if Instructor.objects.filter(id=c.get("lead_instructor_id") or "").exists()
                    else None,
                },
            )
            bump("cohorts")
        cohort_ids = {c["id"] for c in cohorts}
        for c in cohorts:  # second pass once every cohort exists
            nxt = c.get("next_cohort_id")
            Cohort.objects.filter(id=c["id"]).update(next_cohort_id=nxt if nxt in cohort_ids else None)

        for camp in data.get("campaigns", []):
            obj, _ = AdmissionCampaign.objects.update_or_create(
                id=camp["id"],
                defaults={
                    **pick(AdmissionCampaign, camp),
                    "start_date": parse_date(camp.get("start_date")),
                    "deadline": parse_date(camp.get("deadline")),
                },
            )
            for pos in camp.get("positions", []):
                if pos.get("course_id") in known_courses:
                    CampaignPosition.objects.update_or_create(
                        id=pos["id"],
                        defaults={
                            **pick(CampaignPosition, pos, exclude={"campaign", "course"}),
                            "campaign": obj,
                            "course_id": pos["course_id"],
                        },
                    )
            bump("campaigns")

        for cp in data.get("coupons", []):
            Coupon.objects.update_or_create(
                code=cp["code"].upper(),
                defaults={
                    **pick(Coupon, cp, exclude={"code"}),
                    "valid_until": parse_date(cp.get("valid_until")),
                },
            )
            bump("coupons")

        for i, b in enumerate(data.get("banners", [])):
            HeroBanner.objects.update_or_create(id=b["id"], defaults={**pick(HeroBanner, b), "sort_order": i})
            bump("banners")

        for a in data.get("articles", []):
            published = parse_date(a.get("published_at"))
            Article.objects.update_or_create(
                id=a["id"],
                defaults={
                    **pick(Article, a, exclude={"published_at"}),
                    "published_at": timezone.make_aware(datetime.combine(published, datetime.min.time()))
                    if published
                    else None,
                },
            )
            bump("articles")

        for t in data.get("email_templates", []):
            EmailTemplate.objects.update_or_create(
                code=t["code"], defaults=pick(EmailTemplate, t, exclude={"code"})
            )
            bump("email_templates")

        if data.get("site_seo"):
            SiteConfig.objects.update_or_create(
                key=SiteConfig.KEY_SITE_SEO, defaults={"data": data["site_seo"]}
            )
        if data.get("homepage_sections"):
            SiteConfig.objects.update_or_create(
                key=SiteConfig.KEY_HOMEPAGE_SECTIONS, defaults={"data": data["homepage_sections"]}
            )

        self.stdout.write(
            self.style.SUCCESS("Seeded: " + ", ".join(f"{k}={v}" for k, v in sorted(stats.items())))
        )
