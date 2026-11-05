-- =====================================================================
-- 000_migrations_table.sql  ·  Migration ledger
-- Records which migration scripts have been applied. Idempotent.
-- =====================================================================
IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
CREATE TABLE dbo.SchemaMigrations (
    ScriptName NVARCHAR(200) NOT NULL
        CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
    AppliedAt  DATETIME2(3)  NOT NULL
        CONSTRAINT DF_SchemaMigrations_AppliedAt DEFAULT SYSUTCDATETIME()
);
GO