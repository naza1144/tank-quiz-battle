#!/usr/bin/env bash
set -e

echo "=== 1. Test Offline Student Login via Traefik Gateway ==="
LOGIN_RESP=$(curl -k -s -X POST https://tank.192-168-50-96.sslip.io/api/account/offline-login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"65070001","name":"Student Tanker A","facultyId":"fac-eng","departmentId":"dept-cpe","sectionId":"sec-cpe-2026-1"}')
echo "Student Login Response:"
echo "$LOGIN_RESP" | jq .

STUDENT_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token')

echo -e "\n=== 2. Test Offline Teacher Login via Traefik Gateway (User: teacher / PIN: 1990) ==="
TEACHER_RESP=$(curl -k -s -X POST https://tank.192-168-50-96.sslip.io/api/account/teacher-login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher","password":"1990"}')
echo "Teacher Login Response:"
echo "$TEACHER_RESP" | jq .

TEACHER_TOKEN=$(echo "$TEACHER_RESP" | jq -r '.token')

echo -e "\n=== 3. Verify Permission via OPA: Student role checking portal:teacher (Expect: allow = false) ==="
PERM_STUDENT=$(curl -k -s -X POST https://tank.192-168-50-96.sslip.io/api/account/verify-permission \
  -H "Content-Type: application/json" \
  -d '{"role":"STUDENT","permission":"portal:teacher"}')
echo "Student Result: $(echo "$PERM_STUDENT" | jq .)"

echo -e "\n=== 4. Verify Permission via OPA: Teacher role checking portal:teacher (Expect: allow = true) ==="
PERM_TEACHER=$(curl -k -s -X POST https://tank.192-168-50-96.sslip.io/api/account/verify-permission \
  -H "Content-Type: application/json" \
  -d '{"role":"TEACHER","permission":"portal:teacher"}')
echo "Teacher Result: $(echo "$PERM_TEACHER" | jq .)"

echo -e "\n=== 5. Verify Permission via OPA: Student role checking game:play (Expect: allow = true) ==="
PERM_STUDENT_PLAY=$(curl -k -s -X POST https://tank.192-168-50-96.sslip.io/api/account/verify-permission \
  -H "Content-Type: application/json" \
  -d '{"role":"STUDENT","permission":"game:play"}')
echo "Student Game Play: $(echo "$PERM_STUDENT_PLAY" | jq .)"

echo -e "\n=== 6. Verify Permission via OPA: Admin wildcard check (Expect: allow = true) ==="
PERM_ADMIN=$(curl -k -s -X POST https://tank.192-168-50-96.sslip.io/api/account/verify-permission \
  -H "Content-Type: application/json" \
  -d '{"role":"ADMIN","permission":"any:custom:operation"}')
echo "Admin Wildcard Check: $(echo "$PERM_ADMIN" | jq .)"

echo -e "\n=== 7. Check Game Client Root Page (Expect: HTTP 200) ==="
curl -k -s -I https://tank.192-168-50-96.sslip.io/ | grep -E "HTTP/|server|content-type"

echo -e "\n=== 8. Check Quiz Portal Root Page (Expect: HTTP 200) ==="
curl -k -s -I https://tank.192-168-50-96.sslip.io/quiz-portal/ | grep -E "HTTP/|server|content-type"

echo -e "\n=== 9. Cluster Pod Status Across All Relevant Namespaces ==="
echo Dssi_server | sudo -S k3s kubectl get pods -n game
echo Dssi_server | sudo -S k3s kubectl get pods -n identity
echo Dssi_server | sudo -S k3s kubectl get pods -n quiz
