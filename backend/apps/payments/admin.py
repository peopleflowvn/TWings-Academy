from django.contrib import admin

from .models import BankTransaction, Payment


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ["created_at", "provider_txn_id", "amount", "match_status", "order"]
    list_filter = ["match_status", "provider"]
    search_fields = ["provider_txn_id", "content", "reference_code"]
    readonly_fields = [f.name for f in BankTransaction._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["created_at", "order", "amount", "source", "confirmed_by"]
    list_filter = ["source"]
    readonly_fields = [f.name for f in Payment._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
