#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Check the stack actually works
# ─────────────────────────────────────────────────
#  Every assertion goes through the gateway on https://localhost/ — or whatever
#  GATEWAY names — because that is the path real traffic takes. Two of them are negative on purpose: a
#  request with no token must be refused, and M0's internal endpoints must not
#  be reachable from outside the cluster at all. Those are the checks that catch
#  a routing mistake — the positive ones would keep passing with the auth
#  middleware detached.
#
#  The gateway is https, and http is answered with a 301 at the entrypoint — so
#  a plain http default would report every positive check as a failure while the
#  cluster is perfectly healthy. `localhost` is in the certificate's SANs, which
#  is what makes the default work without naming the LAN hostname.
#
#  The chain is always verified — never `curl -k`. A check that skips
#  verification keeps passing with TLS misconfigured, which is the one thing
#  this script exists to catch. The CA is found automatically from Terraform's
#  output file if it has not been installed system-wide; see CA_FILE below.
#
#  Usage:  scripts/verify.sh
#          GATEWAY=https://sudhood.192-168-50-96.sslip.io scripts/verify.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cmd curl
require_cluster

GATEWAY="${GATEWAY:-https://localhost}"

# The certificate is signed by a CA of our own, so curl needs to be told about
# it unless someone has installed it system-wide (which needs root). Without
# this every check below reports 000 — curl refusing the chain, not a service
# failing — and eight honest passes read as eight failures.
#
# CURL_CA_BUNDLE is curl's own variable, so this reaches the checks without
# threading a --cacert flag through every call. Set it yourself to override.
CA_FILE="${CA_FILE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../terraform/01-platform" 2>/dev/null && pwd)/sudhood-ca.crt}"
if [[ -z "${CURL_CA_BUNDLE:-}" && -f "$CA_FILE" ]]; then
  export CURL_CA_BUNDLE="$CA_FILE"
fi

pass=0
fail=0

# Expect a specific HTTP status from a gateway path.
expect_status() {
  local want="$1" path="$2" description="$3"
  shift 3
  local got
  got=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$@" "${GATEWAY}${path}" 2>/dev/null) || got="000"
  # A stall is not an answer, so ask once more rather than reporting a verdict
  # on silence. Measured on this LAN against a healthy cluster: about one
  # request in ten to the gateway address stalls ~5 seconds, and a request that
  # stalls twice runs past --max-time and comes back with no status at all.
  # Across the eight requests this script makes, that is often enough to fail a
  # run for reasons that have nothing to do with the platform.
  #
  # Only the absence of a status is retried. A real code — the wrong one
  # included — is reported as it came, because that is the finding.
  if [[ "$got" == "000" ]]; then
    got=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$@" "${GATEWAY}${path}" 2>/dev/null) || got="000"
  fi
  if [[ "$got" == "$want" ]]; then
    ok "$description  ($want)"
    pass=$((pass + 1))
  else
    printf '%sfail%s %s — expected %s, got %s   [%s]\n' \
      "$C_RED" "$C_RESET" "$description" "$want" "$got" "$path" >&2
    fail=$((fail + 1))
  fi
}

step "pods"
kcn get pods --no-headers 2>/dev/null | awk '{printf "  %-34s %-12s restarts=%s\n", $1, $3, $4}'

# A pod can be Running and still failing its readiness probe, which is the state
# that decides whether the gateway will route to it at all.
#
# Asking the API for the ready flag rather than parsing the "1/1" column: awk
# uses POSIX ERE, which has no backreferences, so the obvious `^([0-9]+)/\1$`
# silently matches nothing and reports every pod as broken.
#
# Pods in phase Succeeded are skipped: loadgen, minio-init, nats-init and
# keycloak-init are Jobs that finished, and a finished container is not ready by
# definition. Counting them made a healthy cluster warn on every single run,
# which is how a warning stops being read.
notready=$(kcn get pods -o go-template='{{range .items}}{{if ne .status.phase "Succeeded"}}{{$pod := .metadata.name}}{{range .status.containerStatuses}}{{if not .ready}}{{$pod}} {{end}}{{end}}{{end}}{{end}}' 2>/dev/null)
if [[ -n "${notready// /}" ]]; then
  warn "not ready: $notready"
fi

step "health endpoints (no token required)"
expect_status 200 "/api/v1/identity/health" "M0 identity health"
expect_status 200 "/api/v1/platform/health" "M10 platform health"

step "JWKS is public — services need it to verify tokens offline"
expect_status 200 "/.well-known/jwks.json" "JWKS"

