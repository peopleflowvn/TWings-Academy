from django.db.models import F, Q
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny

from apps.accounts.permissions import ActionPermission
from apps.accounts.rbac import has_perm_code
from apps.core.models import SiteConfig

from .models import Article, HeroBanner
from .serializers import (
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
        return Article.objects.filter(Q(status="published") | Q(status="scheduled", published_at__lte=now))

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        Article.objects.filter(slug=kwargs["slug"]).update(views_count=F("views_count") + 1)
        return response


class PublicBannerViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = HeroBannerSerializer
    pagination_class = None
    queryset = HeroBanner.objects.filter(is_active=True)


class PublicSiteConfigViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Only the documents the public site renders (not e.g. the journey e-mail switches)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = SiteConfigSerializer
    queryset = SiteConfig.objects.filter(key__in=[SiteConfig.KEY_HOMEPAGE_SECTIONS, SiteConfig.KEY_SITE_SEO])


# ---------------------------------------------------------------- staff
class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    permission_classes = [ActionPermission]
    permission_map = {
        "list": ["articles.create_edit", "articles.publish"],
        "retrieve": ["articles.create_edit", "articles.publish"],
        **dict.fromkeys(CRUD, ["articles.create_edit"]),
    }
    filterset_fields = ["status", "category"]
    search_fields = ["title", "slug"]
    queryset = Article.objects.all()

    def perform_create(self, serializer):
        self._check_publish(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._check_publish(serializer)
        serializer.save()

    def _check_publish(self, serializer):
        new_status = serializer.validated_data.get("status")
        old_status = serializer.instance.status if serializer.instance else "draft"
        if new_status in ("published", "scheduled") and new_status != old_status:
            if not has_perm_code(self.request.user, "articles.publish"):
                raise PermissionDenied("Cần quyền articles.publish để xuất bản bài viết.")


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
