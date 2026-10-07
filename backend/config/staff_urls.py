"""Authenticated staff (CMS) endpoints. Every view enforces RBAC permission codes."""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.accounts.views import StaffUserViewSet
from apps.catalog.views import (
    CohortSessionsView,
    CohortViewSet,
    CouponViewSet,
    CourseReviewViewSet,
    CourseViewSet,
    InstructorViewSet,
    IntakesOverviewView,
    PartnerViewSet,
    ProgramViewSet,
)
from apps.cms.views import ArticleViewSet, HeroBannerViewSet, SiteConfigViewSet
from apps.core.dashboard import DashboardView, SystemHealthView
from apps.core.reports import ReportsView
from apps.core.uploads import ImageUploadView
from apps.core.views import AuditLogViewSet
from apps.crm.placement_views import (
    CandidatesView,
    OutcomesView,
    PlacementListView,
    PlacementMoveView,
    PlacementOutcomeView,
    ShareListView,
    ShareRevokeView,
)
from apps.crm.views import (
    AdmissionCampaignViewSet,
    AppointmentViewSet,
    CohortRolloverView,
    CohortRosterView,
    ConsultantsView,
    InvoiceRequestViewSet,
    JourneysView,
    OrderCvView,
    OrderViewSet,
)
from apps.notifications.views import EmailLogViewSet, EmailTemplateViewSet, SendEmailView
from apps.payments.views import (
    BankTransactionViewSet,
    ConfirmManualPaymentView,
    OrderBillingView,
    RefundOrderView,
)

router = SimpleRouter()
router.register("users", StaffUserViewSet, basename="staff-user")
router.register("courses", CourseViewSet, basename="staff-course")
router.register("programs", ProgramViewSet, basename="staff-program")
router.register("instructors", InstructorViewSet, basename="staff-instructor")
router.register("partners", PartnerViewSet, basename="staff-partner")
router.register("cohorts", CohortViewSet, basename="staff-cohort")
router.register("coupons", CouponViewSet, basename="staff-coupon")
router.register("reviews", CourseReviewViewSet, basename="staff-review")
router.register("articles", ArticleViewSet, basename="staff-article")
router.register("banners", HeroBannerViewSet, basename="staff-banner")
router.register("site-config", SiteConfigViewSet, basename="staff-site-config")
router.register("orders", OrderViewSet, basename="staff-order")
router.register("campaigns", AdmissionCampaignViewSet, basename="staff-campaign")
router.register("appointments", AppointmentViewSet, basename="staff-appointment")
router.register("invoices", InvoiceRequestViewSet, basename="staff-invoice")
router.register("email-templates", EmailTemplateViewSet, basename="staff-email-template")
router.register("email-logs", EmailLogViewSet, basename="staff-email-log")
router.register("transactions", BankTransactionViewSet, basename="staff-transaction")
router.register("audit-logs", AuditLogViewSet, basename="staff-audit-log")

urlpatterns = [
    path("emails/send/", SendEmailView.as_view(), name="staff-email-send"),
    path("uploads/images/", ImageUploadView.as_view(), name="staff-image-upload"),
    path(
        "orders/<str:pk>/confirm-payment/", ConfirmManualPaymentView.as_view(), name="staff-confirm-payment"
    ),
    path("orders/<str:pk>/billing/", OrderBillingView.as_view(), name="staff-order-billing"),
    path("orders/<str:pk>/refund/", RefundOrderView.as_view(), name="staff-order-refund"),
    path("intakes/", IntakesOverviewView.as_view(), name="staff-intakes"),
    path("cohorts/<str:pk>/sessions/", CohortSessionsView.as_view(), name="staff-cohort-sessions"),
    path("cohorts/<str:pk>/roster/", CohortRosterView.as_view(), name="staff-cohort-roster"),
    path("orders/<str:pk>/cv/", OrderCvView.as_view(), name="staff-order-cv"),
    path("consultants/", ConsultantsView.as_view(), name="staff-consultants"),
    path("cohorts/<str:pk>/rollover/", CohortRolloverView.as_view(), name="staff-cohort-rollover"),
    path("lms/", include("apps.lms.urls")),
    path("placements/", PlacementListView.as_view(), name="staff-placements"),
    path("placements/candidates/", CandidatesView.as_view(), name="staff-placement-candidates"),
    path("placements/outcomes/", OutcomesView.as_view(), name="staff-placement-outcomes"),
    path("placements/shares/", ShareListView.as_view(), name="staff-placement-shares"),
    path(
        "placements/shares/<str:pk>/revoke/", ShareRevokeView.as_view(), name="staff-placement-share-revoke"
    ),
    path("placements/<str:pk>/move/", PlacementMoveView.as_view(), name="staff-placement-move"),
    path("placements/<str:pk>/outcome/", PlacementOutcomeView.as_view(), name="staff-placement-outcome"),
    path("dashboard/", DashboardView.as_view(), name="staff-dashboard"),
    path("reports/", ReportsView.as_view(), name="staff-reports"),
    path("journeys/", JourneysView.as_view(), name="staff-journeys"),
    path("system/health/", SystemHealthView.as_view(), name="staff-system-health"),
    *router.urls,
]
