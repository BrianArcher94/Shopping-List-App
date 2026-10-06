-- 005_user_profiles.sql
-- V4 profile page: per-user settings that Entra External ID does not hold.
-- Names, city and country live on the Entra user (written through Microsoft Graph),
-- so they are deliberately NOT stored here - one source of truth per field.
-- Run as an Entra admin against the app database (not master), after 004. Idempotent.
-- The app user already has db_datareader + db_datawriter (001), which cover new tables.

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE ScriptName = N'005_user_profiles.sql')
BEGIN

    ------------------------------------------------------------------ UserProfiles
    -- One row per user, created on first write; no row = all defaults.
    -- Oid = the Entra object id from the validated access token.
    IF OBJECT_ID(N'dbo.UserProfiles', N'U') IS NULL
        CREATE TABLE dbo.UserProfiles (
            Oid              NVARCHAR(64) NOT NULL CONSTRAINT PK_UserProfiles PRIMARY KEY,
            Theme            VARCHAR(10)  NOT NULL CONSTRAINT DF_UserProfiles_Theme DEFAULT ('system')
                CONSTRAINT CK_UserProfiles_Theme CHECK (Theme IN ('light', 'dark', 'system')),
            PhotoUpdatedAt   DATETIME2(3) NULL,   -- NULL = no photo
            PhotoEntraSynced BIT          NULL,   -- did the last photo reach the Entra profile?
            CreatedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_UserProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
            ModifiedAt       DATETIME2(3) NULL
        );

    ------------------------------------------------------------------ Activity lookups
    -- The profile's "Your contributions" card and account deletion filter by the
    -- audit columns from 004. Small tables today; the indexes keep it that way.
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShoppingItems_CreatedBy')
        CREATE INDEX IX_ShoppingItems_CreatedBy ON dbo.ShoppingItems (CreatedBy, CreatedAt);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShoppingLists_ModifiedBy')
        CREATE INDEX IX_ShoppingLists_ModifiedBy ON dbo.ShoppingLists (ModifiedBy, ModifiedAt);

    INSERT INTO dbo.SchemaMigrations (ScriptName) VALUES (N'005_user_profiles.sql');
END
GO
