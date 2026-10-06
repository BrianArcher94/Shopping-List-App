import { randomUUID } from 'node:crypto'
import sql from 'mssql'
import type { FavouriteItem, ListStatus, ShoppingItem, ShoppingList } from '../../domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '../../domain/rules'
import { getPool } from './db'
import { FAV_COLS, ITEM_COLS, LIST_COLS, rowToFav, rowToItem, rowToList, normaliseName } from './rows'
import { ApiError, isUniqueViolation } from './http'
import type { Principal } from './auth'

export interface CreateListInput { weekStartDate: string }
export interface AddItemInput { name: string; quantity: number; notes?: string }
export interface AddFavouriteInput { name: string; defaultQuantity: number }

// V4: every write takes the acting Principal (required, so the compiler finds
// every call site). Creates stamp Created*; status changes and note edits stamp
// Modified*. Deletes leave nothing behind — accepted V4 limitation.

// ---------- Lists ----------

export async function createList(input: CreateListInput, actor: Principal): Promise<ShoppingList> {
  const list: ShoppingList = {
    id: input.weekStartDate,
    name: formatWeekLabel(input.weekStartDate),
    weekStartDate: input.weekStartDate,
    weekEndDate: getWeekEnd(input.weekStartDate),
    status: 'Draft',
    createdAt: new Date().toISOString(),
    orderedAt: null,
    deliveredAt: null,
    createdBy: actor.oid,
    createdByName: actor.name,
    modifiedBy: null,
    modifiedByName: null,
    modifiedAt: null,
  }
  const pool = await getPool()
  try {
    await pool.request()
      .input('Id', sql.NVarChar, list.id)
      .input('Name', sql.NVarChar, list.name)
      .input('WeekStartDate', sql.Date, new Date(list.weekStartDate))
      .input('WeekEndDate', sql.Date, new Date(list.weekEndDate))
      .input('Status', sql.VarChar, list.status)
      .input('CreatedAt', sql.DateTime2, new Date(list.createdAt))
      .input('CreatedBy', sql.NVarChar, list.createdBy)
      .input('CreatedByName', sql.NVarChar, list.createdByName)
      .query(
        `INSERT INTO dbo.ShoppingLists (Id, Name, WeekStartDate, WeekEndDate, Status, CreatedAt, CreatedBy, CreatedByName)
         VALUES (@Id, @Name, @WeekStartDate, @WeekEndDate, @Status, @CreatedAt, @CreatedBy, @CreatedByName)`,
      )
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, `A list for week ${input.weekStartDate} already exists`)
    }
    throw err
  }
  return list
}

export async function getListById(id: string): Promise<ShoppingList | null> {
  const pool = await getPool()
  const res = await pool.request()
    .input('Id', sql.NVarChar, id)
    .query(`SELECT ${LIST_COLS} FROM dbo.ShoppingLists WHERE Id = @Id`)
  return res.recordset.length ? rowToList(res.recordset[0]) : null
}

export async function getCurrentList(now: Date): Promise<ShoppingList | null> {
  return getListById(getCurrentWeekStart(now))
}

export async function listAllLists(): Promise<ShoppingList[]> {
  const pool = await getPool()
  const res = await pool.request().query(
    `SELECT ${LIST_COLS} FROM dbo.ShoppingLists ORDER BY WeekStartDate DESC`,
  )
  return res.recordset.map(rowToList)
}

export async function transitionStatus(listId: string, next: ListStatus, actor: Principal): Promise<ShoppingList> {
  const current = await getListById(listId)
  if (!current) throw new ApiError(404, `List ${listId} not found`)
  if (!canTransition(current.status, next)) {
    throw new ApiError(409, `Illegal transition ${current.status} → ${next}`)
  }
  const now = new Date().toISOString()
  const updated: ShoppingList = {
    ...current,
    status: next,
    orderedAt: next === 'Ordered' ? now : current.orderedAt,
    deliveredAt: next === 'Delivered' ? now : current.deliveredAt,
    modifiedBy: actor.oid,
    modifiedByName: actor.name,
    modifiedAt: now,
  }
  const pool = await getPool()
  await pool.request()
    .input('Id', sql.NVarChar, updated.id)
    .input('Status', sql.VarChar, updated.status)
    .input('OrderedAt', sql.DateTime2, updated.orderedAt ? new Date(updated.orderedAt) : null)
    .input('DeliveredAt', sql.DateTime2, updated.deliveredAt ? new Date(updated.deliveredAt) : null)
    .input('ModifiedBy', sql.NVarChar, actor.oid)
    .input('ModifiedByName', sql.NVarChar, actor.name)
    .input('ModifiedAt', sql.DateTime2, new Date(now))
    .query(
      `UPDATE dbo.ShoppingLists
       SET Status = @Status, OrderedAt = @OrderedAt, DeliveredAt = @DeliveredAt,
           ModifiedBy = @ModifiedBy, ModifiedByName = @ModifiedByName, ModifiedAt = @ModifiedAt
       WHERE Id = @Id`,
    )
  return updated
}

// ---------- Items ----------

export async function listItems(listId: string): Promise<ShoppingItem[]> {
  const pool = await getPool()
  const res = await pool.request()
    .input('ListId', sql.NVarChar, listId)
    .query(`SELECT ${ITEM_COLS} FROM dbo.ShoppingItems WHERE ListId = @ListId ORDER BY CreatedAt`)
  return res.recordset.map(rowToItem)
}

