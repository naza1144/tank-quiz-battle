#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Generate the JWT signing key and store it as a Secret
# ─────────────────────────────────────────────────
#  The key used to live on a ReadWriteOnce PVC, which capped token-service at
#  one replica: a second pod would sit Pending forever waiting for a volume the
#  first one holds. Putting it in a Secret lets every replica mount the same
#  key, which is what makes the service horizontally scalable at all.
#
#  What that costs: a Secret is base64, not encryption. Anyone who can read
#  Secrets in this namespace can read the key that signs every token in the
#  platform, and with it mint a token for any user and any role. Keep RBAC on
#  this namespace tight, and move to sealed-secrets or an external store before
#  this is anything but a dev cluster.
#
#  Safe to re-run only if you mean it — see the guard below. Replacing the key
#  invalidates every token already issued.
#
#  Usage:
#    scripts/create-signing-key.sh              # create if absent
#    scripts/create-signing-key.sh --rotate     # add a second key (see README)
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cmd openssl
require_cmd python3
require_cluster

SECRET_NAME="token-signing-key"
KEY_SIZE=2048

step "ensuring namespace $NAMESPACE exists"
kc create namespace "$NAMESPACE" --dry-run=client -o yaml | kc apply -f - >/dev/null

if kcn get secret "$SECRET_NAME" >/dev/null 2>&1 && [[ "${1:-}" != "--rotate" ]]; then
  existing=$(kcn get secret "$SECRET_NAME" -o go-template='{{range $k,$v := .data}}{{$k}} {{end}}')
  ok "$SECRET_NAME already exists (keys: $existing) — nothing to do"
  cat <<EOF

  Replacing it would invalidate every token in circulation and log out every
  user. If that is genuinely what you want:

      kubectl -n $NAMESPACE delete secret $SECRET_NAME
      scripts/create-signing-key.sh

  To rotate properly — publish a new key while the old one still verifies —
  see "หมุน signing key" in README.md, then:

      scripts/create-signing-key.sh --rotate
EOF
  exit 0
fi

# A private key on the filesystem, even briefly, is a private key that can be
# read by anything running as this user. Restrict the directory before writing.
workdir=$(mktemp -d)
chmod 700 "$workdir"
trap 'rm -rf "$workdir"' EXIT

if [[ "${1:-}" == "--rotate" ]]; then
  # Keep every existing key so tokens signed with them still verify, and add
  # one more. Which key *signs* is decided by JWT_ACTIVE_KID, not by this
  # script — adding a key here changes nothing until that is set.
  step "extracting existing keys"
  kcn get secret "$SECRET_NAME" -o go-template='{{range $k,$v := .data}}{{$k}}{{"\n"}}{{end}}' \
    | while read -r name; do
        [[ -n "$name" ]] || continue
        kcn get secret "$SECRET_NAME" -o "go-template={{index .data \"$name\"}}" \
          | base64 -d > "$workdir/$name"
        echo "  kept $name"
      done
  new_name="rotated-$(kcn get secret "$SECRET_NAME" -o go-template='{{len .data}}').pem"
else
  new_name="token-service.pem"
fi

step "generating a ${KEY_SIZE}-bit RSA key"
openssl genpkey -algorithm RSA -pkeyopt "rsa_keygen_bits:${KEY_SIZE}" \
  -out "$workdir/$new_name" 2>/dev/null
chmod 600 "$workdir/$new_name"
ok "$new_name"

# The kid is an RFC 7638 JWK thumbprint, computed the same way keys.py does it.
# Printing it here means a rotation can set JWT_ACTIVE_KID without starting the
# service first to find out what the key is called.
#
# Convenience only, so it must not be able to fail the run: it needs the
# `cryptography` package, which lives in the service image rather than on
# whatever machine is running this script. When it is missing, say where else
# to read the kid and carry on — the Secret is the part that matters.
kid=$(python3 - "$workdir/$new_name" 2>/dev/null <<'PY'
import base64, hashlib, json, sys
from cryptography.hazmat.primitives import serialization

def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def int_b64(value: int) -> str:
    return b64(value.to_bytes((value.bit_length() + 7) // 8, "big"))

with open(sys.argv[1], "rb") as fh:
    key = serialization.load_pem_private_key(fh.read(), password=None)

numbers = key.public_key().public_numbers()
n, e = int_b64(numbers.n), int_b64(numbers.e)
canonical = json.dumps({"e": e, "kty": "RSA", "n": n}, separators=(",", ":"), sort_keys=True)
print(b64(hashlib.sha256(canonical.encode()).digest()))
PY
) || kid=""

step "writing Secret $SECRET_NAME"
args=()
for pem in "$workdir"/*.pem; do
  args+=(--from-file="$(basename "$pem")=$pem")
done

kcn create secret generic "$SECRET_NAME" "${args[@]}" \
  --dry-run=client -o yaml | kcn apply -f - >/dev/null

if [[ -n "$kid" ]]; then
  ok "$SECRET_NAME written — kid $kid"
else
  ok "$SECRET_NAME written"
  warn "could not compute the key id here (python3 lacks the 'cryptography' package)."
  warn "token-service logs it at startup, and it is in the JWKS:"
  warn "  kubectl -n $NAMESPACE logs deploy/token-service | grep 'Loaded signing key'"
  warn "  curl -s http://localhost/.well-known/jwks.json | python3 -m json.tool"
fi

cat <<EOF

$(printf '%s' "$C_BOLD")Back this up$(printf '%s' "$C_RESET")
  Lose this key and every token ever issued becomes unverifiable — every user
  is logged out and stays out until they log in again.

      kubectl -n $NAMESPACE get secret $SECRET_NAME -o yaml > token-signing-key.backup.yaml

  That file contains the private key in the clear. Store it where you would
  store a private key, not next to the code.
EOF
