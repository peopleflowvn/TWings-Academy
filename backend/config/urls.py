from django.conf import settings
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "TWings Academy – Quản trị hệ thống"
admin.site.site_title = "TWings Admin"

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include("config.api_urls")),
]
