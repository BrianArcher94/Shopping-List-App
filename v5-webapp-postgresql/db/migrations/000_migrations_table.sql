-- =====================================================================
-- 000_migrations_table.sql  ·  Schema "app" + migration ledger
-- Run in the APPLICATION database (sla). Always run first by migrate.ps1;
-- every statement is guarded, so re-running is a no-op.
-- =====================================================================
BEGIN;

-- Dedicated schema: the app role gets USAGE on "app" and nothing in "public".
CREATE SCHEMA IF NOT EXISTS app;

-- Records which migration scripts have been applied (V3: dbo.SchemaMigrations).
CREATE TABLE IF NOT EXISTS app.schema_migrations (
    script_name text        PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app.schema_migrations (script_name)
VALUES ('000_migrations_table.sql')
ON CONFLICT DO NOTHING;

COMMIT;
