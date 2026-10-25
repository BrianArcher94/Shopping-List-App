-- =====================================================================
-- 003_grants.sql  ·  Least-privilege DML for the app role
-- Run in the APPLICATION database (sla), as the admin, after 002.
-- The app can change rows, never structure: no TRUNCATE, REFERENCES,
-- TRIGGER or CREATE. GRANT is idempotent, so re-running is safe.
--
-- psql variables (passed by migrate.ps1):
--   db_name     application database          (sla)
--   app_role    role that gets DML            (slapgsql-dv-msid-ukw-001)
--   admin_role  role that owns/creates tables (<Username>)
-- :"var" expands to a quoted identifier, so hyphens, dots and @ are safe.
-- =====================================================================
BEGIN;

GRANT CONNECT ON DATABASE :"db_name" TO :"app_role";
GRANT USAGE ON SCHEMA app TO :"app_role";

-- Tables that exist now...
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO :"app_role";

-- ...and tables admin_role creates in later migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_role" IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_role";

INSERT INTO app.schema_migrations (script_name)
VALUES ('003_grants.sql')
ON CONFLICT DO NOTHING;

COMMIT;
