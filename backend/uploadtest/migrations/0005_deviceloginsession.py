from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("uploadtest", "0004_profile_archive_backdrop_and_avatar_text"),
    ]

    operations = [
        migrations.CreateModel(
            name="DeviceLoginSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(default="pending", max_length=16)),
                ("poll_token_hash", models.CharField(max_length=64, unique=True)),
                ("user_code_hash", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="device_login_sessions",
                        to="auth.user",
                    ),
                ),
            ],
            options={
                "indexes": [models.Index(fields=["status", "expires_at"], name="uploadtest__status_6ddad0_idx")],
            },
        ),
    ]
