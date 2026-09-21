import { randomUUID } from 'node:crypto'
import sql from 'mssql'
import type { FavouriteItem, ListStatus, ShoppingItem, ShoppingList } from '../../domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '../../domain/rules'
import { getPool } from './db'
import { rowToFav, rowToItem, rowToList, normaliseName } from './rows'
import { ApiError, isUniqueViolation } from './http'

export interface CreateListInput { weekStartDate: string }
export interface AddItemInput { name: string; quantity: number; notes?: string }
export interface AddFavouriteInput { name: string; defaultQuantity: number }

// ---------- Lists ----------

export async function createList(input: CreateListInput): Promise<ShoppingList> {
  const list: ShoppingList = {
    id: input.weekStartDate,
    name: formatWeekLabel(input.weekStartDate),
    weekStartDate: input.weekStartDate,
    weekEndDate: getWeekEnd(input.weekStartDate),
    status: 'Draft',
    createdAt: new Date().toISOString(),
    orderedAt: null,
    deliveredAt: null,
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
      .query(
        `INSERT INTO dbo.ShoppingLists (Id, Name, WeekStartDate, WeekEndDate, Status, CreatedAt)
         VALUES (@Id, @Name, @WeekStartDate, @WeekEndDate, @Status, @CreatedAt)`,
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
    .query(
      `SELECT Id, Name, WeekStartDate, WeekEndDate, Status, CreatedAt, OrderedAt, DeliveredAt
       FROM dbo.ShoppingLists WHERE Id = @Id`,
    )
  return res.recordset.length ? rowToList(res.recordset[0]) : null
}

export async function getCurrentList(now: Date): Promise<ShoppingList | null> {
  return getListById(getCurrentWeekStart(now))
}

export async function listAllLists(): Promise<ShoppingList[]> {
  const pool = await getPool()
  const res = await pool.request().query(
    `SELECT Id, Name, WeekStartDate, WeekEndDate, Status, CreatedAt, OrderedAt, DeliveredAt
     FROM dbo.ShoppingLists ORDER BY WeekStartDate DESC`,
  )
  return res.recordset.map(rowToList)
}

export async function transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
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
  }
  const pool = await getPool()
  await pool.request()
    .input('Id', sql.NVarChar, updated.id)
    .input('Status', sql.VarChar, updated.status)
    .input('OrderedAt', sql.DateTime2, updated.orderedAt ? new Date(updated.orderedAt) : null)
    .input('DeliveredAt', sql.DateTime2, updated.deliveredAt ? new Date(updated.deliveredAt) : null)
    .query(
      `UPDATE dbo.ShoppingLists
       SET Status = @Status, OrderedAt = @OrderedAt, DeliveredAt = @DeliveredAt
       WHERE Id = @Id`,
    )
  return updated
}

// ---------- Items ----------

export async function listItems(listId: string): Promise<ShoppingItem[]> {
  const pool = await getPool()
  const res = await pool.request()
    .input('ListId', sql.NVarChar, listId)
    .query(
      `SELECT Id, ListId, Name, Quantity, Notes, CreatedAt
       FROM dbo.ShoppingItems WHERE ListId = @ListId ORDER BY CreatedAt`,
    )
  return res.recordset.map(rowToItem)
}

export async function addItem(listId: string, input: AddItemInput): Promise<ShoppingItem> {
  await assertEditable(listId)
  const item: ShoppingItem = {
    id: `${listId}__${randomUUID()}`,
    listId,
    name: input.name.trim(),
    quantity: Math.max(1, Math.floor(input.quantity || 1)),
    notes: input.notes ?? '',
    createdAt: new Date().toISOString(),
  }
  const pool = await getPool()
  await pool.request()
    .input('Id', sql.NVarChar, item.id)
    .input('ListId', sql.NVarChar, item.listId)
    .input('Name', sql.NVarChar, item.name)
    .input('Quantity', sql.Int, item.quantity)
    .input('Notes', sql.NVarChar, item.notes)
    .input('CreatedAt', sql.DateTime2, new Date(item.createdAt))
    .query(
      `INSERT INTO dbo.ShoppingItems (Id, ListId, Name, Quantity, Notes, CreatedAt)
       VALUES (@Id, @ListId, @Name, @Quantity, @Notes, @CreatedAt)`,
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

export async function updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  const pool = await getPool()
  const res = await pool.request()
    .input('Id', sql.NVarChar, itemId)
    .input('Notes', sql.NVarChar, notes)
    .query(
      `UPDATE dbo.ShoppingItems SET Notes = @Notes
       OUTPUT INSERTED.Id, INSERTED.ListId, INSERTED.Name, INSERTED.Quantity, INSERTED.Notes, INSERTED.CreatedAt
       WHERE Id = @Id`,
    )
  if (res.recordset.length === 0) throw new ApiError(404, `Item ${itemId} not found`)
  return rowToItem(res.recordset[0])
}

// ---------- Favourites ----------

export async function listFavourites(): Promise<FavouriteItem[]> {
  const pool = await getPool()
  const res = await pool.request().query(
    `SELECT Id, Name, DefaultQuantity, CreatedAt FROM dbo.FavouriteItems ORDER BY Name`,
  )
  return res.recordset.map(rowToFav)
}

export async function addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
  const name = input.name.trim()
  const fav: FavouriteItem = {
    id: normaliseName(name),
    name,
    defaultQuantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
    createdAt: new Date().toISOString(),
  }
  const pool = await getPool()
  try {
    await pool.request()
      .input('Id', sql.NVarChar, fav.id)
      .input('Name', sql.NVarChar, fav.name)
      .input('NormalisedName', sql.NVarChar, normaliseName(name))
      .input('DefaultQuantity', sql.Int, fav.defaultQuantity)
      .input('CreatedAt', sql.DateTime2, new Date(fav.createdAt))
      .query(
        `INSERT INTO dbo.FavouriteItems (Id, Name, NormalisedName, DefaultQuantity, CreatedAt)
         VALUES (@Id, @Name, @NormalisedName, @DefaultQuantity, @CreatedAt)`,
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

export async function reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
  const pool = await getPool()
  const res = await pool.request()
    .input('Id', sql.NVarChar, favouriteId)
    .query('SELECT Id, Name, DefaultQuantity, CreatedAt FROM dbo.FavouriteItems WHERE Id = @Id')
  if (res.recordset.length === 0) throw new ApiError(404, `Favourite ${favouriteId} not found`)
  const fav = rowToFav(res.recordset[0])
  return addItem(listId, { name: fav.name, quantity: fav.defaultQuantity })
}

// ---------- internal ----------

async function assertEditable(listId: string): Promise<void> {
  const list = await getListById(listId)
  if (!list) throw new ApiError(404, `List ${listId} not found`)
  if (isReadOnly(list)) {
    throw new ApiError(409, `List ${listId} is read-only (${list.status})`)
  }
}
