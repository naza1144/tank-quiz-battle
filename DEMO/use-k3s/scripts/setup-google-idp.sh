#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Point Keycloak's Google identity provider at a real OAuth client
# ─────────────────────────────────────────────────
#  keycloak/realm-export.json ships the Google provider with the placeholders
#  ${GOOGLE_CLIENT_ID} and ${GOOGLE_CLIENT_SECRET} — deliberately, because a
#  real client secret must never sit in a committed file. Keycloak stores those
#  placeholders verbatim, and login then fails with
#
#      Could not create authentication request
#      Caused by: IllegalArgumentException: Path parameter not provided GOOGLE_CLIENT_ID
#
#  which names the missing value but not what to do about it. This script is
#  what to do about it. Run it once after import-realm.sh, and again any time
#  the realm is reimported or the secret is rotated.
#
#  Usage:  scripts/setup-google-idp.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cmd curl
require_cmd python3
require_cluster
load_env
require_env KEYCLOAK_ADMIN_PASSWORD GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET

# Catch the most common paste error before touching the cluster: a client id
# that is not actually a Google one, usually because the secret and the id were
# swapped.
if [[ "$GOOGLE_CLIENT_ID" != *.apps.googleusercontent.com ]]; then
  die "GOOGLE_CLIENT_ID does not look like a Google client id
       (expected it to end in .apps.googleusercontent.com, got: ${GOOGLE_CLIENT_ID:0:24}…)"
fi

KC="${KC_URL:-http://localhost:8080}"
REALM="${REALM:-sudhood}"
ALIAS="google"

step "reaching Keycloak at $KC"
# Keycloak is published on the host by k8s/keycloak.yaml (type: LoadBalancer),
# so no port-forward is needed. If that ever goes back to ClusterIP, set
# KC_URL to whatever a port-forward exposes.
curl -fsS "${KC}/realms/${REALM}/.well-known/openid-configuration" >/dev/null 2>&1 \
  || die "cannot reach ${KC}. Is the stack deployed, and has the realm been imported?
       kubectl -n $NAMESPACE get svc keycloak"

step "authenticating as ${KEYCLOAK_ADMIN:-admin}"
TOKEN=$(curl -fsS -X POST "${KC}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=admin-cli" \
  --data-urlencode "username=${KEYCLOAK_ADMIN:-admin}" \
  --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  --data-urlencode "grant_type=password" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])') \
  || die "admin login failed — is KEYCLOAK_ADMIN_PASSWORD the one Keycloak was first started with?"

step "reading the current $ALIAS provider"
CURRENT=$(curl -fsS "${KC}/admin/realms/${REALM}/identity-provider/instances/${ALIAS}" \
  -H "Authorization: Bearer $TOKEN") \
  || die "no identity provider '$ALIAS' in realm '$REALM'. Run scripts/import-realm.sh first."

# Patch only the two credential fields and send the whole object back. Keycloak's
# PUT replaces the provider wholesale, so building the body from what is already
# there keeps every other setting (the trustEmail flag, the default scopes, the
# sync mode) exactly as the realm export defined it.
BODY=$(GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  python3 -c '
import json, os, sys
provider = json.load(sys.stdin)
provider.setdefault("config", {})["clientId"] = os.environ["GOOGLE_CLIENT_ID"]
provider["config"]["clientSecret"] = os.environ["GOOGLE_CLIENT_SECRET"]
provider["enabled"] = True
print(json.dumps(provider))
' <<<"$CURRENT")

step "writing the client id and secret"
curl -fsS -X PUT "${KC}/admin/realms/${REALM}/identity-provider/instances/${ALIAS}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  || die "update rejected by Keycloak"

# Read it back rather than trusting the write. Keycloak answers 204 to a PUT it
# has not applied the way you expect often enough to be worth the extra call.
VERIFY=$(curl -fsS "${KC}/admin/realms/${REALM}/identity-provider/instances/${ALIAS}" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; c=json.load(sys.stdin); print(c["config"]["clientId"], c.get("enabled"))')

STORED_ID="${VERIFY% *}"
if [[ "$STORED_ID" == "$GOOGLE_CLIENT_ID" ]]; then
  # Only the id is echoed. Keycloak never returns a stored secret — it answers
  # with ********** — so there is nothing here that could leak one into a log.
  ok "google provider configured — clientId ${STORED_ID:0:20}…"
else
  die "readback does not match what was sent: got '$STORED_ID'"
fi

cat <<EOF

$(printf '%s' "$C_BOLD")Check it$(printf '%s' "$C_RESET")
  Google must also have the redirect URI registered on its side, or it answers
  redirect_uri_mismatch:

      ${KC}/realms/${REALM}/broker/${ALIAS}/endpoint

  Then open http://localhost/auth/login — it should land on Google's account
  chooser rather than a Keycloak error page.
EOF
