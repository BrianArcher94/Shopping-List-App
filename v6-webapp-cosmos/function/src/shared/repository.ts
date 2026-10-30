import { randomUUID } from 'node:crypto'
import type { PatchRequestBody } from '@azure/cosmos'
import type { FavouriteItem, ListStatus, ShoppingItem, ShoppingList } from '../../domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '../../domain/rules'
import { charged, getFavourites, getLists } from './cosmos'
import { docToFav, docToItem, docToList, listIdOf, normaliseName, type FavDoc, type ItemDoc, type ListDoc } from './docs'
import { addItemPatch, removeItemPatch, setNotesPatch, transitionPatch } from './patches'
import { ApiError, cosmosStatus } from './http'

export interface CreateListInput { weekStartDate: string }
export interface AddItemInput { name: string; quantity: number; notes?: string }
export interface AddFavouriteInput { name: string; defaultQuantity: number }

// Containers: shoppingLists (PK /weekStartDate, id = weekStartDate, items embedded) and
// favouriteItems (PK /id). Every list operation is addressed by id + partition key (a point
// operation); History and Favourites are the only queries.

// History projection: summary fields only — never drag every week's items back.
const LIST_SUMMARY_QUERY =
  'SELECT c.id, c.name, c.weekStartDate, c.weekEndDate, c.status, c.createdAt, c.orderedAt, c.deliveredAt ' +
  'FROM c ORDER BY c.weekStartDate DESC'
const FAV_QUERY =
  'SELECT c.id, c.name, c.normalisedName, c.defaultQuantity, c.createdAt FROM c ORDER BY c.normalisedName'

// ---------- Lists ----------

export async function createList(input: CreateListInput): Promise<ShoppingList> {
  const doc: ListDoc = {
    id: input.weekStartDate,
    weekStartDate: input.weekStartDate,
    name: formatWeekLabel(input.weekStartDate),
    weekEndDate: getWeekEnd(input.weekStartDate),
    status: 'Draft',
    createdAt: new Date().toISOString(),
    orderedAt: null,
    deliveredAt: null,
    items: [],
  }
  try {
    charged('createList', await getLists().items.create(doc))
  } catch (err) {
    // Same id in the same partition → native 409 (replaces V5's PK/UNIQUE violation).
    if (cosmosStatus(err) === 409) {
      throw new ApiError(409, `A list for week ${input.weekStartDate} already exists`)
    }
    throw err
  }
  return docToList(doc)
}

export async function getListById(id: string): Promise<ShoppingList | null> {
  const doc = await readList(id)
  return doc ? docToList(doc) : null
}

export async function getCurrentList(now: Date): Promise<ShoppingList | null> {
  return getListById(getCurrentWeekStart(now))
}

export async function listAllLists(): Promise<ShoppingList[]> {
  // The one cross-partition query: no partition key in the filter, so it fans out.
  const res = charged('listAllLists', await getLists().items.query<ListDoc>(LIST_SUMMARY_QUERY).fetchAll())
  return res.resources.map(docToList)
}

export async function transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
  const current = await readList(listId)
  if (!current) throw new ApiError(404, `List ${listId} not found`)
  if (!canTransition(current.status, next)) {
    throw new ApiError(409, `Illegal transition ${current.status} → ${next}`)
  }
  try {
    const res = await patchList('transitionStatus', listId,
      transitionPatch(current.status, next, new Date().toISOString()))
    return docToList(res)
  } catch (err) {
    // The status moved between our read and the patch (e.g. a concurrent "Mark ordered").
    if (cosmosStatus(err) === 412) {
      throw new ApiError(409, `List ${listId} was changed by another request; reload and retry`)
    }
    throw err
  }
}

// ---------- Items ----------

export async function listItems(listId: string): Promise<ShoppingItem[]> {
  const doc = await readList(listId)
  // Missing list → [] (V5's query just returned no rows). Array order = insertion = created order.
  return doc ? doc.items.map((i) => docToItem(listId, i)) : []
}

