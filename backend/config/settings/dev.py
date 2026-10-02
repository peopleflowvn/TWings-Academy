"""Local development settings. Never used on the VPS."""

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ALLOWED_HOSTS or ["127.0.0.1", "localhost"]  # noqa: F405
CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS or ["http://127.0.0.1:3000", "http://localhost:3000"]  # noqa: F405
CSRF_TRUSTED_ORIGINS = CSRF_TRUSTED_ORIGINS or CORS_ALLOWED_ORIGINS  # noqa: F405
