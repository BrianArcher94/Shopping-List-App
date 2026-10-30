import type {
  IShoppingDataService,
  CreateListInput,
  AddItemInput,
  AddFavouriteInput,
} from './service'
import type {
  FavouriteItem,
  ShoppingItem,
  ShoppingList,
  ListStatus,
} from '@/domain/types'

// Base path for the V2 REST API. Defaults to "/api", which is what the
// Application Gateway routes to the Functions App (same origin as the SPA, so
// no CORS). Override with VITE_API_BASE_URL for local dev against a remote API.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * Talks to the V2 Azure Functions API over HTTP. Implements the same
 * IShoppingDataService surface as the LocalStorage adapter, so swapping it in
 * (VITE_USE_API=true) requires no changes anywhere else in the app.
 *
 * The server side enforces the business rules (status machine, weekly
 * uniqueness, read-only Ordered/Delivered lists) authoritatively by reusing the
 * shared domain/rules logic — the client simply calls the endpoints.
 */
export class ApiShoppingDataService implements IShoppingDataService {
  private readonly baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `API ${init?.method ?? 'GET'} ${path} failed: ${res.status} ${res.statusText} ${body}`.trim(),
      )
    }

    // 204 No Content (e.g. DELETE) has no body to parse.
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  // --- Lists ---

  createList(input: CreateListInput): Promise<ShoppingList> {
    return this.request<ShoppingList>('/lists', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  getCurrentList(now: Date): Promise<ShoppingList | null> {
    return this.request<ShoppingList | null>(
      `/lists/current?now=${encodeURIComponent(now.toISOString())}`,
    )
  }

  getListById(id: string): Promise<ShoppingList | null> {
    return this.request<ShoppingList | null>(`/lists/${encodeURIComponent(id)}`)
  }

  listAllLists(): Promise<ShoppingList[]> {
    return this.request<ShoppingList[]>('/lists')
  }

  transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
    return this.request<ShoppingList>(
      `/lists/${encodeURIComponent(listId)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: next }) },
    )
  }

  // --- Items ---

  listItems(listId: string): Promise<ShoppingItem[]> {
    return this.request<ShoppingItem[]>(
      `/lists/${encodeURIComponent(listId)}/items`,
    )
  }

  addItem(listId: string, input: AddItemInput): Promise<ShoppingItem> {
    return this.request<ShoppingItem>(
      `/lists/${encodeURIComponent(listId)}/items`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  async removeItem(itemId: string): Promise<void> {
    await this.request<void>(`/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    })
  }

  updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
    return this.request<ShoppingItem>(`/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
  }

  // --- Favourites ---

  listFavourites(): Promise<FavouriteItem[]> {
    return this.request<FavouriteItem[]>('/favourites')
  }

  addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
    return this.request<FavouriteItem>('/favourites', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async removeFavourite(favouriteId: string): Promise<void> {
    await this.request<void>(`/favourites/${encodeURIComponent(favouriteId)}`, {
      method: 'DELETE',
    })
  }

  reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
    return this.request<ShoppingItem>(
      `/lists/${encodeURIComponent(listId)}/items/from-favourite`,
      { method: 'POST', body: JSON.stringify({ favouriteId }) },
    )
  }
}
