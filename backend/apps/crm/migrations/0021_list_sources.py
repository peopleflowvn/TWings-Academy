"""
Lead sources in the list's values: "Google" and "YouTube" join the list, and the sources written before
it existed ("Website Form Tư vấn", "Website · Facebook" from the UTM channel…) become the list's value
(the channel stays in the lead's attribution).
"""

from django.db import migrations
from django.db.models import F

NEW_SOURCES = ("Google", "YouTube")


def to_list(apps, schema_editor):
    from apps.crm.attribution import CHANNEL_SOURCES, SOURCE_LABELS
    from apps.crm.lists import normalize

    ListItem = apps.get_model("crm", "ListItem")
    Order = apps.get_model("crm", "Order")
    sources = ListItem.objects.filter(kind="source")
    missing = [v for v in NEW_SOURCES if not sources.filter(value=v).exists()]
    if missing:
        after = sources.filter(value="TikTok").values_list("position", flat=True).first()
        after = after if after is not None else max(sources.values_list("position", flat=True), default=-1)
        sources.filter(position__gt=after).update(position=F("position") + len(missing))
        for i, value in enumerate(missing, start=1):
            ListItem.objects.create(kind="source", value=value, position=after + i)
    items = list(sources.values_list("value", flat=True))
    label_keys = {label: key for key, label in SOURCE_LABELS.items()}
    for value in Order.objects.exclude(source="").values_list("source", flat=True).distinct():
        head, _, tail = value.partition(" · ")
        new = normalize("source", head, items)
        channel = CHANNEL_SOURCES.get(label_keys.get(tail.strip(), ""))
        if new not in items:
            new = "Website" if tail else value
        if channel in items and new == "Website":
            new = channel
        if new != value:
            Order.objects.filter(source=value).update(source=new)



class Migration(migrations.Migration):
    dependencies = [("crm", "0020_listitem")]

    operations = [migrations.RunPython(to_list, migrations.RunPython.noop)]
