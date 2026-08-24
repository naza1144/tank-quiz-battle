#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Build the service images and hand them to k3s
# ─────────────────────────────────────────────────
#  k3s runs its own containerd, separate from the Docker daemon that builds
#  here, so a freshly built image is invisible to the cluster until it is
#  imported. That import is the step people forget; the symptom is a pod stuck
#  on ErrImageNeverPull.
#
#  No registry is involved on purpose — one less moving part on a single-node
#  dev cluster. When this goes to a real cluster, push to a registry instead and
#  drop `imagePullPolicy: Never` from the Deployments.
#
#  **Build contexts are the copies in this folder.**
#  use-k3s/ carries its own source for every service, so the whole deployment
#  can be handed over or archived on its own without depending on a sibling
#  directory being present. That is a deliberate choice, and it has a running
#  cost worth naming: a fix applied on one side is not applied on the other.
#  These two trees drifted by 28 files once already — Alembic, MinIO, the
#  per-service OPA split and both React apps had landed only on the compose
#  side — and keycloak/ still holds three files that diverged the same way.
#
#  So after changing anything under a service directory on either side, check:
#
#    for d in token-service m0-service m10-service \
#             m1-curriculum-service m9-service minio nats postgres; do
#      diff -r --exclude=compose.yaml --exclude=node_modules --exclude=dist \
#        DEMO/use-docker-compose/$d DEMO/use-k3s/$d
#    done
#
#  compose.yaml is excluded because it is the one file that is legitimately
#  per-side: it is how the compose stack wires a service up, and the equivalent
#  here is the manifest in k8s/.
#
#  Usage:
#    scripts/build-images.sh                 # everything
#    scripts/build-images.sh m0-identity     # just one
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cmd docker
require_cmd k3s

TAG="${TAG:-local}"

# image name : build context directory, relative to this folder
declare -A CONTEXTS=(
  [token-service]=token-service
  # m0-identity and m10-platform each build a React app too: their Dockerfiles
  # have a node stage that compiles account-app/ and console/ respectively and
  # copies the output into the Python image. npm does not need to exist on this
  # machine; only docker does.
  [m0-identity]=m0-service
  [m10-platform]=m10-service
  [m1-curriculum]=m1-curriculum-service
  [m9-thesis]=m9-service
)

targets=("$@")
if [[ ${#targets[@]} -eq 0 ]]; then
  targets=(token-service m0-identity m10-platform m1-curriculum m9-thesis)
fi

for name in "${targets[@]}"; do
  context="${CONTEXTS[$name]:-}"
  [[ -n "$context" ]] || die "unknown image '$name'. Choose from: ${!CONTEXTS[*]}"

  image="sudhood/${name}:${TAG}"

  [[ -f "$ROOT_DIR/$context/Dockerfile" ]] \
    || die "no Dockerfile at $context/ — is the service copied into this folder yet?"

  step "building $image  (from $context/)"
  docker build --tag "$image" "$ROOT_DIR/$context"

  step "importing $image into k3s containerd"
  # `k3s ctr` talks to the cluster's containerd socket, which is root-owned —
  # hence sudo. It defaults to the k8s.io namespace, which is where the kubelet
  # looks for images.
  docker save "$image" | sudo k3s ctr images import -
  ok "$image"
done

step "images now visible to k3s"
sudo k3s ctr images ls -q | grep '^docker.io/sudhood/' || warn "no sudhood images found — did the import fail?"

cat <<EOF

$(printf '%s' "$C_BOLD")Next$(printf '%s' "$C_RESET")
  A rebuilt image with the same tag does not restart running pods. Roll them:
      scripts/restart.sh
EOF
