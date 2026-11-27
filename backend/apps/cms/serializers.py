import re

from rest_framework import serializers

from apps.core.models import SiteConfig
from apps.crm.lists import NormalizeListFields

from .models import Article, ArticleRevision, HeroBanner

URL_PREFIXES = ("https://", "http://", "/", "#")


def vn_slugify(value: str) -> str:
    """Vietnamese title -> URL slug: "Đào tạo Ngân hàng" -> "dao-tao-ngan-hang"."""
    import unicodedata

    text = (value or "").replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:200]


def _safe_link(value):
    """Reject javascript:/data: links that could execute in the SPA."""
    if value and not value.strip().lower().startswith(URL_PREFIXES):
        raise serializers.ValidationError("Liên kết phải bắt đầu bằng https://, /, hoặc #.")
    return value


class ArticleSerializer(NormalizeListFields, serializers.ModelSerializer):
    list_fields = {"category": "course_category"}
    is_public = serializers.BooleanField(read_only=True)
    # Free text (a title, Vietnamese accents...): turned into a URL slug; empty: from the title.
    slug = serializers.CharField(max_length=250, required=False, allow_blank=True)

    class Meta:
        model = Article
        fields = "__all__"
        read_only_fields = ["views_count"]

    def validate_featured_image(self, value):
        return _safe_link(value)

    def _taken(self, slug):
        taken = Article.objects.filter(slug=slug)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        return taken.exists()

    def validate_slug(self, value):
        slug = vn_slugify(value)
        if value.strip() and not slug:
            raise serializers.ValidationError("Đường dẫn không hợp lệ.")
        if slug and self._taken(slug):
            raise serializers.ValidationError(f"Đường dẫn “{slug}” đã có bài viết khác dùng.")
        return slug

    def validate_tags(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Danh sách thẻ không hợp lệ.")
        seen, tags = set(), []
        for tag in value:
            text = str(tag).strip()[:60]
            if text and text.lower() not in seen:
                seen.add(text.lower())
                tags.append(text)
        return tags[:20]

    def validate(self, attrs):
        if not attrs.get("slug") and (self.instance is None or "slug" in attrs):
            base = vn_slugify(attrs.get("title") or getattr(self.instance, "title", "")) or "bai-viet"
            slug, n = base, 2
            while self._taken(slug):
                slug, n = f"{base}-{n}", n + 1
            attrs["slug"] = slug
        status = attrs.get("status", getattr(self.instance, "status", "draft"))
        when = attrs.get("published_at", getattr(self.instance, "published_at", None))
        if status == "scheduled" and not when:
            raise serializers.ValidationError({"published_at": "Chọn thời điểm đăng bài."})
        return attrs


class ArticleListSerializer(ArticleSerializer):
    """The list: no body (it can be long), only what the table shows."""

    class Meta(ArticleSerializer.Meta):
        fields = None
        exclude = ["content", "seo_checks"]


class ArticleRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleRevision
        fields = ["id", "title", "excerpt", "content", "status", "saved_by", "created_at"]


class PublicArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        exclude = ["focus_keyword", "seo_score", "seo_checks", "created_at"]


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
        gallery = value.get("gallery")
        if isinstance(gallery, dict) and isinstance(gallery.get("photos"), list):
            for photo in gallery["photos"]:
                if isinstance(photo, dict):
                    _safe_link(photo.get("url") or "")
                    _safe_link(photo.get("image_url") or photo.get("imageUrl") or "")
        testimonials = value.get("testimonials")
        if isinstance(testimonials, dict) and isinstance(testimonials.get("items"), list):
            for item in testimonials["items"]:
                if isinstance(item, dict):
                    _safe_link(item.get("avatar") or "")
        return value
