import type { FavouriteItem, ShoppingItem, ShoppingList, ListStatus } from '@/domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '@/domain/rules'
import type {
  AddFavouriteInput,
  AddItemInput,
  CreateListInput,
  IShoppingDataService,
} from './service'

const KEYS = {
  lists: 'sl:lists',
  items: 'sl:items',
  favourites: 'sl:favourites',
} as const

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function read<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try { return JSON.parse(raw) as T[] }
  catch { return [] }
}

function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export class LocalStorageShoppingDataService implements IShoppingDataService {
  // ----- Lists ---------------------------------------------------------------

  async createList(input: CreateListInput): Promise<ShoppingList> {
    const lists = read<ShoppingList>(KEYS.lists)
    if (lists.some((l) => l.weekStartDate === input.weekStartDate)) {
      throw new Error(`A list for week ${input.weekStartDate} already exists`)
    }
    const list: ShoppingList = {
      id: uid(),
      name: formatWeekLabel(input.weekStartDate),
      weekStartDate: input.weekStartDate,
      weekEndDate: getWeekEnd(input.weekStartDate),
      status: 'Draft',
      createdAt: new Date().toISOString(),
      orderedAt: null,
      deliveredAt: null,
    }
    write(KEYS.lists, [...lists, list])
    return list
  }

  async getCurrentList(now: Date): Promise<ShoppingList | null> {
    const weekStart = getCurrentWeekStart(now)
    const lists = read<ShoppingList>(KEYS.lists)
    return lists.find((l) => l.weekStartDate === weekStart) ?? null
  }

  async getListById(id: string): Promise<ShoppingList | null> {
    const lists = read<ShoppingList>(KEYS.lists)
    return lists.find((l) => l.id === id) ?? null
  }

  async listAllLists(): Promise<ShoppingList[]> {
    const lists = read<ShoppingList>(KEYS.lists)
    return [...lists].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
  }

  async transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
    const lists = read<ShoppingList>(KEYS.lists)
    const idx = lists.findIndex((l) => l.id === listId)
    if (idx < 0) throw new Error(`List ${listId} not found`)
    const current = lists[idx]
    if (!canTransition(current.status, next)) {
      throw new Error(`Illegal transition ${current.status} → ${next}`)
    }
    const now = new Date().toISOString()
    const updated: ShoppingList = {
      ...current,
      status: next,
      orderedAt: next === 'Ordered' ? now : current.orderedAt,
      deliveredAt: next === 'Delivered' ? now : current.deliveredAt,
    }
    lists[idx] = updated
    write(KEYS.lists, lists)
    return updated
  }

  // ----- Items ---------------------------------------------------------------

  async listItems(listId: string): Promise<ShoppingItem[]> {
    const items = read<ShoppingItem>(KEYS.items)
    return items
      .filter((i) => i.listId === listId)
      .map((i) => ({ ...i, notes: i.notes ?? '' }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async addItem(listId: string, input: AddItemInput): Promise<ShoppingItem> {
    await this.assertEditable(listId)
    const items = read<ShoppingItem>(KEYS.items)
    const item: ShoppingItem = {
      id: uid(),
      listId,
      name: input.name.trim(),
      quantity: Math.max(1, Math.floor(input.quantity || 1)),
      notes: input.notes ?? '',
      createdAt: new Date().toISOString(),
    }
    write(KEYS.items, [...items, item])
    return item
  }

  async removeItem(itemId: string): Promise<void> {
    const items = read<ShoppingItem>(KEYS.items)
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    await this.assertEditable(item.listId)
    write(KEYS.items, items.filter((i) => i.id !== itemId))
  }

  async updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
    const items = read<ShoppingItem>(KEYS.items)
    const idx = items.findIndex((i) => i.id === itemId)
    if (idx < 0) throw new Error(`Item ${itemId} not found`)
    await this.assertEditable(items[idx].listId)
    const updated = { ...items[idx], notes }
    items[idx] = updated
    write(KEYS.items, items)
    return updated
  }

  // ----- Favourites ----------------------------------------------------------

  async listFavourites(): Promise<FavouriteItem[]> {
    const favs = read<FavouriteItem>(KEYS.favourites)
    return [...favs].sort((a, b) => a.name.localeCompare(b.name))
  }

  async addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
    const favs = read<FavouriteItem>(KEYS.favourites)
    const name = input.name.trim()
    if (favs.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Favourite "${name}" already exists`)
    }
    const fav: FavouriteItem = {
      id: uid(),
      name,
      defaultQuantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
      createdAt: new Date().toISOString(),
    }
    write(KEYS.favourites, [...favs, fav])
    return fav
  }

  async removeFavourite(favouriteId: string): Promise<void> {
    const favs = read<FavouriteItem>(KEYS.favourites)
    write(KEYS.favourites, favs.filter((f) => f.id !== favouriteId))
  }

  async reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
    const favs = read<FavouriteItem>(KEYS.favourites)
    const fav = favs.find((f) => f.id === favouriteId)
    if (!fav) throw new Error(`Favourite ${favouriteId} not found`)
    return this.addItem(listId, { name: fav.name, quantity: fav.defaultQuantity })
  }

  // ----- internal ------------------------------------------------------------

  private async assertEditable(listId: string): Promise<void> {
    const list = await this.getListById(listId)
    if (!list) throw new Error(`List ${listId} not found`)
    if (isReadOnly(list)) {
      throw new Error(`List ${listId} is read-only (${list.status})`)
    }
  }
}
