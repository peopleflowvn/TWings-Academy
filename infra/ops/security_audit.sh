#!/usr/bin/env bash
# READ-ONLY security audit of the shared VPS (Ops task "security-audit"): the host, Docker and every
# product running on it, not only TWings. Runs as root through `sudo bash -s`; it changes nothing (no
# package, service, file or container is touched). The output is encrypted by the Ops workflow because it
# names other products' containers, users and ports; never paste it anywhere public.
set -uo pipefail
export LC_ALL=C

section() { printf '\n==================== %s\n' "$*"; }
flag() { printf '!! %s\n' "$*"; }

section "host"
. /etc/os-release; echo "$PRETTY_NAME $(uname -rm)"; uptime
[[ -f /var/run/reboot-required ]] && flag "reboot required since $(stat -c %y /var/run/reboot-required | cut -c1-16): $(tr '\n' ' ' </var/run/reboot-required.pkgs 2>/dev/null)"
upgradable="$(apt list --upgradable 2>/dev/null | tail -n +2)"
echo "upgradable packages: $(printf '%s' "$upgradable" | grep -c . || true), from -security: $(printf '%s\n' "$upgradable" | grep -c -- '-security' || true)"
printf '%s\n' "$upgradable" | grep -- '-security' | cut -d/ -f1 | head -40
echo "unattended-upgrades: $(systemctl is-enabled unattended-upgrades 2>/dev/null) / $(systemctl is-active unattended-upgrades 2>/dev/null)"
grep -hE '^APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)' /etc/apt/apt.conf.d/* 2>/dev/null
echo "last unattended run: $(ls -1t /var/log/unattended-upgrades/unattended-upgrades.log* 2>/dev/null | head -1 | xargs -r stat -c %y | cut -c1-16)"

section "ssh"
sshd -T 2>/dev/null | grep -E '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|permitemptypasswords|allowusers|allowgroups|maxauthtries|x11forwarding|allowtcpforwarding|allowagentforwarding|clientaliveinterval|loglevel) '
sshd -T 2>/dev/null | grep -qE '^passwordauthentication yes' && flag "SSH password authentication is ON"
sshd -T 2>/dev/null | grep -qE '^permitrootlogin (yes|without-password|prohibit-password)' && flag "root may log in over SSH ($(sshd -T | sed -n 's/^permitrootlogin //p'))"
echo "--- failed SSH logins, last 7 days: $(journalctl -u ssh -u sshd --since '7 days ago' --no-pager 2>/dev/null | grep -cE 'Failed password|Invalid user|authentication failure')"
journalctl -u ssh -u sshd --since '7 days ago' --no-pager 2>/dev/null | grep -E 'Accepted ' | awk '{for(i=1;i<=NF;i++) if($i=="for"){u=$(i+1)} ; for(i=1;i<=NF;i++) if($i=="from"){ip=$(i+1)}; print u, ip}' | sort | uniq -c | sort -rn | head -15
echo "--- fail2ban"; (command -v fail2ban-client >/dev/null && fail2ban-client status 2>/dev/null && fail2ban-client status sshd 2>/dev/null | grep -E 'Currently|Total') || flag "fail2ban not installed / not running"

section "accounts & sudo"
awk -F: '$7 !~ /(nologin|false|sync|halt|shutdown)$/ {print $1, $3, $6, $7}' /etc/passwd
awk -F: '$2 == "" {print "!! empty password: " $1}' /etc/shadow
awk -F: '$3 == 0 && $1 != "root" {print "!! uid 0: " $1}' /etc/passwd
echo "--- sudo / docker group (docker group = root)"; getent group sudo admin wheel docker 2>/dev/null
echo "--- NOPASSWD rules"; grep -rhs 'NOPASSWD' /etc/sudoers /etc/sudoers.d/ | grep -v '^#'
echo "--- authorized_keys (count, key types, options)"
for d in /root /home/*; do
  f="$d/.ssh/authorized_keys"; [[ -f $f ]] || continue
  echo "$f: $(grep -cvE '^\s*(#|$)' "$f") key(s), perms $(stat -c '%a %U' "$f")"
  grep -vE '^\s*(#|$)' "$f" | awk '{ if ($1 ~ /^(ssh-|ecdsa-|sk-)/) print "   " $1, ($3 ? $3 : "-"); else print "   [opts] " substr($1,1,60), $2 }'
done

section "network exposure"
echo "--- listening on all interfaces (reachable if the cloud firewall allows it)"
ss -H -tulpn | awk '$5 ~ /^(0\.0\.0\.0|\*|\[::\]):/ {print $1, $5, $7}' | sort -u
echo "--- host firewall"
iptables -S INPUT 2>/dev/null | head -25
echo "default INPUT policy: $(iptables -S INPUT 2>/dev/null | head -1)"
(command -v ufw >/dev/null && ufw status 2>/dev/null | head -15) || true
echo "--- DOCKER-USER chain (filters published container ports; Docker bypasses ufw/INPUT)"
iptables -S DOCKER-USER 2>/dev/null

section "docker"
docker version --format 'engine {{.Server.Version}} / api {{.Server.APIVersion}}' 2>/dev/null
echo "--- daemon.json"; cat /etc/docker/daemon.json 2>/dev/null || echo "(none: no userns-remap, no default no-new-privileges, default logging)"
ls -l /var/run/docker.sock
ss -H -tlpn | grep -E 'dockerd' && flag "dockerd listens on TCP"
echo "--- containers: name | image | user | privileged | netmode | pidmode | caps added | no-new-privs | readonly | published ports"
for c in $(docker ps -q); do
  docker inspect -f '{{.Name}} | {{.Config.Image}} | user={{if .Config.User}}{{.Config.User}}{{else}}ROOT{{end}} | priv={{.HostConfig.Privileged}} | net={{.HostConfig.NetworkMode}} | pid={{.HostConfig.PidMode}} | capadd={{.HostConfig.CapAdd}} | sec={{.HostConfig.SecurityOpt}} | ro={{.HostConfig.ReadonlyRootfs}} | ports={{range $p, $b := .NetworkSettings.Ports}}{{if $b}}{{range $b}}{{.HostIp}}:{{.HostPort}}->{{$p}} {{end}}{{end}}{{end}}' "$c"
done
echo "--- risky container settings"
for c in $(docker ps -q); do
  n="$(docker inspect -f '{{.Name}}' "$c")"
  docker inspect -f '{{.HostConfig.Privileged}}' "$c" | grep -q true && flag "$n runs --privileged (root on the host)"
  docker inspect -f '{{range .Mounts}}{{.Source}} {{end}}' "$c" | grep -q 'docker.sock' && flag "$n mounts the Docker socket (root on the host)"
  docker inspect -f '{{.HostConfig.NetworkMode}} {{.HostConfig.PidMode}}' "$c" | grep -qE '^host|host$' && flag "$n shares the host network or PID namespace"
  docker inspect -f '{{range .Mounts}}{{if eq .Source "/"}}x{{end}}{{if eq .Source "/etc"}}x{{end}}{{if eq .Source "/root"}}x{{end}}{{if eq .Source "/home"}}x{{end}}{{end}}' "$c" | grep -q x && flag "$n mounts a sensitive host directory"
  docker inspect -f '{{range $p, $b := .NetworkSettings.Ports}}{{if $b}}{{range $b}}{{.HostIp}}:{{.HostPort}} {{end}}{{end}}{{end}}' "$c" \
    | tr ' ' '\n' | grep -E '^(0\.0\.0\.0|::|):' | grep -vE ':(80|443)$' | sed "s|^|!! $n publishes |"
done
echo "--- networks shared with the gateway (containers that can reach every product behind it directly)"
for net in $(docker network ls --format '{{.Name}}' | grep -vE '^(bridge|host|none)$'); do
  echo "$net: $(docker network inspect -f '{{range .Containers}}{{.Name}} {{end}}' "$net")"
done
echo "--- image ages (old base images = unpatched libraries)"
docker ps --format '{{.Image}}' | sort -u | while read -r img; do
  echo "$(docker image inspect -f '{{.Created}}' "$img" 2>/dev/null | cut -c1-10)  $img"
done | sort

section "secrets on disk"
echo "--- env / key files readable by other users"
find /opt /srv /home /root /etc/docker -xdev -maxdepth 5 -type f \( -name '*.env' -o -name '.env' -o -name '*.pem' -o -name '*.key' -o -name 'id_*' -o -name '*credentials*' \) \
  -perm -o=r -not -name '*.pub' -not -path '*/node_modules/*' -printf '!! %m %u %p\n' 2>/dev/null | head -40
echo "--- git checkouts on the host (secrets committed? remote with a token?)"
find /opt /srv /home -xdev -maxdepth 4 -name .git -type d 2>/dev/null | while read -r g; do
  url="$(git --git-dir="$g" config --get remote.origin.url 2>/dev/null)"
  [[ "$url" =~ ://[^/@]+:[^/@]+@ ]] && flag "$g: remote URL embeds credentials" || echo "$g"
done
echo "--- TWings env files"; ls -l /opt/twings/env/ 2>/dev/null

section "persistence & compromise indicators"
echo "--- cron"; ls -l /etc/cron.d/; for u in $(cut -d: -f1 /etc/passwd); do crontab -l -u "$u" 2>/dev/null | grep -vE '^\s*(#|$)' | sed "s|^|$u: |"; done
echo "--- systemd units not shipped by packages (enabled, /etc/systemd/system)"
find /etc/systemd/system -maxdepth 1 -type f -name '*.service' -printf '%TY-%Tm-%Td %p\n' | sort | tail -20
echo "--- executables in world-writable temp dirs"; find /tmp /var/tmp /dev/shm -xdev -type f -perm -u+x -printf '!! %TY-%Tm-%Td %u %p\n' 2>/dev/null | head -20
echo "--- top CPU processes"; ps -eo user,pid,pcpu,pmem,etime,comm --sort=-pcpu | head -12
echo "--- outbound connections from the host (miners / reverse shells show up here)"
ss -H -tnp state established | awk '{print $4, $5, $6}' | grep -vE ':(22|443|80)\s' | grep -vE '^(127\.|\[::1\]|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)\S*\s+(127\.|10\.|172\.|192\.168\.)' | head -20
echo "--- recent sudo"; journalctl _COMM=sudo --since '7 days ago' --no-pager 2>/dev/null | grep -E 'COMMAND=' | sed -E 's/.*sudo\[[0-9]+\]: *//' | cut -c1-160 | sort | uniq -c | sort -rn | head -15

