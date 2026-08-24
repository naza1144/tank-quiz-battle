#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Put load on a service and watch the autoscaler answer
# ─────────────────────────────────────────────────
#  Proves the thing that is otherwise taken on faith: that a service under load
#  grows extra pods on its own, and that requests keep being answered while it
#  happens.
#
#  The load runs from inside the cluster, not from this machine. Traffic from
#  outside goes through the gateway's rate limiter, which is doing its job when
#  it throttles a flood — and a throttled flood never reaches the service, so
#  the CPU never rises and nothing scales. Testing the autoscaler means putting
#  load past the limiter, on the Service directly.
#
#  ── Why fortio and not a shell loop ─────────────────────────────────────────
#  This script used to run `while ...; do curl ...; done` in a few background
#  subshells. It produced a graph that looked like a broken autoscaler: CPU
#  readings of 1%, 62%, 1%, 488%, 1%, and no scaling at all.
#
#  Nothing was broken. Each iteration of that loop spawned a whole curl
#  process, which costs 10–30ms, while the service answered in under 2ms — so
#  the generator was the bottleneck and the load arrived in bursts rather than
#  as a steady stream. The autoscaler is deliberately built to ignore exactly
#  that shape: scaleUp takes the *lowest* reading in a 30-second window, so a
#  spike between two idle samples is treated as noise, correctly.
#
#  fortio holds connections open and keeps them busy, so the load is continuous
#  and the reading the autoscaler acts on is the real one. It also reports what
#  the service actually did — throughput, status codes, latency percentiles —
#  which is the half of a load test that says whether growing extra pods
#  actually helped.
#
#  Measured on the single-node cluster: 6,280 req/s, 942k requests, 100% 200,
#  p50 16.0ms, p99 19.9ms, scaling 2 → 4 → 6 in about 45 seconds.
#
#  Usage:
#    scripts/load-test.sh                       # m0-identity, 150s
#    scripts/load-test.sh token-service 120     # named service, seconds
#    CONNS=200 scripts/load-test.sh             # heavier
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cluster

TARGET="${1:-m0-identity}"
DURATION="${2:-150}"
# 100 open connections saturates two pods asking for 100m each. Raising it does
# not make the test more truthful once the autoscaler is already at maxReplicas
# — it just queues.
CONNS="${CONNS:-100}"

case "$TARGET" in
  m0-identity)   PORT=8000; PATH_="/api/v1/identity/openapi.json" ;;
  m10-platform)  PORT=8000; PATH_="/api/v1/platform/openapi.json" ;;
  token-service) PORT=8100; PATH_="/.well-known/jwks.json" ;;
  *) die "unknown service '$TARGET'. Choose: m0-identity, m10-platform, token-service" ;;
esac

# Unauthenticated on purpose. A load test that needs a token measures the token
# as much as the service, and the token expires halfway through a long run.
URL="http://${TARGET}:${PORT}${PATH_}"

hpa_line() {
  kcn get hpa "$TARGET" \
    -o jsonpath='{range .status.currentMetrics[*]}{.resource.name}={.resource.current.averageUtilization}% {end}|{.status.desiredReplicas}' 2>/dev/null \
    | awk -F'|' '{printf "%-34s want=%s", ($1 == "" ? "(waiting for metrics)" : $1), $2}'
}

running_pods() {
  kcn get pods -l "app.kubernetes.io/name=$TARGET" --no-headers 2>/dev/null | grep -c Running
}

cleanup() { kcn delete pod loadgen --ignore-not-found --now >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

step "before"
echo "  $(hpa_line)  now=$(running_pods)"

step "loading ${URL} for ${DURATION}s with ${CONNS} connections"
cleanup
kcn run loadgen --restart=Never --image=fortio/fortio:latest -- \
  load -c "$CONNS" -qps 0 -t "${DURATION}s" -quiet "$URL" >/dev/null

# The first run on a machine pulls the image, which can take longer than the
# whole test. Waiting for Running means the clock below starts when the load
# does, rather than measuring an image pull and calling it an idle service.
if ! kcn wait --for=jsonpath='{.status.phase}'=Running pod/loadgen --timeout=300s >/dev/null 2>&1; then
  die "loadgen did not start. Check:  kubectl -n $NAMESPACE describe pod loadgen"
fi
ok "loadgen running"

step "watching"
printf '  %-9s %-34s %s\n' "time" "cpu / memory" "replicas"
# Past the end of the load, to show that scale-down does not follow immediately.
deadline=$(( $(date +%s) + DURATION + 50 ))
peak=$(running_pods)
while [ "$(date +%s)" -lt "$deadline" ]; do
  n=$(running_pods)
  [ "${n:-0}" -gt "$peak" ] && peak=$n
  printf '  %-9s %s  now=%s\n' "$(date +%H:%M:%S)" "$(hpa_line)" "$n"
  sleep 15
done

step "what the autoscaler decided, in its own words"
kcn describe hpa "$TARGET" 2>&1 | sed -n '/Events/,$p' | sed 's/^/  /' | head -10

step "what the service actually did"
kcn logs loadgen 2>&1 | grep -E "^Code |qps|target 50%|target 99%" | sed 's/^/  /'

echo
ok "peak replicas: $peak"
cat <<'EOF'

  Scale-down is deliberately slow — 5 minutes of quiet before the first pod
  goes, then one a minute. Traffic that dips for a moment usually comes back,
  and shedding pods just to re-add them makes every graph unreadable. A run
  that ends with replicas still high is not stuck; it is waiting on purpose.
EOF
