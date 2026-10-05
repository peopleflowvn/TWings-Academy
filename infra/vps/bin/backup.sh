#!/usr/bin/env bash
# Nightly encrypted backup (cron: /etc/cron.d/twings-backup) of
#   1. the TWings database, 2. the Moodle database, 3. Moodle's files (moodledata, without caches)
# to Cloudflare R2, or to /var/backups/twings when R2 is not configured.
# Everything is encrypted with an age PUBLIC key before leaving the container: neither the VPS nor R2
# can read it. R2 retention is a lifecycle rule on the bucket (delete after 35 days).
set -euo pipefail

cd /opt/twings
set -a; . ./env/backup.env; set +a
: "${AGE_RECIPIENT:?}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_DIR=/var/backups/twings
FAILED=0

# store <name> <min-bytes>: encrypt stdin and upload it as <name>-<stamp>.age
store() {
  local name="$1" min="$2" object size
  if [[ -n "${RCLONE_CONFIG_R2_ACCESS_KEY_ID:-}" ]]; then
    object="${BACKUP_REMOTE:?}/${name}-${STAMP}.age"
    age --encrypt --recipient "$AGE_RECIPIENT" | rclone rcat --s3-no-check-bucket "$object"
    size="$(rclone size --json "$object" | sed -n 's/.*"bytes":\([0-9]*\).*/\1/p')"
  else
    install -d -m 700 "$LOCAL_DIR"
    object="${LOCAL_DIR}/${name}-${STAMP}.age"
    age --encrypt --recipient "$AGE_RECIPIENT" > "$object"
    size="$(stat -c %s "$object")"
  fi
  if [[ -z "$size" || "$size" -lt "$min" ]]; then
    logger -t twings-backup "FAILED: ${object} is missing or too small (${size:-0} bytes)"
    FAILED=1
  else
    logger -t twings-backup "ok ${object} (${size} bytes)"
  fi
}

pg_dump_db() {
  docker compose exec -T -e DB="$1" db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$DB" --format=custom --no-owner'
}

# Object names: postgres/... kept for the TWings DB so older restore notes still apply.
pg_dump_db twings | store "postgres/twings" 1024
if docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -tAc "select 1 from pg_database where datname='\''moodle'\''"' | grep -q 1; then
  pg_dump_db moodle | store "moodle/db" 1024
  # Caches, sessions and temp files are rebuilt by Moodle; everything else (course files, submissions)
  # is needed for a restore.
  docker compose exec -T lms tar -C /var/moodledata -cf - \
      --exclude=./cache --exclude=./localcache --exclude=./sessions --exclude=./temp \
      --exclude=./trashdir --exclude=./lock . \
    | store "moodle/files" 1024
fi

if [[ -z "${RCLONE_CONFIG_R2_ACCESS_KEY_ID:-}" ]]; then
  find "$LOCAL_DIR" -name '*.age' -mtime +14 -delete
fi
exit "$FAILED"

# Restore (on a trusted machine holding the age private key):
#   rclone cat r2:twings-backups/postgres/twings-<stamp>.age | age -d -i key.txt > twings.dump
#   pg_restore --clean --if-exists -d <target-db> twings.dump          (same for moodle/db-<stamp>.age)
#   rclone cat r2:twings-backups/moodle/files-<stamp>.age | age -d -i key.txt | tar -C <moodledata> -xf -
