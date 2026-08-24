#!/bin/bash
# ─────────────────────────────────────────────────
# Keycloak Auto Setup Script
# ─────────────────────────────────────────────────
# ใช้: bash setup-keycloak.sh
# 
# สิ่งที่ script นี้ทำ:
#   1. สร้าง Roles: admin, officer, teacher, student
#   2. สร้าง Groups: faculty-science, faculty-engineering, faculty-education,
#                    staff-administration, staff-teaching
#   3. สร้าง Client: sudhood-client
#   4. สร้าง Client Scopes: roles, email, profile, web-origins
#   5. สร้าง Protocol Mappers สำหรับ JWT claims
#   6. สร้าง Default Role (composite: student)
#   7. ตั้งค่า Google Identity Provider
# ─────────────────────────────────────────────────

set -e

# ── Config ────────────────────────────────────────
KEYCLOAK_URL="http://localhost:8080"
REALM="sudhood"
ADMIN_USER="admin"
ADMIN_PASS="admin_secret"

# Google OAuth (แก้ไขตรงนี้เมื่อมี credentials)
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

# ── Helper Functions ──────────────────────────────
echo_color() {
  echo -e "\033[1;34m[KEYCLOAK]\033[0m $1"
}

get_token() {
  curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=admin-cli" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASS" \
    -d "grant_type=password" | jq -r '.access_token'
}

check_realm() {
  local token=$1
  local status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$KEYCLOAK_URL/admin/realms/$REALM" \
    -H "Authorization: Bearer $token")
  echo "$status"
}

# ── Main Script ───────────────────────────────────
echo_color "=== Keycloak Auto Setup ==="
echo_color "URL: $KEYCLOAK_URL"
echo_color "Realm: $REALM"
echo ""

# 1. ตรวจสอบว่า Keycloak พร้อมหรือยัง
echo_color "[1/8] ตรวจสอบ Keycloak..."
for i in {1..30}; do
  if curl -s -o /dev/null "$KEYCLOAK_URL"; then
    echo_color "  ✅ Keycloak พร้อมใช้งาน"
    break
  fi
  if [ $i -eq 30 ]; then
    echo_color "  ❌ Keycloak ไม่ตอบสนองหลังจากรอ 30 วินาที"
    exit 1
  fi
  sleep 1
done

# 2. ขอ Admin Token
echo_color "[2/8] ขอ Admin Token..."
TOKEN=$(get_token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo_color "  ❌ ไม่สามารถขอ Token ได้ (ตรวจสอบ username/password)"
  exit 1
fi
echo_color "  ✅ ได้ Token แล้ว"

# 3. ตรวจสอบ Realm
echo_color "[3/8] ตรวจสอบ Realm '$REALM'..."
REALM_STATUS=$(check_realm "$TOKEN")
if [ "$REALM_STATUS" = "200" ]; then
  echo_color "  ✅ Realm '$REALM' มีอยู่แล้ว"
else
  echo_color "  ❌ ไม่พบ Realm '$REALM'"
  echo_color "  กรุณาสร้าง Realm '$REALM' ก่อน (ผ่าน UI หรือ import realm-export.json)"
  echo ""
  echo_color "  วิธีสร้าง Realm ผ่าน UI:"
  echo_color "    1. เปิด http://localhost:8080"
  echo_color "    2. Login ด้วย admin / admin_secret"
  echo_color "    3. กด Create Realm → ตั้งชื่อ 'sudhood'"
  echo_color "    4. หรือ import ไฟล์ keycloak/realm-export.json"
  exit 1
fi

# ── 4. สร้าง Roles ────────────────────────────────
echo_color "[4/8] สร้าง Roles..."

ROLES=(
  "admin:System Administrator — full access"
  "officer:Registrar / Faculty Officer — manage student records"
  "teacher:Teacher / Lecturer — manage courses and curriculum"
  "student:Student — access own data and courses"
)

for role_entry in "${ROLES[@]}"; do
  ROLE_NAME="${role_entry%%:*}"
  ROLE_DESC="${role_entry##*:}"
  
  # ตรวจสอบว่ามี role อยู่แล้วหรือไม่
  EXISTING=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles/$ROLE_NAME" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.name // empty')
  
  if [ -n "$EXISTING" ]; then
    echo_color "  ⏭️  Role '$ROLE_NAME' มีอยู่แล้ว"
  else
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$ROLE_NAME\", \"description\": \"$ROLE_DESC\"}" > /dev/null
    echo_color "  ✅ สร้าง Role '$ROLE_NAME'"
  fi
done

# ── 5. สร้าง Default Role (composite) ─────────────
echo_color "[5/8] สร้าง Default Role (composite: student)..."

DEFAULT_ROLE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="default-roles-sudhood") | .id // empty')

