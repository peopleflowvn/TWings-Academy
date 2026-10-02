from django.contrib import admin

from .models import Activity, AdmissionCampaign, CampaignPosition, FollowupTask, Order


class ActivityInline(admin.TabularInline):
    model = Activity
    extra = 0
    fields = ["type", "title", "content", "actor", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_code",
        "customer_name",
        "course_title",
        "crm_status",
        "status",
        "amount",
        "created_at",
    ]
    list_filter = ["crm_status", "status", "source"]
    search_fields = ["order_code", "customer_name", "customer_phone", "customer_email"]
    readonly_fields = ["order_code", "citizen_id_index", "privacy_consent_at", "privacy_consent_version"]
    inlines = [ActivityInline]


class PositionInline(admin.TabularInline):
    model = CampaignPosition
    extra = 0


@admin.register(AdmissionCampaign)
class AdmissionCampaignAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status", "target_headcount"]
    inlines = [PositionInline]


admin.site.register(FollowupTask, list_display=["title", "order", "due_date", "is_completed"])
