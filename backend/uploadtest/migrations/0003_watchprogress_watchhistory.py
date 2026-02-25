# Generated manually for account-based progress/history
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("uploadtest", "0002_profile"),
    ]

    operations = [
        migrations.CreateModel(
            name="WatchProgress",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("show_id", models.CharField(max_length=100)),
                ("season", models.IntegerField(blank=True, null=True)),
                ("episode", models.IntegerField(blank=True, null=True)),
                ("current_time", models.FloatField(default=0)),
                ("duration", models.FloatField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="watch_progress",
                        to="uploadtest.profile",
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
                "unique_together": {("profile", "show_id", "season", "episode")},
            },
        ),
        migrations.CreateModel(
            name="WatchHistory",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("show_id", models.CharField(max_length=100)),
                ("season", models.IntegerField(blank=True, null=True)),
                ("episode", models.IntegerField(blank=True, null=True)),
                ("watched_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="watch_history",
                        to="uploadtest.profile",
                    ),
                ),
            ],
            options={
                "ordering": ["-watched_at"],
                "unique_together": {("profile", "show_id")},
            },
        ),
    ]
