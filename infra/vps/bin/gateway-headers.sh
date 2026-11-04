#!/usr/bin/env bash
# Baseline security headers for EVERY site of the shared gateway (the other products' sites too), as
# agreed with the owner on 2026-11-03. Idempotent, and changes nothing but:
#   - one snippet at the top of the gateway Caddyfile, between the markers below,
#   - one "import gw_security_headers" line as the first line of each site block (except the TWings
#     block, whose web container sets stricter headers itself).
# Only defaults are set ("?": an application's own header always wins) and Server / X-Powered-By are
# hidden; no Content-Security-Policy, which has to be written per application.
# Backup, validation by the gateway's own Caddy, graceful reload, restore on any failure (like
# gateway-sync.sh).   Usage: gateway-headers.sh [--dry-run]
set -euo pipefail

APP=/opt/twings
set -a; . "$APP/env/gateway.env"; set +a
: "${GATEWAY_CONTAINER:?}" "${GATEWAY_FILE:?}"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

log() { echo "gateway-headers: $*"; logger -t twings-deploy "gateway-headers: $*"; }

mounted="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' "$GATEWAY_CONTAINER")"
[[ "$mounted" == "$GATEWAY_FILE" ]] || { log "FAILED: gateway mounts '${mounted:-nothing}', not $GATEWAY_FILE"; exit 1; }

BEGIN="# >>> security headers (managed by /opt/twings/bin/gateway-headers.sh - do not edit)"
END="# <<< security headers"
IMPORT="    import gw_security_headers"
TW_BEGIN="# >>> twings (managed by /opt/twings/bin/gateway-sync.sh - do not edit)"
TW_END="# <<< twings"
# One "header" directive per default: the "?" defaults of a single header block share one condition
# (ALL of their fields absent), so an application sending nosniff would also lose the HSTS default.
SNIPPET="$BEGIN
(gw_security_headers) {
    header ?Strict-Transport-Security \"max-age=31536000\"
    header ?X-Content-Type-Options nosniff
    header ?Referrer-Policy strict-origin-when-cross-origin
    header -Server
    header -X-Powered-By
}
$END"

current="$(cat "$GATEWAY_FILE")"
# Remove what an earlier run added, then add it again: the result never depends on how often this runs.
# Snippets must be defined before they are imported: the snippet goes first in the file.
desired="$SNIPPET
$(printf '%s\n' "$current" | awk -v b="$BEGIN" -v e="$END" -v imp="$IMPORT" -v tb="$TW_BEGIN" -v te="$TW_END" '
  $0 == b { skip = 1; next }
  $0 == e { skip = 0; next }
  skip || $0 == imp { next }
  $0 == tb { tw = 1 }
  $0 == te { tw = 0 }
  { print }
  # A site block opens at column 0 (not a comment, snippet "(...)" or the global options "{").
  !tw && /^[^#({[:space:]][^{]*\{[[:space:]]*$/ { print imp }
' | sed '/./,$!d')"

if [[ "$current" == "$desired" ]]; then log "up to date"; exit 0; fi
diff <(printf '%s\n' "$current") <(printf '%s\n' "$desired") || true
if ((DRY_RUN)); then
  printf '%s\n' "$desired" | docker exec -i "$GATEWAY_CONTAINER" caddy validate --config /dev/stdin --adapter caddyfile 2>&1 | tail -2
  log "dry run: nothing written"; exit 0
fi

backup="$GATEWAY_FILE.bak-twings-$(date +%Y%m%d%H%M%S)"
cp -p "$GATEWAY_FILE" "$backup"
restore() { cat "$backup" > "$GATEWAY_FILE"; log "restored $backup"; }
printf '%s\n' "$desired" > "$GATEWAY_FILE"   # in place: the gateway bind-mounts this single file (inode)
if ! docker exec "$GATEWAY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  restore; log "FAILED: new gateway config is invalid"; exit 1
fi
if ! docker exec "$GATEWAY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  restore
  docker exec "$GATEWAY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || true
  log "FAILED: gateway reload"; exit 1
fi
ls -1t "$GATEWAY_FILE".bak-twings-* 2>/dev/null | tail -n +6 | xargs -r rm -f
log "updated and reloaded (backup: $backup)"
