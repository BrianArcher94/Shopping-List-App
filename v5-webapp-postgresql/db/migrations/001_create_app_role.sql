-- =====================================================================
-- 001_create_app_role.sql  ·  Entra role for the app managed identity
-- Run in the "postgres" database (not sla), as an Entra admin.
-- pgaadauth_* functions exist only on Azure Database for PostgreSQL.
--
-- Roles are server-wide, and the ledger lives in sla, so this script is
-- not recorded in app.schema_migrations - it guards itself instead.
--
-- psql variables (passed by migrate.ps1):
--   app_role  role name = managed identity display name (slapgsql-dv-msid-ukw-001)
--   app_oid   managed identity PRINCIPAL (object) ID - not its client ID
-- =====================================================================

-- Creates the role only if it does not exist yet. A plain SELECT is used
-- (not a DO block) because psql does not substitute :'vars' inside $$ bodies.
SELECT pgaadauth_create_principal_with_oid(:'app_role', :'app_oid', 'service', false, false)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role');

-- Show the result: expect one row, rolcanlogin = t, rolsuper = f.
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb
FROM pg_roles
WHERE rolname = :'app_role';
