"""Mounted at /api/v1/staff/corporate/ (see config/staff_urls.py)."""

from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    AcceptanceBatchViewSet,
    AttendanceAdjustmentViewSet,
    ClassDocumentViewSet,
    ClientPaymentViewSet,
    ClientShareViewSet,
    ClientUnitViewSet,
    CommunicationBatchViewSet,
    CorporateClassViewSet,
    CorporateClientViewSet,
    CorporateEmployeeViewSet,
    CorporateEnrollmentViewSet,
    DashboardView,
    ExpenseViewSet,
    ImportBatchViewSet,
    ImportTemplateViewSet,
    ReceivablesView,
    ResultSnapshotViewSet,
    ServiceContractViewSet,
    TrainingPlanViewSet,
    TrainingRequestViewSet,
)

router = SimpleRouter()
router.register("clients", CorporateClientViewSet, basename="corporate-client")
router.register("units", ClientUnitViewSet, basename="corporate-unit")
router.register("contracts", ServiceContractViewSet, basename="corporate-contract")
router.register("plans", TrainingPlanViewSet, basename="corporate-plan")
router.register("classes", CorporateClassViewSet, basename="corporate-class")
router.register("enrollments", CorporateEnrollmentViewSet, basename="corporate-enrollment")
router.register("employees", CorporateEmployeeViewSet, basename="corporate-employee")
router.register("import-templates", ImportTemplateViewSet, basename="corporate-import-template")
router.register("imports", ImportBatchViewSet, basename="corporate-import")
router.register("attendance-adjustments", AttendanceAdjustmentViewSet, basename="corporate-adjustment")
router.register("results", ResultSnapshotViewSet, basename="corporate-result")
router.register("communications", CommunicationBatchViewSet, basename="corporate-communication")
router.register("acceptances", AcceptanceBatchViewSet, basename="corporate-acceptance")
router.register("documents", ClassDocumentViewSet, basename="corporate-document")
router.register("requests", TrainingRequestViewSet, basename="corporate-request")
router.register("expenses", ExpenseViewSet, basename="corporate-expense")
router.register("shares", ClientShareViewSet, basename="corporate-share")
router.register("payments", ClientPaymentViewSet, basename="corporate-payment")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="corporate-dashboard"),
    path("receivables/", ReceivablesView.as_view(), name="corporate-receivables"),
    *router.urls,
]
