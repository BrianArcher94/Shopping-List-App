-- =====================================================================
-- 002_init_schema.sql  ·  Shopping List relational schema (idempotent)
-- Run in the APPLICATION database (sla), as the admin, after 000.
-- Same logical model as V3 (03-webapp-sql/db/migrations/002_init_schema.sql);
-- PostgreSQL dialect, snake_case identifiers, schema "app".
-- One transaction: any failure rolls back every statement AND the ledger row.
-- =====================================================================
BEGIN;

-- shopping_lists: one row per weekly list; week_start_date is the natural unique key.
CREATE TABLE IF NOT EXISTS app.shopping_lists (
    id              text        PRIMARY KEY,                  -- = week_start_date as 'YYYY-MM-DD'
    name            text        NOT NULL,
    week_start_date date        NOT NULL UNIQUE,              -- weekly idempotency
    week_end_date   date        NOT NULL,
    status          text        NOT NULL
        CHECK (status IN ('Draft', 'Ordered', 'Delivered')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    ordered_at      timestamptz NULL,
    delivered_at    timestamptz NULL
);

-- shopping_items: child of a list; deleting a list deletes its items.
CREATE TABLE IF NOT EXISTS app.shopping_items (
    id         text        PRIMARY KEY,                       -- '<listId>__<uuid>'
    list_id    text        NOT NULL
        REFERENCES app.shopping_lists (id) ON DELETE CASCADE,
    name       text        NOT NULL,
    quantity   integer     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    notes      text        NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Neither engine indexes FK columns automatically: needed for "items of list X"
-- and to keep the cascade delete cheap.
CREATE INDEX IF NOT EXISTS ix_shopping_items_list_id ON app.shopping_items (list_id);

-- favourite_items: the DB derives normalised_name, so "no duplicate favourite"
-- cannot drift from name. Writes to normalised_name are rejected (SQLSTATE 428C9).
CREATE TABLE IF NOT EXISTS app.favourite_items (
    id               text        PRIMARY KEY,                 -- normalised name
    name             text        NOT NULL,
    normalised_name  text        GENERATED ALWAYS AS (lower(btrim(name))) STORED UNIQUE,
    default_quantity integer     NOT NULL DEFAULT 1 CHECK (default_quantity >= 1),
    created_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app.schema_migrations (script_name)
VALUES ('002_init_schema.sql')
ON CONFLICT DO NOTHING;

COMMIT;
