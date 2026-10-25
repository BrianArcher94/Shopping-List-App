import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rowToFav, rowToItem, rowToList } from '../src/shared/rows'

// Rows exactly as pg returns them from db/migrations/002_init_schema.sql:
// snake_case keys, DATE as 'YYYY-MM-DD' string (db.ts type parser), timestamptz as Date.

test('rowToList maps snake_case columns and keeps DATE strings unshifted', () => {
  const list = rowToList({
    id: '2026-10-11', name: 'Week of 11 Oct',
    week_start_date: '2026-10-11', week_end_date: '2026-10-17',
    status: 'Ordered',
    created_at: new Date('2026-10-10T19:00:00.000Z'),
    ordered_at: new Date('2026-10-12T08:30:00.000Z'),
    delivered_at: null,
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

test('rowToList keeps real NULL timestamps as null', () => {
  const list = rowToList({
    id: '2026-10-11', name: 'x', week_start_date: '2026-10-11', week_end_date: '2026-10-17',
    status: 'Draft', created_at: new Date('2026-10-10T19:00:00.000Z'),
    ordered_at: null, delivered_at: null,
  })
  assert.equal(list.orderedAt, null)
  assert.equal(list.deliveredAt, null)
})

test('rowToItem maps list_id and created_at', () => {
  const item = rowToItem({
    id: '2026-10-11__abc', list_id: '2026-10-11', name: 'Milk', quantity: 2, notes: 'semi',
    created_at: new Date('2026-10-11T09:00:00.000Z'),
  })
  assert.deepEqual(item, {
    id: '2026-10-11__abc', listId: '2026-10-11', name: 'Milk', quantity: 2, notes: 'semi',
    createdAt: '2026-10-11T09:00:00.000Z',
  })
})

test('rowToItem defaults null notes to empty string', () => {
  const item = rowToItem({ id: 'a__b', list_id: 'a', name: 'Eggs', quantity: 1, notes: null,
                           created_at: new Date('2026-10-11T09:00:00.000Z') })
  assert.equal(item.notes, '')
})

test('rowToFav maps default_quantity and ignores the generated normalised_name', () => {
  const fav = rowToFav({ id: 'milk', name: 'Milk', normalised_name: 'milk', default_quantity: 2,
                         created_at: new Date('2026-10-01T12:00:00.000Z') })
  assert.deepEqual(fav, { id: 'milk', name: 'Milk', defaultQuantity: 2, createdAt: '2026-10-01T12:00:00.000Z' })
})
