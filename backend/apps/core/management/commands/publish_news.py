"""Publish the curated news package to production storage and database."""

import json
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.cms.models import Article


FIXTURE = Path(settings.BASE_DIR) / "fixtures" / "news_articles.json"
IMAGES = Path(settings.BASE_DIR) / "fixtures" / "news_images"
DEMO_SLUGS = {
    "lo-trinh-chuyen-vien-quan-he-khach-hang-ngan-hang-2026",
    "ung-dung-tri-tue-nhan-tao-ai-trong-tham-dinh-tin-dung",
}


class Command(BaseCommand):
    help = "Replace the two starter articles with the curated five-article news package."

    def handle(self, *args, **options):
        package = json.loads(FIXTURE.read_text(encoding="utf-8-sig"))
        rows = [{"id": item["pk"], **item["fields"]} for item in package]
        target_slugs = {row["slug"] for row in rows}
        if len(rows) != 5 or len(target_slugs) != 5:
            raise CommandError("News package must contain exactly five unique articles.")

        existing_slugs = set(Article.objects.values_list("slug", flat=True))
        unexpected = existing_slugs - DEMO_SLUGS - target_slugs
        if unexpected:
            raise CommandError(
                "Refusing to replace non-package articles: " + ", ".join(sorted(unexpected))
            )

        image_urls = {}
        for image in sorted(IMAGES.glob("*.webp")):
            storage_name = f"articles/{image.name}"
            if not default_storage.exists(storage_name):
                with image.open("rb") as source:
                    default_storage.save(storage_name, File(source, name=image.name))
            image_urls[image.name] = default_storage.url(storage_name)
        if len(image_urls) != 5:
            raise CommandError("Expected exactly five WebP images in the news package.")

        backup_dir = Path("/data/news-backups")
        if Path("/data").exists():
            backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            backup = list(Article.objects.order_by("created_at").values())
            (backup_dir / f"articles-{stamp}.json").write_text(
                json.dumps(backup, ensure_ascii=False, indent=2, default=str), encoding="utf-8"
            )

        with transaction.atomic():
            Article.objects.all().delete()
            for row in rows:
                image_name = Path(row["featured_image"]).name
                row["featured_image"] = image_urls[image_name]
                row.pop("created_at", None)
                row.pop("updated_at", None)
                Article.objects.create(**row)

        count = Article.objects.filter(status="published").count()
        if count != 5:
            raise CommandError(f"Post-publish validation failed: expected 5 published articles, got {count}.")
        self.stdout.write(self.style.SUCCESS("Published 5 articles and 5 images successfully."))