section "gateway (shared reverse proxy)"
if [[ -f /opt/twings/env/gateway.env ]]; then
  . /opt/twings/env/gateway.env
  echo "sites served:"; grep -E '^[^#[:space:](][^{]*\{\s*$' "$GATEWAY_FILE" | sed 's/{\s*$//' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep . | sort -u
  echo "--- global options / admin endpoint"; sed -n '1,/^}/p' "$GATEWAY_FILE" | head -20
  grep -nE 'header|Strict-Transport|basicauth|basic_auth|forward_auth|reverse_proxy' "$GATEWAY_FILE" | head -60
  docker exec "$GATEWAY_CONTAINER" caddy version 2>/dev/null
fi

section "TWings application"
cd /opt/twings 2>/dev/null && docker compose exec -T backend python manage.py shell <<'PY' 2>&1 | tail -30
import json
from pathlib import Path
from django.utils import timezone
from apps.accounts.models import User
from apps.notifications.engine import LOCKED_TEMPLATES
from apps.notifications.models import EmailTemplate

print("staff:", User.objects.filter(is_staff=True, is_active=True).count(),
      "superusers:", list(User.objects.filter(is_superuser=True, is_active=True).values_list("email", flat=True)))
stale = timezone.now() - timezone.timedelta(days=90)
print("active staff not signed in for 90 days:",
      list(User.objects.filter(is_staff=True, is_active=True, last_login__lt=stale).values_list("email", flat=True)))
