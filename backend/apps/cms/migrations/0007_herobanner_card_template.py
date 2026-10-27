# Generated manually for card_template on HeroBanner

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0006_herobanner_show_overlay_button_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='herobanner',
            name='card_template',
            field=models.CharField(blank=True, default='modern_split', max_length=32),
        ),
    ]