STUDENT_ROLE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles/student" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id // empty')

if [ -z "$DEFAULT_ROLE_ID" ]; then
  # สร้าง default role
  DEFAULT_ROLE_RESULT=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"default-roles-sudhood\", \"description\": \"Default role for new users\", \"composite\": true}")
  
  DEFAULT_ROLE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="default-roles-sudhood") | .id')
  
  echo_color "  ✅ สร้าง Default Role"
else
  echo_color "  ⏭️  Default Role มีอยู่แล้ว"
fi

# ทำให้ default role เป็น composite และมี student เป็น composite role
if [ -n "$DEFAULT_ROLE_ID" ] && [ -n "$STUDENT_ROLE_ID" ]; then
  # อัปเดตให้เป็น composite
  curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/roles/by-id/$DEFAULT_ROLE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"$DEFAULT_ROLE_ID\", \"name\": \"default-roles-sudhood\", \"composite\": true}" > /dev/null
  
  # เพิ่ม student role เป็น composite
  curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/roles/by-id/$DEFAULT_ROLE_ID/composites" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "[{\"id\": \"$STUDENT_ROLE_ID\", \"name\": \"student\"}]" > /dev/null
  
  echo_color "  ✅ ตั้งค่า Default Role → composite: student"
fi

# ── 6. สร้าง Groups ───────────────────────────────
echo_color "[6/8] สร้าง Groups..."

declare -A GROUPS
GROUPS["faculty-science"]="student"
GROUPS["faculty-engineering"]="student"
GROUPS["faculty-education"]="student"
GROUPS["staff-administration"]="officer,admin"
GROUPS["staff-teaching"]="teacher"

for group_name in "${!GROUPS[@]}"; do
  group_roles="${GROUPS[$group_name]}"
  
  # ตรวจสอบว่ามี group อยู่แล้วหรือไม่
  EXISTING_GROUP=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/groups" \
    -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.name==\"$group_name\") | .id // empty")
  
  if [ -n "$EXISTING_GROUP" ]; then
    echo_color "  ⏭️  Group '$group_name' มีอยู่แล้ว"
  else
    # สร้าง group
    GROUP_RESULT=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/groups" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$group_name\"}")
    
    GROUP_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/groups" \
      -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.name==\"$group_name\") | .id")
    
    # Assign roles ให้ group
    IFS=',' read -ra ROLE_ARRAY <<< "$group_roles"
    for role_name in "${ROLE_ARRAY[@]}"; do
      role_name=$(echo "$role_name" | xargs)  # trim whitespace
      ROLE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles/$role_name" \
        -H "Authorization: Bearer $TOKEN" | jq -r '.id // empty')
      
      if [ -n "$ROLE_ID" ] && [ -n "$GROUP_ID" ]; then
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/groups/$GROUP_ID/role-mappings/realm" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "[{\"id\": \"$ROLE_ID\", \"name\": \"$role_name\"}]" > /dev/null
      fi
    done
    
    echo_color "  ✅ สร้าง Group '$group_name' → roles: $group_roles"
  fi
done

# ── 7. สร้าง Client (sudhood-client) ──────────────
echo_color "[7/8] สร้าง Client 'sudhood-client'..."

EXISTING_CLIENT=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.clientId=="sudhood-client") | .id // empty')

if [ -n "$EXISTING_CLIENT" ]; then
  echo_color "  ⏭️  Client 'sudhood-client' มีอยู่แล้ว"
  CLIENT_ID="$EXISTING_CLIENT"
else
  CLIENT_RESULT=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "clientId": "sudhood-client",
      "name": "Sudhood API Client",
      "description": "Client for all sudhood microservices",
      "enabled": true,
      "clientAuthenticatorType": "client-secret",
      "secret": "sudhood-client-secret",
      "redirectUris": [
        "http://localhost:3000/*",
        "http://localhost:5173/*",
        "http://localhost:8080/*",
        "http://localhost/*"
      ],
      "webOrigins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost"
      ],
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "publicClient": false,
      "protocol": "openid-connect",
      "attributes": {
        "access.token.lifespan": "3600",
        "refresh.token.lifespan": "86400",
        "client.session.max.lifespan": "86400",
        "post.logout.redirect.uris": "http://localhost:3000/*",
        "use.refresh.tokens": "true"
      }
    }')
  
  CLIENT_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.clientId=="sudhood-client") | .id')
  
  echo_color "  ✅ สร้าง Client 'sudhood-client' (secret: sudhood-client-secret)"
