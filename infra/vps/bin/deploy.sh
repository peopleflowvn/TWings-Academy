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

# Through the web container: the React site, the API (web -> backend) and Moodle (web -> lms).
health() {
  set -a; . ./env/caddy.env; set +a
  for _ in $(seq 1 45); do
    if docker compose exec -T web wget -qO /dev/null --header "Host: ${API_DOMAIN}" \
         http://127.0.0.1:8080/api/v1/health/ >/dev/null 2>&1 &&
       docker compose exec -T web wget -qO /dev/null --header "Host: ${WEB_DOMAIN}" \
         http://127.0.0.1:8080/ >/dev/null 2>&1 &&
       docker compose exec -T web wget -qO /dev/null --header "Host: ${WEB_DOMAIN}" \
         http://127.0.0.1:8080/learn/admin/environment.xml >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Shared host: only remove TWings images, keeping the current and previous tags for rollback.
prune_own_images() {
  docker image ls --format '{{.Repository}}:{{.Tag}}' \
    | grep -E '^ghcr\.io/peopleflowvn/twings-academy-(backend|web|lms):[0-9a-f]{40}$' \
    | grep -v -e ":${TAG}$" ${PREV_TAG:+-e ":${PREV_TAG}$"} \
    | xargs -r docker image rm >/dev/null 2>&1 || true
}

# ---------------------------------------------------------------- Moodle (LMS)
# Moodle CLI output goes to a root-only log on the VPS, not to the (public) CI log.
LMS_LOG=/var/log/twings-lms.log
lms_cli() { docker compose run --rm --no-deps -T lms "$@" >>"$LMS_LOG" 2>&1; }

# Moodle's role + database in the TWings Postgres (idempotent; password from env/lms.env via stdin).
ensure_moodle_db() {
  local pw
  pw="$(sed -n 's/^MOODLE_DB_PASSWORD=//p' env/lms.env)"
  [[ "$pw" =~ ^[A-Za-z0-9_-]{20,}$ ]] || { echo "!! MOODLE_DB_PASSWORD missing or not URL-safe" >&2; return 1; }
  # The pipe must stay on this line: anything on the next line would become part of the heredoc.
  { printf "\\set pw '%s'\n" "$pw"; cat <<'SQL'; } | docker compose exec -T db sh -c 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres' >/dev/null 2>&1     || { echo "!! could not create the Moodle role/database (details are not printed: CI logs are public)" >&2; return 1; }
SELECT 'CREATE ROLE moodle LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'moodle')\gexec
ALTER ROLE moodle WITH LOGIN PASSWORD :'pw';
SELECT 'CREATE DATABASE moodle OWNER moodle ENCODING ''UTF8'' TEMPLATE template0' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'moodle')\gexec
REVOKE ALL ON DATABASE moodle FROM PUBLIC;
SQL
}

moodle_installed() {
  docker compose exec -T db sh -c \
    'psql -U "$POSTGRES_USER" -d moodle -tAc "select to_regclass('"'"'mdl_config'"'"') is not null"' | grep -qx t
}

# Fresh install on the first deploy, otherwise upgrade (a no-op unless the Moodle version changed).
# Like Django migrations, a Moodle upgrade is never reversed by a rollback: update lms/ deliberately (docs/LMS.md).
moodle_install_or_upgrade() {
  echo "==== $(date -Is) deploy ${TAG}" >>"$LMS_LOG"
  if moodle_installed; then
    lms_cli php /var/www/moodle/admin/cli/upgrade.php --non-interactive
    echo "==> moodle: upgrade checked"
  else
    lms_cli sh -c 'php /var/www/moodle/admin/cli/install_database.php --agree-license --lang=en \
      --adminuser=admin --adminpass="$MOODLE_ADMIN_PASSWORD" --adminemail="$MOODLE_ADMIN_EMAIL" \
      --fullname="TWings Academy" --shortname="TWings" --summary="Học trực tuyến TWings Academy"'
    echo "==> moodle: installed"
  fi
  lms_cli php /var/www/moodle/twings_setup.php
  echo "==> moodle: configured"
}

echo "==> deploying ${TAG} (previous: ${PREV_TAG:-none})"
set_tag "$TAG"
# Any failure before the health check puts the previous tag back (containers were not swapped yet).
trap '[[ -n "$PREV_TAG" ]] && set_tag "$PREV_TAG"' ERR
docker compose pull --quiet backend web lms
docker compose up -d --wait db
ensure_moodle_db
moodle_install_or_upgrade
# Migrations must stay backward compatible with the previous image (expand/contract), because a
# rollback below only swaps the image; it never reverses migrations.
docker compose run --rm --no-deps backend python manage.py migrate --noinput
docker compose run --rm --no-deps backend python manage.py createcachetable
docker compose run --rm --no-deps backend python manage.py ensure_admin
docker compose up -d --remove-orphans
trap - ERR

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
