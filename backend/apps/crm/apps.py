from django.apps import AppConfig


class CrmConfig(AppConfig):
    name = "apps.crm"

    def ready(self):
        from . import signals  # noqa: F401
