import { randomUUID } from 'node:crypto'
import type { FavouriteItem, ListStatus, ShoppingItem, ShoppingList } from '../../domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '../../domain/rules'
import { getTableClient, TABLES } from './tables'
import {
  entityToFav, entityToItem, entityToList,
  favToEntity, itemToEntity, listToEntity,
  normaliseName,
  type FavEntity, type ItemEntity, type ListEntity,
} from './entities'
import { ApiError, hasStatus } from './http'

export interface CreateListInput { weekStartDate: string }
export interface AddItemInput { name: string; quantity: number; notes?: string }
export interface AddFavouriteInput { name: string; defaultQuantity: number }

// ---------- Lists ----------

export async function createList(input: CreateListInput): Promise<ShoppingList> {
  const client = getTableClient(TABLES.lists)
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
    await client.createEntity(listToEntity(list))
  } catch (err) {
    if (hasStatus(err, 409)) {
      throw new ApiError(409, `A list for week ${input.weekStartDate} already exists`)
    }
    throw err
  }
  return list
}

export async function getListById(id: string): Promise<ShoppingList | null> {
  const client = getTableClient(TABLES.lists)
  try {
    const e = await client.getEntity<ListEntity>('LIST', id)
    return entityToList(e)
  } catch (err) {
    if (hasStatus(err, 404)) return null
    throw err
  }
}

export async function getCurrentList(now: Date): Promise<ShoppingList | null> {
  return getListById(getCurrentWeekStart(now))
}

export async function listAllLists(): Promise<ShoppingList[]> {
  const client = getTableClient(TABLES.lists)
  const out: ShoppingList[] = []
  const entities = client.listEntities<ListEntity>({
    queryOptions: { filter: "PartitionKey eq 'LIST'" },
  })
  for await (const e of entities) out.push(entityToList(e))
  return out.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
}

export async function transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
  const client = getTableClient(TABLES.lists)
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
  await client.updateEntity(listToEntity(updated), 'Replace')
  return updated
}

// ---------- Items ----------

export async function listItems(listId: string): Promise<ShoppingItem[]> {
  const client = getTableClient(TABLES.items)
  const out: ShoppingItem[] = []
  const entities = client.listEntities<ItemEntity>({
    queryOptions: { filter: `PartitionKey eq '${listId}'` },
  })
  for await (const e of entities) out.push(entityToItem(e))
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addItem(listId: string, input: AddItemInput): Promise<ShoppingItem> {
  await assertEditable(listId)
  const client = getTableClient(TABLES.items)
  const item: ShoppingItem = {
    id: `${listId}__${randomUUID()}`,
    listId,
    name: input.name.trim(),
    quantity: Math.max(1, Math.floor(input.quantity || 1)),
    notes: input.notes ?? '',
    createdAt: new Date().toISOString(),
  }
  await client.createEntity(itemToEntity(item))
  return item
}

export async function removeItem(itemId: string): Promise<void> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  const client = getTableClient(TABLES.items)
  try {
    await client.deleteEntity(listId, itemId)
  } catch (err) {
    if (!hasStatus(err, 404)) throw err   // deleting a missing item is fine
  }
}

export async function updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
  const listId = itemId.split('__')[0]
  await assertEditable(listId)
  const client = getTableClient(TABLES.items)
  let existing: ItemEntity
  try {
    existing = await client.getEntity<ItemEntity>(listId, itemId)
  } catch (err) {
    if (hasStatus(err, 404)) throw new ApiError(404, `Item ${itemId} not found`)
    throw err
  }
  const updated = { ...existing, notes }
  await client.updateEntity(updated, 'Merge')
  return entityToItem(updated)
}

// ---------- Favourites ----------

export async function listFavourites(): Promise<FavouriteItem[]> {
  const client = getTableClient(TABLES.favourites)
  const out: FavouriteItem[] = []
  const entities = client.listEntities<FavEntity>({
    queryOptions: { filter: "PartitionKey eq 'FAV'" },
  })
  for await (const e of entities) out.push(entityToFav(e))
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export async function addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
  const client = getTableClient(TABLES.favourites)
  const name = input.name.trim()
  const fav: FavouriteItem = {
    id: normaliseName(name),
    name,
    defaultQuantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
    createdAt: new Date().toISOString(),
  }
  try {
    await client.createEntity(favToEntity(fav))
  } catch (err) {
    if (hasStatus(err, 409)) throw new ApiError(409, `Favourite "${name}" already exists`)
    throw err
  }
  return fav
}

export async function removeFavourite(favouriteId: string): Promise<void> {
  const client = getTableClient(TABLES.favourites)
  try {
    await client.deleteEntity('FAV', favouriteId)
  } catch (err) {
    if (!hasStatus(err, 404)) throw err
  }
}

export async function reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
  const client = getTableClient(TABLES.favourites)
  let fav: FavEntity
  try {
    fav = await client.getEntity<FavEntity>('FAV', favouriteId)
  } catch (err) {
    if (hasStatus(err, 404)) throw new ApiError(404, `Favourite ${favouriteId} not found`)
    throw err
  }
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