export async function addItem(listId: string, input: AddItemInput): Promise<ShoppingItem> {
  const item: ItemDoc = {
    id: `${listId}__${randomUUID()}`,
    name: input.name.trim(),
    quantity: Math.max(1, Math.floor(input.quantity || 1)),
    notes: input.notes ?? '',
    createdAt: new Date().toISOString(),
  }
  try {
    // Condition status = 'Draft' makes the editability check and the append one atomic write.
    await patchList('addItem', listId, addItemPatch(item))
  } catch (err) {
    const status = cosmosStatus(err)
    if (status === 404) throw new ApiError(404, `List ${listId} not found`)
    // Missing documents give 404, never 412 — so a 412 here can only mean "not Draft".
    if (status === 412) throw new ApiError(409, `List ${listId} is read-only`)
    throw err
  }
  return docToItem(listId, item)
}

export async function removeItem(itemId: string): Promise<void> {
  // Removing a missing item is a no-op, as V5's 0-row DELETE was.
  await editItem('removeItem', itemId, (index) => removeItemPatch(index))
}

export async function updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
  const listId = listIdOf(itemId)
  const updated = await editItem('updateItemNotes', itemId, (index) => setNotesPatch(index, notes))
  const item = updated?.items.find((i) => i.id === itemId)
  if (!item) throw new ApiError(404, `Item ${itemId} not found`)
  return docToItem(listId, item)
}

// ---------- Favourites ----------

export async function listFavourites(): Promise<FavouriteItem[]> {
  // normalisedName reproduces V5's ORDER BY lower(name); needs the /normalisedName/? range index.
  const res = charged('listFavourites', await getFavourites().items.query<FavDoc>(FAV_QUERY).fetchAll())
  return res.resources.map(docToFav)
}

export async function addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
  const name = input.name.trim()
  const doc: FavDoc = {
    id: normaliseName(name),
    name,
    normalisedName: normaliseName(name),   // no generated columns — stored explicitly for sorting
    defaultQuantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
    createdAt: new Date().toISOString(),
  }
  try {
    charged('addFavourite', await getFavourites().items.create(doc))
  } catch (err) {
    // id is also the partition key, so a duplicate name is a native 409.
    if (cosmosStatus(err) === 409) throw new ApiError(409, `Favourite "${name}" already exists`)
    throw err
  }
  return docToFav(doc)
}

export async function removeFavourite(favouriteId: string): Promise<void> {
  try {
    charged('removeFavourite', await getFavourites().item(favouriteId, favouriteId).delete())
  } catch (err) {
    // Cosmos throws 404 where SQL affected 0 rows — keep V5's "deleting nothing is fine" (204).
    if (cosmosStatus(err) !== 404) throw err
  }
}

export async function reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
  const res = charged('reuseFavourite', await getFavourites().item(favouriteId, favouriteId).read<FavDoc>())
  if (!res.resource) throw new ApiError(404, `Favourite ${favouriteId} not found`)
  const fav = docToFav(res.resource)
  return addItem(listId, { name: fav.name, quantity: fav.defaultQuantity })
}

// ---------- internal ----------

// Point read (~1 RU): id and partition key are both the week start date. 404 → undefined.
async function readList(id: string): Promise<ListDoc | undefined> {
  const res = charged('readList', await getLists().item(id, id).read<ListDoc>())
  return res.resource
}

async function patchList(op: string, listId: string, body: PatchRequestBody, etag?: string): Promise<ListDoc> {
  const options = etag ? { accessCondition: { type: 'IfMatch', condition: etag } } : undefined
  const res = charged(op, await getLists().item(listId, listId).patch<ListDoc>(body, options))
  return res.resource
}

// Read → check editable → patch by array index with IfMatch. The ETag guarantees the index
// still points at the same item; if the document moved on (412), re-read and try once more.
// Returns the patched document, or undefined if the item doesn't exist.
async function editItem(
  op: string,
  itemId: string,
  buildPatch: (index: number) => PatchRequestBody,
): Promise<ListDoc | undefined> {
  const listId = listIdOf(itemId)
  for (let attempt = 1; ; attempt++) {
    const doc = await readList(listId)
    if (!doc) throw new ApiError(404, `List ${listId} not found`)
    if (isReadOnly(docToList(doc))) {
      throw new ApiError(409, `List ${listId} is read-only (${doc.status})`)
    }
    const index = doc.items.findIndex((i) => i.id === itemId)
    if (index === -1) return undefined
    try {
      return await patchList(op, listId, buildPatch(index), doc._etag)
    } catch (err) {
      if (cosmosStatus(err) !== 412) throw err
      if (attempt >= 2) {
        throw new ApiError(409, `List ${listId} was changed by another request; reload and retry`)
      }
    }
  }
}
