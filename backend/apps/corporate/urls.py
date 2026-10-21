"""Mounted at /api/v1/staff/corporate/ (see config/staff_urls.py)."""

from rest_framework.routers import SimpleRouter

from .views import (
    ClientUnitViewSet,
    CorporateClassViewSet,
    CorporateClientViewSet,
    CorporateEnrollmentViewSet,
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

urlpatterns = router.urls
