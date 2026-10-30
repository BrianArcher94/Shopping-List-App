<#
.SYNOPSIS
    Phase 5 smoke test: drives the deployed Functions API through the main flows and
    checks every status code, including the ones Cosmos DB errors map to
    (409 id conflict, 412 failed patch condition -> 409, 404 on delete -> 204).

.DESCRIPTION
    The first request is the managed identity's first data-plane call to Cosmos DB, so a 500
    on step 1 means "the function can't reach the account (PE/DNS) or lacks the data role"
    (see v6-plan.html section 17).

    Uses a far-future test week (default 2098-12-28) so it never collides with real weeks.
    Favourites it creates are deleted again.
    The test list cannot be deleted through the API, so it stays (Delivered) - re-runs
    reuse it only while it's still Draft; otherwise pass a different Sunday as -Week.

    The function only accepts your IP (local.shared.ip_address), so run this from that machine.

.EXAMPLE
    ./function/smoke.ps1
.EXAMPLE
    ./function/smoke.ps1 -Week 2098-12-21
#>
[CmdletBinding()]
param(
    [string] $BaseUrl = 'https://slacdb-dv-fnap-ukw-001.azurewebsites.net',
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string] $Week = '2098-12-28'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([datetime]::ParseExact($Week, 'yyyy-MM-dd', $null).DayOfWeek -ne 'Sunday') {
    throw "-Week must be a Sunday (lists run Sunday -> Saturday); $Week is not."
}

$api     = "$($BaseUrl.TrimEnd('/'))/api"
$results = [System.Collections.Generic.List[object]]::new()

# Sends one request and records PASS/FAIL against the expected status. Returns the parsed body.
function Step {
    param([string] $Label, [string] $Method, [string] $Path, [int[]] $Expect, $Body = $null)
    $req = @{ Method = $Method; Uri = "$api/$Path"; SkipHttpErrorCheck = $true; TimeoutSec = 60 }
    if ($null -ne $Body) {
        $req.ContentType = 'application/json'
        $req.Body        = $Body | ConvertTo-Json -Compress
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $res    = Invoke-WebRequest @req
        $status = [int]$res.StatusCode
        $json   = if ($res.Content) { $res.Content | ConvertFrom-Json } else { $null }
    }
    catch {
        $status = 0
        $json   = [pscustomobject]@{ error = $_.Exception.Message }
    }
    $pass = $Expect -contains $status
    $note = if (-not $pass -and $json -and $json.PSObject.Properties['error']) { $json.error } else { '' }
    $results.Add([pscustomobject]@{
        Outcome = if ($pass) { 'PASS' } else { 'FAIL' }
        Step    = $Label
        Expect  = $Expect -join '/'
        Got     = $status
        Ms      = $sw.ElapsedMilliseconds
        Note    = $note
    })
    return $json
}

# The id from a step's response body, or $null if the step failed (body is { error }).
function IdOf($Body) {
    if ($Body -and $Body.PSObject.Properties['id']) { return $Body.id }
    return $null
}

$missing = [datetime]::ParseExact($Week, 'yyyy-MM-dd', $null).AddDays(7).ToString('yyyy-MM-dd')
$favName = 'Smoke Test Tea'

Write-Host ">> Smoke test against $api (test week $Week)"

# --- connectivity: MI token, private endpoint, data-plane role (cross-partition query) ---
Step 'list all lists (MI first login)' GET 'lists' 200 | Out-Null
if ($results[0].Outcome -eq 'FAIL') {
    $results | Format-Table -AutoSize
    Write-Host '>> Stopping: the API cannot reach Cosmos DB (or you). See v6-plan.html section 17.' -ForegroundColor Red
    exit 1
}

# --- lists ---
Step 'create test list'               POST 'lists' 201, 409 @{ weekStartDate = $Week } | Out-Null
$list = Step 'get test list'          GET  "lists/$Week" 200
if ($list -and $list.PSObject.Properties['status'] -and $list.status -ne 'Draft') {
    throw "Test list $Week is already $($list.status) from an earlier run. Pass a different Sunday as -Week."
}
Step 'duplicate week -> 409'          POST 'lists' 409 @{ weekStartDate = $Week } | Out-Null   # same id + PK

