#!/usr/bin/env bash
# Backup restore drill (ops task "restore-drill"). Runs on the GitHub runner, never on the VPS: the VPS
# only streams the newest ENCRYPTED objects; they are decrypted here with BACKUP_AGE_SECRET_KEY (ops
# environment secret) and restored into a throwaway Postgres container that is removed afterwards.
# Proves that last night's backup decrypts, restores and holds data, and measures how long it takes.
set -euo pipefail

[[ "${BACKUP_AGE_SECRET_KEY:-}" == AGE-SECRET-KEY-* ]] || {
  echo "secret BACKUP_AGE_SECRET_KEY missing in the ops environment (see docs/DEPLOYMENT.md, 'Diễn tập khôi phục')"
  exit 1
}

PG_IMAGE=postgres:18-alpine # same major version as infra/docker-compose.prod.yml
MAX_AGE_HOURS=26            # nightly backup at 02:30 + slack
start=$(date +%s)
work=$(mktemp -d)
trap 'docker rm -f drill-db >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
printf '%s\n' "$BACKUP_AGE_SECRET_KEY" > "$work/key.txt"
chmod 600 "$work/key.txt"
command -v age >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq age >/dev/null; }

failed=0
fail() { echo "FAIL: $*"; failed=1; }

# fetch <prefix> <file>: newest <prefix>-<stamp>.age (R2, or /var/backups/twings) -> <file>, encrypted.
# The object name goes to stderr (line "OBJECT <name>", among rclone notices) in <file>.name.
# object <file>: the object name fetch recorded (or its last stderr line, the error, when it failed).
object() { grep -m1 '^OBJECT ' "$1.name" | cut -c8- || tail -1 "$1.name"; }

fetch() {
  ssh vps "sudo bash -s -- $1" > "$2" 2> "$2.name" <<'REMOTE'
set -euo pipefail
cd /opt/twings
set -a; . ./env/backup.env; set +a
dir="${1%/*}" base="${1##*/}"
if [[ -n "${RCLONE_CONFIG_R2_ACCESS_KEY_ID:-}" ]]; then
  name="$(rclone lsf "$BACKUP_REMOTE/$dir/" --include "$base-*.age" | sort | tail -1)"
  [[ -n "$name" ]] || { echo "no $1 backup found" >&2; exit 3; }
  echo "OBJECT $dir/$name" >&2
  rclone cat "$BACKUP_REMOTE/$dir/$name"
else
  file="$(ls /var/backups/twings/"$dir"/"$base"-*.age 2>/dev/null | sort | tail -1)"
  [[ -n "$file" ]] || { echo "no $1 backup found" >&2; exit 3; }
  echo "OBJECT $file" >&2
  cat "$file"
fi
REMOTE
}

# check_age <object name>: the stamp in the name must be recent.
check_age() {
  local stamp hours
  stamp="$(grep -oE '[0-9]{8}T[0-9]{6}Z' <<<"$1" | tail -1)" || true
  [[ -n "$stamp" ]] || { fail "no timestamp in $1"; return; }
  hours=$(( ($(date -u +%s) - $(date -u -d "${stamp:0:8} ${stamp:9:2}:${stamp:11:2}:${stamp:13:2}" +%s)) / 3600 ))
  echo "  backup age: ${hours}h"
  (( hours <= MAX_AGE_HOURS )) || fail "newest backup is ${hours}h old (> ${MAX_AGE_HOURS}h): nightly backup not running?"
}

psql_drill() { docker exec -i drill-db psql -U postgres -v ON_ERROR_STOP=1 -X -q "$@"; }

# Largest tables by exact row count: shows the restore holds real data, not just a schema.
ROWS_SQL="select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I',
  table_schema, table_name), false, true, '')))[1]::text::bigint as rows
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
order by rows desc, table_name limit 12"

echo "=== start throwaway $PG_IMAGE"
docker run -d --name drill-db -e POSTGRES_PASSWORD=drill "$PG_IMAGE" >/dev/null
for _ in $(seq 60); do docker exec drill-db pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done
sleep 2 # the entrypoint restarts the server once after initdb

restore_db() { # restore_db <db> <prefix> <min tables>
  local db="$1" prefix="$2" min="$3" t0 tables rc=0
  echo "=== $db <- $prefix"
  t0=$(date +%s)
  fetch "$prefix" "$work/$db.age" || { fail "cannot fetch $prefix: $(object "$work/$db.age")"; return; }
  echo "  object: $(object "$work/$db.age") ($(stat -c %s "$work/$db.age") bytes encrypted)"
  check_age "$(object "$work/$db.age")"
  psql_drill -c "create database $db"
  # --no-owner/--no-privileges: production roles do not exist in the throwaway server.
  age -d -i "$work/key.txt" "$work/$db.age" \
    | docker exec -i drill-db pg_restore -U postgres -d "$db" --no-owner --no-privileges > "$work/$db.log" 2>&1 || rc=$?
  rm -f "$work/$db.age"
  if (( rc != 0 )); then
    fail "pg_restore $db exited $rc"
    tail -20 "$work/$db.log"
  fi
  tables=$(psql_drill -d "$db" -tAc "select count(*) from information_schema.tables where table_schema = 'public'")
  echo "  tables: $tables, restored in $(( $(date +%s) - t0 ))s"
  (( tables >= min )) || fail "$db has only $tables tables (expected >= $min)"
  psql_drill -d "$db" -c "$ROWS_SQL"
}

restore_db twings postgres/twings 50
psql_drill -d twings -c "select count(*) as migrations, max(applied) as last_migration from django_migrations"
psql_drill -d twings -c "select role, count(*) from accounts_user group by role order by 2 desc" || fail "accounts_user unreadable"

# Moodle runs in production, so its database and files must be in the backup too.
restore_db moodle moodle/db 300
psql_drill -d moodle -c "select (select count(*) from mdl_user where deleted = 0) as users, (select count(*) from mdl_course) as courses, (select value from mdl_config where name = 'release') as release"

echo "=== moodledata <- moodle/files"
if fetch moodle/files "$work/files.age"; then
  echo "  object: $(object "$work/files.age") ($(stat -c %s "$work/files.age") bytes encrypted)"
  check_age "$(object "$work/files.age")"
  mkdir "$work/moodledata"
  if age -d -i "$work/key.txt" "$work/files.age" | tar -C "$work/moodledata" -xf -; then
    echo "  files: $(find "$work/moodledata" -type f | wc -l), size: $(du -sh "$work/moodledata" | cut -f1)"
    [[ -d "$work/moodledata/filedir" ]] || fail "moodledata has no filedir/ (course files)"
  else
    fail "moodledata archive does not decrypt/extract"
  fi
  rm -rf "$work/files.age" "$work/moodledata"
else
  fail "cannot fetch moodle/files: $(object "$work/files.age")"
fi

echo "=== total restore time: $(( $(date +%s) - start ))s"
if (( failed )); then echo "DRILL FAILED"; exit 1; fi
echo "DRILL OK"
