-- 004_add_audit_columns.sql
-- V4: record WHO created / last modified each row. Values come from the validated
-- External ID access token (oid + name); the weekly scheduler writes 'system'.
-- Run as an Entra admin against the app database (not master). Idempotent:
-- guarded by the SchemaMigrations ledger AND per-column, so a partial run can be re-executed.
-- The NOT NULL columns carry defaults so this ALTER is safe on tables that already hold rows.

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE ScriptName = N'004_add_audit_columns.sql')
BEGIN

    ------------------------------------------------------------------ ShoppingLists
    IF COL_LENGTH('dbo.ShoppingLists', 'CreatedBy') IS NULL
        ALTER TABLE dbo.ShoppingLists ADD
            CreatedBy      NVARCHAR(64)  NOT NULL CONSTRAINT DF_Lists_CreatedBy     DEFAULT (N'system'),
            CreatedByName  NVARCHAR(200) NOT NULL CONSTRAINT DF_Lists_CreatedByName DEFAULT (N'System'),
            ModifiedBy     NVARCHAR(64)  NULL,
            ModifiedByName NVARCHAR(200) NULL,
            ModifiedAt     DATETIME2(3)  NULL;

    ------------------------------------------------------------------ ShoppingItems
    IF COL_LENGTH('dbo.ShoppingItems', 'CreatedBy') IS NULL
        ALTER TABLE dbo.ShoppingItems ADD
            CreatedBy      NVARCHAR(64)  NOT NULL CONSTRAINT DF_Items_CreatedBy     DEFAULT (N'system'),
            CreatedByName  NVARCHAR(200) NOT NULL CONSTRAINT DF_Items_CreatedByName DEFAULT (N'System'),
            ModifiedBy     NVARCHAR(64)  NULL,
            ModifiedByName NVARCHAR(200) NULL,
            ModifiedAt     DATETIME2(3)  NULL;

    ------------------------------------------------------------------ FavouriteItems
    IF COL_LENGTH('dbo.FavouriteItems', 'CreatedBy') IS NULL
        ALTER TABLE dbo.FavouriteItems ADD
            CreatedBy      NVARCHAR(64)  NOT NULL CONSTRAINT DF_Fav_CreatedBy     DEFAULT (N'system'),
            CreatedByName  NVARCHAR(200) NOT NULL CONSTRAINT DF_Fav_CreatedByName DEFAULT (N'System'),
            ModifiedBy     NVARCHAR(64)  NULL,
            ModifiedByName NVARCHAR(200) NULL,
            ModifiedAt     DATETIME2(3)  NULL;

    INSERT INTO dbo.SchemaMigrations (ScriptName) VALUES (N'004_add_audit_columns.sql');
END
GO
