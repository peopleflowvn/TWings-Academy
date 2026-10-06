"""Anonymous endpoints used by the public website. Read-only except the throttled forms."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.catalog.views import (
    PublicCourseViewSet,
    PublicInstructorViewSet,
    PublicPartnerViewSet,
    PublicProgramViewSet,
)
from apps.cms.views import PublicArticleViewSet, PublicBannerViewSet, PublicSiteConfigViewSet
from apps.crm.views import PublicRegistrationView
from apps.payments.views import PublicCheckoutView, PublicOrderStatusView
from apps.sso import account

router = SimpleRouter()
router.register("courses", PublicCourseViewSet, basename="public-course")
router.register("programs", PublicProgramViewSet, basename="public-program")
router.register("instructors", PublicInstructorViewSet, basename="public-instructor")
router.register("partners", PublicPartnerViewSet, basename="public-partner")
router.register("articles", PublicArticleViewSet, basename="public-article")
router.register("banners", PublicBannerViewSet, basename="public-banner")
router.register("site-config", PublicSiteConfigViewSet, basename="public-site-config")

urlpatterns = [
    path("registrations/", PublicRegistrationView.as_view(), name="public-registration"),
    path("checkout/", PublicCheckoutView.as_view(), name="public-checkout"),
    path("orders/<str:order_code>/status/", PublicOrderStatusView.as_view(), name="public-order-status"),
    path("account/", account.AccountView.as_view(), name="public-account"),
    path("account/send-code/", account.SendCodeView.as_view(), name="public-account-send-code"),
    path("account/verify/", account.VerifyCodeView.as_view(), name="public-account-verify"),
    path("account/logout/", account.LogoutView.as_view(), name="public-account-logout"),
    path(
        "account/orders/<str:order_code>/refund-request/",
        account.RefundRequestView.as_view(),
        name="public-account-refund-request",
    ),
    *router.urls,
]
