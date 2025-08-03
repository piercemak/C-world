from rest_framework import serializers # type: ignore
from .models import Episode

class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        fields = ['id', 'title', 'video']
