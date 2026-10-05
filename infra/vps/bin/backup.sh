#!/usr/bin/env bash
# Nightly encrypted PostgreSQL backup to Cloudflare R2 (cron: /etc/cron.d/twings-backup).
# The dump is encrypted with an age PUBLIC key before leaving the VPS: neither the VPS nor R2 can
# read it. Retention is enforced by an R2 lifecycle rule on the bucket (e.g. delete after 35 days).
set -euo pipefail

cd /opt/twings
set -a; . ./env/backup.env; set +a
: "${AGE_RECIPIENT:?}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
dump() {
  docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
    | age --encrypt --recipient "$AGE_RECIPIENT"
}

if [[ -n "${RCLONE_CONFIG_R2_ACCESS_KEY_ID:-}" ]]; then
  OBJECT="${BACKUP_REMOTE:?}/twings-${STAMP}.dump.age"
  dump | rclone rcat --s3-no-check-bucket "$OBJECT"
  SIZE="$(rclone size --json "$OBJECT" | sed -n 's/.*"bytes":\([0-9]*\).*/\1/p')"
else
  # No R2 yet: keep 14 days of encrypted dumps on the VPS (protects against mistakes, not VPS loss).
  install -d -m 700 /var/backups/twings
  OBJECT="/var/backups/twings/twings-${STAMP}.dump.age"
  dump > "$OBJECT"
  SIZE="$(stat -c %s "$OBJECT")"
  find /var/backups/twings -name 'twings-*.dump.age' -mtime +14 -delete
fi

if [[ -z "$SIZE" || "$SIZE" -lt 1024 ]]; then
  logger -t twings-backup "FAILED: ${OBJECT} is missing or too small (${SIZE:-0} bytes)"
  exit 1
fi
logger -t twings-backup "ok ${OBJECT} (${SIZE} bytes)"

# Restore (on a trusted machine holding the private key):
#   rclone cat r2:twings-backups/postgres/<file>.dump.age | age -d -i key.txt > db.dump
#   pg_restore --clean --if-exists -d <target-db> db.dump
