from django.contrib import admin

from .models import Cohort, Coupon, Course, Instructor, Partner


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "slug", "category", "price", "is_published"]
    list_filter = ["category", "is_published", "delivery_format"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ["title"]}
    filter_horizontal = ["instructors"]


@admin.register(Cohort)
class CohortAdmin(admin.ModelAdmin):
    list_display = ["name", "course", "status", "start_date", "capacity"]
    list_filter = ["status", "course"]


admin.site.register(Instructor, search_fields=["name"], list_display=["name", "title", "status"])
admin.site.register(Partner, list_display=["name", "type", "is_active"])
admin.site.register(Coupon, list_display=["code", "discount_percent", "usage_count", "is_active"])
