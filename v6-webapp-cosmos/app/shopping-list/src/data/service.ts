import type { FavouriteItem, ShoppingItem, ShoppingList, ListStatus } from '@/domain/types'

export interface CreateListInput {
  /** ISO date (YYYY-MM-DD) of the Sunday that starts the week */
  weekStartDate: string
}

export interface AddItemInput {
  name: string
  quantity: number
  notes?: string
}

export interface AddFavouriteInput {
  name: string
  defaultQuantity: number
}

/**
 * The future-proofing seam. V1 uses LocalStorage; later versions implement the
 * same surface against Dataverse / SQL / Cosmos / Table Storage. UI and hooks
 * never touch a backend directly — they go through this interface.
 */
export interface IShoppingDataService {
  // Lists
  createList(input: CreateListInput): Promise<ShoppingList>
  getCurrentList(now: Date): Promise<ShoppingList | null>
  getListById(id: string): Promise<ShoppingList | null>
  listAllLists(): Promise<ShoppingList[]>
  transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList>

  // Items
  listItems(listId: string): Promise<ShoppingItem[]>
  addItem(listId: string, input: AddItemInput): Promise<ShoppingItem>
  removeItem(itemId: string): Promise<void>
  updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem>

  // Favourites
  listFavourites(): Promise<FavouriteItem[]>
  addFavourite(input: AddFavouriteInput): Promise<FavouriteItem>
  removeFavourite(favouriteId: string): Promise<void>
  reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem>
}
