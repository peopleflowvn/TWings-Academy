from django.contrib import admin

from .models import LmsEnrollment


@admin.register(LmsEnrollment)
class LmsEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("order", "status", "moodle_user_id", "moodle_course_id", "attempts", "enrolled_at")
    list_filter = ("status",)
    search_fields = ("order__order_code", "order__customer_email")
    readonly_fields = [f.name for f in LmsEnrollment._meta.fields]
