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
      # Recreate only what already runs (picks up the new env): never start Moodle before deploy.sh installed it.
      if [ -f $APP/.env ]; then cd $APP && running=\$(sudo docker compose ps --services --status running | tr '\n' ' ') && [ -n \"\$running\" ] && sudo docker compose up -d \$running; fi"
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
    echo "--- test domain (same site, same-origin API, not indexed)"
    test=https://twings.tunghr.io.vn
    for u in "$test/" "$test/api/v1/health/" "$web/api/v1/public/courses/" "$test/robots.txt"; do
      curl -s -o /tmp/body -m 30 -w "%{http_code} $u
" "$u" || echo "FAIL $u"; head -c 80 /tmp/body; echo
    done
    curl -sI -m 30 "$test/" | grep -i "x-robots-tag" || echo "MISSING x-robots-tag"
    curl -s -m 30 "$test/robots.txt" | grep -qx "Disallow: /" && echo "robots.txt disallows all" || echo "MISSING robots disallow"
    echo "--- LMS (Moodle) at /learn; its web service API must not be reachable from the internet"
    for u in "$web/learn/login/index.php" "$test/learn/login/index.php" "$web/learn/webservice/rest/server.php"; do
      curl -s -o /dev/null -m 30 -w "%{http_code} $u
" "$u" || echo "FAIL $u"
    done
    echo "--- staff CMS at /app (SPA shell, not indexed)"
    curl -s -o /dev/null -D /tmp/h -m 30 -w "%{http_code} $web/app
" "$web/app"; grep -i "x-robots-tag" /tmp/h || echo "MISSING x-robots-tag on /app"
    echo "--- nothing but the gateway is reachable from the internet"
    for port in 5432 8000 8080 8081 2019; do
      timeout 5 bash -c "</dev/tcp/$VPS_HOST/$port" 2>/dev/null && echo "OPEN $port" || echo "closed $port"
    done
    echo "--- certificates"
    for h in tuyensinh.twings.edu.vn api-tuyensinh.twings.edu.vn; do
      echo | openssl s_client -connect "$h:443" -servername "$h" 2>/dev/null | openssl x509 -noout -issuer -subject -enddate
    done
    ;;

  backup)
    # Run the nightly backup now and show where it went (R2 when configured, else /var/backups/twings).
    remote "sudo $APP/bin/backup.sh && sudo journalctl -t twings-backup -n 3 --no-pager"
    ;;

  storage-check)
    # Write, read back and delete a probe file through Django's storages (R2 or local volume).
    remote "cd $APP && sudo docker compose exec -T backend python -c '
