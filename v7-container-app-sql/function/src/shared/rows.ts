import type { FavouriteItem, ShoppingItem, ShoppingList } from '../../domain/types'

const toDateStr = (d: Date | string) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)
const toIso     = (d: Date | string) => (d instanceof Date ? d.toISOString() : d)

export function rowToList(r: any): ShoppingList {
  return {
    id: r.Id, name: r.Name,
    weekStartDate: toDateStr(r.WeekStartDate),
    weekEndDate:   toDateStr(r.WeekEndDate),
    status: r.Status,
    createdAt:   toIso(r.CreatedAt),
    orderedAt:   r.OrderedAt   ? toIso(r.OrderedAt)   : null,   // real NULL
    deliveredAt: r.DeliveredAt ? toIso(r.DeliveredAt) : null,
  }
}

export function rowToItem(r: any): ShoppingItem {
  return { id: r.Id, listId: r.ListId, name: r.Name,
           quantity: r.Quantity, notes: r.Notes ?? '', createdAt: toIso(r.CreatedAt) }
}

export function rowToFav(r: any): FavouriteItem {
  return { id: r.Id, name: r.Name, defaultQuantity: r.DefaultQuantity, createdAt: toIso(r.CreatedAt) }
}

export const normaliseName = (name: string) => name.trim().toLowerCase()