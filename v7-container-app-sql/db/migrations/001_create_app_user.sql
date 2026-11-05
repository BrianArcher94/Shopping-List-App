-- =====================================================================
-- 001_create_app_user.sql  ·  Grant the app managed identity DB access
-- Run in the APPLICATION database (not master), as an Entra admin.
-- The bracketed name MUST equal the managed identity's display name
-- (module.az-core output "msid_name" = slasqlcon-dv-msid-ukw-001).
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE ScriptName = N'001_create_app_user.sql')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'slasqlcon-dv-msid-ukw-001')
    BEGIN
        CREATE USER [slasqlcon-dv-msid-ukw-001] FROM EXTERNAL PROVIDER;
        ALTER ROLE db_datareader ADD MEMBER [slasqlcon-dv-msid-ukw-001];
        ALTER ROLE db_datawriter ADD MEMBER [slasqlcon-dv-msid-ukw-001];
    END

    INSERT INTO dbo.SchemaMigrations (ScriptName) VALUES (N'001_create_app_user.sql');
END
GO