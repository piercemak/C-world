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
