-- =====================================================================
-- 004_verification.sql  ·  Read-only checks - safe to run any time
-- Run in the APPLICATION database (sla). Changes nothing.
-- psql variable: app_role (see 003_grants.sql)
-- =====================================================================

\echo '--- ledger (expect 000, 002, 003, 004)'
SELECT script_name, applied_at
FROM app.schema_migrations
ORDER BY script_name;

\echo '--- tables in schema app (expect 4: favourite_items, schema_migrations, shopping_items, shopping_lists)'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'app'
ORDER BY table_name;

\echo '--- constraints (expect p x4, u x2, f x1, c x3)'
SELECT conrelid::regclass AS table_name, contype, conname
FROM pg_constraint
WHERE connamespace = 'app'::regnamespace
ORDER BY contype, table_name, conname;

\echo '--- generated columns (expect favourite_items.normalised_name)'
SELECT table_name, column_name, generation_expression
FROM information_schema.columns
WHERE table_schema = 'app' AND is_generated = 'ALWAYS';

\echo '--- indexes'
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'app'
ORDER BY tablename, indexname;

\echo '--- app role privileges (expect SELECT/INSERT/UPDATE/DELETE = t, TRUNCATE = f)'
SELECT t.table_name,
       has_table_privilege(:'app_role', format('app.%I', t.table_name), 'SELECT')   AS sel,
       has_table_privilege(:'app_role', format('app.%I', t.table_name), 'INSERT')   AS ins,
       has_table_privilege(:'app_role', format('app.%I', t.table_name), 'UPDATE')   AS upd,
       has_table_privilege(:'app_role', format('app.%I', t.table_name), 'DELETE')   AS del,
       has_table_privilege(:'app_role', format('app.%I', t.table_name), 'TRUNCATE') AS trunc
FROM information_schema.tables t
WHERE t.table_schema = 'app'
ORDER BY t.table_name;

\echo '--- app role schema rights (expect usage = t, create = f)'
SELECT has_schema_privilege(:'app_role', 'app', 'USAGE')  AS usage,
       has_schema_privilege(:'app_role', 'app', 'CREATE') AS "create";

\echo '--- extensions (expect pg_stat_statements in public)'
SELECT e.extname, n.nspname AS schema, e.extversion
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'pg_stat_statements';