fi

# ── 8. สร้าง Client Scopes + Protocol Mappers ─────
echo_color "[8/8] สร้าง Client Scopes และ Protocol Mappers..."

declare -A SCOPES
SCOPES["roles"]="OpenID Connect scope for role claims"
SCOPES["email"]="OpenID Connect built-in scope: email"
SCOPES["profile"]="OpenID Connect built-in scope: profile"
SCOPES["web-origins"]="OpenID Connect scope for add web origins to access token"

for scope_name in "${!SCOPES[@]}"; do
  scope_desc="${SCOPES[$scope_name]}"
  
  # ตรวจสอบว่ามี scope อยู่แล้วหรือไม่
  EXISTING_SCOPE=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
    -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.name==\"$scope_name\") | .id // empty")
  
  if [ -n "$EXISTING_SCOPE" ]; then
    echo_color "  ⏭️  Client Scope '$scope_name' มีอยู่แล้ว"
  else
    # สร้าง scope
    SCOPE_RESULT=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"$scope_name\",
        \"description\": \"$scope_desc\",
        \"protocol\": \"openid-connect\",
        \"attributes\": {
          \"include.in.token.scope\": \"true\",
          \"consent.screen.text\": \"\"
        }
      }")
    
    SCOPE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
      -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.name==\"$scope_name\") | .id")
    
    echo_color "  ✅ สร้าง Client Scope '$scope_name'"
  fi
done

# ── สร้าง Protocol Mappers สำหรับ roles scope ─────
echo_color "  └─ สร้าง Protocol Mappers..."

# หา scope ID ของ roles
ROLES_SCOPE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="roles") | .id // empty')

if [ -n "$ROLES_SCOPE_ID" ]; then
  # realm role mapper
  EXISTING_MAPPER=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$ROLES_SCOPE_ID/protocol-mappers/models" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="realm roles") | .id // empty')
  
  if [ -z "$EXISTING_MAPPER" ]; then
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$ROLES_SCOPE_ID/protocol-mappers/models" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "realm roles",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-realm-role-mapper",
        "config": {
          "multivalued": "true",
          "user.attribute": "foo",
          "access.token.claim": "true",
          "claim.name": "realm_roles",
          "jsonType.label": "String",
          "id.token.claim": "true"
        }
      }' > /dev/null
    echo_color "    ✅ สร้าง Mapper 'realm roles' → claim: realm_roles"
  fi
  
  # client role mapper
  EXISTING_MAPPER=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$ROLES_SCOPE_ID/protocol-mappers/models" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="client roles") | .id // empty')
  
  if [ -z "$EXISTING_MAPPER" ]; then
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$ROLES_SCOPE_ID/protocol-mappers/models" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "client roles",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-client-role-mapper",
        "config": {
          "multivalued": "true",
          "user.attribute": "foo",
          "access.token.claim": "true",
          "claim.name": "client_roles",
          "jsonType.label": "String",
          "id.token.claim": "true"
        }
      }' > /dev/null
    echo_color "    ✅ สร้าง Mapper 'client roles' → claim: client_roles"
  fi
  
  # audience mapper
  EXISTING_MAPPER=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$ROLES_SCOPE_ID/protocol-mappers/models" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="audience") | .id // empty')
  
  if [ -z "$EXISTING_MAPPER" ]; then
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$ROLES_SCOPE_ID/protocol-mappers/models" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "audience",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-audience-mapper",
        "config": {
          "included.client.audience": "sudhood-client",
          "access.token.claim": "true",
          "id.token.claim": "true"
        }
      }' > /dev/null
    echo_color "    ✅ สร้าง Mapper 'audience' → audience: sudhood-client"
  fi