seed = {t["code"]: t for t in json.loads(Path("fixtures/seed_content.json").read_text(encoding="utf-8"))["emailTemplates"]}
for code in sorted(LOCKED_TEMPLATES):
    db = EmailTemplate.objects.filter(code=code).first()
    if db is None:
        print(f"template {code}: not in DB (built-in default is used)")
        continue
    same = db.body == seed.get(code, {}).get("body") and db.subject == seed.get(code, {}).get("subject")
    print(f"template {code}: {'same as seed' if same else '!! DIFFERS FROM SEED: review before trusting it'} (updated {db.updated_at:%Y-%m-%d})")
PY
echo "--- Moodle security settings and site administrators"
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d moodle -tA -F " = "' <<'SQL' 2>/dev/null
SELECT name, value FROM mdl_config WHERE name IN ('lockoutthreshold', 'passwordpolicy', 'minpasswordlength',
  'enablewebservices', 'enablemobilewebservice', 'registerauth', 'forcelogin', 'auth', 'debug', 'debugdisplay',
  'release') ORDER BY name;
SELECT 'site admin', username || ' (' || auth || ', last login ' || COALESCE(to_timestamp(NULLIF(lastlogin, 0))::date::text, 'never') || ')'
  FROM mdl_user WHERE ',' || (SELECT value FROM mdl_config WHERE name = 'siteadmins') || ',' LIKE '%,' || id || ',%';
SQL

echo; echo "audit finished $(date -Is)"
