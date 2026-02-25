from django.contrib import admin
from .models import Episode, Profile, WatchProgress, WatchHistory

admin.site.register(Episode)
admin.site.register(Profile)
admin.site.register(WatchProgress)
admin.site.register(WatchHistory)
