#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Turn .env into the sudhood-secrets Secret
# ─────────────────────────────────────────────────
#  Kept out of kustomize deliberately. A secretGenerator would mean committing
#  either the values or a file that must never be committed; generating the
#  Secret from .env at apply time keeps the only copy of the plaintext on your
#  machine, in a gitignored file.
#
#  Safe to re-run: the Secret is replaced in place, not duplicated. You will run
#  it at least twice — once before the realm exists, and again after Keycloak
#  hands out the OIDC client secret.
#
#  Usage:  scripts/create-secrets.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cluster
load_env

require_env POSTGRES_PASSWORD REDIS_PASSWORD KEYCLOAK_ADMIN_PASSWORD \
            PGADMIN_PASSWORD INTERNAL_API_KEY MINIO_ROOT_PASSWORD

# The OIDC client secret is not known until the realm has been imported, so it
# is allowed to stay a placeholder on the first pass. Login is the only thing
# that breaks until it is filled in, and token-service will refuse to start
# rather than run with a blank one.
oidc_secret="${OIDC_CLIENT_SECRET:-}"
if [[ -z "$oidc_secret" || "$oidc_secret" == *CHANGE_ME* ]]; then
  warn "OIDC_CLIENT_SECRET is still a placeholder — login will not work yet."
  warn "Fill it in from Keycloak (SETUP-K3S.md step 6) and re-run this script."
  oidc_secret="PLACEHOLDER_NOT_YET_SET"
fi

pg_user="${POSTGRES_USER:-sudhood}"
pg_db="${POSTGRES_DB:-sudhood}"

# Composed here rather than in the ConfigMap because both embed a password.
# Hostnames are the in-cluster Service names, which match the old compose
# container names — that is why no application code changed in this port.
database_url="postgresql+asyncpg://${pg_user}:${POSTGRES_PASSWORD}@postgres:5432/${pg_db}"
redis_url="redis://:${REDIS_PASSWORD}@redis:6379/0"

# One login per service, each reaching its own schema and nothing else — the
# grants live in postgres/init/02-service-users.sh, this only composes the URLs
# that name those roles. DATABASE_URL above stays as the superuser connection
# for anything that legitimately needs it (pgAdmin, harden-audit.sh); a service
# that uses it has quietly opted out of the boundary.
#
# Unset SERVICE_DB_PASSWORD means both this and the init script fall back to the
# superuser password, so a fresh checkout works without editing .env. Set it
# anywhere that is not a laptop, and note that changing it means re-running the
# init script by hand — the roles already exist by then.
service_pw="${SERVICE_DB_PASSWORD:-$POSTGRES_PASSWORD}"
service_url() { printf 'postgresql+asyncpg://%s:%s@postgres:5432/%s' "$1" "$service_pw" "$pg_db"; }

# No m10_service: M10 has no schema of its own yet. Add it here in the same
# shape as the others when it grows one.
m0_database_url="$(service_url m0_service)"
m1_database_url="$(service_url m1_service)"
m9_database_url="$(service_url m9_service)"

# MinIO. Same fallback shape again: unset MINIO_SERVICE_PASSWORD means the
# per-service keys share the root password, which costs nothing in isolation —
# the boundary is the bucket policy attached to each key, not the password.
minio_root_user="${MINIO_ROOT_USER:-minioadmin}"
minio_service_pw="${MINIO_SERVICE_PASSWORD:-$MINIO_ROOT_PASSWORD}"

step "ensuring namespace $NAMESPACE exists"
# create-secrets.sh usually runs before `kubectl apply -k .`, so the namespace
# may not be there yet.
kc create namespace "$NAMESPACE" --dry-run=client -o yaml | kc apply -f - >/dev/null
ok "namespace $NAMESPACE"

step "writing Secret sudhood-secrets"
kcn create secret generic sudhood-secrets \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
  --from-literal=PGADMIN_PASSWORD="$PGADMIN_PASSWORD" \
  --from-literal=OIDC_CLIENT_SECRET="$oidc_secret" \
  --from-literal=INTERNAL_API_KEY="$INTERNAL_API_KEY" \
  --from-literal=DATABASE_URL="$database_url" \
  --from-literal=SERVICE_DB_PASSWORD="$service_pw" \
  --from-literal=M0_DATABASE_URL="$m0_database_url" \
  --from-literal=M1_DATABASE_URL="$m1_database_url" \
  --from-literal=M9_DATABASE_URL="$m9_database_url" \
  --from-literal=MINIO_ROOT_USER="$minio_root_user" \
  --from-literal=MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  --from-literal=MINIO_SERVICE_PASSWORD="$minio_service_pw" \
  --from-literal=REDIS_URL="$redis_url" \
  --dry-run=client -o yaml | kcn apply -f - >/dev/null

ok "sudhood-secrets written with $(kcn get secret sudhood-secrets -o go-template='{{len .data}}') keys"

cat <<EOF

$(printf '%s' "$C_BOLD")Note$(printf '%s' "$C_RESET")
  Pods do not pick up a changed Secret on their own. After re-running this:
      scripts/restart.sh
EOF
