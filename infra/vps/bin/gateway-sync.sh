#!/usr/bin/env bash
# Keep the TWings site block in the SHARED gateway's Caddyfile (owned by another product) and reload
# the gateway gracefully. Idempotent; run on demand (Ops task "gateway-sync") once DNS points here,
# and again if another product's deploy rewrites that file.
#
# Safety: the block is only added once both hostnames resolve to this VPS (avoids failed ACME
# attempts), the file is backed up first, the new config is validated by the gateway's own Caddy
# before reloading, and the backup is restored on any failure. Only the marked block is touched.
set -euo pipefail

APP=/opt/twings
# GATEWAY_CONTAINER, GATEWAY_FILE (host path of its Caddyfile): host-specific, kept out of git.
set -a; . "$APP/env/caddy.env"; . "$APP/env/gateway.env"; set +a
: "${WEB_DOMAIN:?}" "${API_DOMAIN:?}" "${GATEWAY_CONTAINER:?}" "${GATEWAY_FILE:?}"

log() { echo "gateway-sync: $*"; logger -t twings-deploy "gateway-sync: $*"; }

# 1. DNS must already point here, otherwise Caddy would hammer Let's Encrypt with failing challenges.
public_ip="$(curl -fsS -m 5 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
points_here() {
  local resolved
  resolved="$(getent ahostsv4 "$1" | awk 'NR==1 {print $1}')"
  [[ -n "$public_ip" && "$resolved" == "$public_ip" ]] && return 0
  log "skip: $1 resolves to '${resolved:-nothing}', expected '${public_ip:-?}' (create the DNS A record first)"
  return 1
}
points_here "$WEB_DOMAIN" && points_here "$API_DOMAIN" || exit 0
# Extra hostnames (REDIRECT_DOMAINS, comma separated) answer with a permanent redirect to WEB_DOMAIN,
# so sessions/cookies and SEO stay on one origin. Not-yet-pointed ones are left out for now.
redirects=()
for host in ${REDIRECT_DOMAINS//,/ }; do points_here "$host" && redirects+=("$host"); done

BEGIN="# >>> twings (managed by /opt/twings/bin/gateway-sync.sh - do not edit)"
END="# <<< twings"
BLOCK="$BEGIN
${WEB_DOMAIN}, ${API_DOMAIN} {
    request_body {
        max_size 10MB
    }
    reverse_proxy twings-web:8080
}"
if ((${#redirects[@]})); then
  BLOCK+="

$(IFS=,; echo "${redirects[*]}" | sed 's/,/, /g') {
    redir https://${WEB_DOMAIN}{uri} permanent
}"
fi
BLOCK+="
$END"

# 2. Build the desired file: existing content minus our old block, plus the current block.
current="$(cat "$GATEWAY_FILE")"
others="$(printf '%s\n' "$current" | awk -v b="$BEGIN" -v e="$END" '$0==b{skip=1;next} $0==e{skip=0;next} !skip')"
# ($(...) already strips the trailing blank lines left where the old block was.)
desired="${others}"$'\n\n'"${BLOCK}"
if [[ "$current" == "$desired" ]]; then
  log "up to date"
  exit 0
fi

# 3. Back up, write in place (bind-mounted single file: keep the inode), validate, reload.
backup="$GATEWAY_FILE.bak-twings-$(date +%Y%m%d%H%M%S)"
cp -p "$GATEWAY_FILE" "$backup"
restore() { cat "$backup" > "$GATEWAY_FILE"; log "restored $backup"; }
printf '%s\n' "$desired" > "$GATEWAY_FILE"

if ! docker exec "$GATEWAY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  restore; log "FAILED: new gateway config is invalid"; exit 1
fi
if ! docker exec "$GATEWAY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  restore
  docker exec "$GATEWAY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || true
  log "FAILED: gateway reload"; exit 1
fi
# Keep the 5 most recent backups.
ls -1t "$GATEWAY_FILE".bak-twings-* 2>/dev/null | tail -n +6 | xargs -r rm -f
log "updated and reloaded (backup: $backup)"
