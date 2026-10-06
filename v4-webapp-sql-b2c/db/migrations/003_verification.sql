-- ledger shows 000, 001, 002, 004 and 005 applied
SELECT ScriptName, AppliedAt FROM dbo.SchemaMigrations ORDER BY ScriptName;

-- the app identity has the right roles
SELECT dp.name, r.name AS role_name
FROM sys.database_role_members m
JOIN sys.database_principals dp ON dp.principal_id = m.member_principal_id
JOIN sys.database_principals r  ON r.principal_id  = m.role_principal_id
WHERE dp.name = N'slab2c-dv-msid-ukw-001';    -- expect db_datareader, db_datawriter

-- tables, keys and the FK exist
SELECT name FROM sys.tables ORDER BY name;     -- FavouriteItems, SchemaMigrations, ShoppingItems, ShoppingLists
SELECT name, type_desc FROM sys.key_constraints ORDER BY name;   -- PK + UNIQUE constraints
SELECT name FROM sys.foreign_keys;             -- FK_ShoppingItems_List

-- V4: audit columns from 004 exist on all three tables (expect 5 rows per table)
SELECT t.name AS table_name, c.name AS column_name, c.is_nullable
FROM sys.columns c
JOIN sys.tables t ON t.object_id = c.object_id
WHERE c.name IN (N'CreatedBy', N'CreatedByName', N'ModifiedBy', N'ModifiedByName', N'ModifiedAt')
ORDER BY t.name, c.column_id;

-- V4 profile page: 005 created UserProfiles and the two audit lookup indexes
SELECT name FROM sys.tables WHERE name = N'UserProfiles';                       -- 1 row
SELECT name FROM sys.check_constraints WHERE name = N'CK_UserProfiles_Theme';   -- 1 row
SELECT name FROM sys.indexes
WHERE name IN (N'IX_ShoppingItems_CreatedBy', N'IX_ShoppingLists_ModifiedBy');  -- 2 rows
