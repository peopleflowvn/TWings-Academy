#!/usr/bin/env bash
# Install TWings on a VPS that ALREADY runs other products (Docker, SSH and the firewall are managed by
# their owners). Unlike bootstrap.sh this never upgrades packages, restarts Docker, edits sshd,
# fail2ban, iptables or the timezone. It only adds:
#   - the packages backups need (age, rclone, jq) if missing
#   - the "deploy" user whose key can only run "deploy <sha>" (forced command + one sudoers entry)
#   - /opt/twings (compose file, scripts, env placeholders) and a nightly backup cron entry
#
# Usage (Ops workflow task "setup-shared"):  sudo bash setup-shared.sh <ci-deploy-public-key-file>
# Idempotent: safe to re-run after editing infra/.
set -euo pipefail

DEPLOY_PUBKEY_FILE="${1:?usage: setup-shared.sh <ci-deploy-public-key-file>}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"   # the copied infra/ folder
APP=/opt/twings

[[ $EUID -eq 0 ]] || { echo "run as root (sudo)"; exit 1; }
command -v docker >/dev/null && docker compose version >/dev/null || { echo "Docker + compose plugin required"; exit 1; }

echo "==> packages for backups (install only, no upgrade)"
missing=()
for p in age rclone jq; do command -v "$p" >/dev/null || missing+=("$p"); done
# NEEDRESTART_MODE=l: only LIST services needing a restart. Ubuntu's default under a non-interactive
# frontend restarts them (sshd, networkd, other products' CI runners...), unacceptable on a shared host.
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l NEEDRESTART_SUSPEND=1
if ((${#missing[@]})); then
  apt-get install -yq --no-upgrade "${missing[@]}" \
    || { apt-get update -q && apt-get install -yq --no-upgrade "${missing[@]}"; }
fi

echo "==> deploy user (CI key restricted to a single forced command)"
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
passwd -l deploy >/dev/null
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
PUBKEY="$(tr -d '\r\n' < "$DEPLOY_PUBKEY_FILE")"
[[ "$PUBKEY" =~ ^ssh-ed25519\  ]] || { echo "CI deploy key must be ssh-ed25519"; exit 1; }
echo "command=\"${APP}/bin/deploy-gate\",restrict ${PUBKEY}" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
cat > /etc/sudoers.d/twings-deploy <<EOF
deploy ALL=(root) NOPASSWD: ${APP}/bin/deploy.sh
EOF
chmod 440 /etc/sudoers.d/twings-deploy
visudo -cf /etc/sudoers.d/twings-deploy
# Some hardened sshd configs whitelist users; tell the operator instead of editing sshd ourselves.
if sshd -T 2>/dev/null | grep -qi '^allowusers' && ! sshd -T | grep -i '^allowusers' | grep -qw deploy; then
  echo "!! sshd AllowUsers does not include 'deploy': CI deploys will be refused until it is added"
fi

echo "==> application layout in ${APP}"
install -d -m 755 -o root -g root "$APP" "$APP/bin" "$APP/postgres" "$APP/postgres/init"
install -d -m 700 -o root -g root "$APP/env"
install -m 644 -o root -g root "$SRC/docker-compose.prod.yml" "$APP/docker-compose.yml"
install -m 755 -o root -g root "$SRC/postgres/init/01-app-role.sh" "$APP/postgres/init/01-app-role.sh"
install -m 755 -o root -g root "$SRC/vps/bin/deploy-gate" "$SRC/vps/bin/deploy.sh" \
  "$SRC/vps/bin/backup.sh" "$SRC/vps/bin/gateway-sync.sh" "$APP/bin/"
for f in db caddy backup gateway lms; do
  [[ -f "$APP/env/$f.env" ]] || install -m 600 -o root -g root "$SRC/env/$f.env.example" "$APP/env/$f.env"
done
[[ -f "$APP/env/backend.env" ]] || install -m 600 -o root -g root /dev/null "$APP/env/backend.env"

echo "==> nightly encrypted backup (02:30 Asia/Ho_Chi_Minh, host timezone untouched)"
cat > /etc/cron.d/twings-backup <<EOF
CRON_TZ=Asia/Ho_Chi_Minh
30 2 * * * root ${APP}/bin/backup.sh >/var/log/twings-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/twings-backup

echo "==> LMS enrollment retries every 10 minutes (paid orders whose Moodle enrolment failed)"
cat > /etc/cron.d/twings-lms <<EOF
*/10 * * * * root cd ${APP} && [ -f .env ] && docker compose exec -T backend python manage.py sync_lms_enrollments >/dev/null 2>&1
# Progress/completion from Moodle; certificates for newly completed learners.
*/30 * * * * root cd ${APP} && [ -f .env ] && docker compose exec -T backend python manage.py sync_lms_completion >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/twings-lms

echo "==> installment reminders daily at 09:00 Asia/Ho_Chi_Minh"
cat > /etc/cron.d/twings-billing <<EOF
CRON_TZ=Asia/Ho_Chi_Minh
0 9 * * * root cd ${APP} && [ -f .env ] && docker compose exec -T backend python manage.py remind_installments >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/twings-billing

echo "Done. Next: Ops 'sync-env', then run the Deploy workflow."
