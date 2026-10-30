import { test } from 'node:test'
import assert from 'node:assert/strict'
import { docToFav, docToItem, docToList, listIdOf, normaliseName } from '../src/shared/docs'

// Documents exactly as Cosmos returns them: domain fields plus system properties.
const SYSTEM = { _rid: 'abc==', _self: 'dbs/x/colls/y/docs/z/', _etag: '"0b00-1"', _attachments: 'attachments/', _ts: 1792345678 }

test('docToList copies domain fields and drops items and system properties', () => {
  const list = docToList({
    id: '2026-10-11', weekStartDate: '2026-10-11', name: 'Week of 11 Oct', weekEndDate: '2026-10-17',
    status: 'Ordered', createdAt: '2026-10-10T19:00:00.000Z',
    orderedAt: '2026-10-12T08:30:00.000Z', deliveredAt: null,
    items: [{ id: '2026-10-11__a', name: 'Milk', quantity: 1, notes: '', createdAt: '2026-10-11T09:00:00.000Z' }],
    ...SYSTEM,
  })
  assert.deepEqual(list, {
    id: '2026-10-11', name: 'Week of 11 Oct',
    weekStartDate: '2026-10-11', weekEndDate: '2026-10-17',
    status: 'Ordered',
    createdAt: '2026-10-10T19:00:00.000Z',
    orderedAt: '2026-10-12T08:30:00.000Z',
    deliveredAt: null,
  })
})

test('docToList turns absent timestamps into null', () => {
  const list = docToList({ id: 'w', weekStartDate: 'w', name: 'x', weekEndDate: 'e', status: 'Draft',
                           createdAt: 't', items: [] } as any)
  assert.equal(list.orderedAt, null)
  assert.equal(list.deliveredAt, null)
})

test('docToList works on the History projection (no items property)', () => {
  const list = docToList({ id: 'w', weekStartDate: 'w', name: 'x', weekEndDate: 'e', status: 'Delivered',
                           createdAt: 't', orderedAt: 'o', deliveredAt: 'd' } as any)
  assert.equal(list.deliveredAt, 'd')
})

test('docToItem adds listId from the parent and keeps the item shape', () => {
  const item = docToItem('2026-10-11', { id: '2026-10-11__abc', name: 'Milk', quantity: 2, notes: 'semi',
                                         createdAt: '2026-10-11T09:00:00.000Z' })
  assert.deepEqual(item, {
    id: '2026-10-11__abc', listId: '2026-10-11', name: 'Milk', quantity: 2, notes: 'semi',
    createdAt: '2026-10-11T09:00:00.000Z',
  })
})

test('docToItem defaults missing notes to empty string', () => {
  const item = docToItem('a', { id: 'a__b', name: 'Eggs', quantity: 1, createdAt: 't' } as any)
  assert.equal(item.notes, '')
})

test('docToFav drops normalisedName and system properties', () => {
  const fav = docToFav({ id: 'milk', name: 'Milk', normalisedName: 'milk', defaultQuantity: 2,
                         createdAt: '2026-10-01T12:00:00.000Z', ...SYSTEM } as any)
  assert.deepEqual(fav, { id: 'milk', name: 'Milk', defaultQuantity: 2, createdAt: '2026-10-01T12:00:00.000Z' })
})

test('normaliseName trims and lower-cases', () => {
  assert.equal(normaliseName('  Semi-Skimmed MILK '), 'semi-skimmed milk')
})

test('listIdOf recovers the parent list (= partition key) from an item id', () => {
  assert.equal(listIdOf('2026-10-11__6f1c2d3e-0000-4000-8000-000000000000'), '2026-10-11')
})
