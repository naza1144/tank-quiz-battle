#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Roll the application Deployments
# ─────────────────────────────────────────────────
#  Needed more often than it looks. Kubernetes does not restart pods when a
#  ConfigMap or Secret changes, and re-importing an image under the same tag
#  leaves running containers on the old layers. Both changes apply only after a
#  roll.
#
#  Only the three application Deployments by default — bouncing Postgres or
#  Keycloak to pick up an app config change is a slow way to achieve nothing.
#
#  Usage:
#    scripts/restart.sh                    # the three services
#    scripts/restart.sh keycloak postgres  # named Deployments
#    scripts/restart.sh --all              # everything in the namespace
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cluster

targets=("$@")
if [[ ${#targets[@]} -eq 0 ]]; then
  targets=(token-service m0-identity m10-platform)
elif [[ "${targets[0]}" == "--all" ]]; then
  # No opa: the shared engine is gone. Each service's OPA is a sidecar in its
  # own pod and rolls with it.
  targets=(postgres redis keycloak pgadmin token-service m0-identity m10-platform)
fi

for name in "${targets[@]}"; do
  step "restarting $name"
  kcn rollout restart "deploy/$name"
done

for name in "${targets[@]}"; do
  # Deliberately not fatal: token-service legitimately sits unready until the
  # Keycloak realm exists, and failing the whole script over that is noise.
  if kcn rollout status "deploy/$name" --timeout=180s; then
    ok "$name"
  else
    warn "$name did not become ready — kubectl -n $NAMESPACE logs deploy/$name"
  fi
done
