"""Production settings: HTTPS-only cookies, HSTS, media on Cloudflare R2."""

from .base import *  # noqa: F403
from .base import env

DEBUG = False
# The container healthcheck calls the API on 127.0.0.1.
ALLOWED_HOSTS = [*ALLOWED_HOSTS, "127.0.0.1"]  # noqa: F405

if ADMIN_URL == "admin/":  # noqa: F405
    raise RuntimeError("Set DJANGO_ADMIN_URL to a random, non-guessable path in production.")

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# Caddy redirects HTTP to HTTPS before requests reach Django.
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
# Preloading is hard to undo: opt in explicitly once every subdomain is HTTPS-only.
SECURE_HSTS_PRELOAD = env.bool("DJANGO_SECURE_HSTS_PRELOAD", default=False)

# Session cookie may be shared with the frontend's registrable domain if needed (e.g. ".twings.edu.vn").
SESSION_COOKIE_DOMAIN = env("DJANGO_SESSION_COOKIE_DOMAIN", default=None)
CSRF_COOKIE_DOMAIN = env("DJANGO_CSRF_COOKIE_DOMAIN", default=None)

# ---------------------------------------------------------------------------
# Uploaded files. With R2 configured: public bucket for images, private bucket for CVs/documents.
# Without R2: the /data volume, public media served by Caddy at MEDIA_URL (absolute, API host).
# ---------------------------------------------------------------------------
if env("R2_ENDPOINT_URL", default=""):
    _r2_common = {
        "endpoint_url": env("R2_ENDPOINT_URL"),  # https://<account_id>.r2.cloudflarestorage.com
        "access_key": env("R2_ACCESS_KEY_ID"),
        "secret_key": env("R2_SECRET_ACCESS_KEY"),
        "region_name": "auto",
        "signature_version": "s3v4",
        "default_acl": None,
        "file_overwrite": False,
    }
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                **_r2_common,
                "bucket_name": env("R2_PUBLIC_BUCKET"),
                "custom_domain": env("R2_PUBLIC_DOMAIN"),  # e.g. pub-<id>.r2.dev
                "querystring_auth": False,
            },
        },
        "private": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                **_r2_common,
                "bucket_name": env("R2_PRIVATE_BUCKET"),
                "querystring_auth": True,
                "querystring_expire": 300,  # pre-signed links live 5 minutes
            },
        },
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
else:
    MEDIA_ROOT = env("MEDIA_ROOT", default="/data/media")
    MEDIA_URL = env("MEDIA_URL")  # e.g. https://api-tuyensinh.twings.edu.vn/media/
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "private": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {"location": env("PRIVATE_MEDIA_ROOT", default="/data/private")},
        },
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }

# W008: HTTPS redirect is enforced by Caddy, the only way to reach the app (it publishes no port).
# W021: HSTS preload is deliberately opt-in (DJANGO_SECURE_HSTS_PRELOAD) because it is hard to undo.
SILENCED_SYSTEM_CHECKS = ["security.W008"] + ([] if SECURE_HSTS_PRELOAD else ["security.W021"])
