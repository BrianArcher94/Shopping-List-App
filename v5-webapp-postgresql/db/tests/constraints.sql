-- =====================================================================
-- constraints.sql  ·  Prove each constraint rejects bad data
-- Run in sla on Azure as the Entra admin (bootstrap window). Ends in ROLLBACK - leaves no data.
-- Records the SQLSTATE each rule raises; Phase 2 maps these to HTTP codes.
--
-- Each attempt runs inside pg_temp.expect(), whose EXCEPTION block is a
-- subtransaction - so one failed statement does not abort the rest
-- (outside such a block PostgreSQL would answer 25P02 to everything after).
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE results (n serial, outcome text, label text, expected text, got text) ON COMMIT DROP;

CREATE FUNCTION pg_temp.expect(label text, stmt text, expected text) RETURNS void
LANGUAGE plpgsql AS $f$
DECLARE
    got text := 'ok';
BEGIN
    BEGIN
        EXECUTE stmt;
    EXCEPTION WHEN OTHERS THEN
        got := SQLSTATE;
    END;
    INSERT INTO results (outcome, label, expected, got)
    VALUES (CASE WHEN got = expected THEN 'PASS' ELSE 'FAIL' END, label, expected, got);
END
$f$;

-- ---------- fixtures (a far-future week so it never clashes with real data) ----------
INSERT INTO app.shopping_lists (id, name, week_start_date, week_end_date, status)
VALUES ('2099-01-04', 'Test week', '2099-01-04', '2099-01-10', 'Draft');

INSERT INTO app.shopping_items (id, list_id, name, quantity)
VALUES ('2099-01-04__a', '2099-01-04', 'Bread', 1),
       ('2099-01-04__b', '2099-01-04', 'Eggs', 12);

INSERT INTO app.favourite_items (id, name) VALUES ('milk', 'milk ');

-- ---------- expected rejections ----------
SELECT pg_temp.expect('duplicate week_start_date',
  $$INSERT INTO app.shopping_lists (id, name, week_start_date, week_end_date, status)
    VALUES ('dup', 'Dup', '2099-01-04', '2099-01-10', 'Draft')$$, '23505');

SELECT pg_temp.expect('duplicate favourite (case/space-insensitive)',
  $$INSERT INTO app.favourite_items (id, name) VALUES ('milk-2', 'Milk')$$, '23505');

SELECT pg_temp.expect('item for a missing list',
  $$INSERT INTO app.shopping_items (id, list_id, name) VALUES ('x__1', '1999-01-03', 'Ghost')$$, '23503');

SELECT pg_temp.expect('invalid status',
  $$UPDATE app.shopping_lists SET status = 'Pending' WHERE id = '2099-01-04'$$, '23514');

SELECT pg_temp.expect('item quantity 0',
  $$INSERT INTO app.shopping_items (id, list_id, name, quantity) VALUES ('2099-01-04__z', '2099-01-04', 'None', 0)$$, '23514');

SELECT pg_temp.expect('favourite default_quantity 0',
  $$INSERT INTO app.favourite_items (id, name, default_quantity) VALUES ('tea', 'Tea', 0)$$, '23514');

SELECT pg_temp.expect('write to generated normalised_name',
  $$INSERT INTO app.favourite_items (id, name, normalised_name) VALUES ('jam', 'Jam', 'jam')$$, '428C9');

-- ---------- expected successes ----------
SELECT pg_temp.expect('valid transition Draft -> Ordered',
  $$UPDATE app.shopping_lists SET status = 'Ordered', ordered_at = now() WHERE id = '2099-01-04'$$, 'ok');

SELECT pg_temp.expect('delete list (cascades to items)',
  $$DELETE FROM app.shopping_lists WHERE id = '2099-01-04'$$, 'ok');

INSERT INTO results (outcome, label, expected, got)
SELECT CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
       'items removed by cascade', '0 rows', count(*)::text || ' rows'
FROM app.shopping_items WHERE list_id = '2099-01-04';

SELECT outcome, label, expected, got FROM results ORDER BY n;
SELECT count(*) FILTER (WHERE outcome = 'PASS') AS passed,
       count(*) FILTER (WHERE outcome = 'FAIL') AS failed
FROM results;

-- Fail the run (psql exit 3) if anything failed, so migrate.ps1 -Test can't miss it.
-- ON_ERROR_STOP ends the session here; the open transaction is rolled back with it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM results WHERE outcome = 'FAIL') THEN
        RAISE EXCEPTION 'constraint tests: % failed', (SELECT count(*) FROM results WHERE outcome = 'FAIL');
    END IF;
END
$$;

ROLLBACK;
