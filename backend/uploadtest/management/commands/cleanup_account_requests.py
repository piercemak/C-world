from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from uploadtest.models import AccountApprovalRequest


class Command(BaseCommand):
    help = "Remove abandoned pending and old denied CWorld account requests."

    def handle(self, *args, **options):
        now = timezone.now()
        pending_age = now - timedelta(seconds=max(86400, int(getattr(settings, "CWORLD_ACCOUNT_PENDING_TTL_SECONDS", 2592000))))
        denied_age = now - timedelta(seconds=max(86400, int(getattr(settings, "CWORLD_ACCOUNT_DENIED_RETENTION_SECONDS", 7776000))))

        pending, _ = AccountApprovalRequest.objects.filter(
            status=AccountApprovalRequest.STATUS_PENDING,
            requested_at__lt=pending_age,
        ).delete()
        denied, _ = AccountApprovalRequest.objects.filter(
            status=AccountApprovalRequest.STATUS_DENIED,
            reviewed_at__lt=denied_age,
        ).delete()

        self.stdout.write(self.style.SUCCESS(f"Removed {pending} abandoned pending records and {denied} expired denied records."))
