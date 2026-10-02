from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "name", "role", "is_active", "is_staff", "last_login"]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = ["email", "name"]
    fieldsets = [
        (None, {"fields": ["email", "password"]}),
        ("Hồ sơ", {"fields": ["name", "phone", "avatar"]}),
        ("Phân quyền", {"fields": ["role", "permission_overrides", "is_active", "is_staff", "is_superuser"]}),
        ("Thời gian", {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [
        (None, {"classes": ["wide"], "fields": ["email", "name", "role", "password1", "password2"]})
    ]
    readonly_fields = ["last_login", "date_joined"]
