# V5 database — PostgreSQL schema & migrations

Ordered, idempotent SQL scripts plus a runner, applied **directly to Azure** (there is no local
PostgreSQL). Background: `shared-docs/v5/phase-1.html` and plan §9 / §15.

```
db/
├── migrate.ps1                      runner (Entra token from az CLI)
├── migrations/
│   ├── 000_migrations_table.sql     schema "app" + ledger            (sla)
│   ├── 001_create_app_role.sql      Entra role for the MI            (postgres)
│   ├── 002_init_schema.sql          tables, constraints, index       (sla)
│   ├── 003_grants.sql               DML grants to the app role       (sla)
│   └── 004_extensions.sql           pg_stat_statements               (sla)
├── verify/004_verification.sql      read-only checks                 (sla)
└── tests/constraints.sql            constraint proofs, rolls back    (sla)
```

Rules: one transaction per migration; never edit an applied migration — add a new numbered file.

## Prerequisites

- PostgreSQL **client tools** only (`psql` on PATH): `choco install psql17 -y` from an elevated
  shell. It installs no server or service.
- `az login` as the Entra admin (`<Username>`).
- Terraform applied with `public_network_access_enabled = true` in `main.pgsql.tf` (public access
  on; the firewall rule admits `local.shared.ip_address` only).
- The managed identity's **principal (object) ID** is looked up by name automatically. To pass it
  yourself: `./db/migrate.ps1 -AppOid (az ad sp list --display-name slapgsql-dv-msid-ukw-001 --query '[0].id' -o tsv)`.

## Bootstrap session (Phase 5) — one sitting, then close the window

Runbook: `shared-docs/v5/phase-5.html`.

```powershell
# 1. migrate + verify + constraint tests (tests roll back; any FAIL stops the run)
./db/migrate.ps1 -Test

# 2. idempotency: the second run must skip 002, 003 and 004
./db/migrate.ps1
```

Then set `public_network_access_enabled = false` in `main.pgsql.tf`, re-apply, and confirm
`Test-NetConnection slapgsql-dv-pgsql-ukw-001.postgres.database.azure.com -Port 5432` now fails.
