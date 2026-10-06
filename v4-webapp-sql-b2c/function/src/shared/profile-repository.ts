import sql from 'mssql'
import {
  FORMER_MEMBER_NAME,
  type ProfileActivity,
  type ProfileActivityEntry,
  type ProfileActivityKind,
  type ThemePreference,
} from '../../domain/profile'
import { getPool } from './db'

// dbo.UserProfiles (migration 005) holds only what Entra does not: the theme
// preference and photo bookkeeping. Its PhotoEntraSynced column is unused since
// the photo became app-owned (External ID has no Graph photo storage); it stays
// NULL and can be dropped by a later migration. One row per user, created on first write -
// a user with no row simply has the defaults.

export interface ProfileRow {
  theme: ThemePreference
  photoUpdatedAt: string | null
}

export const DEFAULT_PROFILE_ROW: ProfileRow = { theme: 'system', photoUpdatedAt: null }

const toIso = (d: Date | string | null) => (d == null ? null : d instanceof Date ? d.toISOString() : d)

export function rowToProfile(r: any): ProfileRow {
  return {
    theme: r.Theme,
    photoUpdatedAt: toIso(r.PhotoUpdatedAt),
  }
}

export async function getProfileRow(oid: string): Promise<ProfileRow> {
  const pool = await getPool()
  const res = await pool.request()
    .input('Oid', sql.NVarChar, oid)
    .query('SELECT Theme, PhotoUpdatedAt FROM dbo.UserProfiles WHERE Oid = @Oid')
  return res.recordset.length ? rowToProfile(res.recordset[0]) : { ...DEFAULT_PROFILE_ROW }
}

export async function saveTheme(oid: string, theme: ThemePreference): Promise<void> {
  const pool = await getPool()
  await pool.request()
    .input('Oid', sql.NVarChar, oid)
    .input('Theme', sql.VarChar, theme)
    .query(
      `MERGE dbo.UserProfiles WITH (HOLDLOCK) AS t
       USING (SELECT @Oid AS Oid) AS s ON t.Oid = s.Oid
       WHEN MATCHED THEN UPDATE SET Theme = @Theme, ModifiedAt = SYSUTCDATETIME()
       WHEN NOT MATCHED THEN INSERT (Oid, Theme) VALUES (@Oid, @Theme);`,
    )
}

/** Record a photo change. `updatedAt` null = photo removed. */
export async function savePhotoState(oid: string, updatedAt: Date | null): Promise<void> {
  const pool = await getPool()
  await pool.request()
    .input('Oid', sql.NVarChar, oid)
    .input('PhotoUpdatedAt', sql.DateTime2, updatedAt)
    .query(
      `MERGE dbo.UserProfiles WITH (HOLDLOCK) AS t
       USING (SELECT @Oid AS Oid) AS s ON t.Oid = s.Oid
       WHEN MATCHED THEN UPDATE SET PhotoUpdatedAt = @PhotoUpdatedAt, ModifiedAt = SYSUTCDATETIME()
       WHEN NOT MATCHED THEN INSERT (Oid, PhotoUpdatedAt) VALUES (@Oid, @PhotoUpdatedAt);`,
    )
}

// ----- activity (from the V4 audit columns) -----------------------------------

export const ACTIVITY_WINDOW_DAYS = 90

// Limitation inherited from the audit model: lists only record their LATEST
// modifier, so "status changes" counts lists where this user made the most
// recent move; deleted items leave no trace.
const RECENT_SQL = `
  SELECT 'item' AS Kind, i.Name AS Label, i.Quantity AS Quantity, l.Id AS ListId, l.Name AS ListName, i.CreatedAt AS At
    FROM dbo.ShoppingItems i JOIN dbo.ShoppingLists l ON l.Id = i.ListId
   WHERE i.CreatedBy = @Oid
  UNION ALL
  SELECT 'status', Status, NULL, Id, Name, ModifiedAt
    FROM dbo.ShoppingLists
   WHERE ModifiedBy = @Oid AND ModifiedAt IS NOT NULL
  UNION ALL
  SELECT 'favourite', Name, DefaultQuantity, NULL, NULL, CreatedAt
    FROM dbo.FavouriteItems
   WHERE CreatedBy = @Oid`

