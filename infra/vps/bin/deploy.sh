#!/usr/bin/env bash
# Pull and roll out a backend image, run migrations, verify health, roll back on failure.
# Runs as root via sudo from deploy-gate (sudoers allows only this exact script).
set -euo pipefail

TAG="${1:-}"
[[ "$TAG" =~ ^[0-9a-f]{40}$ ]] || { echo "invalid tag" >&2; exit 2; }

cd /opt/twings
exec 9>/var/lock/twings-deploy.lock
flock -n 9 || { echo "another deploy is running" >&2; exit 3; }

PREV_TAG="$(sed -n 's/^IMAGE_TAG=//p' .env 2>/dev/null || true)"
set_tag() { printf 'IMAGE_TAG=%s\n' "$1" > .env.tmp && mv .env.tmp .env; }

health() {
  for _ in $(seq 1 30); do
    if docker compose exec -T backend python -c \
      "import urllib.request as u; u.urlopen(u.Request('http://127.0.0.1:8000/api/v1/health/', headers={'Host': '127.0.0.1'}), timeout=3)" \
      >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

echo "==> deploying ${TAG} (previous: ${PREV_TAG:-none})"
set_tag "$TAG"
docker compose pull --quiet backend caddy
docker compose up -d --wait db
# Migrations must stay backward compatible with the previous image (expand/contract), because a
# rollback below only swaps the image; it never reverses migrations.
docker compose run --rm --no-deps backend python manage.py migrate --noinput
docker compose run --rm --no-deps backend python manage.py createcachetable
docker compose up -d --remove-orphans

if health && docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  echo "==> healthy: ${TAG}"
  docker image prune -f --filter "until=168h" >/dev/null
  logger -t twings-deploy "deployed ${TAG}"
else
  echo "!! health check failed, rolling back to ${PREV_TAG:-<none>}" >&2
  logger -t twings-deploy "FAILED ${TAG}, rolling back to ${PREV_TAG:-none}"
  if [[ -n "$PREV_TAG" ]]; then
    set_tag "$PREV_TAG"
    docker compose up -d --remove-orphans
  fi
  exit 1
fi
