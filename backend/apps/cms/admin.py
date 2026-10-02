from django.contrib import admin

from apps.core.models import SiteConfig

from .models import Article, HeroBanner


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "category", "published_at", "views_count"]
    list_filter = ["status", "category"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ["title"]}


admin.site.register(HeroBanner, list_display=["title", "sort_order", "is_active"])
admin.site.register(SiteConfig, list_display=["key", "updated_at"])
