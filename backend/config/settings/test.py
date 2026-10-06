"""Test settings: self-contained so CI needs no secrets. Uses DATABASE_URL when provided (Postgres in CI)."""

import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-not-a-secret")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
# Throwaway Fernet key generated for tests only.
os.environ.setdefault("FIELD_ENCRYPTION_KEYS", "3q2-7wBlEC6h0zFHgXYIX8B4K0zWw8nU2qJXQx3cFfA=")
os.environ.setdefault("BLIND_INDEX_KEY", "test-blind-index-key")

from .base import *  # noqa: E402, F403

DEBUG = False
ALLOWED_HOSTS = ["testserver"]
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # speed only
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
RESEND_API_KEY = ""
RESEND_WEBHOOK_SECRET = "whsec_dGVzdC1zZWNyZXQtZm9yLXRlc3RzLW9ubHk="
BANK_WEBHOOK_API_KEY = "test-bank-key"
VIETQR_ACCOUNT_NUMBER = "0123456789"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "private": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
REST_FRAMEWORK = {**REST_FRAMEWORK}  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    **REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
    "anon": "10000/min",
    "public_form": "10000/min",
    "login": "10000/min",
    "track": "10000/min",
}
