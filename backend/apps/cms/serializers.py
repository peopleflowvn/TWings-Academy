from rest_framework import serializers

from apps.core.models import SiteConfig

from .models import Article, HeroBanner

URL_PREFIXES = ("https://", "http://", "/", "#")


def _safe_link(value):
    """Reject javascript:/data: links that could execute in the SPA."""
    if value and not value.strip().lower().startswith(URL_PREFIXES):
        raise serializers.ValidationError("Liên kết phải bắt đầu bằng https://, /, hoặc #.")
    return value


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = "__all__"
        read_only_fields = ["views_count"]

    def validate_featured_image(self, value):
        return _safe_link(value)


class PublicArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        exclude = ["focus_keyword", "seo_score", "seo_checks", "created_at", "updated_at"]


class HeroBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroBanner
        exclude = ["created_at", "updated_at"]

    def validate_link_url(self, value):
        return _safe_link(value)

    def validate_image_url(self, value):
        return _safe_link(value)

    def validate_full_banner_image_url(self, value):
        return _safe_link(value)


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = ["key", "data", "updated_at"]
        read_only_fields = ["key", "updated_at"]

    def validate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be a JSON object.")
        return value
