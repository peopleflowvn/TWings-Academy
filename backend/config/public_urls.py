"""Anonymous endpoints used by the public website. Read-only except the throttled forms."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.catalog.views import (
    PublicCourseViewSet,
    PublicInstructorViewSet,
    PublicPartnerViewSet,
    PublicProgramViewSet,
    PublicReviewViewSet,
)
from apps.cms.analytics import TrackView
from apps.cms.legal import legal_view
from apps.cms.views import PublicArticleViewSet, PublicBannerViewSet, PublicSiteConfigViewSet
from apps.crm.views import PublicRegistrationView
from apps.payments.views import PublicCheckoutView, PublicOrderStatusView
from apps.sso import account

router = SimpleRouter()
router.register("courses", PublicCourseViewSet, basename="public-course")
router.register("programs", PublicProgramViewSet, basename="public-program")
router.register("instructors", PublicInstructorViewSet, basename="public-instructor")
router.register("partners", PublicPartnerViewSet, basename="public-partner")
router.register("reviews", PublicReviewViewSet, basename="public-review")
router.register("articles", PublicArticleViewSet, basename="public-article")
router.register("banners", PublicBannerViewSet, basename="public-banner")
router.register("site-config", PublicSiteConfigViewSet, basename="public-site-config")

urlpatterns = [
    path("registrations/", PublicRegistrationView.as_view(), name="public-registration"),
    path("checkout/", PublicCheckoutView.as_view(), name="public-checkout"),
    path("orders/<str:order_code>/status/", PublicOrderStatusView.as_view(), name="public-order-status"),
    path("legal/<str:key>/", legal_view, name="public-legal"),
    path("track/", TrackView.as_view(), name="public-track"),
    path("account/", account.AccountView.as_view(), name="public-account"),
    path("account/send-code/", account.SendCodeView.as_view(), name="public-account-send-code"),
    path("account/verify/", account.VerifyCodeView.as_view(), name="public-account-verify"),
    path("account/logout/", account.LogoutView.as_view(), name="public-account-logout"),
    path("account/reviews/", account.ReviewView.as_view(), name="public-account-review"),
    path(
        "account/orders/<str:order_code>/invoice/",
        account.InvoiceView.as_view(),
        name="public-account-invoice",
    ),
    path(
        "account/orders/<str:order_code>/dossier/",
        account.DossierView.as_view(),
        name="public-account-dossier",
    ),
    path("account/orders/<str:order_code>/cv/", account.CvUploadView.as_view(), name="public-account-cv"),
    path(
        "account/orders/<str:order_code>/refund-request/",
        account.RefundRequestView.as_view(),
        name="public-account-refund-request",
    ),
    *router.urls,
]