fi

# ── สร้าง Protocol Mappers สำหรับ profile scope ───
PROFILE_SCOPE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="profile") | .id // empty')

if [ -n "$PROFILE_SCOPE_ID" ]; then
  # group mapper
  EXISTING_MAPPER=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$PROFILE_SCOPE_ID/protocol-mappers/models" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.name=="groups") | .id // empty')
  
  if [ -z "$EXISTING_MAPPER" ]; then
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$PROFILE_SCOPE_ID/protocol-mappers/models" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "groups",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-realm-role-mapper",
        "config": {
          "multivalued": "true",
          "user.attribute": "foo",
          "access.token.claim": "true",
          "claim.name": "groups",
          "jsonType.label": "String",
          "id.token.claim": "true"
        }
      }' > /dev/null
    echo_color "    ✅ สร้าง Mapper 'groups' → claim: groups"
  fi
fi

# ── ตั้งค่า Default Client Scopes ให้ sudhood-client ──
echo_color "  └─ ตั้งค่า Default Client Scopes ให้ sudhood-client..."

if [ -n "$CLIENT_ID" ]; then
  for scope_name in "roles" "email" "profile" "web-origins"; do
    SCOPE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
      -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.name==\"$scope_name\") | .id // empty")
    
    if [ -n "$SCOPE_ID" ]; then
      # ตรวจสอบว่า scope ถูก assign แล้วหรือยัง
      EXISTING_SCOPE=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_ID/default-client-scopes" \
        -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.id==\"$SCOPE_ID\") | .id // empty")
      
      if [ -z "$EXISTING_SCOPE" ]; then
        curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_ID/default-client-scopes/$SCOPE_ID" \
          -H "Authorization: Bearer $TOKEN" > /dev/null
        echo_color "    ✅ แนบ Scope '$scope_name'"
      fi
    fi
  done
fi

# ── ตั้งค่า Google Identity Provider ───────────────
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  echo_color "  └─ ตั้งค่า Google Identity Provider..."
  
  EXISTING_IDP=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances/google" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.alias // empty')
  
  if [ "$EXISTING_IDP" = "google" ]; then
    echo_color "    ⏭️  Google Identity Provider มีอยู่แล้ว"
  else
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"alias\": \"google\",
        \"displayName\": \"Google\",
        \"providerId\": \"google\",
        \"enabled\": true,
        \"storeToken\": true,
        \"trustEmail\": true,
        \"syncMode\": \"FORCE\",
        \"firstBrokerLoginFlowAlias\": \"First Broker Login\",
        \"config\": {
          \"clientId\": \"$GOOGLE_CLIENT_ID\",
          \"clientSecret\": \"$GOOGLE_CLIENT_SECRET\",
          \"useJwksUrl\": \"true\"
        }
      }" > /dev/null
    echo_color "    ✅ ตั้งค่า Google Identity Provider"
  fi
else
  echo_color "  ⏭️  ข้ามการตั้งค่า Google (ไม่ได้ตั้ง GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)"
  echo_color "      ตั้งค่าได้โดย:"
  echo_color "        export GOOGLE_CLIENT_ID='xxxxx.apps.googleusercontent.com'"
  echo_color "        export GOOGLE_CLIENT_SECRET='GOCSPX-xxxxx'"
  echo_color "        bash setup-keycloak.sh"
