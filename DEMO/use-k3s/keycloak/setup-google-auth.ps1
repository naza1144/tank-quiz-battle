# Google OAuth2 Auto Setup for Keycloak (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File setup-google-auth.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Google OAuth2 Auto Setup for Keycloak" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. เปิด Google Cloud Console ────────────────────
Write-Host "[1/4] Opening Google Cloud Console..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Follow these steps in your browser:"
Write-Host "  -----------------------------------------"
Write-Host "  a) Create a Project (if not already done)"
Write-Host "     -> Name: Sudhood Platform"
Write-Host ""
Write-Host "  b) Open OAuth Consent Screen"
Write-Host "     -> User Type: External (or Internal if Google Workspace)"
Write-Host "     -> App name: Sudhood Platform"
Write-Host "     -> Add scopes: userinfo.email, userinfo.profile"
Write-Host "     -> Add your email as Test user"
Write-Host ""
Write-Host "  c) Create OAuth Client ID"
Write-Host "     -> Application type: Web application"
Write-Host "     -> Name: Sudhood Keycloak"
Write-Host "     -> Authorized redirect URIs:"
Write-Host "        http://localhost:8080/realms/sudhood/broker/google/endpoint"
Write-Host "     -> Authorized JavaScript origins:"
Write-Host "        http://localhost:8080"
Write-Host ""

# เปิด browser อัตโนมัติ
try {
    Start-Process "https://console.cloud.google.com/apis/credentials"
    Write-Host "  [OK] Browser opened to Google Cloud Console" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Could not open browser automatically" -ForegroundColor Yellow
    Write-Host "  Please open: https://console.cloud.google.com/apis/credentials"
}
Write-Host ""

# ── 2. ขอ Client ID และ Secret ──────────────────────
Write-Host "[2/4] Please enter your Google OAuth credentials:" -ForegroundColor Yellow
Write-Host "  (Get these from Google Cloud Console > Credentials > OAuth Client ID)"
Write-Host ""

$GOOGLE_CLIENT_ID = Read-Host "  Client ID"
$GOOGLE_CLIENT_SECRET = Read-Host "  Client Secret"

if ([string]::IsNullOrEmpty($GOOGLE_CLIENT_ID) -or [string]::IsNullOrEmpty($GOOGLE_CLIENT_SECRET)) {
    Write-Host "`n  [FAIL] Client ID and Client Secret are required!" -ForegroundColor Red
    exit 1
}

Write-Host "`n  [OK] Credentials received" -ForegroundColor Green
Write-Host ""

# ── 3. Config Keycloak ──────────────────────────────
Write-Host "[3/4] Configuring Keycloak..." -ForegroundColor Yellow

$KEYCLOAK_URL = "http://localhost:8080"
$REALM = "sudhood"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin_secret"

# ขอ token
try {
    $body = @{client_id="admin-cli"; username=$ADMIN_USER; password=$ADMIN_PASS; grant_type="password"}
    $response = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
        -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body -ErrorAction Stop
    $TOKEN = $response.access_token
    Write-Host "  [OK] Got admin token" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Could not connect to Keycloak at $KEYCLOAK_URL" -ForegroundColor Red
    Write-Host "  Make sure Keycloak is running (docker compose up -d)" -ForegroundColor Red
    exit 1
}

# ตรวจสอบ Realm
try {
    $null = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM" `
        -Headers @{Authorization="Bearer $TOKEN"} -ErrorAction Stop
    Write-Host "  [OK] Realm '$REALM' found" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Realm '$REALM' not found" -ForegroundColor Red
    Write-Host "  Create it first (UI or import realm-export.json)" -ForegroundColor Red
    exit 1
}

# ตรวจสอบว่ามี Google IDP อยู่แล้วหรือไม่
try {
    $existing = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances/google" `
        -Headers @{Authorization="Bearer $TOKEN"} -ErrorAction Stop
    Write-Host "  [SKIP] Google Identity Provider already exists" -ForegroundColor Yellow
    
    # ถามว่าต้องการอัปเดตหรือไม่
    $update = Read-Host "  Update existing Google IDP with new credentials? (y/N)"
    if ($update -eq "y" -or $update -eq "Y") {
        # อัปเดต
        $body = @{
            alias="google"; displayName="Google"; providerId="google"; enabled=$true; storeToken=$true; trustEmail=$true
            firstBrokerLoginFlowAlias="First Broker Login"
            config=@{clientId=$GOOGLE_CLIENT_ID; clientSecret=$GOOGLE_CLIENT_SECRET; useJwksUrl="true"; syncMode="FORCE"}
        } | ConvertTo-Json -Depth 5
        Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances/google" `
            -Method Put -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} -Body $body -ErrorAction Stop
        Write-Host "  [OK] Updated Google IDP" -ForegroundColor Green
    }
} catch {
    # ไม่มี → สร้างใหม่
    Write-Host "  Creating new Google Identity Provider..." -ForegroundColor Yellow
    try {
        # Keycloak 26.x ใช้ firstBrokerLoginFlowAlias = "first broker login" (lowercase)
        # ถ้าไม่ระบุ Keycloak จะใช้ default flow ให้เอง
        $body = @{
            alias="google"; displayName="Google"; providerId="google"; enabled=$true; storeToken=$true; trustEmail=$true
            config=@{clientId=$GOOGLE_CLIENT_ID; clientSecret=$GOOGLE_CLIENT_SECRET; useJwksUrl="true"; syncMode="FORCE"}
        } | ConvertTo-Json -Depth 5
        Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances" `
            -Method Post -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} -Body $body -ErrorAction Stop
        Write-Host "  [OK] Created Google Identity Provider" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $_" -ForegroundColor Red
        exit 1
    }
}

# ── 4. Save to .env ─────────────────────────────────
Write-Host ""
Write-Host "[4/4] Saving credentials to .env..." -ForegroundColor Yellow

$envPath = Join-Path -Path (Get-Location) -ChildPath ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Replace or add GOOGLE_CLIENT_ID
    if ($envContent -match "GOOGLE_CLIENT_ID=") {
        $envContent = $envContent -replace "GOOGLE_CLIENT_ID=.*", "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
    } else {
        $envContent += "`nGOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
    }
    
    # Replace or add GOOGLE_CLIENT_SECRET
    if ($envContent -match "GOOGLE_CLIENT_SECRET=") {
        $envContent = $envContent -replace "GOOGLE_CLIENT_SECRET=.*", "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
    } else {
        $envContent += "`nGOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
    }
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "  [OK] Saved to .env" -ForegroundColor Green
} else {
    Write-Host "  [WARN] .env file not found, skipping" -ForegroundColor Yellow
}

# ── เสร็จ ───────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Google OAuth2 Setup Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Test it: http://localhost:8080/realms/sudhood/account" -ForegroundColor White
Write-Host ""
Write-Host "  What was configured:" -ForegroundColor Cyan
Write-Host "  - Google Identity Provider in Keycloak" -ForegroundColor White
Write-Host "  - Client ID and Secret saved to .env" -ForegroundColor White
Write-Host "  - Login with Gmail at the account page above" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan