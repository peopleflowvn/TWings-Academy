"""
Base settings shared by every environment.

Every secret comes from environment variables (see backend/.env.example). Nothing sensitive is
hard-coded here, so this file is safe to keep in a public repository.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env()
# Local development convenience only; production injects variables via docker compose env_file.
if (BASE_DIR / ".env").is_file():
    env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

# Random, non-guessable path for the Django admin in production (e.g. "ops-7f3k9q/").
ADMIN_URL = env("DJANGO_ADMIN_URL", default="admin/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "rest_framework",
    "django_filters",
    "axes",
    "storages",
    # Local
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.cms",
    "apps.crm",
    "apps.payments",
    "apps.notifications",
]

MIDDLEWARE = [
    "apps.core.middleware.CloudflareRealIPMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.SecurityHeadersMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Must be last: locks out brute-force login attempts.
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database & cache
# ---------------------------------------------------------------------------
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
DATABASES["default"]["ATOMIC_REQUESTS"] = True

# Database-backed cache keeps throttling consistent across gunicorn workers without adding Redis.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Brute-force protection: lock a username+IP pair after 5 failures for 1 hour.
AXES_FAILURE_LIMIT = env.int("AXES_FAILURE_LIMIT", default=5)
AXES_COOLOFF_TIME = timedelta(hours=1)
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]
AXES_RESET_ON_SUCCESS = True
AXES_USERNAME_CALLABLE = "apps.accounts.axes.get_username"
AXES_LOCKOUT_CALLABLE = "apps.accounts.axes.lockout_response"

# Staff sessions: short-lived, HttpOnly, never readable from JavaScript.
SESSION_COOKIE_AGE = env.int("SESSION_COOKIE_AGE", default=60 * 60 * 8)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_NAME = "twings_sid"
CSRF_COOKIE_HTTPONLY = True  # the SPA reads the token from /auth/csrf/, not from the cookie
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_NAME = "twings_csrf"
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

# ---------------------------------------------------------------------------
# CORS: only the official frontend origins may call the API with credentials.
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
CORS_URLS_REGEX = r"^/api/v1/(?!webhooks/).*$"

# ---------------------------------------------------------------------------
# Security headers (TLS terminates at Cloudflare; the tunnel forwards X-Forwarded-Proto)
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
# Only trust CF-Connecting-IP when the app is reachable exclusively through Cloudflare.
TRUST_CLOUDFLARE_IP_HEADER = env.bool("TRUST_CLOUDFLARE_IP_HEADER", default=False)

DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
MAX_UPLOAD_IMAGE_BYTES = env.int("MAX_UPLOAD_IMAGE_BYTES", default=5 * 1024 * 1024)

# ---------------------------------------------------------------------------
# Django REST Framework: deny by default, session auth only, camelCase JSON for the SPA
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["djangorestframework_camel_case.render.CamelCaseJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
        "djangorestframework_camel_case.parser.CamelCaseMultiPartParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("THROTTLE_ANON", default="120/min"),
        "user": env("THROTTLE_USER", default="1200/min"),
        "public_form": env("THROTTLE_PUBLIC_FORM", default="10/hour"),
        "login": env("THROTTLE_LOGIN", default="20/hour"),
        "email_send": env("THROTTLE_EMAIL_SEND", default="60/hour"),
        "webhook": env("THROTTLE_WEBHOOK", default="600/min"),
    },
    "COERCE_DECIMAL_TO_STRING": False,  # ratings are numbers in the frontend types
    "DATE_FORMAT": "%d/%m/%Y",
    "DATE_INPUT_FORMATS": ["%d/%m/%Y", "iso-8601"],
    "UNAUTHENTICATED_USER": None,
}

# ---------------------------------------------------------------------------
# I18N
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static (served by WhiteNoise) & media (Cloudflare R2 in production)
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "private": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {"location": BASE_DIR / "media_private"},
    },
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# ---------------------------------------------------------------------------
# Field-level encryption for personal data (CCCD, addresses, bank accounts).
# Comma-separated Fernet keys; the first encrypts, all decrypt (allows key rotation).
# ---------------------------------------------------------------------------
FIELD_ENCRYPTION_KEYS = env.list("FIELD_ENCRYPTION_KEYS")
# Separate key for deterministic lookup hashes (e.g. duplicate detection on CCCD).
BLIND_INDEX_KEY = env("BLIND_INDEX_KEY")

# ---------------------------------------------------------------------------
# Integrations (all optional in development)
# ---------------------------------------------------------------------------
RESEND_API_KEY = env("RESEND_API_KEY", default="")
RESEND_FROM_EMAIL = env("RESEND_FROM_EMAIL", default="TWings Academy <onboarding@resend.dev>")
RESEND_WEBHOOK_SECRET = env("RESEND_WEBHOOK_SECRET", default="")

# Bank transaction webhook (SePay-compatible: "Authorization: Apikey <key>")
BANK_WEBHOOK_API_KEY = env("BANK_WEBHOOK_API_KEY", default="")

# Receiving account shown in VietQR codes. Public information, but kept in config, not code.
VIETQR_BANK_BIN = env("VIETQR_BANK_BIN", default="970426")  # MSB
VIETQR_BANK_NAME = env("VIETQR_BANK_NAME", default="MSB")
VIETQR_ACCOUNT_NUMBER = env("VIETQR_ACCOUNT_NUMBER", default="")
VIETQR_ACCOUNT_NAME = env("VIETQR_ACCOUNT_NAME", default="CONG TY CP TWINGS ACADEMY")
VIETQR_TEMPLATE = env("VIETQR_TEMPLATE", default="compact2")

# ---------------------------------------------------------------------------
# Logging: structured to stdout, never log request bodies or secrets.
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
    "loggers": {
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "axes": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
