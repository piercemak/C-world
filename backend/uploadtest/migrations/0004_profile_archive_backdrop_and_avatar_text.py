from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("uploadtest", "0003_watchprogress_watchhistory"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="avatar_url",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="archive_backdrop",
            field=models.TextField(blank=True),
        ),
    ]
