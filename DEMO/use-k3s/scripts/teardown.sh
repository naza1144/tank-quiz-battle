#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Remove the stack
# ─────────────────────────────────────────────────
#  The default stops the workloads and leaves every PersistentVolumeClaim in
#  place, which is almost always what you want: accounts, the Keycloak realm,
#  and the JWT signing keys survive a teardown/redeploy cycle.
#
#  Note it does NOT use `kubectl delete -k .`, even though that is the obvious
#  mirror of the deploy. The PVCs are part of the kustomization, so that command
#  would take them with it — and local-path's reclaim policy is Delete, so the
#  directories on disk go too. There is no undo.
#
#  Usage:
#    scripts/teardown.sh              # stop workloads, keep all data
#    scripts/teardown.sh --with-data  # delete the namespace and every volume
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cluster

if [[ "${1:-}" == "--with-data" ]]; then
  cat <<EOF
${C_YELLOW}This deletes the namespace and all four PersistentVolumeClaims.${C_RESET}
The local-path StorageClass reclaims on delete, so the data is gone for good:

  postgres-data   accounts, plus Keycloak's realm and users
  redis-data      active sessions and refresh tokens
  token-keys      ${C_BOLD}the JWT signing keys${C_RESET} — losing these makes every token
                  ever issued unverifiable and logs out every user
  pgadmin-data    saved server connections

EOF
  read -r -p "Type the namespace name ($NAMESPACE) to confirm: " answer
  [[ "$answer" == "$NAMESPACE" ]] || die "not confirmed — nothing deleted"

  step "deleting namespace $NAMESPACE"
  kc delete namespace "$NAMESPACE" --wait=true
  ok "gone, volumes included"
  exit 0
fi

step "stopping workloads (volumes and secrets kept)"
# Named kinds rather than `delete -k`, to keep the PVCs out of it. Middlewares
# and IngressRoutes go too so a redeploy cannot leave a stale route pointing at
# a Service that no longer exists.
kcn delete deployment --all --ignore-not-found=true
kcn delete service --all --ignore-not-found=true
kcn delete ingressroute.traefik.io --all --ignore-not-found=true
kcn delete middleware.traefik.io --all --ignore-not-found=true

step "what is left"
kcn get pvc,secret,configmap 2>/dev/null || true

cat <<EOF

$(printf '%s' "$C_BOLD")Bring it back$(printf '%s' "$C_RESET")
  scripts/deploy.sh          # reattaches to the same volumes, data intact

$(printf '%s' "$C_BOLD")Genuinely clean slate$(printf '%s' "$C_RESET")
  scripts/teardown.sh --with-data
EOF
