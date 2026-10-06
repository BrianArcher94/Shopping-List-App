import type { FavouriteItem, ShoppingItem, ShoppingList } from '../../domain/types'

const toDateStr = (d: Date | string) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)
const toIso     = (d: Date | string) => (d instanceof Date ? d.toISOString() : d)

// V4 audit columns (migration 004). Present on all three tables.
function audit(r: any) {
  return {
    createdBy:      r.CreatedBy,
    createdByName:  r.CreatedByName,
    modifiedBy:     r.ModifiedBy     ?? null,
    modifiedByName: r.ModifiedByName ?? null,
    modifiedAt:     r.ModifiedAt ? toIso(r.ModifiedAt) : null,
  }
}

// Column list fragments so every SELECT/OUTPUT stays in step with the mappers.
export const LIST_COLS = 'Id, Name, WeekStartDate, WeekEndDate, Status, CreatedAt, OrderedAt, DeliveredAt, CreatedBy, CreatedByName, ModifiedBy, ModifiedByName, ModifiedAt'
export const ITEM_COLS = 'Id, ListId, Name, Quantity, Notes, CreatedAt, CreatedBy, CreatedByName, ModifiedBy, ModifiedByName, ModifiedAt'
export const FAV_COLS  = 'Id, Name, DefaultQuantity, CreatedAt, CreatedBy, CreatedByName, ModifiedBy, ModifiedByName, ModifiedAt'

export function rowToList(r: any): ShoppingList {
  return {
    id: r.Id, name: r.Name,
    weekStartDate: toDateStr(r.WeekStartDate),
    weekEndDate:   toDateStr(r.WeekEndDate),
    status: r.Status,
    createdAt:   toIso(r.CreatedAt),
    orderedAt:   r.OrderedAt   ? toIso(r.OrderedAt)   : null,   // real NULL
    deliveredAt: r.DeliveredAt ? toIso(r.DeliveredAt) : null,
    ...audit(r),
  }
}

export function rowToItem(r: any): ShoppingItem {
  return { id: r.Id, listId: r.ListId, name: r.Name,
           quantity: r.Quantity, notes: r.Notes ?? '', createdAt: toIso(r.CreatedAt),
           ...audit(r) }
}

export function rowToFav(r: any): FavouriteItem {
  return { id: r.Id, name: r.Name, defaultQuantity: r.DefaultQuantity, createdAt: toIso(r.CreatedAt),
           ...audit(r) }
}

export const normaliseName = (name: string) => name.trim().toLowerCase()
