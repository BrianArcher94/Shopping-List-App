import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normaliseName, rowToFav, rowToItem, rowToList } from '../src/shared/rows'

// Rows exactly as mssql returns them: DATE and DATETIME2 columns arrive as JS Dates, NULL as null.
const listRow = {
  Id: '2026-10-18', Name: 'Week of 18 Oct', Status: 'Ordered',
  WeekStartDate: new Date('2026-10-18T00:00:00Z'), WeekEndDate: new Date('2026-10-24T00:00:00Z'),
  CreatedAt: new Date('2026-10-17T19:00:00.123Z'), OrderedAt: new Date('2026-10-18T09:30:00Z'), DeliveredAt: null,
}

test('rowToList maps DATE columns to YYYY-MM-DD and DATETIME2 to ISO strings', () => {
  assert.deepEqual(rowToList(listRow), {
    id: '2026-10-18', name: 'Week of 18 Oct', status: 'Ordered',
    weekStartDate: '2026-10-18', weekEndDate: '2026-10-24',
    createdAt: '2026-10-17T19:00:00.123Z', orderedAt: '2026-10-18T09:30:00.000Z', deliveredAt: null,
  })
})

test('rowToList keeps NULL timestamps as null', () => {
  const list = rowToList({ ...listRow, Status: 'Draft', OrderedAt: null })
  assert.equal(list.orderedAt, null)
  assert.equal(list.deliveredAt, null)
})

test('rowToItem maps columns and defaults NULL notes to an empty string', () => {
  const item = rowToItem({
    Id: '2026-10-18__abc', ListId: '2026-10-18', Name: 'Milk', Quantity: 2, Notes: null,
    CreatedAt: new Date('2026-10-18T10:00:00Z'),
  })
  assert.deepEqual(item, {
    id: '2026-10-18__abc', listId: '2026-10-18', name: 'Milk', quantity: 2, notes: '',
    createdAt: '2026-10-18T10:00:00.000Z',
  })
})

test('rowToFav maps columns', () => {
  assert.deepEqual(
    rowToFav({ Id: 'tea', Name: 'Tea', DefaultQuantity: 1, CreatedAt: new Date('2026-10-01T00:00:00Z') }),
    { id: 'tea', name: 'Tea', defaultQuantity: 1, createdAt: '2026-10-01T00:00:00.000Z' },
  )
})

test('normaliseName trims and lower-cases (the favourite id and UNIQUE key)', () => {
  assert.equal(normaliseName('  Smoke Test TEA '), 'smoke test tea')
})