fi

# ── สร้าง Test Users ──────────────────────────────
echo_color ""
echo_color "=== สร้าง Test Users ==="

declare -A TEST_USERS
TEST_USERS["test-admin"]="admin:admin123:staff-administration"
TEST_USERS["test-officer"]="officer:officer123:staff-administration"
TEST_USERS["test-teacher"]="teacher:teacher123:staff-teaching"
TEST_USERS["test-student"]="student:student123:faculty-engineering"

for username in "${!TEST_USERS[@]}"; do
  IFS=':' read -r role password group <<< "${TEST_USERS[$username]}"
  
  # ตรวจสอบว่ามี user อยู่แล้วหรือไม่
  EXISTING_USER=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.username==\"$username\") | .id // empty")
  
  if [ -n "$EXISTING_USER" ]; then
    echo_color "  ⏭️  User '$username' มีอยู่แล้ว"
  else
    # สร้าง user
    USER_RESULT=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"username\": \"$username\",
        \"email\": \"$username@example.com\",
        \"firstName\": \"Test\",
        \"lastName\": \"${role^}\",
        \"emailVerified\": true,
        \"enabled\": true
      }")
    
    USER_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/users" \
      -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.username==\"$username\") | .id")
    
    if [ -n "$USER_ID" ]; then
      # ตั้งรหัสผ่าน
      curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
          \"type\": \"password\",
          \"value\": \"$password\",
          \"temporary\": false
        }" > /dev/null
      
      # Assign role
      ROLE_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles/$role" \
        -H "Authorization: Bearer $TOKEN" | jq -r '.id // empty')
      
      if [ -n "$ROLE_ID" ]; then
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/role-mappings/realm" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "[{\"id\": \"$ROLE_ID\", \"name\": \"$role\"}]" > /dev/null
      fi
      
      # Join group
      GROUP_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/groups" \
        -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.name==\"$group\") | .id // empty")
      
      if [ -n "$GROUP_ID" ]; then
        curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/groups/$GROUP_ID" \
          -H "Authorization: Bearer $TOKEN" > /dev/null
      fi
      
      echo_color "  ✅ สร้าง User '$username' (role: $role, pass: $password, group: $group)"
    fi
  fi
done

# ── สรุป ──────────────────────────────────────────
echo ""
echo_color "=========================================="
echo_color "  ✅ Setup เสร็จสมบูรณ์!"
echo_color "=========================================="
echo_color ""
echo_color "  🔑 Admin Console: http://localhost:8080"
echo_color "     Username: admin"
echo_color "     Password: admin_secret"
echo_color ""
echo_color "  👤 Test Users:"
echo_color "     test-admin   | admin123   | role: admin"
echo_color "     test-officer | officer123 | role: officer"
echo_color "     test-teacher | teacher123 | role: teacher"
echo_color "     test-student | student123 | role: student"
echo_color ""
echo_color "  📱 Client: sudhood-client / sudhood-client-secret"
echo_color ""
echo_color "  🔗 Google OAuth: $( [ -n "$GOOGLE_CLIENT_ID" ] && echo '✅ ตั้งค่าแล้ว' || echo '⏭️ ยังไม่ได้ตั้งค่า' )"
echo_color ""
echo_color "  🧪 ทดสอบขอ JWT:"
echo_color "     curl -s -X POST http://localhost:8080/realms/sudhood/protocol/openid-connect/token \\"
echo_color "       -H \"Content-Type: application/x-www-form-urlencoded\" \\"
echo_color "       -d \"client_id=sudhood-client\" \\"
echo_color "       -d \"client_secret=sudhood-client-secret\" \\"
echo_color "       -d \"username=test-admin\" \\"
echo_color "       -d \"password=admin123\" \\"
echo_color "       -d \"grant_type=password\" | jq ."
echo_color ""
echo_color "=========================================="