from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.lms.public import certificate_json, certificate_page

admin.site.site_header = "TWings Academy – Quản trị hệ thống"
admin.site.site_title = "TWings Admin"

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include("config.api_urls")),
    # Public certificate verification (served on the site domains through the web container).
    path("xac-minh/<str:code>/", certificate_page, name="certificate-page"),
    path("api/v1/public/certificates/<str:code>/", certificate_json, name="certificate-json"),
]
