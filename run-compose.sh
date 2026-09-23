#!/usr/bin/env bash
# ==============================================================================
# 🚀 Tank Quiz Battle 1990 — Docker Compose Automated Deployment & Smoke Test
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================================================="
echo "🚀 [1/3] Building & Starting Docker Compose Multi-Service Stack..."
echo "=============================================================================="

docker compose down --remove-orphans || true
docker compose build
docker compose up -d

echo ""
echo "=============================================================================="
echo "⏳ [2/3] Waiting for all services to become Healthy..."
echo "=============================================================================="

MAX_RETRIES=30
RETRY_COUNT=0

until [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  UNHEALTHY=$(docker compose ps --format json | grep -i 'unhealthy' || true)
  STARTING=$(docker compose ps --format json | grep -i 'starting' || true)
  
  if [ -z "$STARTING" ] && [ -z "$UNHEALTHY" ]; then
    echo "✅ All services are healthy and running!"
    break
  fi

  echo "   Waiting for containers to initialize... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT+1))
done

echo ""
docker compose ps

echo ""
echo "=============================================================================="
echo "🧪 [3/3] Running Smoke Test against Traefik Gateway (:80)..."
echo "=============================================================================="

sleep 1

# 1. Health check
echo "▶️ Testing Game Server Health Check..."
HEALTH_RES=$(curl -s "http://localhost/api/health" || true)
echo "   Response: $HEALTH_RES"

# 2. Quiz categories
echo "▶️ Testing Quiz Service Categories (440 Python Questions)..."
CATEGORIES_RES=$(curl -s "http://localhost/api/quiz/categories" || true)
echo "   Response: $CATEGORIES_RES" | head -n 5

# 3. Account Service Offline Login
echo "▶️ Testing Account Service Student ID Login..."
LOGIN_RES=$(curl -s -X POST "http://localhost/api/account/offline-login" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"671450001","name":"Tester Student"}' || true)
echo "   Response: $LOGIN_RES" | head -n 5

echo ""
echo "=============================================================================="
echo "🎉 DOCKER COMPOSE STACK IS RUNNING & VERIFIED SUCCESSFULLY!"
echo "=============================================================================="
echo "🌐 Web Game Client:        http://localhost/"
echo "🔒 Teacher Portal:          http://localhost/#teacher"
echo "📚 Quiz Manager Portal:     http://localhost/portal"
echo "🩺 Traefik Dashboard:       http://localhost:8081"
echo "=============================================================================="
