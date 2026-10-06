from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel
from apps.core.sanitize import sanitize_html


class Article(BaseModel):
    STATUS_CHOICES = [("published", "Đã xuất bản"), ("draft", "Bản nháp"), ("scheduled", "Hẹn giờ")]

    slug = models.SlugField(max_length=250, unique=True)
    title = models.CharField(max_length=300)
    excerpt = models.TextField(blank=True)
    content = models.TextField(blank=True)  # sanitised HTML
    featured_image = models.CharField(max_length=500, blank=True)
    category = models.CharField(max_length=100, blank=True)
    author = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    views_count = models.PositiveIntegerField(default=0)

    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    focus_keyword = models.CharField(max_length=100, blank=True)
    canonical_url = models.URLField(max_length=500, blank=True)
    seo_score = models.PositiveSmallIntegerField(default=0)
    seo_checks = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.content = sanitize_html(self.content)
        if self.status == "published" and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_public(self):
        return self.status == "published" or (
            self.status == "scheduled" and self.published_at and self.published_at <= timezone.now()
        )


class PageViewDaily(models.Model):
    """
    Cookie-less page views: one counter per day, page and traffic source. No IP, no identifier, no
    personal data, so no consent is needed; enough for views -> leads -> paid funnels.
    """

    date = models.DateField()
    path = models.CharField(max_length=200)
    source = models.CharField(max_length=60)
    views = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["date", "path", "source"], name="uniq_pageview_day")]
        indexes = [models.Index(fields=["date"])]

    def __str__(self):
        return f"{self.date} {self.path} {self.source}: {self.views}"


class HeroBanner(BaseModel):
    title = models.CharField(max_length=300)
    subtitle = models.TextField(blank=True)
    bg_gradient = models.CharField(max_length=200, blank=True)
    button_text = models.CharField(max_length=100, blank=True)
    button_action = models.CharField(max_length=32, blank=True)
    button_style = models.CharField(max_length=16, default="primary")
    partner_badges = models.JSONField(default=list, blank=True)
    floating_badges = models.JSONField(default=list, blank=True)
    image_url = models.CharField(max_length=500, blank=True)
    display_type = models.CharField(max_length=16, default="card")
    full_banner_image_url = models.CharField(max_length=500, blank=True)
    link_url = models.CharField(max_length=500, blank=True)
    target_blank = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return self.title
