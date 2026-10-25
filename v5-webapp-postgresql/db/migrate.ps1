<#
.SYNOPSIS
    Applies db/migrations/*.sql to the V5 Azure PostgreSQL server in order, skipping scripts
    already in app.schema_migrations, then runs db/verify/004_verification.sql.

.DESCRIPTION
    Gets an Entra token for the signed-in az CLI user (resource type oss-rdbms) and uses it as the
    password for this run only - nothing is stored. Runs 001_create_app_role.sql against the
    "postgres" database (roles are server-wide); everything else runs against -Database.

    Requires network reach to the server: apply Terraform with public_network_access_enabled = true
    in main.pgsql.tf first (the firewall rule admits local.shared.ip_address), and switch it back
    off afterwards.

    -AppOid is looked up from Entra by -AppRole (the managed identity's display name) when omitted.
    -Test also runs tests/constraints.sql, which rolls back and fails the run if any check fails.

.EXAMPLE
    ./db/migrate.ps1 -Test
.EXAMPLE
    ./db/migrate.ps1 -AppOid <managed identity principal (object) ID>
#>
[CmdletBinding()]
param(
    [string] $PgHost    = 'slapgsql-dv-pgsql-ukw-001.postgres.database.azure.com',
    [int]    $Port      = 5432,
    [string] $Database  = 'sla',
    [string] $AdminUser = '<Username>',
    [string] $AppRole   = 'slapgsql-dv-msid-ukw-001',
    [string] $AppOid,
    [switch] $Test
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AppRoleScript = '001_create_app_role.sql'
$MigrationsDir = Join-Path $PSScriptRoot 'migrations'
$VerifyScript  = Join-Path $PSScriptRoot 'verify/004_verification.sql'
$TestScript    = Join-Path $PSScriptRoot 'tests/constraints.sql'

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql not found on PATH. Install the PostgreSQL client tools (see db/README.md).'
}

# Connection settings travel as PG* environment variables (no connection strings, so a UPN
# with '@' needs no escaping). Previous values are restored in the finally block.
$saved = @{}
foreach ($name in 'PGHOST', 'PGPORT', 'PGUSER', 'PGSSLMODE', 'PGPASSWORD') {
    $saved[$name] = [Environment]::GetEnvironmentVariable($name)
}

function Invoke-Psql {
    param([string] $Db, [string[]] $Arguments)
    & psql -d $Db -X -v ON_ERROR_STOP=1 @Arguments
    if ($LASTEXITCODE -ne 0) { throw "psql failed (exit $LASTEXITCODE) against database '$Db'." }
}

try {
    $env:PGHOST    = $PgHost
    $env:PGPORT    = "$Port"
    $env:PGUSER    = $AdminUser
    $env:PGSSLMODE = 'require'

    Write-Host '>> Getting Entra token for oss-rdbms from az CLI'
    $token = az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv
    if ($LASTEXITCODE -ne 0 -or -not $token) { throw 'az account get-access-token failed. Run az login.' }
    $env:PGPASSWORD = $token

    # A user-assigned managed identity is a service principal with the identity's name.
    if (-not $AppOid) {
        Write-Host ">> Looking up principal ID for $AppRole"
        $AppOid = az ad sp list --display-name $AppRole --query '[0].id' -o tsv
        if ($LASTEXITCODE -ne 0 -or -not $AppOid) { throw "No service principal named '$AppRole'. Pass -AppOid." }
        Write-Host "   $AppOid"
    }

    $vars = @('-v', "db_name=$Database", '-v', "app_role=$AppRole", '-v', "admin_role=$AdminUser")

    Write-Host ">> Connecting as $AdminUser to $PgHost`:$Port/$Database"
    Invoke-Psql -Db $Database -Arguments @('-q', '-tAc', 'SELECT 1') | Out-Null

    # 000 always runs: it creates the ledger the rest depends on, and is fully guarded.
    $scripts = Get-ChildItem -Path $MigrationsDir -Filter '*.sql' | Sort-Object Name
    $first = $scripts | Select-Object -First 1
    Write-Host ">> Applying $($first.Name)"
    Invoke-Psql -Db $Database -Arguments ($vars + @('-q', '-f', $first.FullName))

    # 001 is not in the ledger (it runs in "postgres"); it skips itself if the role exists.
    Write-Host ">> Applying $AppRoleScript (database: postgres)"
    Invoke-Psql -Db 'postgres' -Arguments ($vars + @('-v', "app_oid=$AppOid", '-f', (Join-Path $MigrationsDir $AppRoleScript)))

    $applied = @(Invoke-Psql -Db $Database -Arguments @('-tAc', 'SELECT script_name FROM app.schema_migrations'))

    foreach ($script in ($scripts | Select-Object -Skip 1)) {
        if ($script.Name -eq $AppRoleScript) { continue }
        if ($applied -contains $script.Name) {
            Write-Host ">> $($script.Name) already applied - skipping"
            continue
        }
        Write-Host ">> Applying $($script.Name)"
        Invoke-Psql -Db $Database -Arguments ($vars + @('-q', '-f', $script.FullName))
    }

    Write-Host '>> Verification'
    Invoke-Psql -Db $Database -Arguments ($vars + @('-f', $VerifyScript))

    if ($Test) {
        Write-Host '>> Constraint tests (rolled back)'
        Invoke-Psql -Db $Database -Arguments @('-f', $TestScript)
    }
    Write-Host '>> Done'
}
finally {
    foreach ($name in $saved.Keys) {
        [Environment]::SetEnvironmentVariable($name, $saved[$name])
    }
}
