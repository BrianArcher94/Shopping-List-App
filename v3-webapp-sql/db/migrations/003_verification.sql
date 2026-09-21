-- ledger shows all three applied
SELECT ScriptName, AppliedAt FROM dbo.SchemaMigrations ORDER BY ScriptName;

-- the app identity has the right roles
SELECT dp.name, r.name AS role_name
FROM sys.database_role_members m
JOIN sys.database_principals dp ON dp.principal_id = m.member_principal_id
JOIN sys.database_principals r  ON r.principal_id  = m.role_principal_id
WHERE dp.name = N'slasql-dv-msid-ukw-001';    -- expect db_datareader, db_datawriter

-- tables, keys and the FK exist
SELECT name FROM sys.tables ORDER BY name;     -- FavouriteItems, SchemaMigrations, ShoppingItems, ShoppingLists
SELECT name, type_desc FROM sys.key_constraints ORDER BY name;   -- PK + UNIQUE constraints
SELECT name FROM sys.foreign_keys;             -- FK_ShoppingItems_List