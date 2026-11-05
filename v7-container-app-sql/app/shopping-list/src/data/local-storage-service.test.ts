import { describe, test, expect, beforeEach } from 'vitest'
import { LocalStorageShoppingDataService } from './local-storage-service'

let svc: LocalStorageShoppingDataService

beforeEach(() => {
  svc = new LocalStorageShoppingDataService()
})

describe('lists', () => {
  test('createList persists and returns the new list', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })

    expect(list.id).toBeTruthy()
    expect(list.weekStartDate).toBe('2026-05-31')
    expect(list.weekEndDate).toBe('2026-06-06')
    expect(list.status).toBe('Draft')
    expect(list.name).toBe('Week of 2026-05-31')
    expect(list.createdAt).toBeTruthy()
    expect(list.orderedAt).toBeNull()
    expect(list.deliveredAt).toBeNull()

    const all = await svc.listAllLists()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(list.id)
  })

  test('createList rejects a second list for the same week (alternate key)', async () => {
    await svc.createList({ weekStartDate: '2026-05-31' })
    await expect(svc.createList({ weekStartDate: '2026-05-31' })).rejects.toThrow(/already exists/i)
  })

  test('getCurrentList returns the Draft list for the week containing now, or null', async () => {
    // Monday 2026-06-01 falls inside the week that starts Sunday 2026-05-31.
    const now = new Date('2026-06-01T10:00:00')
    expect(await svc.getCurrentList(now)).toBeNull()
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const current = await svc.getCurrentList(now)
    expect(current?.id).toBe(list.id)
  })

  test('getListById returns the list or null', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    expect((await svc.getListById(list.id))?.id).toBe(list.id)
    expect(await svc.getListById('nope')).toBeNull()
  })

  test('listAllLists returns lists newest-first by weekStartDate', async () => {
    await svc.createList({ weekStartDate: '2026-05-17' })
    await svc.createList({ weekStartDate: '2026-05-31' })
    await svc.createList({ weekStartDate: '2026-05-24' })

    const all = await svc.listAllLists()
    expect(all.map((l) => l.weekStartDate)).toEqual(['2026-05-31', '2026-05-24', '2026-05-17'])
  })
})

describe('items', () => {
  test('addItem then listItems returns the item', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 2 })

    expect(item.listId).toBe(list.id)
    expect(item.name).toBe('Milk')
    expect(item.quantity).toBe(2)

    const items = await svc.listItems(list.id)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(item.id)
  })

  test('addItem refuses to mutate a read-only Ordered list', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    await svc.transitionStatus(list.id, 'Ordered')
    await expect(svc.addItem(list.id, { name: 'Milk', quantity: 1 })).rejects.toThrow(/read-only/i)
  })

  test('removeItem deletes the item', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 1 })
    await svc.removeItem(item.id)
    expect(await svc.listItems(list.id)).toHaveLength(0)
  })

  test('removeItem refuses on read-only list', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 1 })
    await svc.transitionStatus(list.id, 'Ordered')
    await expect(svc.removeItem(item.id)).rejects.toThrow(/read-only/i)
  })

  test('addItem stores an empty notes field by default', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 1 })
    expect(item.notes).toBe('')
  })

  test('addItem stores notes when provided', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, {
      name: 'Milk',
      quantity: 1,
      notes: 'Whole milk only',
    })
    expect(item.notes).toBe('Whole milk only')

    const fresh = new LocalStorageShoppingDataService()
    const items = await fresh.listItems(list.id)
    expect(items[0].notes).toBe('Whole milk only')
  })

  test('updateItemNotes persists the notes', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 1 })

    const updated = await svc.updateItemNotes(item.id, 'Whole milk\nfrom the back')
    expect(updated.notes).toBe('Whole milk\nfrom the back')

    const items = await svc.listItems(list.id)
    expect(items[0].notes).toBe('Whole milk\nfrom the back')
  })

  test('updateItemNotes accepts an empty string', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 1 })
    await svc.updateItemNotes(item.id, 'something')
    const cleared = await svc.updateItemNotes(item.id, '')
    expect(cleared.notes).toBe('')
  })

  test('updateItemNotes refused on read-only list', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const item = await svc.addItem(list.id, { name: 'Milk', quantity: 1 })
    await svc.transitionStatus(list.id, 'Ordered')
    await expect(svc.updateItemNotes(item.id, 'nope')).rejects.toThrow(/read-only/i)
  })

})

describe('transitionStatus', () => {
  test('Draft → Ordered sets orderedAt and changes status', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const updated = await svc.transitionStatus(list.id, 'Ordered')
    expect(updated.status).toBe('Ordered')
    expect(updated.orderedAt).toBeTruthy()
    expect(updated.deliveredAt).toBeNull()
  })

  test('Ordered → Delivered sets deliveredAt', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    await svc.transitionStatus(list.id, 'Ordered')
    const updated = await svc.transitionStatus(list.id, 'Delivered')
    expect(updated.status).toBe('Delivered')
    expect(updated.deliveredAt).toBeTruthy()
  })

  test('rejects illegal transitions', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    await expect(svc.transitionStatus(list.id, 'Delivered')).rejects.toThrow(/transition/i)
  })
})

describe('favourites', () => {
  test('addFavourite + listFavourites + removeFavourite', async () => {
    const fav = await svc.addFavourite({ name: 'Bread', defaultQuantity: 1 })
    expect(fav.name).toBe('Bread')
    expect(fav.defaultQuantity).toBe(1)

    expect(await svc.listFavourites()).toHaveLength(1)

    await svc.removeFavourite(fav.id)
    expect(await svc.listFavourites()).toHaveLength(0)
  })

  test('addFavourite rejects duplicate names (case-insensitive)', async () => {
    await svc.addFavourite({ name: 'Bread', defaultQuantity: 1 })
    await expect(svc.addFavourite({ name: 'bread', defaultQuantity: 2 })).rejects.toThrow(/already/i)
  })

  test('reuseFavourite adds the favourite to a Draft list as a new item', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const fav = await svc.addFavourite({ name: 'Eggs', defaultQuantity: 12 })
    const item = await svc.reuseFavourite(list.id, fav.id)

    expect(item.name).toBe('Eggs')
    expect(item.quantity).toBe(12)
    expect(item.listId).toBe(list.id)
  })

  test('reuseFavourite refused on read-only list', async () => {
    const list = await svc.createList({ weekStartDate: '2026-05-31' })
    const fav = await svc.addFavourite({ name: 'Eggs', defaultQuantity: 12 })
    await svc.transitionStatus(list.id, 'Ordered')
    await expect(svc.reuseFavourite(list.id, fav.id)).rejects.toThrow(/read-only/i)
  })
})

describe('persistence', () => {
  test('a fresh service instance reads what the previous one wrote', async () => {
    await svc.createList({ weekStartDate: '2026-05-31' })
    await svc.addFavourite({ name: 'Bread', defaultQuantity: 1 })

    const svc2 = new LocalStorageShoppingDataService()
    expect(await svc2.listAllLists()).toHaveLength(1)
    expect(await svc2.listFavourites()).toHaveLength(1)
  })
})
