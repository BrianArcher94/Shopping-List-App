import type { FavouriteItem, ShoppingItem, ShoppingList } from '../../domain/types'

// DATE columns arrive as 'YYYY-MM-DD' strings (type parser in db.ts); timestamptz as Date.
const toDateStr = (d: Date | string) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)
const toIso     = (d: Date | string) => (d instanceof Date ? d.toISOString() : d)

export function rowToList(r: any): ShoppingList {
  return {
    id: r.id, name: r.name,
    weekStartDate: toDateStr(r.week_start_date),
    weekEndDate:   toDateStr(r.week_end_date),
    status: r.status,
    createdAt:   toIso(r.created_at),
    orderedAt:   r.ordered_at   ? toIso(r.ordered_at)   : null,   // real NULL
    deliveredAt: r.delivered_at ? toIso(r.delivered_at) : null,
  }
}

export function rowToItem(r: any): ShoppingItem {
  return { id: r.id, listId: r.list_id, name: r.name,
           quantity: r.quantity, notes: r.notes ?? '', createdAt: toIso(r.created_at) }
}

export function rowToFav(r: any): FavouriteItem {
  return { id: r.id, name: r.name, defaultQuantity: r.default_quantity, createdAt: toIso(r.created_at) }
}

export const normaliseName = (name: string) => name.trim().toLowerCase()
