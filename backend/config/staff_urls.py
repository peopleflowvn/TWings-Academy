"""Authenticated staff (CMS) endpoints. Every view enforces RBAC permission codes."""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.accounts.views import StaffUserViewSet
from apps.catalog.views import CohortViewSet, CouponViewSet, CourseViewSet, InstructorViewSet, PartnerViewSet
from apps.cms.views import ArticleViewSet, HeroBannerViewSet, SiteConfigViewSet
from apps.core.uploads import ImageUploadView
from apps.crm.views import AdmissionCampaignViewSet, CohortRolloverView, OrderViewSet
from apps.notifications.views import EmailLogViewSet, EmailTemplateViewSet, SendEmailView
from apps.payments.views import BankTransactionViewSet, ConfirmManualPaymentView

router = SimpleRouter()
router.register("users", StaffUserViewSet, basename="staff-user")
router.register("courses", CourseViewSet, basename="staff-course")
router.register("instructors", InstructorViewSet, basename="staff-instructor")
router.register("partners", PartnerViewSet, basename="staff-partner")
router.register("cohorts", CohortViewSet, basename="staff-cohort")
router.register("coupons", CouponViewSet, basename="staff-coupon")
router.register("articles", ArticleViewSet, basename="staff-article")
router.register("banners", HeroBannerViewSet, basename="staff-banner")
router.register("site-config", SiteConfigViewSet, basename="staff-site-config")
router.register("orders", OrderViewSet, basename="staff-order")
router.register("campaigns", AdmissionCampaignViewSet, basename="staff-campaign")
router.register("email-templates", EmailTemplateViewSet, basename="staff-email-template")
router.register("email-logs", EmailLogViewSet, basename="staff-email-log")
router.register("transactions", BankTransactionViewSet, basename="staff-transaction")

urlpatterns = [
    path("emails/send/", SendEmailView.as_view(), name="staff-email-send"),
    path("uploads/images/", ImageUploadView.as_view(), name="staff-image-upload"),
    path(
        "orders/<str:pk>/confirm-payment/", ConfirmManualPaymentView.as_view(), name="staff-confirm-payment"
    ),
    path("cohorts/<str:pk>/rollover/", CohortRolloverView.as_view(), name="staff-cohort-rollover"),
    path("lms/", include("apps.lms.urls")),
    *router.urls,
]
