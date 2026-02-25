from rest_framework import serializers # type: ignore
from django.contrib.auth.models import User
from .models import Episode, Profile, WatchProgress, WatchHistory

class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        fields = ['id', 'title', 'video']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "name", "avatar_url", "is_kid", "created_at"]
        read_only_fields = ["id", "created_at"]


class WatchProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchProgress
        fields = [
            "id",
            "show_id",
            "season",
            "episode",
            "current_time",
            "duration",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class WatchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchHistory
        fields = ["id", "show_id", "season", "episode", "watched_at"]
        read_only_fields = ["id", "watched_at"]
