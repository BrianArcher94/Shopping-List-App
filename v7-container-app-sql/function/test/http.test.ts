import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { InvocationContext } from '@azure/functions'
import { ApiError, isUniqueViolation, run, safetyNet, sqlErrorNumber } from '../src/shared/http'

// mssql/Tedious errors carry the SQL Server error number in .number.
const sqlError = (number: number) => Object.assign(new Error(`sql ${number}`), { number })

const fakeContext = () => {
  const logs: string[] = []
  const ctx = { warn: () => logs.push('warn'), error: () => logs.push('error') } as unknown as InvocationContext
  return { ctx, logs }
}

test('sqlErrorNumber reads numeric error numbers only', () => {
  assert.equal(sqlErrorNumber(sqlError(2627)), 2627)
  assert.equal(sqlErrorNumber(Object.assign(new Error(), { code: 'ETIMEOUT' })), undefined)  // Tedious connection error
  assert.equal(sqlErrorNumber(Object.assign(new Error(), { number: '2627' })), undefined)
  assert.equal(sqlErrorNumber(undefined), undefined)
})

test('isUniqueViolation matches PK/UNIQUE constraint and unique index only', () => {
  assert.equal(isUniqueViolation(sqlError(2627)), true)
  assert.equal(isUniqueViolation(sqlError(2601)), true)
  assert.equal(isUniqueViolation(sqlError(547)), false)
  assert.equal(isUniqueViolation(new Error('boom')), false)
})

test('safetyNet maps SQL error numbers to API responses', () => {
  assert.equal(safetyNet(sqlError(2627))?.status, 409)
  assert.equal(safetyNet(sqlError(2601))?.status, 409)
  assert.equal(safetyNet(sqlError(547))?.status, 409)       // FK / CHECK violation
  assert.equal(safetyNet(sqlError(40613))?.status, 503)     // serverless database resuming
  assert.deepEqual(safetyNet(sqlError(40613))?.headers, { 'Retry-After': '30' })
  assert.equal(safetyNet(sqlError(18456)), undefined)       // login failed — a real bug, stays 500
  assert.equal(safetyNet(new Error('boom')), undefined)
})

test('run returns ApiError status and message', async () => {
  const { ctx } = fakeContext()
  const res = await run(ctx, async () => { throw new ApiError(409, 'List is read-only') })
  assert.deepEqual(res, { status: 409, jsonBody: { error: 'List is read-only' } })
})

test('run maps an unhandled SQL error without leaking details', async () => {
  const { ctx, logs } = fakeContext()
  const res = await run(ctx, async () => { throw sqlError(547) })
  assert.deepEqual(res, { status: 409, jsonBody: { error: 'Conflicts with related data' } })
  assert.deepEqual(logs, ['warn'])
})

test('run turns anything else into a logged 500', async () => {
  const { ctx, logs } = fakeContext()
  const res = await run(ctx, async () => { throw sqlError(18456) })
  assert.deepEqual(res, { status: 500, jsonBody: { error: 'Internal server error' } })
  assert.deepEqual(logs, ['error'])
})
