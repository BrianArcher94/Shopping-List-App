-- =====================================================================
-- 002_init_schema.sql  ·  Shopping List relational schema (idempotent)
-- Run in the application database, as an Entra admin, after 000 and 001.
-- =====================================================================

-- ShoppingLists: one row per weekly list; WeekStartDate is the natural unique key.
IF OBJECT_ID(N'dbo.ShoppingLists', N'U') IS NULL
CREATE TABLE dbo.ShoppingLists (
    Id            NVARCHAR(64)   NOT NULL CONSTRAINT PK_ShoppingLists PRIMARY KEY,
    Name          NVARCHAR(200)  NOT NULL,
    WeekStartDate DATE           NOT NULL,
    WeekEndDate   DATE           NOT NULL,
    Status        VARCHAR(20)    NOT NULL
        CONSTRAINT CK_ShoppingLists_Status CHECK (Status IN ('Draft','Ordered','Delivered')),
    CreatedAt     DATETIME2(3)   NOT NULL CONSTRAINT DF_Lists_CreatedAt DEFAULT SYSUTCDATETIME(),
    OrderedAt     DATETIME2(3)   NULL,          -- real NULL, not the empty string V2 used
    DeliveredAt   DATETIME2(3)   NULL,
    CONSTRAINT UQ_ShoppingLists_WeekStart UNIQUE (WeekStartDate)   -- weekly idempotency
);
GO

-- ShoppingItems: child of a list; FK replaces the listId__uuid RowKey trick.
IF OBJECT_ID(N'dbo.ShoppingItems', N'U') IS NULL
CREATE TABLE dbo.ShoppingItems (
    Id        NVARCHAR(64)   NOT NULL CONSTRAINT PK_ShoppingItems PRIMARY KEY,
    ListId    NVARCHAR(64)   NOT NULL,
    Name      NVARCHAR(200)  NOT NULL,
    Quantity  INT            NOT NULL CONSTRAINT DF_Items_Qty   DEFAULT (1),
    Notes     NVARCHAR(1000) NOT NULL CONSTRAINT DF_Items_Notes DEFAULT (''),
    CreatedAt DATETIME2(3)   NOT NULL CONSTRAINT DF_Items_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ShoppingItems_List FOREIGN KEY (ListId)
        REFERENCES dbo.ShoppingLists (Id) ON DELETE CASCADE   -- delete list → items go too
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShoppingItems_ListId')
    CREATE INDEX IX_ShoppingItems_ListId ON dbo.ShoppingItems (ListId);
GO

-- FavouriteItems: NormalisedName enforces "no duplicate favourite".
IF OBJECT_ID(N'dbo.FavouriteItems', N'U') IS NULL
CREATE TABLE dbo.FavouriteItems (
    Id              NVARCHAR(64)  NOT NULL CONSTRAINT PK_FavouriteItems PRIMARY KEY,
    Name            NVARCHAR(200) NOT NULL,
    NormalisedName  NVARCHAR(200) NOT NULL,
    DefaultQuantity INT           NOT NULL CONSTRAINT DF_Fav_Qty DEFAULT (1),
    CreatedAt       DATETIME2(3)  NOT NULL CONSTRAINT DF_Fav_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_FavouriteItems_Normalised UNIQUE (NormalisedName)
);
GO

-- Record this migration in the ledger.
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE ScriptName = N'002_init_schema.sql')
    INSERT INTO dbo.SchemaMigrations (ScriptName) VALUES (N'002_init_schema.sql');
GO