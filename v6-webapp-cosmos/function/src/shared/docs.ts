import type { FavouriteItem, ListStatus, ShoppingItem, ShoppingList } from '../../domain/types'

// Document shapes as stored in Cosmos (see shared-docs/v6/v6-plan.html §6).
// Cosmos adds system properties (_rid, _self, _etag, _attachments, _ts) on read; the mappers
// below copy an explicit allow-list of fields so those never leak into the API.

export interface ItemDoc {
  id: string            // '<listId>__<uuid>' — the prefix locates the parent list document
  name: string
  quantity: number
  notes: string
  createdAt: string
}

export interface ListDoc {
  id: string            // = weekStartDate
  weekStartDate: string // partition key
  name: string
  weekEndDate: string
  status: ListStatus
  createdAt: string
  orderedAt: string | null
  deliveredAt: string | null
  items: ItemDoc[]      // embedded: one document = one atomic unit for "is it still Draft?"
  _etag?: string
}

export interface FavDoc {
  id: string            // = normalisedName; also the partition key, so duplicates get a native 409
  name: string
  normalisedName: string
  defaultQuantity: number
  createdAt: string
}

export function docToList(d: ListDoc): ShoppingList {
  return {
    id: d.id, name: d.name,
    weekStartDate: d.weekStartDate,
    weekEndDate: d.weekEndDate,
    status: d.status,
    createdAt: d.createdAt,
    orderedAt: d.orderedAt ?? null,
    deliveredAt: d.deliveredAt ?? null,
  }
}

// listId isn't stored on embedded items — it's the parent's id.
export function docToItem(listId: string, i: ItemDoc): ShoppingItem {
  return { id: i.id, listId, name: i.name, quantity: i.quantity, notes: i.notes ?? '', createdAt: i.createdAt }
}

export function docToFav(d: FavDoc): FavouriteItem {
  return { id: d.id, name: d.name, defaultQuantity: d.defaultQuantity, createdAt: d.createdAt }
}

export const normaliseName = (name: string) => name.trim().toLowerCase()

// '<listId>__<uuid>' → '<listId>' (also the list's partition key value).
export const listIdOf = (itemId: string) => itemId.split('__')[0]
