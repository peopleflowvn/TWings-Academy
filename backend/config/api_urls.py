from django.urls import include, path

from apps.core.views import health

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/", include("apps.accounts.urls")),
    path("public/", include("config.public_urls")),
    path("staff/", include("config.staff_urls")),
    path("webhooks/", include("config.webhook_urls")),
]
