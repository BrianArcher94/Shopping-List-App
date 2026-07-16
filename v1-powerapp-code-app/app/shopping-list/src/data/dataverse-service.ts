import type { FavouriteItem, ShoppingItem, ShoppingList, ListStatus } from '@/domain/types'
import { canTransition, formatWeekLabel, getCurrentWeekStart, getWeekEnd, isReadOnly } from '@/domain/rules'
import type {
  AddFavouriteInput,
  AddItemInput,
  CreateListInput,
  IShoppingDataService,
} from './service'
import { Ba_shoppinglistsService } from '@/generated/services/Ba_shoppinglistsService'
import { Ba_shoppingitemsService } from '@/generated/services/Ba_shoppingitemsService'
import { Ba_favouriteitemsService } from '@/generated/services/Ba_favouriteitemsService'
import type { Ba_shoppinglists } from '@/generated/models/Ba_shoppinglistsModel'
import type { Ba_shoppingitems } from '@/generated/models/Ba_shoppingitemsModel'
import type { Ba_favouriteitems } from '@/generated/models/Ba_favouriteitemsModel'

const LIST_STATUS_TO_CODE = { Draft: 1, Ordered: 2, Delivered: 3 } as const
const LIST_STATUS_FROM_CODE: Record<number, ListStatus> = { 1: 'Draft', 2: 'Ordered', 3: 'Delivered' }

