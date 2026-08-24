#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Update Google OAuth Credentials in Keycloak & .env
# Usage: ./scripts/update-google-oauth.sh [CLIENT_ID] [CLIENT_SECRET]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

CLIENT_ID="${1:-}"
CLIENT_SECRET="${2:-}"

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "🔑 กรุณากรอก Google OAuth Client ID และ Client Secret:"
  read -rp "  Google Client ID: " CLIENT_ID
  read -rp "  Google Client Secret: " CLIENT_SECRET
fi

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "❌ ข้อผิดพลาด: ข้อมูล Client ID หรือ Secret ไม่ครบถ้วน"
  exit 1
fi

echo "📝 1. กำลังอัปเดตไฟล์ .env..."
if [[ -f .env ]]; then
  sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${CLIENT_ID}|" .env
  sed -i "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}|" .env
fi

echo "🔐 2. กำลังอัปเดต Identity Provider ใน Keycloak Container..."
docker exec tank-keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master --user admin --password admin >/dev/null 2>&1

docker exec tank-keycloak /opt/keycloak/bin/kcadm.sh update "identity-provider/instances/google" -r sudhood \
  -s "config.clientId=${CLIENT_ID}" \
  -s "config.clientSecret=${CLIENT_SECRET}" \
  -s "enabled=true"

echo ""
echo "🎉 อัปเดต Google OAuth Credentials ใน Keycloak สำเร็จเรียบร้อยแล้ว!"
echo "✨ สามารถกดปุ่ม 'เข้าสู่ระบบด้วย Google Account' บนหน้าเว็บ http://localhost:3000 ได้ทันที"
echo "🔒 ระบบจะอนุญาตเฉพาะอีเมล @ubu.ac.th เท่านั้น"
