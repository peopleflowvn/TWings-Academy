"""Mounted at /api/v1/staff/corporate/ (see config/staff_urls.py)."""

from rest_framework.routers import SimpleRouter

from .views import (
    AttendanceAdjustmentViewSet,
    ClientUnitViewSet,
    CorporateClassViewSet,
    CorporateClientViewSet,
    CorporateEnrollmentViewSet,
    ImportBatchViewSet,
    ImportTemplateViewSet,
    ServiceContractViewSet,
    TrainingPlanViewSet,
)

router = SimpleRouter()
router.register("clients", CorporateClientViewSet, basename="corporate-client")
router.register("units", ClientUnitViewSet, basename="corporate-unit")
router.register("contracts", ServiceContractViewSet, basename="corporate-contract")
router.register("plans", TrainingPlanViewSet, basename="corporate-plan")
router.register("classes", CorporateClassViewSet, basename="corporate-class")
router.register("enrollments", CorporateEnrollmentViewSet, basename="corporate-enrollment")
router.register("import-templates", ImportTemplateViewSet, basename="corporate-import-template")
router.register("imports", ImportBatchViewSet, basename="corporate-import")
router.register("attendance-adjustments", AttendanceAdjustmentViewSet, basename="corporate-adjustment")

urlpatterns = router.urls
