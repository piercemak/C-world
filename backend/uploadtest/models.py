from django.contrib.auth.models import User
from django.db import models

class Episode(models.Model):
    title = models.CharField(max_length=100)
    season = models.IntegerField()
    episode_number = models.IntegerField()
    video = models.FileField(upload_to='converted/%Y/season%(season)d/')  # or just 'converted/'


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    background_color = models.CharField(max_length=20, default="#000000")
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    volume = models.FloatField(default=1.0)

class WatchProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    show_id = models.CharField(max_length=100)
    season = models.IntegerField(null=True, blank=True)
    episode = models.IntegerField(null=True, blank=True)
    progress = models.FloatField(default=0.0)
    
    
    def __str__(self):
        return f"{self.show_id} S{self.season:02d}E{self.episode:02d} – {self.progress:.1f}s"

