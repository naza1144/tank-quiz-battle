#!/bin/sh
# Bootstraps the `sudhood` realm — replaces scripts/import-realm.sh and the
# manual client-secret copy that SETUP-K3S.md called the one step that could
# not be automated.
#
# Runs as a Job inside the cluster, in the same shape as minio-init and
# nats-init. That matters more than it sounds: a script on someone's laptop
# needs a port-forward, a copy of .env and a working kubectl, and it runs
# whenever that person remembers to run it. A Job runs on every apply, from
# inside, with the same Secret the services read.
#
# ── Why the secret is imposed rather than read back ──────────────────────────
# The old flow was: Keycloak generates a client secret -> a human opens the
# admin console -> copies it -> pastes it into .env -> re-runs create-secrets
# -> restarts the pods. Five steps, four of them manual, and the value passes
# through a clipboard on the way.
#
# Here Terraform generates it, writes it into sudhood-secrets, and this script
# tells Keycloak what it is. Same value on both sides by construction. Nobody
# reads it, so nobody can paste it somewhere it should not be.
#
# ── Idempotent on purpose ────────────────────────────────────────────────────
# Runs on every `terraform apply`. An existing realm is left alone rather than
# reimported: the realm holds user accounts and identity-provider links by
# then, and reimporting would be a data-loss event dressed up as a config
# change. Only the two things this script owns — the client secret and the
# Google credentials — are written every time.
set -eu

KC="${KEYCLOAK_URL:-http://keycloak:8080}"
REALM="${KEYCLOAK_REALM:-sudhood}"
CFG=/tmp/kcadm.config

kcadm() { /opt/keycloak/bin/kcadm.sh "$@" --config "$CFG"; }

# ── Wait ─────────────────────────────────────────────────────────────────────
# By logging in, not by polling a health endpoint. The Keycloak image is a
# minimal UBI build with no curl in it, and "the port answers" is a weaker
# claim than "the admin API accepts these credentials" anyway — Keycloak opens
# its port well before the realm database is ready to serve.
echo "waiting for keycloak at ${KC}"
n=0
until kcadm config credentials --server "$KC" --realm master \
        --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1; do
    n=$((n + 1))
    if [ "$n" -gt 100 ]; then
        echo "keycloak did not accept an admin login after ~5 minutes." >&2
        echo "If the pod is running, the likely cause is that KEYCLOAK_ADMIN_PASSWORD" >&2
        echo "changed after the first boot: the admin user is written to the database" >&2
        echo "on first start and is not updated from the environment afterwards." >&2
        exit 1
    fi
    sleep 3
done
echo "  authenticated as ${KEYCLOAK_ADMIN}"

# ── Realm ────────────────────────────────────────────────────────────────────
if kcadm get "realms/${REALM}" >/dev/null 2>&1; then
    echo "realm ${REALM} already exists — left as it is"
else
    kcadm create realms -f /realm/realm-export.json
    echo "realm ${REALM} created from realm-export.json"
fi

# ── Client secret ────────────────────────────────────────────────────────────
client_id() {
    kcadm get clients -r "$REALM" -q "clientId=$1" --fields id --format csv --noquotes 2>/dev/null | head -1
}

cid=$(client_id sudhood-token-service)
if [ -z "$cid" ]; then
    echo "client sudhood-token-service is missing from the realm — cannot continue." >&2
    echo "It is defined in realm-export.json; if the realm predates that file," >&2
    echo "create the client by hand or delete the realm and let this rebuild it." >&2
    exit 1
fi
kcadm update "clients/${cid}" -r "$REALM" -s "secret=${OIDC_CLIENT_SECRET}"
echo "  client secret set to the value in sudhood-secrets"

# ── Redirect URIs ────────────────────────────────────────────────────────────
# Driven by environment rather than frozen into realm-export.json, because
# these are the values that have to change the day the platform stops living
# on localhost — and a redirect URI that disagrees with the one the service
# sends produces `invalid_redirect_uri`, which names the symptom and not the
# file to edit.
if [ -n "${TOKEN_SERVICE_REDIRECT_URIS:-}" ]; then
    uris=$(echo "$TOKEN_SERVICE_REDIRECT_URIS" | tr ',' '\n' \
           | sed 's/^/"/; s/$/"/' | paste -sd, -)
    kcadm update "clients/${cid}" -r "$REALM" -s "redirectUris=[${uris}]"
    echo "  redirect URIs: ${TOKEN_SERVICE_REDIRECT_URIS}"
fi

# ── Google identity provider ─────────────────────────────────────────────────
# Optional. An empty client id means the stack comes up complete and simply has
# no Google button — which is the right behaviour for a cluster being built
# before anyone has been to the Google console, and for CI, where there is no
# reason to hold real credentials at all.
if [ -n "${GOOGLE_CLIENT_ID:-}" ] && [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
    if kcadm get "identity-provider/instances/google" -r "$REALM" >/dev/null 2>&1; then
        kcadm update "identity-provider/instances/google" -r "$REALM" \
            -s "config.clientId=${GOOGLE_CLIENT_ID}" \
            -s "config.clientSecret=${GOOGLE_CLIENT_SECRET}"
        echo "  google identity provider updated"
    else
        kcadm create identity-provider/instances -r "$REALM" \
            -s alias=google -s providerId=google -s enabled=true \
            -s trustEmail=true \
            -s "config.clientId=${GOOGLE_CLIENT_ID}" \
            -s "config.clientSecret=${GOOGLE_CLIENT_SECRET}" \
            -s config.useJwksUrl=true -s config.syncMode=FORCE
        echo "  google identity provider created"
    fi
else
    echo "  GOOGLE_CLIENT_ID not set — skipping the Google identity provider."
    echo "  Set google_client_id / google_client_secret in terraform.tfvars and re-apply."
fi

echo "keycloak bootstrap complete"
