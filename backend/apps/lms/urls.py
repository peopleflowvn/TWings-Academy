from django.urls import path

from . import views

urlpatterns = [
    path("orders/<str:pk>/", views.OrderLearningView.as_view(), name="lms-order"),
    path("orders/<str:pk>/actions/", views.OrderLearningActionView.as_view(), name="lms-order-action"),
    path("courses/", views.CourseCatalogView.as_view(), name="lms-courses"),
    path("courses/<int:moodle_course_id>/learners/", views.CourseLearnersView.as_view(), name="lms-learners"),
    path("cohorts/<str:pk>/provision/", views.ProvisionCohortView.as_view(), name="lms-provision-cohort"),
    path("open/", views.OpenMoodleView.as_view(), name="lms-open"),
]
