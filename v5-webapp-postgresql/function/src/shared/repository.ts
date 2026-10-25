import { randomUUID } from 'node:crypto'
import type { FavouriteItem, ListStatus, ShoppingItem, ShoppingList } from '../../domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '../../domain/rules'
import { getPool } from './db'
import { rowToFav, rowToItem, rowToList, normaliseName } from './rows'
import { ApiError, isUniqueViolation } from './http'

export interface CreateListInput { weekStartDate: string }
export interface AddItemInput { name: string; quantity: number; notes?: string }
export interface AddFavouriteInput { name: string; defaultQuantity: number }

// Schema: db/migrations/002_init_schema.sql (schema "app", snake_case columns).
const LIST_COLS = 'id, name, week_start_date, week_end_date, status, created_at, ordered_at, delivered_at'
const ITEM_COLS = 'id, list_id, name, quantity, notes, created_at'
const FAV_COLS  = 'id, name, default_quantity, created_at'

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
  try {
    // 'YYYY-MM-DD' strings go straight into the DATE columns — no JS Date, no timezone shift.
    await getPool().query(
      `INSERT INTO app.shopping_lists (id, name, week_start_date, week_end_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [list.id, list.name, list.weekStartDate, list.weekEndDate, list.status, list.createdAt],
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
  const res = await getPool().query(
    `SELECT ${LIST_COLS} FROM app.shopping_lists WHERE id = $1`,
    [id],
  )
  return res.rows.length ? rowToList(res.rows[0]) : null
}

export async function getCurrentList(now: Date): Promise<ShoppingList | null> {
  return getListById(getCurrentWeekStart(now))
}

export async function listAllLists(): Promise<ShoppingList[]> {
  const res = await getPool().query(
    `SELECT ${LIST_COLS} FROM app.shopping_lists ORDER BY week_start_date DESC`,
  )
  return res.rows.map(rowToList)
}

export async function transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
  const current = await getListById(listId)
  if (!current) throw new ApiError(404, `List ${listId} not found`)
  if (!canTransition(current.status, next)) {
    throw new ApiError(409, `Illegal transition ${current.status} → ${next}`)
  }
  // Atomic compare-and-set: the WHERE re-checks the status we validated against, so two
  // concurrent "Mark ordered" requests can't both succeed (V3 read-then-wrote, which could).
  const res = await getPool().query(
    `UPDATE app.shopping_lists
     SET status       = $2,
         ordered_at   = CASE WHEN $2 = 'Ordered'   THEN $4::timestamptz ELSE ordered_at   END,
         delivered_at = CASE WHEN $2 = 'Delivered' THEN $4::timestamptz ELSE delivered_at END
     WHERE id = $1 AND status = $3
     RETURNING ${LIST_COLS}`,
    [listId, next, current.status, new Date().toISOString()],
  )
  if (res.rowCount === 0) {
    throw new ApiError(409, `List ${listId} was changed by another request; reload and retry`)
  }
  return rowToList(res.rows[0])
}

// ---------- Items ----------

export async function listItems(listId: string): Promise<ShoppingItem[]> {
  const res = await getPool().query(
    `SELECT ${ITEM_COLS} FROM app.shopping_items WHERE list_id = $1 ORDER BY created_at`,
    [listId],
  )
  return res.rows.map(rowToItem)
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
  await getPool().query(
    `INSERT INTO app.shopping_items (id, list_id, name, quantity, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [item.id, item.listId, item.name, item.quantity, item.notes, item.createdAt],
  )
  return item
}

export async function removeItem(itemId: string): Promise<void> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  // Deleting a missing item affects 0 rows and does not throw — that is fine.
  await getPool().query('DELETE FROM app.shopping_items WHERE id = $1', [itemId])
}

export async function updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  // RETURNING goes at the end (T-SQL's OUTPUT INSERTED.* sat between SET and WHERE).
  const res = await getPool().query(
    `UPDATE app.shopping_items SET notes = $2 WHERE id = $1 RETURNING ${ITEM_COLS}`,
    [itemId, notes],
  )
  if (res.rowCount === 0) throw new ApiError(404, `Item ${itemId} not found`)
  return rowToItem(res.rows[0])
}

// ---------- Favourites ----------

export async function listFavourites(): Promise<FavouriteItem[]> {
  // lower(): PostgreSQL compares case-sensitively; V3's CI collation sorted case-insensitively.
  const res = await getPool().query(
    `SELECT ${FAV_COLS} FROM app.favourite_items ORDER BY lower(name)`,
  )
  return res.rows.map(rowToFav)
}

export async function addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
  const name = input.name.trim()
  const fav: FavouriteItem = {
    id: normaliseName(name),
    name,
    defaultQuantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
    createdAt: new Date().toISOString(),
  }
  try {
    // normalised_name is a GENERATED column — the DB derives it, and rejects writes to it.
    await getPool().query(
      `INSERT INTO app.favourite_items (id, name, default_quantity, created_at)
       VALUES ($1, $2, $3, $4)`,
      [fav.id, fav.name, fav.defaultQuantity, fav.createdAt],
    )
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, `Favourite "${name}" already exists`)
    throw err
  }
  return fav
}

export async function removeFavourite(favouriteId: string): Promise<void> {
  await getPool().query('DELETE FROM app.favourite_items WHERE id = $1', [favouriteId])
}

export async function reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
  const res = await getPool().query(
    `SELECT ${FAV_COLS} FROM app.favourite_items WHERE id = $1`,
    [favouriteId],
  )
  if (res.rows.length === 0) throw new ApiError(404, `Favourite ${favouriteId} not found`)
  const fav = rowToFav(res.rows[0])
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
