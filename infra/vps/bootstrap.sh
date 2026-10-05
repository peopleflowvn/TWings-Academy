#!/usr/bin/env bash
# One-time hardening + setup of the Oracle Cloud VPS (Ubuntu 22.04/24.04, amd64 or arm64).
#
# Usage, from your workstation (admin key), after copying the infra/ folder to the VPS:
#   scp -i <admin-key> -r infra ubuntu@<vps-ip>:/tmp/twings-infra
#   scp -i <admin-key> ci-deploy.pub ubuntu@<vps-ip>:/tmp/ci-deploy.pub
#   ssh -i <admin-key> ubuntu@<vps-ip> 'sudo bash /tmp/twings-infra/vps/bootstrap.sh /tmp/ci-deploy.pub'
#
# Idempotent: safe to re-run after editing infra/ (it re-installs compose file and scripts).
set -euo pipefail

DEPLOY_PUBKEY_FILE="${1:?usage: bootstrap.sh <ci-deploy-public-key-file>}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"   # the copied infra/ folder
APP=/opt/twings
ADMIN_USER="${SUDO_USER:-ubuntu}"

[[ $EUID -eq 0 ]] || { echo "run as root (sudo)"; exit 1; }
. /etc/os-release
[[ "$ID" == "ubuntu" ]] || { echo "This script targets Ubuntu; found $ID"; exit 1; }

echo "==> packages & automatic security updates"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get -yq upgrade
apt-get -yq install ca-certificates curl gnupg unattended-upgrades fail2ban age rclone jq
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Docker Engine (official repository)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get -yq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "no-new-privileges": true,
  "live-restore": true,
  "userland-proxy": false
}
JSON
systemctl enable --now docker
systemctl restart docker

echo "==> SSH hardening"
cat > /etc/ssh/sshd_config.d/99-twings-hardening.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
AllowUsers ${ADMIN_USER} deploy

# The admin may tunnel to local services (e.g. ssh -L for maintenance).
Match User ${ADMIN_USER}
    AllowTcpForwarding local
EOF
sshd -t
systemctl reload ssh || systemctl reload sshd

cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

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

echo "==> application layout in ${APP}"
install -d -m 755 -o root -g root "$APP" "$APP/bin" "$APP/postgres" "$APP/postgres/init"
install -d -m 700 -o root -g root "$APP/env"
install -m 644 -o root -g root "$SRC/docker-compose.prod.yml" "$APP/docker-compose.yml"
install -m 755 -o root -g root "$SRC/postgres/init/01-app-role.sh" "$APP/postgres/init/01-app-role.sh"
install -m 755 -o root -g root "$SRC/vps/bin/deploy-gate" "$SRC/vps/bin/deploy.sh" "$SRC/vps/bin/backup.sh" "$APP/bin/"
for f in db caddy backup; do
  [[ -f "$APP/env/$f.env" ]] || install -m 600 -o root -g root "$SRC/env/$f.env.example" "$APP/env/$f.env"
done
[[ -f "$APP/env/backend.env" ]] || install -m 600 -o root -g root /dev/null "$APP/env/backend.env"

echo "==> host firewall: allow HTTP/HTTPS for Caddy"
# Oracle's Ubuntu images ship iptables rules that reject everything but SSH on INPUT. Docker's
# published ports normally bypass INPUT (DNAT + FORWARD), but open 80/443 explicitly so Caddy also
# works with the userland proxy or host networking. Persisted with netfilter-persistent if present.
for proto_port in tcp:80 tcp:443 udp:443; do
  proto="${proto_port%%:*}" port="${proto_port##*:}"
  iptables -C INPUT -p "$proto" --dport "$port" -j ACCEPT 2>/dev/null \
    || iptables -I INPUT 1 -p "$proto" --dport "$port" -j ACCEPT
done
command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null 2>&1 || true

echo "==> nightly encrypted backup (02:30 Asia/Ho_Chi_Minh)"
timedatectl set-timezone Asia/Ho_Chi_Minh
cat > /etc/cron.d/twings-backup <<EOF
30 2 * * * root ${APP}/bin/backup.sh >/var/log/twings-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/twings-backup

cat <<EOF

Done. Remaining manual steps (secrets are never stored in git):
  1. Fill ${APP}/env/db.env, backend.env, caddy.env, backup.env   (or upload files rendered by
     infra/vps/render_env.py; keep chmod 600)
  2. Oracle VCN security list: ingress TCP 22 (ideally from your IP) + TCP 80, TCP 443, UDP 443.
  3. Push to main → GitHub Actions builds the image and runs: ssh deploy@<vps> "deploy <sha>"
EOF