# --- items ---
$item = Step 'add item'               POST "lists/$Week/items" 201 @{ name = 'Smoke milk'; quantity = 2 }
Step 'item for missing list -> 404'   POST "lists/$missing/items" 404 @{ name = 'Ghost'; quantity = 1 } | Out-Null
if ($itemId = IdOf $item) {
    Step 'update item notes'          PATCH "items/$([uri]::EscapeDataString($itemId))" 200 @{ notes = 'semi-skimmed' } | Out-Null
}
Step 'list items'                     GET  "lists/$Week/items" 200 | Out-Null

# --- favourites (id = normalised name = partition key, so duplicates are a native 409) ---
Step 'add favourite'                  POST 'favourites' 201, 409 @{ name = $favName; defaultQuantity = 1 } | Out-Null
Step 'duplicate favourite -> 409'     POST 'favourites' 409 @{ name = "  $($favName.ToLower()) "; defaultQuantity = 3 } | Out-Null
$favId = $favName.Trim().ToLower()
$reused = Step 'reuse favourite'      POST "lists/$Week/items/from-favourite" 201 @{ favouriteId = $favId }
if ($reusedId = IdOf $reused) {
    Step 'remove item'                DELETE "items/$([uri]::EscapeDataString($reusedId))" 204 | Out-Null
}

# --- status transitions (conditional patch: FROM c WHERE c.status = <current>) ---
# Two "Mark ordered" requests at once: both read Draft, but only one patch condition can pass.
$race = 1..2 | ForEach-Object -Parallel {
    try {
        $r = Invoke-WebRequest -Method PATCH -Uri "$using:api/lists/$using:Week/status" -SkipHttpErrorCheck `
             -ContentType 'application/json' -Body '{"status":"Ordered"}' -TimeoutSec 60
        [int]$r.StatusCode
    } catch { 0 }
} -ThrottleLimit 2
$raceCodes = @($race | Sort-Object)
$results.Add([pscustomobject]@{
    Outcome = if (($raceCodes -join ',') -eq '200,409') { 'PASS' } else { 'FAIL' }
    Step    = 'concurrent order x2 -> one wins'
    Expect  = '200,409'
    Got     = $raceCodes -join ','
    Ms      = 0
    Note    = ''
})
Step 'add to ordered list -> 409'     POST "lists/$Week/items" 409 @{ name = 'Too late'; quantity = 1 } | Out-Null   # 412 -> 409
Step 'illegal Ordered->Draft -> 409'  PATCH "lists/$Week/status" 409 @{ status = 'Draft' } | Out-Null
Step 'deliver list'                   PATCH "lists/$Week/status" 200 @{ status = 'Delivered' } | Out-Null

# --- clean up favourites ---
Step 'remove favourite'               DELETE "favourites/$([uri]::EscapeDataString($favId))" 204 | Out-Null
Step 'remove missing favourite -> 204' DELETE "favourites/$([uri]::EscapeDataString($favId))" 204 | Out-Null   # Cosmos 404 swallowed

# --- weekly job (what the Logic App calls every Saturday 20:00) ---
Step 'create-weekly-list (1st)'        POST 'jobs/create-weekly-list' 200 | Out-Null
$job2 = Step 'create-weekly-list (2nd)' POST 'jobs/create-weekly-list' 200
if ($job2 -and $job2.PSObject.Properties['created']) {
    $results.Add([pscustomobject]@{
        Outcome = if (-not $job2.created) { 'PASS' } else { 'FAIL' }
        Step    = 'weekly job is idempotent'
        Expect  = 'created=false'
        Got     = "created=$($job2.created)"
        Ms      = 0
        Note    = "week $($job2.weekStartDate)"
    })
}
Step 'current list'                   GET 'lists/current' 200 | Out-Null

$results | Format-Table -AutoSize
$failed = @($results | Where-Object Outcome -eq 'FAIL').Count
Write-Host ">> passed = $($results.Count - $failed), failed = $failed"
if ($failed -gt 0) { exit 1 }