function unwrap<T>(label: string, result: { data?: T; error?: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  if (result.data === undefined || result.data === null) throw new Error(`${label}: no data returned`)
  return result.data
}

/**
 * The generated `…Base` types mark `ownerid`, `owneridtype`, and `statecode` as
 * required. For a create call we must NOT send `ownerid` as a primitive string
 * (Dataverse expects either omission, in which case it defaults to the caller,
 * or an `'ownerid@odata.bind': '/systemusers(<guid>)'` annotation). `statecode`
 * defaults to Active as well, so we omit it too. This helper lets us send a
 * sparse payload that the generated service's type checker would otherwise
 * reject.
 */
function asCreatePayload<T>(payload: Record<string, unknown>): T {
  return payload as T
}

/**
 * Dataverse Date-Only columns with "User Local" behavior come back as full
 * ISO datetime strings like "2026-05-24T00:00:00Z". Our domain only wants the
 * YYYY-MM-DD prefix. (Pure "Date Only" behavior already returns YYYY-MM-DD,
 * so slicing is safe either way.)
 */
function toIsoDate(value: string | undefined | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function mapList(row: Ba_shoppinglists): ShoppingList {
  const statusCode = Number(row.ba_liststatus)
  const weekStartDate = toIsoDate(row.ba_weekstart)
  const weekEndFromServer = toIsoDate(row.ba_weekend)
  return {
    id: row.ba_shoppinglistid,
    name: row.ba_name,
    weekStartDate,
    weekEndDate: weekEndFromServer || (weekStartDate ? getWeekEnd(weekStartDate) : ''),
    status: LIST_STATUS_FROM_CODE[statusCode] ?? 'Draft',
    createdAt: row.createdon ?? new Date().toISOString(),
    orderedAt: row.ba_dateordered ?? null,
    deliveredAt: row.ba_datedelivered ?? null,
  }
}

function mapItem(row: Ba_shoppingitems): ShoppingItem {
  return {
    id: row.ba_shoppingitemid,
    listId: row._ba_shoppinglist_value ?? '',
    name: row.ba_name,
    quantity: row.ba_quantity ?? 1,
    notes: row.ba_notes ?? '',
    createdAt: row.createdon ?? new Date().toISOString(),
  }
}

function mapFavourite(row: Ba_favouriteitems): FavouriteItem {
  return {
    id: row.ba_favouriteitemid,
    name: row.ba_name,
    defaultQuantity: row.ba_defaultquantity ?? 1,
    createdAt: row.createdon ?? new Date().toISOString(),
  }
}

export class DataverseShoppingDataService implements IShoppingDataService {
  // ----- Lists ---------------------------------------------------------------

  async createList(input: CreateListInput): Promise<ShoppingList> {
    // Enforce one-list-per-week. Dataverse can also enforce this via an alternate
    // key on ba_weekstart; this client-side check is defensive.
    const existing = unwrap('createList(check)', await Ba_shoppinglistsService.getAll({
      select: ['ba_shoppinglistid'],
      filter: `ba_weekstart eq ${input.weekStartDate}`,
      top: 1,
    }))
    if (existing.length > 0) {
      throw new Error(`A list for week ${input.weekStartDate} already exists`)
    }

    const created = unwrap('createList', await Ba_shoppinglistsService.create(asCreatePayload({
      ba_name: formatWeekLabel(input.weekStartDate),
      ba_weekstart: input.weekStartDate,
      ba_liststatus: LIST_STATUS_TO_CODE.Draft,
    })))
    return mapList(created)
  }

  async getCurrentList(now: Date): Promise<ShoppingList | null> {
    const weekStart = getCurrentWeekStart(now)
    const rows = unwrap('getCurrentList', await Ba_shoppinglistsService.getAll({
      filter: `ba_weekstart eq ${weekStart}`,
      top: 1,
    }))
    return rows.length > 0 ? mapList(rows[0]) : null
  }

  async getListById(id: string): Promise<ShoppingList | null> {
    try {
      const row = unwrap('getListById', await Ba_shoppinglistsService.get(id))
      return mapList(row)
    } catch {
      return null
    }
  }

  async listAllLists(): Promise<ShoppingList[]> {
    const rows = unwrap('listAllLists', await Ba_shoppinglistsService.getAll({
      orderBy: ['ba_weekstart desc'],
    }))
    return rows.map(mapList)
  }

  async transitionStatus(listId: string, next: ListStatus): Promise<ShoppingList> {
    const current = await this.getListById(listId)
    if (!current) throw new Error(`List ${listId} not found`)
    if (!canTransition(current.status, next)) {
      throw new Error(`Illegal transition ${current.status} → ${next}`)
    }
    const now = new Date().toISOString()
    const patch: Partial<Ba_shoppinglists> = {
      ba_liststatus: LIST_STATUS_TO_CODE[next] as unknown as Ba_shoppinglists['ba_liststatus'],
    }
    if (next === 'Ordered') patch.ba_dateordered = now
    if (next === 'Delivered') patch.ba_datedelivered = now

    const updated = unwrap('transitionStatus', await Ba_shoppinglistsService.update(listId, patch))
    return mapList(updated)
  }

  // ----- Items ---------------------------------------------------------------

  async listItems(listId: string): Promise<ShoppingItem[]> {
    const rows = unwrap('listItems', await Ba_shoppingitemsService.getAll({
      filter: `_ba_shoppinglist_value eq ${listId}`,
      orderBy: ['createdon asc'],
    }))
    return rows.map(mapItem)
  }

  async addItem(listId: string, input: AddItemInput): Promise<ShoppingItem> {
    await this.assertEditable(listId)
    const created = unwrap('addItem', await Ba_shoppingitemsService.create(asCreatePayload({
      ba_name: input.name.trim(),
      ba_quantity: Math.max(1, Math.floor(input.quantity || 1)),
      ba_notes: input.notes ?? '',
      'ba_ShoppingList@odata.bind': `/ba_shoppinglists(${listId})`,
    })))
    return mapItem(created)
  }

  async removeItem(itemId: string): Promise<void> {
    // We have to fetch first to find the parent list (for read-only enforcement).
    const result = await Ba_shoppingitemsService.get(itemId, { select: ['_ba_shoppinglist_value'] })
    if (result.error) return // not found — silent no-op, matches LocalStorage behaviour
    const listId = result.data?._ba_shoppinglist_value
    if (listId) await this.assertEditable(listId)
    await Ba_shoppingitemsService.delete(itemId)
  }

  async updateItemNotes(itemId: string, notes: string): Promise<ShoppingItem> {
    const current = unwrap('updateItemNotes(get)', await Ba_shoppingitemsService.get(itemId, {
      select: ['_ba_shoppinglist_value'],
    }))
    const listId = current._ba_shoppinglist_value
    if (!listId) throw new Error(`Item ${itemId} has no parent list`)
    await this.assertEditable(listId)
    const updated = unwrap('updateItemNotes', await Ba_shoppingitemsService.update(itemId, {
      ba_notes: notes,
    }))
    return mapItem(updated)
  }

  // ----- Favourites ----------------------------------------------------------

  async listFavourites(): Promise<FavouriteItem[]> {
    const rows = unwrap('listFavourites', await Ba_favouriteitemsService.getAll({
      orderBy: ['ba_name asc'],
    }))
    return rows.map(mapFavourite)
  }

  async addFavourite(input: AddFavouriteInput): Promise<FavouriteItem> {
    const name = input.name.trim()
    const existing = unwrap('addFavourite(check)', await Ba_favouriteitemsService.getAll({
      select: ['ba_favouriteitemid'],
      filter: `ba_name eq '${name.replace(/'/g, "''")}'`,
      top: 1,
    }))
    if (existing.length > 0) {
      throw new Error(`Favourite "${name}" already exists`)
    }
    const created = unwrap('addFavourite', await Ba_favouriteitemsService.create(asCreatePayload({
      ba_name: name,
      ba_defaultquantity: Math.max(1, Math.floor(input.defaultQuantity || 1)),
    })))
    return mapFavourite(created)
  }

  async removeFavourite(favouriteId: string): Promise<void> {
    await Ba_favouriteitemsService.delete(favouriteId)
  }

  async reuseFavourite(listId: string, favouriteId: string): Promise<ShoppingItem> {
    const fav = unwrap('reuseFavourite(get)', await Ba_favouriteitemsService.get(favouriteId))
    return this.addItem(listId, { name: fav.ba_name, quantity: fav.ba_defaultquantity ?? 1 })
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