import urllib.request
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage, storages
for name, st in ((\"default\", default_storage), (\"private\", storages[\"private\"])):
    p = st.save(\"healthcheck/probe.txt\", ContentFile(b\"ok\"))
    url = st.url(p)
    print(name, type(st).__name__, \"saved\", p, \"->\", url.split(\"?\")[0])
    if name == \"default\":
        req = urllib.request.Request(url, headers={\"User-Agent\": \"Mozilla/5.0 twings-storage-check\"})
        print(\"  public GET:\", urllib.request.urlopen(req, timeout=10).read())
    st.delete(p)
    print(\"  deleted:\", not st.exists(p))
'"
    ;;

  lms-check)
    # Moodle install/setup log + a real web service call from the backend over the internal network.
    remote "sudo tail -n 40 /var/log/twings-lms.log; cd $APP && sudo docker compose ps lms lms-cron && sudo docker compose exec -T backend python -c '
from apps.lms import moodle
info = moodle.call(\"core_webservice_get_site_info\")
print(\"site:\", info[\"sitename\"], \"| release:\", info[\"release\"], \"| ws user:\", info[\"username\"], \"| lang:\", info[\"lang\"])
print(\"functions:\", sorted(f[\"name\"] for f in info[\"functions\"]))
' && sudo docker compose exec -T lms php -r '
\$r = @file_get_contents(\"https://tuyensinh.twings.edu.vn/api/v1/health/\", false, stream_context_create([\"http\" => [\"timeout\" => 10]]));
echo \"lms -> public site (hairpin): \", \$r === false ? \"FAILED\" : \$r, PHP_EOL;
'"
    ;;

  lms-e2e)
    # End-to-end: a throwaway paid order must yield a Moodle account + enrolment; everything test-only
    # is removed afterwards (the course shell stays: it is the real course's LMS space).
    remote "cd $APP && sudo docker compose exec -T backend python manage.py shell -c '
from django.db import transaction
from apps.catalog.models import Course
from apps.crm.models import Order
from apps.lms.models import LmsEnrollment
course = Course.objects.order_by(\"title\").first()
with transaction.atomic():
    order = Order.objects.create(customer_name=\"Kiểm Thử LMS\", customer_email=\"lms-e2e@example.invalid\", course=course, amount=1)
    order.status = \"paid\"
    order.save()
e = LmsEnrollment.objects.get(order=order)
print(\"course:\", course.slug, \"| enrollment:\", e.status, \"| moodle user:\", e.moodle_user_id, \"| moodle course:\", e.moodle_course_id, \"| error:\", e.last_error or \"-\")
order.delete()
print(\"test order removed\")
' && sudo docker compose exec -T lms php -r '
define(\"CLI_SCRIPT\", true);
require \"/var/www/moodle/config.php\";
\$u = \$DB->get_record(\"user\", [\"email\" => \"lms-e2e@example.invalid\", \"deleted\" => 0]);
if (\$u) { \$n = count(enrol_get_users_courses(\$u->id)); delete_user(\$u); echo \"moodle: test user had \$n course(s), deleted\n\"; } else { echo \"moodle: test user NOT found\n\"; }
'"
    ;;

  test-learner)
    # A real paid test order (amount 0) for the given e-mail: the LMS enrolment creates the Moodle
    # account and Moodle e-mails the login. Kept until deleted from the CMS.
    remote "cd $APP && sudo docker compose exec -T backend python manage.py shell -c '
from django.db import transaction
from apps.catalog.models import Course
from apps.crm.models import Order
from apps.lms.models import LmsEnrollment
course = Course.objects.order_by(\"title\").first()
with transaction.atomic():
    order = Order.objects.create(customer_name=\"Học Viên Test\", customer_email=\"$ARG\", course=course, amount=0,
                                 crm_status=\"1. Mới\", interested_course=\"[TEST] học thử LMS\")
    order.status = \"paid\"
    order.save()
e = LmsEnrollment.objects.get(order=order)
print(\"order:\", order.order_code, \"| course:\", course.title, \"| lms:\", e.status, \"| moodle user:\", e.moodle_user_id, \"| new account:\", e.user_created, \"| error:\", e.last_error or \"-\")
'"
    ;;

  lms-admin-check)
    # Exercise the CMS LMS features against the real Moodle (read-only, except preparing the
    # super admin's own Moodle access exactly like the "Mở Moodle" button does).
    remote "cd $APP && sudo docker compose exec -T backend python manage.py shell -c '
from apps.accounts.models import User
from apps.lms import overview
o = overview.learner_overview(\"tunglh.com@gmail.com\")
print(\"learner:\", o[\"user\"] and o[\"user\"][\"email\"], \"| courses:\", [(c[\"fullname\"][:30], c[\"progress\"], c[\"completed\"], c[\"grade\"]) for c in o[\"courses\"]])
rows = overview.course_catalog()
print(\"catalog:\", [(r[\"slug\"][:28], r[\"paidOrders\"], r[\"moodle\"] and r[\"moodle\"][\"students\"]) for r in rows])
mapped = [r for r in rows if r[\"moodle\"]]
if mapped:
    print(\"learners:\", [(l[\"email\"], l[\"progress\"], l[\"inactive\"], l[\"order\"] and l[\"order\"][\"orderCode\"]) for l in overview.course_learners(mapped[0][\"moodle\"][\"id\"])])
admin = User.objects.filter(role=\"super_admin\").order_by(\"date_joined\").first()
print(\"staff access:\", overview.ensure_staff_access(admin))
'"
    ;;

  lms-intake-check)
    # Plugins present, one real intake provisioned (copied from its template), completion sync run.
    remote "cd $APP && sudo docker compose exec -T lms php -r '
define(\"CLI_SCRIPT\", true);
require \"/var/www/moodle/config.php\";
foreach ([\"mod_customcert\", \"mod_attendance\", \"block_completion_progress\", \"report_customsql\"] as \$p) {
    \$i = core_plugin_manager::instance()->get_plugin_info(\$p);
    echo \$p, \": \", \$i ? (\$i->versiondb ?: \"NOT INSTALLED\") : \"MISSING\", PHP_EOL;
}
' && sudo docker compose exec -T backend python manage.py shell -c '
from apps.catalog.models import Cohort
from apps.lms.services import provision_cohort
c = Cohort.objects.exclude(status=\"completed\").select_related(\"course\").order_by(\"start_date\").first()
print(\"intake:\", c and (c.course.title[:40], c.name, c.start_date))
if c:
    print(\"provision:\", provision_cohort(c))
    print(\"again (idempotent):\", provision_cohort(c))
' && sudo docker compose exec -T backend python manage.py sync_lms_completion"
    ;;

  catalog-report)
    # Courses, programs and sales per course: input for pricing / bundling decisions.
    remote "cd $APP && sudo docker compose exec -T backend python manage.py shell -c '
from django.db.models import Count, Q
from apps.catalog.models import Course, Program
for c in Course.objects.annotate(n=Count(\"orders\", filter=Q(orders__learning_access=True))).order_by(\"category\", \"sort_order\"):
    print(\"course\", c.slug, \"|\", c.title[:60], \"|\", c.category, \"|\", c.level, \"|\", c.price, \"/\", c.original_price, \"| pub\", c.is_published, \"| inst\", c.installment_count, \"| sold\", c.n)
for p in Program.objects.all():
    print(\"program\", p.slug, \"|\", p.title, \"|\", p.price, \"| pub\", p.is_published, \"|\", [x.course.slug for x in p.program_courses.all()])
'"
    ;;

  seed-sales)
    remote "cd $APP && sudo docker compose exec -T backend python manage.py seed_sales_setup"
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
