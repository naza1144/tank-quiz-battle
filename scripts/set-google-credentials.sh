#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Set New Google OAuth Client ID and Secret for Tank Quiz Battle
# Usage: ./scripts/set-google-credentials.sh [CLIENT_ID] [CLIENT_SECRET]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

CLIENT_ID="${1:-}"
CLIENT_SECRET="${2:-}"

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "🔑 กรุณากรอกข้อมูล Google OAuth credentials ใหม่:"
  read -rp "  Google Client ID: " CLIENT_ID
  read -rp "  Google Client Secret: " CLIENT_SECRET
fi

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "❌ ข้อผิดพลาด: ไม่ได้กรอก Client ID หรือ Secret"
  exit 1
fi

echo "📝 กำลังอัปเดตไฟล์ .env และคอนฟิก..."

# 1. Update root .env
if [[ -f .env ]]; then
  sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${CLIENT_ID}|" .env
  sed -i "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}|" .env
fi

# 2. Update DEMO/use-k3s/.env if present
if [[ -f DEMO/use-k3s/.env ]]; then
  sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${CLIENT_ID}|" DEMO/use-k3s/.env
  sed -i "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}|" DEMO/use-k3s/.env
fi

echo "✅ อัปเดต Google OAuth Credentials ใหม่เรียบร้อยแล้ว!"
echo "📌 Authorized redirect URIs ที่ต้องใส่ใน Google Cloud Console:"
echo "   - http://localhost:8080/realms/sudhood/broker/google/endpoint"
echo "   - https://localhost/realms/sudhood/broker/google/endpoint"
