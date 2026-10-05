#!/usr/bin/env bash
# Runs on the GitHub runner for .github/workflows/ops.yml; "vps" is the SSH alias set up there.
# Output goes to an encrypted artifact, so it may contain sensitive details.
set -euo pipefail

TASK="${1:?task}"
ARG="${2:-}"
APP=/opt/twings

remote() { ssh vps "$@"; }

case "$TASK" in
  status)
    remote 'set -x
      . /etc/os-release; echo "$PRETTY_NAME $(uname -m)"; uptime; free -h; df -h /
      sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
      sudo ss -tlnup
      command -v docker && sudo docker compose -f /opt/twings/docker-compose.yml ps -a || true
      sudo docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" || true
      sudo docker compose ls || true
      cd /opt/twings 2>/dev/null && sudo docker compose exec -T backend sh -c "find /data -type f | head -20; echo files: \$(find /data -type f | wc -l)" || true
      systemctl list-units --type=service --state=running --no-legend "actions.runner.*" "ssh*" "cron*" | cut -c1-90 || true
      cat /etc/ssh/sshd_config.d/*.conf 2>/dev/null; getent passwd | awk -F: "\$3>=1000 && \$3<65534 {print \$1}"
      sudo iptables -S INPUT | head -20
      sudo cat /opt/twings/.env 2>/dev/null || true
      cd /opt/twings 2>/dev/null && sudo docker compose exec -T web wget -qO- \
        --header "Host: $(sudo sed -n "s/^API_DOMAIN=//p" /opt/twings/env/caddy.env)" \
        http://127.0.0.1:8080/api/v1/health/ || true
      sudo journalctl -t twings-deploy -n 20 --no-pager || true'
    ;;

  bootstrap)
    [[ "$CI_DEPLOY_PUBKEY" =~ ^ssh-ed25519\  ]] || { echo "repository variable CI_DEPLOY_PUBKEY missing"; exit 1; }
    # bootstrap.sh restarts Docker and rewrites sshd/firewall: only for a host that runs nothing else.
    foreign=$(remote 'sudo docker ps --format "{{.Names}}" 2>/dev/null | grep -v "^twings-" || true')
    [[ -z "$foreign" ]] || { echo "refusing: host runs other containers:"; echo "$foreign"; exit 1; }
    remote 'rm -rf /tmp/twings-infra && mkdir -p /tmp/twings-infra'
    tar -C infra -czf - . | remote 'tar -C /tmp/twings-infra -xzf -'
    printf '%s\n' "$CI_DEPLOY_PUBKEY" | remote 'cat > /tmp/ci-deploy.pub'
    remote 'sudo bash /tmp/twings-infra/vps/bootstrap.sh /tmp/ci-deploy.pub && rm -rf /tmp/twings-infra /tmp/ci-deploy.pub'
    # Same login must still work after the SSH hardening.
    remote 'echo "admin SSH still OK after hardening"'
    ;;

  setup-shared)
    [[ "$CI_DEPLOY_PUBKEY" =~ ^ssh-ed25519\  ]] || { echo "repository variable CI_DEPLOY_PUBKEY missing"; exit 1; }
    remote 'rm -rf /tmp/twings-infra && mkdir -p /tmp/twings-infra'
    tar -C infra -czf - . | remote 'tar -C /tmp/twings-infra -xzf -'
    printf '%s\n' "$CI_DEPLOY_PUBKEY" | remote 'cat > /tmp/ci-deploy.pub'
    remote 'sudo bash /tmp/twings-infra/vps/setup-shared.sh /tmp/ci-deploy.pub; rc=$?; rm -rf /tmp/twings-infra /tmp/ci-deploy.pub; exit $rc'
    ;;

  sync-env)
    [[ -n "$ENV_BUNDLE" ]] || { echo "secret VPS_ENV_BUNDLE missing"; exit 1; }
    printf '%s' "$ENV_BUNDLE" | base64 -d | remote "set -e
      t=\$(mktemp -d); trap 'rm -rf \$t' EXIT
      tar -C \$t -xzf -
      for f in \$t/*.env; do sudo install -m 600 -o root -g root \"\$f\" $APP/env/; done
      sudo ls -l $APP/env/
      if [ -f $APP/.env ]; then cd $APP && sudo docker compose up -d; fi"
    ;;

  gateway-sync)
    # Adds/updates the TWings block in the shared gateway's Caddyfile (approved by the owner).
    remote "sudo $APP/bin/gateway-sync.sh && sudo docker logs --since 2m \$(sudo sed -n 's/^GATEWAY_CONTAINER=//p' $APP/env/gateway.env) 2>&1 | grep -i -E 'twings|tuyensinh|certificate|error' | tail -30"
    ;;

  smoke)
    # From the GitHub runner (public internet), not the VPS: what a visitor sees.
    web=https://tuyensinh.twings.edu.vn api=https://api-tuyensinh.twings.edu.vn
    for u in "$api/api/v1/health/" "$web/" "$web/some/client/route" "$api/api/v1/public/courses/" "http://tuyensinh.twings.edu.vn/"; do
      curl -s -o /tmp/body -m 30 -w "%{http_code} $u -> %{redirect_url}\n" "$u" || echo "FAIL $u"
      head -c 200 /tmp/body; echo
    done
    echo "--- web headers"; curl -sI -m 30 "$web/" | grep -i -E "strict|content-security|x-frame|cache-control|^server"
    echo "--- CORS preflight from the site"
    curl -s -o /dev/null -D - -m 30 -X OPTIONS -H "Origin: $web" -H "Access-Control-Request-Method: POST" \
      "$api/api/v1/auth/login/" | grep -i -E "^HTTP|access-control-allow-(origin|credentials)"
    echo "--- certificates"
    for h in tuyensinh.twings.edu.vn api-tuyensinh.twings.edu.vn; do
      echo | openssl s_client -connect "$h:443" -servername "$h" 2>/dev/null | openssl x509 -noout -issuer -subject -enddate
    done
    ;;

  backup)
    # Run the nightly backup now and show where it went (R2 when configured, else /var/backups/twings).
    remote "sudo $APP/bin/backup.sh && sudo journalctl -t twings-backup -n 3 --no-pager"
    ;;

  logs)
    remote "cd $APP && sudo docker compose logs --no-color --tail=300; sudo tail -n 50 /var/log/twings-backup.log 2>/dev/null || true"
    ;;

  seed-content)
    remote "cd $APP && sudo docker compose exec -T backend python manage.py seed_content"
    ;;

  create-admin)
    # Random password, shown only in the encrypted output; change it after the first login.
    remote "cd $APP && pw=\$(openssl rand -base64 18) && \
      sudo docker compose exec -T -e DJANGO_SUPERUSER_PASSWORD=\"\$pw\" -e DJANGO_SUPERUSER_EMAIL='$ARG' -e DJANGO_SUPERUSER_NAME=Administrator \
        backend python manage.py createsuperuser --noinput && echo \"login: $ARG  password: \$pw\""
    ;;

  restart)
    remote "cd $APP && sudo docker compose up -d --remove-orphans && sudo docker compose ps"
    ;;

  *)
    echo "unknown task: $TASK"; exit 2 ;;
esac