step "swagger reachable without a token"
expect_status 200 "/api/v1/identity/openapi.json" "M0 OpenAPI"
expect_status 200 "/api/v1/platform/openapi.json" "M10 OpenAPI"

step "protected endpoints refuse an anonymous request"
expect_status 401 "/api/v1/identity/me" "M0 /me without a token"

step "internal endpoints are not routed from outside"
# 404 rather than 401: nothing routes /internal/*, so the gateway has no service
# to hand it to. A 401 here would mean the prefix is routed and merely guarded,
# which is a weaker position than being unreachable.
expect_status 404 "/internal/accounts/resolve" "M0 /internal/* via gateway" -X POST

step "each service's own OPA answers a policy query"
# Asked from inside the pod, because that is the only place these engines are
# reachable — they bind 127.0.0.1 and have no Service. That unreachability is
# the point, so the check has to meet them where they are rather than ask the
# gateway, which is what the previous version of this step did back when one
# shared engine sat behind opa.localhost.
#
# Only that the engine loaded a policy and decides. Whether each rule is right
# belongs in `opa test` against the .rego, which runs without a cluster.
#
# Asked from the *service* container, not the opa one: the OPA image is
# distroless and carries no shell, no curl and no wget. Both containers share
# the pod's network namespace, so localhost:8181 from the service container is
# the same engine — and it is also the exact path the service itself uses,
# which makes this a check of the real wiring rather than of a debug route.
for svc in m0-identity m10-platform; do
  opa_result=$(kcn exec "deploy/$svc" -c "$svc" -- python3 -c \
    'import urllib.request,sys
sys.stdout.write(urllib.request.urlopen("http://127.0.0.1:8181/v1/data", timeout=5).read().decode())' \
    2>/dev/null || true)
  if [[ "$opa_result" == *'"result"'* ]]; then
    ok "$svc OPA responds: ${opa_result:0:60}"
    pass=$((pass + 1))
  else
    printf '%sfail%s %s OPA query — got: %s\n' "$C_RED" "$C_RESET" "$svc" "${opa_result:-<nothing>}" >&2
    fail=$((fail + 1))
  fi
done

step "no policy engine is reachable from outside"
# The old opa.localhost route is gone. If this ever answers again, someone has
# published an engine that decides who may do what in the whole platform.
#
# `) || opa_public="000"` rather than `|| echo "000"` inside the substitution.
# curl writes its -w output even when the transfer fails, so on a timeout the
# echo appended a *second* code and the variable held "000000" — matching
# neither arm below, landing in the failure branch, and announcing an exposed
# engine because nothing had answered. The opposite of the truth, and it stopped
# a build on a cluster where every other check passed.
opa_public=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 \
  -H "Host: opa.localhost" "${GATEWAY}/v1/data" 2>/dev/null) || opa_public="000"
if [[ "$opa_public" == "404" ]]; then
  ok "opa.localhost is not routed (404)"
  pass=$((pass + 1))
elif [[ "$opa_public" == "000" ]]; then
  # Silence is weaker evidence than a 404 — it is also what a gateway that is
  # down looks like — but it is not evidence of exposure, and exposure is what
  # this check is for. The other ten checks are what notice a dead gateway.
  ok "opa.localhost did not answer at all — nothing reachable there"
  pass=$((pass + 1))
else
  printf '%sfail%s opa.localhost answered %s — an engine is exposed\n' "$C_RED" "$C_RESET" "$opa_public" >&2
  fail=$((fail + 1))
fi

step "login redirects to Keycloak"
# 307 with a Location pointing at the Keycloak realm. Following it would leave
# the cluster and hit Google, which is not something a check should do.
# Assignment on failure, for the reason spelled out in the check above.
login_status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${GATEWAY}/auth/login" 2>/dev/null) || login_status="000"
login_location=$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 10 "${GATEWAY}/auth/login" 2>/dev/null || true)
if [[ "$login_status" =~ ^30[0-9]$ && "$login_location" == *"/realms/sudhood/"* ]]; then
  ok "login redirect → ${login_location:0:72}..."
  pass=$((pass + 1))
else
  warn "login is not redirecting yet (status $login_status)."
  warn "The realm or the client secret is not in place. Both are Terraform's"
  warn "job now (keycloak-init.tf), so check that Job rather than a script:"
  warn "  kubectl -n sudhood logs job/\$(kubectl -n sudhood get job -o name | grep keycloak-init | cut -d/ -f2)"
fi

printf '\n%s%d passed, %d failed%s\n' "$C_BOLD" "$pass" "$fail" "$C_RESET"
[[ "$fail" -eq 0 ]] || exit 1
