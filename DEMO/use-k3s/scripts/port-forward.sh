#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Publish the browser-facing and admin ports on localhost
# ─────────────────────────────────────────────────
#  The API is reachable on http://localhost/ already — k3s' Traefik holds port 80
#  and the IngressRoutes point at it. What is missing is everything the compose
#  stack published directly:
#
#    8080  Keycloak admin console, and the address the browser is redirected to
#          during login. This one is not optional: KC_HOSTNAME is `localhost`
#          and port 8080, so it is what Keycloak stamps into `iss` and into the
#          Google redirect URI you already registered.
#    5050  pgAdmin
#    8100  token-service directly, for debugging without the gateway
#    7100  m0-identity directly — the port the compose stack used
#    8181  OPA, for policy queries without the Host header dance
#
#  Runs in the foreground; Ctrl-C tears all of them down.
#
#  Usage:  scripts/port-forward.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cluster

declare -a PIDS=()
cleanup() {
  step "closing port-forwards"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

forward() {
  local svc="$1" local_port="$2" remote_port="$3" label="$4"
  kcn port-forward "svc/${svc}" "${local_port}:${remote_port}" >/dev/null 2>&1 &
  PIDS+=($!)
  printf '  %-28s http://localhost:%s\n' "$label" "$local_port"
}

step "forwarding"
forward keycloak      8080 8080 "Keycloak admin"
forward pgadmin       5050 5050 "pgAdmin"
forward token-service 8100 8100 "Token Service (direct)"
forward m0-identity   7100 8000 "M0 Identity (direct)"
# No OPA line. The engines bind 127.0.0.1 inside their own pods and have no
# Service, so there is nothing here to name. Forwarding still works when you
# need it, by going through the pod that holds the engine — port-forward runs
# inside the pod's network namespace, which is why a loopback-only listener is
# reachable this way and not from anywhere else:
#   kubectl -n sudhood port-forward deploy/m0-identity 8181:8181
#   kubectl -n sudhood port-forward deploy/m10-platform 8182:8181

cat <<EOF

  Gateway (no forward needed)  http://localhost/

$(printf '%s' "$C_BOLD")Ctrl-C to stop$(printf '%s' "$C_RESET")
EOF

# port-forward dies quietly if the pod restarts, which looks like the script
# hanging. Report it instead of pretending the tunnel is still up.
while true; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      warn "a port-forward dropped (pod restart?) — Ctrl-C and run this again"
      sleep 5
      break
    fi
  done
  sleep 2
done
