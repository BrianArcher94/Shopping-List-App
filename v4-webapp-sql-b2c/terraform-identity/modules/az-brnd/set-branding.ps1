# Applies company branding to the External ID tenant. Called by terraform_data.main
# (brnd.tf) with its inputs in BRND_* environment variables - never run with secrets
# on the command line. Idempotent: every call PATCHes/PUTs the full desired state.
#
# Needs the Graph application permission OrganizationalBranding.ReadWrite.All on the
# bootstrap SP (bootstrap/bootstrap.ps1 -SkipSecret grants it).
#
# Graph behaviours this works around (all observed against the live tenant, 2026-09-26):
#  - A new tenant has NO default branding: GET/PATCH /branding return 404, and PATCH
#    cannot create it. The default is only created as a side effect of creating a
#    LOCALIZED branding (POST /branding/localizations); id "0"/"default" is rejected,
#    and the body needs at least one property besides id.
#  - Deleting the last localization also deletes the default IF the default is still
#    empty. A populated default survives, so the temporary locale is removed last.
#  - Straight after a delete, creates fail for a short while with 400 "Failed to update
#    metadata for locale 0" - hence the retries.

$ErrorActionPreference = 'Stop'

$tenantId  = $env:BRND_TENANT_ID
$graph     = "https://graph.microsoft.com/v1.0/organization/$tenantId/branding"
$bootstrap = 'en-US'   # temporary locale used only to bring the default into existence

# Client-credentials token for Graph, as the bootstrap SP (same identity as the providers)
$token = (Invoke-RestMethod -Method Post `
    -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" `
    -Body @{
        grant_type    = 'client_credentials'
        client_id     = $env:BRND_CLIENT_ID
        client_secret = $env:BRND_CLIENT_SECRET
        scope         = 'https://graph.microsoft.com/.default'
    }).access_token
$auth = @{ Authorization = "Bearer $token" }

# Invoke-RestMethod with retries for Graph's eventual consistency. Surfaces the Graph
# error message (not just the status line) when it finally gives up.
function Invoke-Graph {
    param([hashtable]$Request, [int]$Attempts = 6, [int]$DelaySeconds = 15)
    for ($i = 1; ; $i++) {
        try { return Invoke-RestMethod @Request }
        catch {
            $status = [int]$_.Exception.Response.StatusCode
            $detail = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
            $retryable = $status -eq 404 -or $status -eq 429 -or $status -ge 500 -or $detail -match 'Failed to update metadata'
            if (-not $retryable -or $i -ge $Attempts) {
                throw "$($Request.Method) $($Request.Uri) failed ($status): $detail"
            }
            Write-Host "  $($Request.Method) $($Request.Uri) -> $status, retry $i/$($Attempts - 1) in ${DelaySeconds}s"
            Start-Sleep -Seconds $DelaySeconds
        }
    }
}

function Test-DefaultBranding {
    try { Invoke-RestMethod -Method Get -Uri "$graph`?`$select=id" -Headers ($auth + @{ 'Accept-Language' = '0' }) | Out-Null; return $true }
    catch { if ([int]$_.Exception.Response.StatusCode -eq 404) { return $false } else { throw } }
}

# 1. Make sure the default branding exists.
$createdBootstrap = $false
if (-not (Test-DefaultBranding)) {
    Write-Host "Branding: no default branding - creating it via temporary locale $bootstrap"
    $body = @{ id = $bootstrap; signInPageText = ' ' } | ConvertTo-Json -Compress
    Invoke-Graph @{ Method = 'Post'; Uri = "$graph/localizations"; Headers = $auth; ContentType = 'application/json'; Body = $body } | Out-Null
    $createdBootstrap = $true
}

# 2. Properties on the default (Accept-Language 0 = the default, all-locales branding).
$body = @{ backgroundColor = $env:BRND_BACKGROUND_COLOR; signInPageText = $env:BRND_SIGN_IN_TEXT } | ConvertTo-Json -Compress
Invoke-Graph @{ Method = 'Patch'; Uri = $graph; Headers = ($auth + @{ 'Accept-Language' = '0' }); ContentType = 'application/json'; Body = $body } | Out-Null
Write-Host "Branding: backgroundColor $($env:BRND_BACKGROUND_COLOR), signInPageText set"

# 3. Images - Stream properties take the raw bytes, one PUT each, on locale 0.
foreach ($pair in ($env:BRND_IMAGES -split ';' | Where-Object { $_ })) {
    $name, $file = $pair -split '=', 2
    if (-not (Test-Path $file)) { throw "Branding image not found: $file" }
    Invoke-Graph @{ Method = 'Put'; Uri = "$graph/localizations/0/$name"; Headers = $auth; ContentType = 'image/png'; InFile = $file } | Out-Null
    Write-Host "Branding: $name uploaded ($((Get-Item $file).Length) bytes)"
}

# 4. Drop the temporary locale - otherwise browsers in that language would get it
#    (no logos) instead of the default. Safe now that the default is populated.
if ($createdBootstrap) {
    Invoke-Graph @{ Method = 'Delete'; Uri = "$graph/localizations/$bootstrap"; Headers = $auth } | Out-Null
    Write-Host "Branding: temporary locale $bootstrap removed"
}
