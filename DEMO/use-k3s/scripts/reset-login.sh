#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Sign everyone out — back to a clean login screen
# ─────────────────────────────────────────────────
#  Logging in leaves state in three places, and clearing only one of them is why
#  "I logged out but it goes straight back in" happens:
#
#    1. Keycloak  — an SSO session, so the next visit skips the account chooser
#                   and signs straight back in as whoever was there before.
#    2. Redis     — the refresh tokens this platform issued, which stay valid
#                   until revoked no matter what the browser does.
#    3. Browser   — the console's sessionStorage plus Keycloak's own cookies.
#                   Only you can clear these; the last section says how.
#
#  Nothing here touches accounts, the realm, or the signing key. Everyone can
#  log straight back in — they just have to actually log in.
#
#  Usage:  scripts/reset-login.sh
# ─────────────────────────────────────────────────
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require_cmd curl
require_cmd python3
require_cluster
load_env
require_env KEYCLOAK_ADMIN_PASSWORD

KC="${KC_URL:-http://localhost:8080}"
REALM="${REALM:-sudhood}"

# ── 1. Keycloak sessions ─────────────────────────
step "ending every Keycloak session in realm $REALM"
if curl -fsS "${KC}/realms/${REALM}/.well-known/openid-configuration" >/dev/null 2>&1; then
  TOKEN=$(curl -fsS -X POST "${KC}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "client_id=admin-cli" \
    --data-urlencode "username=${KEYCLOAK_ADMIN:-admin}" \
    --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" \
    --data-urlencode "grant_type=password" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])') \
    || die "admin login failed"

  before=$(curl -fsS "${KC}/admin/realms/${REALM}/client-session-stats" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c 'import sys,json; print(sum(int(c.get("active",0)) for c in json.load(sys.stdin)))' 2>/dev/null || echo "?")

  curl -fsS -X POST "${KC}/admin/realms/${REALM}/logout-all" \
    -H "Authorization: Bearer $TOKEN" >/dev/null \
    || die "logout-all was rejected"

  ok "Keycloak sessions cleared (was: $before active)"
else
  warn "Keycloak is not reachable at $KC — skipping. Is the stack running?"
fi

# ── 2. Redis: login state and refresh tokens ─────
step "revoking refresh tokens and in-flight logins"
# Prefixes come from token-service/store.py:
#   login:   an in-flight login's state/nonce
#   rt:      a live refresh token, stored under a hash of its value
#   rtused:  tokens already exchanged, kept to detect reuse
#   rtfam:   the family a token belongs to, so theft revokes the whole chain
#
# SCAN rather than KEYS: KEYS blocks the server for the length of the scan,
# which is fine on a demo database and a habit worth not forming.
deleted=$(kcn exec deploy/redis -- sh -c '
  total=0
  for prefix in "login:*" "rt:*" "rtused:*" "rtfam:*"; do
    cursor=0
    while :; do
      out=$(redis-cli -a "$REDIS_PASSWORD" --no-auth-warning SCAN "$cursor" MATCH "$prefix" COUNT 500)
      cursor=$(echo "$out" | head -1)
      keys=$(echo "$out" | tail -n +2)
      if [ -n "$keys" ]; then
        n=$(echo "$keys" | wc -l)
        echo "$keys" | xargs -r redis-cli -a "$REDIS_PASSWORD" --no-auth-warning DEL >/dev/null
        total=$((total + n))
      fi
      [ "$cursor" = "0" ] && break
    done
  done
  echo "$total"' 2>/dev/null | tail -1)

ok "Redis: ${deleted:-0} key(s) removed"

# ── 3. Browser ───────────────────────────────────
cat <<EOF

$(printf '%s' "$C_BOLD")ที่เหลือต้องล้างในเบราว์เซอร์เอง$(printf '%s' "$C_RESET")

  ทางที่เร็วที่สุด — เปิดหน้าต่าง Incognito แล้วเข้า http://localhost/console/
  ไม่มี cookie ไม่มี sessionStorage ติดมา จบในขั้นตอนเดียว

  ถ้าจะใช้หน้าต่างเดิม ต้องล้างสองโดเมน เพราะ session อยู่คนละที่:

    localhost        console token (sessionStorage) + refresh cookie
    localhost:8080   Keycloak SSO cookie — ตัวที่ทำให้ login ซ้ำโดยไม่ถามอะไร

  Chrome: กด F12 → Application → Storage → Clear site data (ทำทั้งสองโดเมน)

  หรือรันใน console ของหน้า /console/ :

    sessionStorage.clear(); location.href='/console/'

$(printf '%s' "$C_BOLD")ไม่ได้ลบ$(printf '%s' "$C_RESET")  บัญชีผู้ใช้ · realm · signing key — login ใหม่ได้ทันที
EOF
