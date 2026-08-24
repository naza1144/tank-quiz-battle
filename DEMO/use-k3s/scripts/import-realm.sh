#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Import the sudhood realm into Keycloak
# ─────────────────────────────────────────────────
#  Same approach as the compose stack: get an admin token from the master realm,
#  POST the realm export. Done over a temporary port-forward, so nothing has to
#  be exposed through the gateway to run it.
#
#  Idempotent in the sense that matters — a realm that already exists is
#  reported and left alone rather than half-overwritten.
#
#  Usage:  scripts/import-realm.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cmd curl
require_cmd python3
require_cluster
load_env
require_env KEYCLOAK_ADMIN_PASSWORD

REALM_FILE="$ROOT_DIR/keycloak/realm-export.json"
[[ -f "$REALM_FILE" ]] || die "$REALM_FILE not found"

# A high local port, to avoid colliding with the 8080 that port-forward.sh uses
# for the browser session.
LOCAL_PORT="${LOCAL_PORT:-18080}"
KC="http://127.0.0.1:${LOCAL_PORT}"

step "waiting for keycloak to be ready"
kcn wait --for=condition=available deploy/keycloak --timeout=300s >/dev/null \
  || die "keycloak is not available. Check:  kubectl -n $NAMESPACE logs deploy/keycloak"

step "opening a port-forward on ${LOCAL_PORT}"
kcn port-forward svc/keycloak "${LOCAL_PORT}:8080" >/dev/null 2>&1 &
PF_PID=$!
# Without this the port-forward outlives the script on any failure path and the
# next run collides with it.
trap 'kill "$PF_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -fsS "${KC}/realms/master/.well-known/openid-configuration" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "${KC}/realms/master/.well-known/openid-configuration" >/dev/null 2>&1 \
  || die "port-forward did not come up on ${LOCAL_PORT}"
ok "port-forward ready"

step "authenticating as ${KEYCLOAK_ADMIN:-admin}"
TOKEN=$(curl -fsS -X POST "${KC}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=admin-cli" \
  --data-urlencode "username=${KEYCLOAK_ADMIN:-admin}" \
  --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  --data-urlencode "grant_type=password" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])') \
  || die "admin login failed — is KEYCLOAK_ADMIN_PASSWORD in .env the one the pod was started with?
       If you changed it after the first deploy, the old password is still in the database."
ok "got an admin token"

if curl -fsS -o /dev/null "${KC}/admin/realms/sudhood" -H "Authorization: Bearer $TOKEN" 2>/dev/null; then
  warn "realm 'sudhood' already exists — nothing imported."
  warn "To reimport, delete it first:"
  warn "  curl -X DELETE ${KC}/admin/realms/sudhood -H \"Authorization: Bearer \$TOKEN\""
  exit 0
fi

step "importing realm from keycloak/realm-export.json"
status=$(curl -sS -o /tmp/kc-import-response -w '%{http_code}' \
  -X POST "${KC}/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@${REALM_FILE}")

if [[ "$status" == "201" ]]; then
  ok "realm 'sudhood' imported"
else
  echo "--- response ---" >&2
  cat /tmp/kc-import-response >&2
  echo >&2
  die "import failed with HTTP $status"
fi

cat <<EOF

$(printf '%s' "$C_BOLD")Next — the one manual step$(printf '%s' "$C_RESET")
  Keycloak generated a secret for the sudhood-token-service client. Copy it into
  .env, then re-run create-secrets.sh and restart.sh:

    1. scripts/port-forward.sh                     # keeps localhost:8080 open
    2. open http://localhost:8080  →  realm sudhood
         Clients → sudhood-token-service → Credentials → copy the secret
    3. put it in .env as OIDC_CLIENT_SECRET
    4. scripts/create-secrets.sh && scripts/restart.sh
EOF
