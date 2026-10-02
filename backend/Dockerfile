# syntax=docker/dockerfile:1.7
# Multi-arch (amd64 + arm64 for Oracle Ampere) image for the TWings Django API.
# Contains no secrets: every credential is injected at runtime from /opt/twings/env/backend.env.

ARG PYTHON_IMAGE=python:3.13-slim-trixie@sha256:bb2988715db2cf7ace7b53f38f3cffbef7c7046a656bee66245eb0ed386e2e81

# ---------------------------------------------------------------- build stage
FROM ${PYTHON_IMAGE} AS build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
COPY requirements.txt .
# --require-hashes: refuse any package whose hash differs from the reviewed lock file.
RUN python -m venv /venv && /venv/bin/pip install --require-hashes --no-deps -r requirements.txt

COPY . /app
# collectstatic needs importable prod settings; these throwaway values exist only in this layer.
RUN cd /app && DJANGO_SETTINGS_MODULE=config.settings.prod \
    DJANGO_SECRET_KEY=collectstatic-only DJANGO_ADMIN_URL=build-only/ DATABASE_URL=sqlite:////tmp/x.db \
    FIELD_ENCRYPTION_KEYS=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= BLIND_INDEX_KEY=x \
    R2_ENDPOINT_URL=https://example.invalid R2_ACCESS_KEY_ID=x R2_SECRET_ACCESS_KEY=x \
    R2_PUBLIC_BUCKET=x R2_PUBLIC_DOMAIN=example.invalid R2_PRIVATE_BUCKET=x \
    /venv/bin/python manage.py collectstatic --noinput -v0

# ---------------------------------------------------------------- runtime stage
FROM ${PYTHON_IMAGE}
LABEL org.opencontainers.image.source="https://github.com/peopleflowvn/TWings-Academy" \
      org.opencontainers.image.description="TWings Academy Django API"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH=/venv/bin:$PATH \
    DJANGO_SETTINGS_MODULE=config.settings.prod

RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app

COPY --from=build /venv /venv
COPY --from=build --chown=root:root /app /app
# Code stays root-owned and read-only for the app user.
WORKDIR /app
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import urllib.request as u; u.urlopen(u.Request('http://127.0.0.1:8000/api/v1/health/', headers={'Host': '127.0.0.1'}), timeout=4)"]

CMD ["gunicorn", "config.wsgi:application", "-c", "gunicorn.conf.py"]
