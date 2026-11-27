from datetime import timedelta

from django.db.models import F, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import ActionPermission
from apps.accounts.rbac import has_perm_code
from apps.core.models import SiteConfig
from apps.core.sanitize import sanitize_html

from .models import Article, ArticleRevision, HeroBanner
from .serializers import (
    ArticleListSerializer,
    ArticleRevisionSerializer,
    ArticleSerializer,
    HeroBannerSerializer,
    PublicArticleSerializer,
    SiteConfigSerializer,
)

CRUD = ["create", "update", "partial_update", "destroy"]


# ---------------------------------------------------------------- public
class PublicArticleViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicArticleSerializer
    lookup_field = "slug"
    filterset_fields = ["category"]
    search_fields = ["title", "excerpt"]

    def get_queryset(self):
        now = timezone.now()
        return Article.objects.filter(
            Q(status="published") | Q(status="scheduled", published_at__lte=now)
        ).order_by("-is_featured", "-published_at", "-created_at")

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        Article.objects.filter(slug=kwargs["slug"]).update(views_count=F("views_count") + 1)
        return response


@method_decorator(never_cache, name="dispatch")
class PublicBannerViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = HeroBannerSerializer
    pagination_class = None

    def get_queryset(self):
        return HeroBanner.objects.live()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        return response


class PublicSiteConfigViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Only the documents the public site renders (not e.g. the journey e-mail switches)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = SiteConfigSerializer
    queryset = SiteConfig.objects.filter(key__in=[SiteConfig.KEY_HOMEPAGE_SECTIONS, SiteConfig.KEY_SITE_SEO])


# ---------------------------------------------------------------- staff
class ArticleViewSet(viewsets.ModelViewSet):
    """
    Articles (/app/content/articles): drafts, publishing (now / at a time), unpublishing, featured, and
    the revisions kept on each save. Publishing, scheduling and taking an article down need
    articles.publish; writing and editing articles.create_edit.
    """

    serializer_class = ArticleSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["articles.create_edit", "articles.publish"],
        "retrieve": ["articles.create_edit", "articles.publish"],
        "revisions": ["articles.create_edit", "articles.publish"],
        "partial_update": ["articles.create_edit", "articles.publish"],
        **dict.fromkeys(["create", "update", "destroy"], ["articles.create_edit"]),
    }
    filterset_fields = ["status", "category", "is_featured"]
    search_fields = ["title", "slug", "excerpt", "author"]
    ordering_fields = ["published_at", "updated_at", "created_at", "views_count", "seo_score", "title"]
    queryset = Article.objects.all()

    def get_serializer_class(self):
        return ArticleListSerializer if self.action == "list" else ArticleSerializer

    def perform_create(self, serializer):
        self._check_publish(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._check_publish(serializer)
        article = serializer.instance
        data = serializer.validated_data
        before = {"title": article.title, "excerpt": article.excerpt, "content": article.content}
        new = {**data, "content": sanitize_html(data["content"])} if "content" in data else data
        changed = any(k in new and new[k] != v for k, v in before.items())
        if not has_perm_code(self.request.user, "articles.create_edit") and set(data) - {
            "status",
            "published_at",
        }:
            raise PermissionDenied("Cần quyền articles.create_edit để sửa nội dung bài viết.")
        user = self.request.user
        who = (user.name or user.email)[:150]
        # One version per editing session: autosaves by the same person within 10 minutes add none.
        recent = article.revisions.filter(
            saved_by=who, created_at__gte=timezone.now() - timedelta(minutes=10)
        ).exists()
        if changed and not recent:
            ArticleRevision.objects.create(article=article, status=article.status, saved_by=who, **before)
            stale = article.revisions.values_list("pk", flat=True)[ArticleRevision.KEEP :]
            ArticleRevision.objects.filter(pk__in=list(stale)).delete()
        serializer.save()

    def _check_publish(self, serializer):
        """Going live, scheduling / rescheduling, or taking an article down: articles.publish."""
        data, article = serializer.validated_data, serializer.instance
        old_status = article.status if article else "draft"
        new_status = data.get("status", old_status)
        rescheduled = (
            article is not None
            and new_status == "scheduled"
            and "published_at" in data
            and data["published_at"] != article.published_at
        )
        if (new_status != old_status or rescheduled) and not has_perm_code(
            self.request.user, "articles.publish"
        ):
            raise PermissionDenied("Cần quyền articles.publish để đăng, hẹn giờ hoặc gỡ bài viết.")

    @action(detail=True, methods=["get"])
    def revisions(self, request, pk=None):
        article = self.get_object()
        return Response(
            ArticleRevisionSerializer(article.revisions.all()[: ArticleRevision.KEEP], many=True).data
        )


class HeroBannerViewSet(viewsets.ModelViewSet):
    serializer_class = HeroBannerSerializer
    permission_classes = [ActionPermission]
    permission_map = dict.fromkeys(["list", "retrieve", *CRUD], ["banner.carousel"])
    pagination_class = None
    queryset = HeroBanner.objects.all()


class SiteConfigViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = SiteConfigSerializer
    permission_classes = [ActionPermission]
    queryset = SiteConfig.objects.all()

    PERMS_BY_KEY = {
        SiteConfig.KEY_HOMEPAGE_SECTIONS: ["homepage.intro_about", "system.sections_toggle"],
        SiteConfig.KEY_SITE_SEO: ["seo.settings"],
    }

    @property
    def permission_map(self):
        perms = self.PERMS_BY_KEY.get(self.kwargs.get("pk"), [])
        return dict.fromkeys(["retrieve", "update", "partial_update"], perms)

    def get_object(self):
        key = self.kwargs["pk"]
        if key not in self.PERMS_BY_KEY:
            from django.http import Http404

            raise Http404
        obj, _ = SiteConfig.objects.get_or_create(key=key)
        return obj
