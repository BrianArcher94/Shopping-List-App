export type ListStatus = 'Draft' | 'Ordered' | 'Delivered'

/**
 * V4 audit trail. `createdBy` / `modifiedBy` hold the Entra External ID `oid`
 * of the signed-in user (or the literal "system" for the weekly scheduler);
 * the `*Name` fields are the display name denormalised at write time.
 * Optional so the LocalStorage adapter and older rows need no changes.
 */
export interface AuditFields {
  createdBy?: string
  createdByName?: string
  modifiedBy?: string | null
  modifiedByName?: string | null
  modifiedAt?: string | null
}

export interface ShoppingList extends AuditFields {
  id: string
  name: string
  /** ISO date (YYYY-MM-DD) of the Sunday that begins this week */
  weekStartDate: string
  /** ISO date (YYYY-MM-DD) of the Saturday that ends this week */
  weekEndDate: string
  status: ListStatus
  createdAt: string
  orderedAt: string | null
  deliveredAt: string | null
}

export interface ShoppingItem extends AuditFields {
  id: string
  listId: string
  name: string
  quantity: number
  notes: string
  createdAt: string
}

export interface FavouriteItem extends AuditFields {
  id: string
  name: string
  defaultQuantity: number
  createdAt: string
}
