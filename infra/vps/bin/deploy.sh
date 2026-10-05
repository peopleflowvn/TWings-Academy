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
# Compose interpolation file: image tag + the shared gateway's network name (env/gateway.env).
set_tag() {
  { printf 'IMAGE_TAG=%s\n' "$1"; grep '^GATEWAY_NETWORK=' env/gateway.env; } > .env.tmp && mv .env.tmp .env
}

# Through the web container: checks the React site, the web -> backend proxy and the API.
health() {
  set -a; . ./env/caddy.env; set +a
  for _ in $(seq 1 45); do
    if docker compose exec -T web wget -qO /dev/null --header "Host: ${API_DOMAIN}" \
         http://127.0.0.1:8080/api/v1/health/ >/dev/null 2>&1 &&
       docker compose exec -T web wget -qO /dev/null --header "Host: ${WEB_DOMAIN}" \
         http://127.0.0.1:8080/ >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Shared host: only remove TWings images, keeping the current and previous tags for rollback.
prune_own_images() {
  docker image ls --format '{{.Repository}}:{{.Tag}}' \
    | grep -E '^ghcr\.io/peopleflowvn/twings-academy-(backend|web):[0-9a-f]{40}$' \
    | grep -v -e ":${TAG}$" ${PREV_TAG:+-e ":${PREV_TAG}$"} \
    | xargs -r docker image rm >/dev/null 2>&1 || true
}

echo "==> deploying ${TAG} (previous: ${PREV_TAG:-none})"
set_tag "$TAG"
docker compose pull --quiet backend web
docker compose up -d --wait db
# Migrations must stay backward compatible with the previous image (expand/contract), because a
# rollback below only swaps the image; it never reverses migrations.
docker compose run --rm --no-deps backend python manage.py migrate --noinput
docker compose run --rm --no-deps backend python manage.py createcachetable
docker compose up -d --remove-orphans

if health; then
  echo "==> healthy: ${TAG}"
  prune_own_images
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
