-- =====================================================================
-- 004_extensions.sql  ·  Query insight (pg_stat_statements)
-- Run in the APPLICATION database (sla), as the admin, after 003.
-- Needs the server parameter azure.extensions to allow PG_STAT_STATEMENTS
-- (set by the az-pgsql module's pgsql_configurations default). Azure already
-- preloads the library; this only creates the views in sla.
-- The extension lives in "public", not "app": the app role gets no rights on it.
-- =====================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;

INSERT INTO app.schema_migrations (script_name)
VALUES ('004_extensions.sql')
ON CONFLICT DO NOTHING;

COMMIT;
