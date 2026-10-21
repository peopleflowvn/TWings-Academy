from django.contrib import admin

from .models import ClientUnit, CorporateClass, CorporateClient, CorporateEmployee, CorporateEnrollment


@admin.register(CorporateClient)
class CorporateClientAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active")
    search_fields = ("code", "name")


@admin.register(ClientUnit)
class ClientUnitAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "kind", "code")
    list_filter = ("kind",)


@admin.register(CorporateEmployee)
class CorporateEmployeeAdmin(admin.ModelAdmin):
    list_display = ("learner", "client", "employee_code", "manager_email", "valid_from", "valid_to")
    search_fields = ("employee_code", "learner__full_name", "learner__email")


@admin.register(CorporateClass)
class CorporateClassAdmin(admin.ModelAdmin):
    list_display = ("cohort", "client", "status", "pic", "issue_certificate")
    list_filter = ("status",)


@admin.register(CorporateEnrollment)
class CorporateEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("learner", "corporate_class", "status")
    list_filter = ("status",)
    search_fields = ("learner__full_name", "learner__email")
