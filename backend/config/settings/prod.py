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
# Cloudflare enforces HTTPS at the edge; redirecting here too would loop through the tunnel.
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
# Preloading is hard to undo: opt in explicitly once every subdomain is HTTPS-only.
SECURE_HSTS_PRELOAD = env.bool("DJANGO_SECURE_HSTS_PRELOAD", default=False)

# Session cookie may be shared with the frontend's registrable domain if needed (e.g. ".twings.edu.vn").
SESSION_COOKIE_DOMAIN = env("DJANGO_SESSION_COOKIE_DOMAIN", default=None)
CSRF_COOKIE_DOMAIN = env("DJANGO_CSRF_COOKIE_DOMAIN", default=None)

# ---------------------------------------------------------------------------
# Cloudflare R2 (S3-compatible). Public bucket for images, private bucket for CVs/documents.
# ---------------------------------------------------------------------------
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
            "custom_domain": env("R2_PUBLIC_DOMAIN"),  # e.g. media.twings.edu.vn
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

# W008: HTTPS redirect is enforced by Cloudflare ("Always Use HTTPS"); the origin is only reachable
#       through the tunnel, so redirecting here would loop.
# W021: HSTS preload is deliberately opt-in (DJANGO_SECURE_HSTS_PRELOAD) because it is hard to undo.
SILENCED_SYSTEM_CHECKS = ["security.W008"] + ([] if SECURE_HSTS_PRELOAD else ["security.W021"])
