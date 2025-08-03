from django.db import models

class Episode(models.Model):
    title = models.CharField(max_length=100)
    season = models.IntegerField()
    episode_number = models.IntegerField()
    video = models.FileField(upload_to='converted/%Y/season%(season)d/')  # or just 'converted/'
    
    def __str__(self):
        return f"S{self.season:02d}E{self.episode_number:02d} - {self.title}"
