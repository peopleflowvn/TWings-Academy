from django.apps import AppConfig


class LmsConfig(AppConfig):
    name = "apps.lms"
    verbose_name = "LMS (Moodle)"

    def ready(self):
        from . import signals  # noqa: F401