export function rowToActivityEntry(r: any): ProfileActivityEntry {
  return {
    kind: r.Kind as ProfileActivityKind,
    label: r.Label,
    quantity: r.Quantity ?? null,
    listId: r.ListId ?? null,
    listName: r.ListName ?? null,
    at: toIso(r.At) as string,
  }
}

export async function getActivity(oid: string, now: Date = new Date()): Promise<ProfileActivity> {
  const since = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * 86_400_000)
  const pool = await getPool()
  const res = await pool.request()
    .input('Oid', sql.NVarChar, oid)
    .input('Since', sql.DateTime2, since)
    .query(
      `SELECT
         (SELECT COUNT(*) FROM dbo.ShoppingItems  WHERE CreatedBy  = @Oid AND CreatedAt  >= @Since) AS ItemsAdded,
         (SELECT COUNT(*) FROM dbo.ShoppingLists  WHERE ModifiedBy = @Oid AND ModifiedAt >= @Since) AS StatusChanges,
         (SELECT COUNT(*) FROM dbo.FavouriteItems WHERE CreatedBy  = @Oid AND CreatedAt  >= @Since) AS FavouritesAdded;
       SELECT TOP (8) * FROM (${RECENT_SQL}) a ORDER BY At DESC;`,
    )
  const [counts, recent] = res.recordsets as any[][]
  return {
    windowDays: ACTIVITY_WINDOW_DAYS,
    itemsAdded: counts[0].ItemsAdded,
    statusChanges: counts[0].StatusChanges,
    favouritesAdded: counts[0].FavouritesAdded,
    recent: recent.map(rowToActivityEntry),
  }
}

/** Everything attributed to the user, for the "Download my data" export. */
export async function getAllActivity(oid: string): Promise<ProfileActivityEntry[]> {
  const pool = await getPool()
  const res = await pool.request()
    .input('Oid', sql.NVarChar, oid)
    .query(`SELECT * FROM (${RECENT_SQL}) a ORDER BY At DESC`)
  return res.recordset.map(rowToActivityEntry)
}

// ----- account deletion -------------------------------------------------------

/**
 * Remove the user's personal data from SQL in one transaction:
 *  - shared lists/items/favourites keep their rows (the household still needs
 *    them) but every name stamped by this user becomes "Former member";
 *  - the UserProfiles row is deleted.
 * The oid columns are kept: an opaque id of a deleted account identifies no one,
 * and keeping it preserves "who did what" grouping in the audit trail.
 */
export async function anonymiseAndDeleteProfile(oid: string): Promise<void> {
  const pool = await getPool()
  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    await new sql.Request(tx)
      .input('Oid', sql.NVarChar, oid)
      .input('Former', sql.NVarChar, FORMER_MEMBER_NAME)
      .query(
        `UPDATE dbo.ShoppingLists  SET CreatedByName  = @Former WHERE CreatedBy  = @Oid;
         UPDATE dbo.ShoppingLists  SET ModifiedByName = @Former WHERE ModifiedBy = @Oid;
         UPDATE dbo.ShoppingItems  SET CreatedByName  = @Former WHERE CreatedBy  = @Oid;
         UPDATE dbo.ShoppingItems  SET ModifiedByName = @Former WHERE ModifiedBy = @Oid;
         UPDATE dbo.FavouriteItems SET CreatedByName  = @Former WHERE CreatedBy  = @Oid;
         UPDATE dbo.FavouriteItems SET ModifiedByName = @Former WHERE ModifiedBy = @Oid;
         DELETE FROM dbo.UserProfiles WHERE Oid = @Oid;`,
      )
    await tx.commit()
  } catch (err) {
    await tx.rollback().catch(() => undefined)
    throw err
  }
}
