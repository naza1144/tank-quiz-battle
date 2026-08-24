#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Shared helpers — sourced by every other script here
# ─────────────────────────────────────────────────
#  Not meant to be run directly.
# ─────────────────────────────────────────────────
set -euo pipefail

NAMESPACE="${NAMESPACE:-sudhood}"

# Everything is relative to the use-k3s folder, so the scripts work no matter
# which directory they are called from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Output ───────────────────────────────────────
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
  C_RESET=''; C_BOLD=''; C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''
fi

step() { printf '%s==>%s %s%s%s\n' "$C_BLUE" "$C_RESET" "$C_BOLD" "$*" "$C_RESET"; }
ok()   { printf '%s  ok%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%swarn%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die()  { printf '%sfail%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

# ── kubectl ──────────────────────────────────────
#  On a default k3s install /etc/rancher/k3s/k3s.yaml is root-only, and the
#  kubectl that ships with k3s reads it before anything else — which is why a
#  plain `kubectl get nodes` fails with a permission error even though the
#  cluster is fine. Prefer a readable user kubeconfig and be explicit about it.
resolve_kubeconfig() {
  if [[ -n "${KUBECONFIG:-}" && -r "${KUBECONFIG}" ]]; then
    return
  fi
  if [[ -r "$HOME/.kube/config" ]]; then
    export KUBECONFIG="$HOME/.kube/config"
    return
  fi
  if [[ -r /etc/rancher/k3s/k3s.yaml ]]; then
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    return
  fi
  die "no readable kubeconfig. Fix it once with:
       mkdir -p ~/.kube
       sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
       sudo chown \$(id -u):\$(id -g) ~/.kube/config
       chmod 600 ~/.kube/config
       echo 'export KUBECONFIG=\$HOME/.kube/config' >> ~/.bashrc"
}

resolve_kubeconfig
KUBECTL=("kubectl" "--kubeconfig=$KUBECONFIG")

kc()  { "${KUBECTL[@]}" "$@"; }
kcn() { "${KUBECTL[@]}" --namespace "$NAMESPACE" "$@"; }

require_cluster() {
  kc version --request-timeout=5s >/dev/null 2>&1 \
    || die "cannot reach the cluster. Is k3s running?  systemctl status k3s"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed"
}

# ── .env ─────────────────────────────────────────
load_env() {
  local env_file="$ROOT_DIR/.env"
  [[ -f "$env_file" ]] || die "$env_file not found. Start with:  cp .env.example .env"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

# Refuse to carry a placeholder into the cluster. A Secret holding the literal
# string CHANGE_ME is worse than a missing one: everything starts, and the
# failure surfaces later as an unexplained 401.
require_env() {
  local name value
  for name in "$@"; do
    value="${!name:-}"
    [[ -n "$value" ]] || die "$name is empty in .env"
    [[ "$value" != *CHANGE_ME* ]] || die "$name is still CHANGE_ME in .env"
  done
}
