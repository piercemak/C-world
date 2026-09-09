from django.db import models
from django.contrib.auth.models import User

class Episode(models.Model):
    title = models.CharField(max_length=100)
    season = models.IntegerField()
    episode_number = models.IntegerField()
    video = models.FileField(upload_to='converted/%Y/season%(season)d/')  # or just 'converted/'
    
    def __str__(self):
        return f"S{self.season:02d}E{self.episode_number:02d} - {self.title}"


class Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="profiles")
    name = models.CharField(max_length=50)
    avatar_url = models.TextField(blank=True)
    archive_backdrop = models.TextField(blank=True)
    is_kid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.name}"


class WatchProgress(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="watch_progress")
    show_id = models.CharField(max_length=100)
    season = models.IntegerField(null=True, blank=True)
    episode = models.IntegerField(null=True, blank=True)
    current_time = models.FloatField(default=0)
    duration = models.FloatField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("profile", "show_id", "season", "episode")
        ordering = ["-updated_at"]


class WatchHistory(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="watch_history")
    show_id = models.CharField(max_length=100)
    season = models.IntegerField(null=True, blank=True)
    episode = models.IntegerField(null=True, blank=True)
    watched_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("profile", "show_id")
        ordering = ["-watched_at"]


class DeviceLoginSession(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_CONSUMED = "consumed"

    status = models.CharField(max_length=16, default=STATUS_PENDING)
    poll_token_hash = models.CharField(max_length=64, unique=True)
    user_code_hash = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="device_login_sessions",
    )
    expires_at = models.DateTimeField()
    approved_at = models.DateTimeField(null=True, blank=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "expires_at"]),
        ]

    def __str__(self):
        return f"Device login {self.id} ({self.status})"
