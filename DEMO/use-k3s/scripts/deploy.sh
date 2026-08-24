#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Apply the manifests and wait for the stack to come up
# ─────────────────────────────────────────────────
#  `kubectl apply -k .` on its own returns the moment the objects are accepted,
#  which is long before anything is serving. This waits on the things that
#  actually gate the next step, in dependency order, so a failure points at the
#  component that caused it instead of at whatever timed out last.
#
#  Usage:  scripts/deploy.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cluster

# Catch the missing-Secret cases before applying, because the resulting failure
# (pods stuck in CreateContainerConfigError) reads like a manifest bug.
if ! kcn get secret sudhood-secrets >/dev/null 2>&1; then
  die "Secret sudhood-secrets not found. Run scripts/create-secrets.sh first."
fi
if ! kcn get secret token-signing-key >/dev/null 2>&1; then
  die "Secret token-signing-key not found. Run scripts/create-signing-key.sh first."
fi

# A Job's pod template is immutable, so re-applying after the bootstrap script
# changes fails with "field is immutable" — and the ConfigMap name carries a
# content hash, which means editing either script changes the template. Deleting
# first is the supported way to re-run a Job. Both scripts are idempotent, so
# running them again on an existing volume is a no-op that re-checks its own
# work.
step "clearing previous bootstrap Jobs"
kcn delete job minio-init nats-init --ignore-not-found >/dev/null
ok "minio-init, nats-init cleared"

step "applying manifests"
kc apply -k "$ROOT_DIR"

# Applied separately and on purpose: this object lives in kube-system, and the
# kustomization's namespace transformer would move it into sudhood, where the
# API server accepts it and nothing ever reads it.
step "applying gateway HA config (kube-system)"
kc apply -f "$ROOT_DIR/k8s/gateway/traefik-ha.yaml"
warn "k3s reconciles the Traefik HelmChart in the background — the second"
warn "gateway replica appears a minute or two after this returns."

# Postgres first: Keycloak and M0 both block on it via init containers, and a
# database that never becomes ready would otherwise show up as three separate
# timeouts.
step "waiting for postgres"
kcn rollout status deploy/postgres --timeout=180s

step "waiting for redis"
kcn rollout status deploy/redis --timeout=120s

# MinIO gates M10's storage endpoints, and its bootstrap Job is what creates the
# per-service keys M10 authenticates with — a service that starts before those
# exist answers 503 on every upload ticket rather than failing visibly.
step "waiting for minio and nats"
kcn rollout status deploy/minio --timeout=180s
kcn rollout status deploy/nats --timeout=120s
kcn wait --for=condition=complete job/minio-init --timeout=180s \
  || warn "minio-init did not complete — check: kubectl -n $NAMESPACE logs job/minio-init"
kcn wait --for=condition=complete job/nats-init --timeout=120s \
  || warn "nats-init did not complete — check: kubectl -n $NAMESPACE logs job/nats-init"
# There is no OPA Deployment to wait for. Each service's policy engine is a
# container inside that service's own pod, so a policy that fails to compile
# shows up as that service never becoming ready — which is where it belongs.

# Cold-start Keycloak builds its schema; the startupProbe allows up to ~200s.
step "waiting for keycloak (cold start builds the schema — this is the slow one)"
kcn rollout status deploy/keycloak --timeout=300s

step "waiting for the services"
# token-service is allowed to fail here on a first install: /ready checks
# Keycloak's realm, which does not exist until import-realm.sh has run.
if ! kcn rollout status deploy/token-service --timeout=120s; then
  warn "token-service is not ready yet."
  warn "On a first install that is expected — /ready checks the Keycloak realm,"
  warn "which does not exist until you run scripts/import-realm.sh."
fi
kcn rollout status deploy/m0-identity --timeout=180s
kcn rollout status deploy/m10-platform --timeout=120s
# Other people's modules. Not blocking: a failure here is theirs to fix, and it
# should not stop a deploy of the platform from reporting success.
kcn rollout status deploy/m1-curriculum --timeout=180s || warn "m1-curriculum is not ready — see k8s/m1-curriculum.yaml"
kcn rollout status deploy/m9-thesis --timeout=180s || warn "m9-thesis is not ready — see k8s/m9-thesis.yaml"
kcn rollout status deploy/pgadmin --timeout=180s || warn "pgadmin is slow to start; not blocking"

step "current state"
kcn get pods -o wide

step "autoscalers"
# "<unknown>/70%" here is normal for the first minute: metrics-server needs a
# window of samples before it can report utilisation, and until it does the HPA
# holds at minReplicas rather than guessing.
kcn get hpa 2>/dev/null || warn "no HPAs found"

cat <<EOF

$(printf '%s' "$C_BOLD")Next$(printf '%s' "$C_RESET")
  First install?   scripts/import-realm.sh    then fill OIDC_CLIENT_SECRET in .env
  Check it works:  scripts/verify.sh
  Console:         http://localhost/console
EOF
