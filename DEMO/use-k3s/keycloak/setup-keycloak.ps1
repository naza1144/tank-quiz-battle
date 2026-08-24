# Keycloak Auto Setup Script (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File setup-keycloak.ps1

$KEYCLOAK_URL = "http://localhost:8080"
$REALM = "sudhood"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin_secret"
$GOOGLE_CLIENT_ID = $env:GOOGLE_CLIENT_ID
$GOOGLE_CLIENT_SECRET = $env:GOOGLE_CLIENT_SECRET

function Write-Color($text) { Write-Host "[KEYCLOAK] $text" -ForegroundColor Cyan }

function Get-AdminToken {
    $body = @{client_id="admin-cli"; username=$ADMIN_USER; password=$ADMIN_PASS; grant_type="password"}
    $r = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body -ErrorAction SilentlyContinue
    return $r.access_token
}

function Invoke-KCApi {
    param($method, $uri, $body)
    $headers = @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"}
    if ($body) { return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -Body $body }
    else { return Invoke-RestMethod -Uri $uri -Method $method -Headers $headers }
}

function Get-RoleId($roleName) {
    try { $roles = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles?search=$roleName"; $r = $roles | Where-Object { $_.name -eq $roleName }; return $r.id } catch { return $null }
}

# ===========================
# 1. Wait for Keycloak
# ===========================
Write-Color "[1/8] Checking Keycloak..."
for ($i = 1; $i -le 30; $i++) {
    try { $null = Invoke-WebRequest -Uri $KEYCLOAK_URL -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Write-Color "  [OK] Keycloak is ready"; break } catch { if ($i -eq 30) { Write-Color "  [FAIL] Keycloak did not respond"; exit 1 } Start-Sleep -Seconds 1 }
}

# ===========================
# 2. Get Admin Token
# ===========================
Write-Color "[2/8] Getting admin token..."
try { $TOKEN = Get-AdminToken; if ([string]::IsNullOrEmpty($TOKEN)) { Write-Color "  [FAIL] Could not get token"; exit 1 }; Write-Color "  [OK] Token obtained" } catch { Write-Color "  [FAIL] $_"; exit 1 }

# ===========================
# 3. Check Realm
# ===========================
Write-Color "[3/8] Checking realm '$REALM'..."
try { $null = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM"; Write-Color "  [OK] Realm '$REALM' exists" } catch { Write-Color "  [FAIL] Realm not found. Create it first."; exit 1 }

# ===========================
# 4. Create Roles
# ===========================
Write-Color "[4/8] Creating roles..."
$ROLES = @(
    @{name="admin"; description="System Administrator"},
    @{name="officer"; description="Faculty Officer"},
    @{name="teacher"; description="Teacher / Lecturer"},
    @{name="student"; description="Student"}
)
$allRoles = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles"
foreach ($role in $ROLES) {
    $found = $allRoles | Where-Object { $_.name -eq $role.name }
    if ($found) { Write-Color "  [SKIP] Role '$($role.name)' exists" }
    else { Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles" -body ($role | ConvertTo-Json); Write-Color "  [OK] Created role '$($role.name)'" }
}

# ===========================
# 5. Default Role (composite: student)
# ===========================
Write-Color "[5/8] Setting up default role..."
$allRoles = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles"
$realmInfo = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM"
$defaultRoleName = $realmInfo.defaultRole.name
$defaultRole = $allRoles | Where-Object { $_.name -eq $defaultRoleName }
$studentRole = $allRoles | Where-Object { $_.name -eq "student" }

if ($defaultRole -and $studentRole) {
    try { Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/by-id/$($defaultRole.id)/composites" -body (@(@{id=$studentRole.id; name="student"}) | ConvertTo-Json); Write-Color "  [OK] Added student as composite" } catch { Write-Color "  [WARN] Could not add composite (may already exist)" }
} else { Write-Color "  [WARN] Default role or student role not found" }

# ===========================
# 6. Create Groups
# ===========================
Write-Color "[6/8] Creating groups..."
$GROUPS = @(
    @{name="faculty-science"; roles=@("student")},
    @{name="faculty-engineering"; roles=@("student")},
    @{name="faculty-education"; roles=@("student")},
    @{name="staff-administration"; roles=@("officer", "admin")},
    @{name="staff-teaching"; roles=@("teacher")}
)
$allRoles = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles"
$allGroups = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/groups"

foreach ($g in $GROUPS) {
    $found = $allGroups | Where-Object { $_.name -eq $g.name }
    if ($found) { Write-Color "  [SKIP] Group '$($g.name)' exists"; continue }
    Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/groups" -body (@{name=$g.name} | ConvertTo-Json)
    $allGroups = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/groups"
    $newGroup = $allGroups | Where-Object { $_.name -eq $g.name }
    foreach ($rn in $g.roles) {
        $ro = $allRoles | Where-Object { $_.name -eq $rn }
        if ($ro) { Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/groups/$($newGroup.id)/role-mappings/realm" -body (@(@{id=$ro.id; name=$rn}) | ConvertTo-Json) }
    }
    Write-Color "  [OK] Created group '$($g.name)'"
}

# ===========================
# 7. Create Client
# ===========================
Write-Color "[7/8] Creating client 'sudhood-client'..."
$CLIENT_ID = $null
$allClients = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/clients"
$existing = $allClients | Where-Object { $_.clientId -eq "sudhood-client" }
if ($existing) { Write-Color "  [SKIP] Client exists"; $CLIENT_ID = $existing.id }
else {
    $body = @{
        clientId="sudhood-client"; name="Sudhood API Client"; enabled=$true
        clientAuthenticatorType="client-secret"; secret="sudhood-client-secret"
        redirectUris=@("http://localhost:3000/*","http://localhost:5173/*","http://localhost:8080/*","http://localhost/*")
        webOrigins=@("http://localhost:3000","http://localhost:5173","http://localhost:8080","http://localhost")
        standardFlowEnabled=$true; directAccessGrantsEnabled=$true; publicClient=$false; protocol="openid-connect"
        attributes=@{ "access.token.lifespan"="3600"; "refresh.token.lifespan"="86400"; "post.logout.redirect.uris"="http://localhost:3000/*"; "use.refresh.tokens"="true" }
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/clients" -body $body
        $allClients = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/clients"
        $nc = $allClients | Where-Object { $_.clientId -eq "sudhood-client" }; $CLIENT_ID = $nc.id
        Write-Color "  [OK] Created client 'sudhood-client'"
    } catch { Write-Color "  [FAIL] Could not create client: $_" }
}

# ===========================
# 8. Client Scopes + Mappers
# ===========================
Write-Color "[8/8] Setting up client scopes and mappers..."
$allScopes = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes"

# Create scopes if missing
$scopeDefs = @("roles","email","profile","web-origins")
foreach ($sn in $scopeDefs) {
    $found = $allScopes | Where-Object { $_.name -eq $sn }
    if (-not $found) {
        Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" -body (@{name=$sn; description=$sn; protocol="openid-connect"; attributes=@{ "include.in.token.scope"="true"; "consent.screen.text"="" }} | ConvertTo-Json -Depth 5)
        $allScopes = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes"
    }
}

# Protocol Mappers
$rolesScopeId = ($allScopes | Where-Object { $_.name -eq "roles" }).id
$profileScopeId = ($allScopes | Where-Object { $_.name -eq "profile" }).id

if ($rolesScopeId) {
    $mappers = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$rolesScopeId/protocol-mappers/models"
    $mapperDefs = @(
        @{name="realm roles"; mapperType="oidc-usermodel-realm-role-mapper"; cn="realm_roles"}
        @{name="client roles"; mapperType="oidc-usermodel-client-role-mapper"; cn="client_roles"}
    )
    foreach ($md in $mapperDefs) {
        $found = $mappers | Where-Object { $_.name -eq $md.name }
        if (-not $found) {
            $config = @{multivalued="true"; "user.attribute"="foo"; "access.token.claim"="true"; "claim.name"=$md.cn; "jsonType.label"="String"; "id.token.claim"="true"}
            Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$rolesScopeId/protocol-mappers/models" -body (@{name=$md.name; protocol="openid-connect"; protocolMapper=$md.mapperType; config=$config} | ConvertTo-Json -Depth 5)
            Write-Color "    [OK] Mapper '$($md.name)'"
        }
    }
    # audience mapper
    $found = $mappers | Where-Object { $_.name -eq "audience" }
    if (-not $found) {
        $config = @{"included.client.audience"="sudhood-client"; "access.token.claim"="true"; "id.token.claim"="true"}
        Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$rolesScopeId/protocol-mappers/models" -body (@{name="audience"; protocol="openid-connect"; protocolMapper="oidc-audience-mapper"; config=$config} | ConvertTo-Json -Depth 5)
        Write-Color "    [OK] Mapper 'audience'"
    }
}

if ($profileScopeId) {
    $mappers = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$profileScopeId/protocol-mappers/models"
    $found = $mappers | Where-Object { $_.name -eq "groups" }
    if (-not $found) {
        $config = @{multivalued="true"; "user.attribute"="foo"; "access.token.claim"="true"; "claim.name"="groups"; "jsonType.label"="String"; "id.token.claim"="true"}
        Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$profileScopeId/protocol-mappers/models" -body (@{name="groups"; protocol="openid-connect"; protocolMapper="oidc-usermodel-realm-role-mapper"; config=$config} | ConvertTo-Json -Depth 5)
        Write-Color "    [OK] Mapper 'groups'"
    }
}

# Default scopes on client
if ($CLIENT_ID) {
    $defaultScopes = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_ID/default-client-scopes"
    foreach ($sn in @("roles","email","profile","web-origins")) {
        $sid = ($allScopes | Where-Object { $_.name -eq $sn }).id
        if ($sid -and (-not ($defaultScopes | Where-Object { $_.id -eq $sid }))) {
            Invoke-KCApi -method Put -uri "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_ID/default-client-scopes/$sid"
            Write-Color "    [OK] Attached scope '$sn'"
        }
    }
}

# ===========================
# Google Identity Provider
# ===========================
if ($GOOGLE_CLIENT_ID -and $GOOGLE_CLIENT_SECRET) {
    Write-Color "  + Google Identity Provider..."
    try {
        $null = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances/google"
        Write-Color "    [SKIP] Google IDP exists"
    } catch {
        $body = @{
            alias="google"; displayName="Google"; providerId="google"; enabled=$true; storeToken=$true; trustEmail=$true
            firstBrokerLoginFlowAlias="First Broker Login"
            config=@{clientId=$GOOGLE_CLIENT_ID; clientSecret=$GOOGLE_CLIENT_SECRET; useJwksUrl="true"; syncMode="FORCE"}
        } | ConvertTo-Json -Depth 5
        Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/identity-provider/instances" -body $body
        Write-Color "    [OK] Configured Google IDP"
    }
} else { Write-Color "  [SKIP] Google OAuth not configured" }

# ===========================
# Test Users
# ===========================
Write-Color ""; Write-Color "Creating test users..."
$allRoles = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/roles"
$allGroups = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/groups"
$allUsers = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/users"

$TEST_USERS = @(
    @{u="test-admin"; role="admin"; pass="admin123"; grp="staff-administration"}
    @{u="test-officer"; role="officer"; pass="officer123"; grp="staff-administration"}
    @{u="test-teacher"; role="teacher"; pass="teacher123"; grp="staff-teaching"}
    @{u="test-student"; role="student"; pass="student123"; grp="faculty-engineering"}
)
foreach ($tu in $TEST_USERS) {
    $found = $allUsers | Where-Object { $_.username -eq $tu.u }
    if ($found) { Write-Color "  [SKIP] User '$($tu.u)' exists"; continue }
    $body = @{username=$tu.u; email="$($tu.u)@example.com"; firstName="Test"; lastName=($tu.role.Substring(0,1).ToUpper() + $tu.role.Substring(1)); emailVerified=$true; enabled=$true} | ConvertTo-Json
    Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/users" -body $body
    $allUsers = Invoke-KCApi -method Get -uri "$KEYCLOAK_URL/admin/realms/$REALM/users"
    $nu = $allUsers | Where-Object { $_.username -eq $tu.u }
    if ($nu) {
        Invoke-KCApi -method Put -uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$($nu.id)/reset-password" -body (@{type="password"; value=$tu.pass; temporary=$false} | ConvertTo-Json)
        $ro = $allRoles | Where-Object { $_.name -eq $tu.role }
        if ($ro) { Invoke-KCApi -method Post -uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$($nu.id)/role-mappings/realm" -body (@(@{id=$ro.id; name=$tu.role}) | ConvertTo-Json) }
        $go = $allGroups | Where-Object { $_.name -eq $tu.grp }
        if ($go) { Invoke-KCApi -method Put -uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$($nu.id)/groups/$($go.id)" }
        Write-Color "  [OK] Created user '$($tu.u)' (role: $($tu.role))"
    }
}

# ===========================
Write-Host ""
Write-Color "================================"
Write-Color "  Setup Complete!"
Write-Color "================================"
Write-Color "  Admin: admin / admin_secret"
Write-Color "  Users: test-admin, test-officer, test-teacher, test-student (pass = role+123)"
Write-Color "  Client: sudhood-client / sudhood-client-secret"
Write-Color "  Google: $(if ($GOOGLE_CLIENT_ID) { 'configured' } else { 'skipped' })"
Write-Color "================================"