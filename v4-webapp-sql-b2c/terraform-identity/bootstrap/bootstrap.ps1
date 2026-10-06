param (
    [Parameter(Mandatory)][string]$tenantId,
    [string]$appName    = "slab2c-dv-tfid-appr-ukw-001",
    [int]$secretDays    = 90,
    # Grant/refresh permissions only. Skips the credential reset so re-running the
    # script for new Graph roles (e.g. the MFA plan) does not mint an extra secret.
    [switch]$SkipSecret
)

$ErrorActionPreference = 'Stop'
write-host "***** Bootstrap Terraform identity in external tenant $tenantId *****"

# External tenants have no subscription, hence --allow-no-subscriptions
az login --tenant $tenantId --allow-no-subscriptions | Out-Null

$graphAppId = "00000003-0000-0000-c000-000000000000"   # Microsoft Graph (same in every tenant)
$roles = @(
    "Application.ReadWrite.All",
    "DelegatedPermissionGrant.ReadWrite.All",
    "EventListener.ReadWrite.All",
    "Policy.ReadWrite.AuthenticationFlows",
    "OrganizationalBranding.ReadWrite.All"   # company branding (main.brnd.tf)
    "Policy.ReadWrite.ConditionalAccess",      # CA policy (azuread_conditional_access_policy)
    "Policy.Read.All",                         # CA policy read-back (provider requirement)
    "Policy.ReadWrite.AuthenticationMethod",   # email OTP method config (main.aume.tf)
    "AppRoleAssignment.ReadWrite.All"          # admin consent for the graph app's User.ReadWrite.All (main.grant.tf)
)

# Idempotent: reuse the app registration if it already exists
$app = az ad app list --display-name $appName | ConvertFrom-Json | Select-Object -First 1
if (-not $app) {
    write-host "Create app registration $appName"
    $app = az ad app create --display-name $appName --sign-in-audience AzureADMyOrg | ConvertFrom-Json
}

$sp = az ad sp list --filter "appId eq '$($app.appId)'" | ConvertFrom-Json | Select-Object -First 1
if (-not $sp) {
    write-host "Create service principal"
    $sp = az ad sp create --id $app.appId | ConvertFrom-Json
}

# Resolve permission IDs by NAME from the Graph SP rather than hardcoding GUIDs
$graphSp  = az ad sp show --id $graphAppId | ConvertFrom-Json
$existing = (az rest --method get --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments" | ConvertFrom-Json).value

foreach ($role in $roles) {
    $roleId = ($graphSp.appRoles | Where-Object { $_.value -eq $role }).id
    if (-not $roleId) { throw "Graph app role '$role' not found - check the name against the Graph permissions reference" }
    if ($existing.appRoleId -contains $roleId) { write-host "Already granted: $role"; continue }

    # Creating the appRoleAssignment IS the admin consent for an application permission
    $body = Join-Path $env:TEMP "approle.json"
    @{ principalId = $sp.id; resourceId = $graphSp.id; appRoleId = $roleId } | ConvertTo-Json -Compress | Set-Content $body
    az rest --method post --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignments" --headers "Content-Type=application/json" --body "@$body" | Out-Null
    write-host "Granted: $role"
}

if ($SkipSecret) {
    write-host ""
    write-host "ciam_client_id     : $($app.appId)"
    write-host "-SkipSecret: existing client secret left untouched; pipeline variables need no change."
    return
}

$end  = (Get-Date).ToUniversalTime().AddDays($secretDays).ToString("yyyy-MM-ddTHH:mm:ssZ")
$cred = az ad app credential reset --id $app.appId --append --display-name "terraform-$(Get-Date -Format yyyyMMdd)" --end-date $end | ConvertFrom-Json

write-host ""
write-host "ciam_client_id     : $($app.appId)"
write-host "ciam_client_secret : $($cred.password)     <-- shown once. Expires $end"
write-host "Store both as variables on the identity pipeline (secret flagged). Do NOT write them to a file in the repo."