export async function addItem(listId: string, input: AddItemInput, actor: Principal): Promise<ShoppingItem> {
  await assertEditable(listId)
  const item: ShoppingItem = {
    id: `${listId}__${randomUUID()}`,
    listId,
    name: input.name.trim(),
    quantity: Math.max(1, Math.floor(input.quantity || 1)),
    notes: input.notes ?? '',
    createdAt: new Date().toISOString(),
    createdBy: actor.oid,
    createdByName: actor.name,
    modifiedBy: null,
    modifiedByName: null,
    modifiedAt: null,
  }
  const pool = await getPool()
  await pool.request()
    .input('Id', sql.NVarChar, item.id)
    .input('ListId', sql.NVarChar, item.listId)
    .input('Name', sql.NVarChar, item.name)
    .input('Quantity', sql.Int, item.quantity)
    .input('Notes', sql.NVarChar, item.notes)
    .input('CreatedAt', sql.DateTime2, new Date(item.createdAt))
    .input('CreatedBy', sql.NVarChar, item.createdBy)
    .input('CreatedByName', sql.NVarChar, item.createdByName)
    .query(
      `INSERT INTO dbo.ShoppingItems (Id, ListId, Name, Quantity, Notes, CreatedAt, CreatedBy, CreatedByName)
       VALUES (@Id, @ListId, @Name, @Quantity, @Notes, @CreatedAt, @CreatedBy, @CreatedByName)`,
    )
  return item
}

export async function removeItem(itemId: string): Promise<void> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  const pool = await getPool()
  // Deleting a missing item affects 0 rows and does not throw — that is fine.
  await pool.request()
    .input('Id', sql.NVarChar, itemId)
    .query('DELETE FROM dbo.ShoppingItems WHERE Id = @Id')
}

export async function updateItemNotes(itemId: string, notes: string, actor: Principal): Promise<ShoppingItem> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  const pool = await getPool()
  const outputCols = ITEM_COLS.split(', ').map((c) => `INSERTED.${c}`).join(', ')
  const res = await pool.request()
    .input('Id', sql.NVarChar, itemId)
    .input('Notes', sql.NVarChar, notes)
    .input('ModifiedBy', sql.NVarChar, actor.oid)
    .input('ModifiedByName', sql.NVarChar, actor.name)
    .query(
      `UPDATE dbo.ShoppingItems
       SET Notes = @Notes, ModifiedBy = @ModifiedBy, ModifiedByName = @ModifiedByName, ModifiedAt = SYSUTCDATETIME()
       OUTPUT ${outputCols}
       WHERE Id = @Id`,
    )
  if (res.recordset.length === 0) throw new ApiError(404, `Item ${itemId} not found`)
  return rowToItem(res.recordset[0])
}

// ---------- Favourites ----------

export async function listFavourites(): Promise<FavouriteItem[]> {
  const pool = await getPool()
  const res = await pool.request().query(
    `SELECT ${FAV_COLS} FROM dbo.FavouriteItems ORDER BY Name`,
  )
  return res.recordset.map(rowToFav)
}

export async function addFavourite(input: AddFavouriteInput, actor: Principal): Promise<FavouriteItem> {
  const name = input.name.trim()
  const fav: FavouriteItem = {
    id: normaliseName(name),
    name,
    defaultQuantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
    createdAt: new Date().toISOString(),
    createdBy: actor.oid,
    createdByName: actor.name,
    modifiedBy: null,
    modifiedByName: null,
    modifiedAt: null,
  }
  const pool = await getPool()
  try {
    await pool.request()
      .input('Id', sql.NVarChar, fav.id)
      .input('Name', sql.NVarChar, fav.name)
      .input('NormalisedName', sql.NVarChar, normaliseName(name))
      .input('DefaultQuantity', sql.Int, fav.defaultQuantity)
      .input('CreatedAt', sql.DateTime2, new Date(fav.createdAt))
      .input('CreatedBy', sql.NVarChar, fav.createdBy)
      .input('CreatedByName', sql.NVarChar, fav.createdByName)
      .query(
        `INSERT INTO dbo.FavouriteItems (Id, Name, NormalisedName, DefaultQuantity, CreatedAt, CreatedBy, CreatedByName)
         VALUES (@Id, @Name, @NormalisedName, @DefaultQuantity, @CreatedAt, @CreatedBy, @CreatedByName)`,
      )
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, `Favourite "${name}" already exists`)
    throw err
  }
  return fav
}

export async function removeFavourite(favouriteId: string): Promise<void> {
  const pool = await getPool()
  await pool.request()
    .input('Id', sql.NVarChar, favouriteId)
    .query('DELETE FROM dbo.FavouriteItems WHERE Id = @Id')
}

export async function reuseFavourite(listId: string, favouriteId: string, actor: Principal): Promise<ShoppingItem> {
  const pool = await getPool()
  const res = await pool.request()
    .input('Id', sql.NVarChar, favouriteId)
    .query(`SELECT ${FAV_COLS} FROM dbo.FavouriteItems WHERE Id = @Id`)
  if (res.recordset.length === 0) throw new ApiError(404, `Favourite ${favouriteId} not found`)
  const fav = rowToFav(res.recordset[0])
  return addItem(listId, { name: fav.name, quantity: fav.defaultQuantity }, actor)
}

// ---------- internal ----------

async function assertEditable(listId: string): Promise<void> {
  const list = await getListById(listId)
  if (!list) throw new ApiError(404, `List ${listId} not found`)
  if (isReadOnly(list)) {
    throw new ApiError(409, `List ${listId} is read-only (${list.status})`)
  }
}
