export type ListStatus = 'Draft' | 'Ordered' | 'Delivered'

export interface ShoppingList {
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

export interface ShoppingItem {
  id: string
  listId: string
  name: string
  quantity: number
  notes: string
  createdAt: string
}

export interface FavouriteItem {
  id: string
  name: string
  defaultQuantity: number
  createdAt: string
}
