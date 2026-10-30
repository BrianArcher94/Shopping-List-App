import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addItemPatch, removeItemPatch, setNotesPatch, statusIs, transitionPatch } from '../src/shared/patches'

test('statusIs builds a "FROM c WHERE" predicate (the only form Cosmos accepts)', () => {
  assert.equal(statusIs('Draft'), "FROM c WHERE c.status = 'Draft'")
})

test('statusIs rejects anything outside the ListStatus set', () => {
  assert.throws(() => statusIs("Draft' OR true --" as any))
})

test('transitionPatch to Ordered sets status and orderedAt, conditioned on the current status', () => {
  assert.deepEqual(transitionPatch('Draft', 'Ordered', '2026-10-12T08:30:00.000Z'), {
    condition: "FROM c WHERE c.status = 'Draft'",
    operations: [
      { op: 'set', path: '/status', value: 'Ordered' },
      { op: 'set', path: '/orderedAt', value: '2026-10-12T08:30:00.000Z' },
    ],
  })
})

test('transitionPatch to Delivered sets deliveredAt, not orderedAt', () => {
  assert.deepEqual(transitionPatch('Ordered', 'Delivered', 'now'), {
    condition: "FROM c WHERE c.status = 'Ordered'",
    operations: [
      { op: 'set', path: '/status', value: 'Delivered' },
      { op: 'set', path: '/deliveredAt', value: 'now' },
    ],
  })
})

test('addItemPatch appends to /items only while the list is Draft', () => {
  const item = { id: 'w__1', name: 'Milk', quantity: 1, notes: '', createdAt: 't' }
  assert.deepEqual(addItemPatch(item), {
    condition: "FROM c WHERE c.status = 'Draft'",
    operations: [{ op: 'add', path: '/items/-', value: item }],
  })
})

test('index-based patches target the array element', () => {
  assert.deepEqual(removeItemPatch(3), [{ op: 'remove', path: '/items/3' }])
  assert.deepEqual(setNotesPatch(0, 'semi'), [{ op: 'set', path: '/items/0/notes', value: 'semi' }])
})
