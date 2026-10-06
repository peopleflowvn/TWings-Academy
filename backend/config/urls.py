from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

from apps.cms import seo
from apps.lms.public import certificate_json, certificate_page
from apps.payments.receipts import receipt_page

admin.site.site_header = "TWings Academy – Quản trị hệ thống"
admin.site.site_title = "TWings Admin"

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include("config.api_urls")),
    # Public certificate verification (served on the site domains through the web container).
    path("xac-minh/<str:code>/", certificate_page, name="certificate-page"),
    path("bien-nhan/<str:token>/", receipt_page, name="payment-receipt"),
    path("api/v1/public/certificates/<str:code>/", certificate_json, name="certificate-json"),
    path("api/v1/public/seo/", seo.page_meta, name="public-seo"),
    # Link-preview / search bots (routed here by Caddy on the User-Agent), sitemap and robots.txt.
    re_path(r"^_seo/(?P<path>.*)$", seo.prerender, name="seo-prerender"),
    path("sitemap.xml", seo.sitemap, name="sitemap"),
    path("robots.txt", seo.robots, name="robots"),
]
