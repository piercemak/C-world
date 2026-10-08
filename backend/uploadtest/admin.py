from django.contrib import admin
from django.utils import timezone
from .models import AccountApprovalRequest, Episode, Profile, WatchProgress, WatchHistory

admin.site.register(Episode)
admin.site.register(Profile)
admin.site.register(WatchProgress)
admin.site.register(WatchHistory)


@admin.register(AccountApprovalRequest)
class AccountApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ("user", "email", "status", "requested_at", "reviewed_at")
    list_filter = ("status",)
    search_fields = ("user__username", "email")
    actions = ("approve_accounts", "deny_accounts")

    @admin.action(description="Approve selected account requests")
    def approve_accounts(self, request, queryset):
        for approval in queryset.filter(status=AccountApprovalRequest.STATUS_PENDING).select_related("user"):
            approval.status = AccountApprovalRequest.STATUS_APPROVED
            approval.reviewed_at = timezone.now()
            approval.save(update_fields=["status", "reviewed_at"])
            approval.user.is_active = True
            approval.user.save(update_fields=["is_active"])

    @admin.action(description="Deny selected account requests")
    def deny_accounts(self, request, queryset):
        for approval in queryset.filter(status=AccountApprovalRequest.STATUS_PENDING).select_related("user"):
            approval.status = AccountApprovalRequest.STATUS_DENIED
            approval.reviewed_at = timezone.now()
            approval.save(update_fields=["status", "reviewed_at"])
            approval.user.is_active = False
            approval.user.save(update_fields=["is_active"])
