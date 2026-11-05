import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import * as db from '../src/shared/db'
import * as repo from '../src/shared/repository'
import { ApiError } from '../src/shared/http'

// A fake mssql pool. Each query is answered by `respond`, which sees the SQL text and the bound
// inputs — enough to exercise the repository's guard logic without a database. The SQL itself
// (UPDLOCK/HOLDLOCK, OUTPUT, …) is only proven against real Azure SQL (smoke.ps1).
type Result = { recordset?: unknown[]; rowsAffected?: number[] }
let respond: (sqlText: string, inputs: Record<string, unknown>) => Result
const queries: string[] = []

const fakePool = {
  request() {
    const inputs: Record<string, unknown> = {}
    const req = {
      input(name: string, _type: unknown, value: unknown) { inputs[name] = value; return req },
      async query(sqlText: string) {
        queries.push(sqlText)
        const r = respond(sqlText, inputs)
        return { recordset: r.recordset ?? [], rowsAffected: r.rowsAffected ?? [0] }
      },
    }
    return req
  },
}
;(db as { getPool: unknown }).getPool = async () => fakePool

const listRow = (status: string) => ({
  Id: '2098-12-28', Name: 'Week of 28 Dec', Status: status,
  WeekStartDate: new Date('2098-12-28T00:00:00Z'), WeekEndDate: new Date('2099-01-03T00:00:00Z'),
  CreatedAt: new Date('2098-12-27T20:00:00Z'), OrderedAt: null, DeliveredAt: null,
})

// Answers "SELECT … FROM dbo.ShoppingLists WHERE Id = @Id" with a list in `status`
// (or no row when null), and every guarded write with `rowsAffected`.
const scenario = (status: string | null, rowsAffected: number) => (sqlText: string): Result =>
  /^\s*SELECT[\s\S]*FROM dbo\.ShoppingLists WHERE Id = @Id/.test(sqlText)
    ? { recordset: status ? [listRow(status)] : [] }
    : { rowsAffected: [rowsAffected] }

const rejectsWith = (status: number, pattern: RegExp) => (err: unknown) => {
  assert.ok(err instanceof ApiError)
  assert.equal(err.status, status)
  assert.match(err.message, pattern)
  return true
}

beforeEach(() => { queries.length = 0 })

// ---------- transitionStatus ----------

test('transitionStatus updates only while the status is still the one validated', async () => {
  let bound: Record<string, unknown> = {}
  respond = (sqlText, inputs) => {
    if (sqlText.includes('UPDATE')) { bound = inputs; return { rowsAffected: [1] } }
    return scenario('Draft', 0)(sqlText)
  }
  const list = await repo.transitionStatus('2098-12-28', 'Ordered')
  assert.equal(list.status, 'Ordered')
  assert.ok(list.orderedAt)
  assert.match(queries.at(-1)!, /WHERE Id = @Id AND Status = @From/)
  assert.equal(bound.From, 'Draft')
})

test('transitionStatus: losing a concurrent "Mark ordered" race returns 409', async () => {
  respond = scenario('Draft', 0)   // read Draft, but the guarded UPDATE matched nothing
  await assert.rejects(repo.transitionStatus('2098-12-28', 'Ordered'), rejectsWith(409, /changed by another request/))
})

test('transitionStatus: illegal transition is 409 and never writes', async () => {
  respond = scenario('Ordered', 1)
  await assert.rejects(repo.transitionStatus('2098-12-28', 'Draft'), rejectsWith(409, /Illegal transition/))
  assert.equal(queries.filter(q => q.includes('UPDATE')).length, 0)
})

test('transitionStatus: missing list is 404', async () => {
  respond = scenario(null, 0)
  await assert.rejects(repo.transitionStatus('2098-12-28', 'Ordered'), rejectsWith(404, /not found/))
})

// ---------- items ----------

test('addItem inserts only while the list is Draft and returns the item', async () => {
  respond = scenario('Draft', 1)
  const item = await repo.addItem('2098-12-28', { name: '  Milk ', quantity: 2.7 })
  assert.equal(item.name, 'Milk')
  assert.equal(item.quantity, 2)
  assert.match(item.id, /^2098-12-28__/)
  assert.match(queries[0], /WHERE EXISTS \(SELECT 1 FROM dbo\.ShoppingLists WITH \(UPDLOCK, HOLDLOCK\)/)
})

test('addItem to an ordered list is 409', async () => {
  respond = scenario('Ordered', 0)
  await assert.rejects(repo.addItem('2098-12-28', { name: 'Too late', quantity: 1 }), rejectsWith(409, /read-only \(Ordered\)/))
})

test('addItem to a missing list is 404', async () => {
  respond = scenario(null, 0)
  await assert.rejects(repo.addItem('2099-01-04', { name: 'Ghost', quantity: 1 }), rejectsWith(404, /not found/))
})

test('addItem blocked while the list still reads Draft lost a race: 409', async () => {
  respond = scenario('Draft', 0)
  await assert.rejects(repo.addItem('2098-12-28', { name: 'Milk', quantity: 1 }), rejectsWith(409, /changed by another request/))
})

test('removeItem of an already-deleted item on a Draft list is a no-op (204)', async () => {
  respond = scenario('Draft', 0)
  await repo.removeItem('2098-12-28__gone')
})

test('removeItem from a delivered list is 409', async () => {
  respond = scenario('Delivered', 0)
  await assert.rejects(repo.removeItem('2098-12-28__x'), rejectsWith(409, /read-only/))
})

test('updateItemNotes on a missing item of a Draft list is 404', async () => {
  respond = scenario('Draft', 0)
  await assert.rejects(repo.updateItemNotes('2098-12-28__gone', 'x'), rejectsWith(404, /Item .* not found/))
})

test('updateItemNotes on an ordered list is 409', async () => {
  respond = scenario('Ordered', 0)
  await assert.rejects(repo.updateItemNotes('2098-12-28__x', 'x'), rejectsWith(409, /read-only/))
})

// ---------- unique violations ----------

test('createList for an existing week is 409', async () => {
  respond = () => { throw Object.assign(new Error('dup'), { number: 2627 }) }
  await assert.rejects(repo.createList({ weekStartDate: '2098-12-28' }), rejectsWith(409, /already exists/))
})

test('addFavourite with a duplicate normalised name is 409', async () => {
  respond = () => { throw Object.assign(new Error('dup'), { number: 2601 }) }
  await assert.rejects(repo.addFavourite({ name: ' Tea ', defaultQuantity: 1 }), rejectsWith(409, /"Tea" already exists/))
})
