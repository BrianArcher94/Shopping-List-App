import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { InvocationContext } from '@azure/functions'
import { ApiError, constraintStatus, isUniqueViolation, run } from '../src/shared/http'

// pg errors carry the PostgreSQL SQLSTATE in .code (see db/tests/constraints.sql).
const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code })

const fakeContext = () => {
  const logs: string[] = []
  const ctx = { warn: () => logs.push('warn'), error: () => logs.push('error') } as unknown as InvocationContext
  return { ctx, logs }
}

test('isUniqueViolation is true only for SQLSTATE 23505', () => {
  assert.equal(isUniqueViolation(pgError('23505')), true)
  assert.equal(isUniqueViolation(pgError('23503')), false)
  assert.equal(isUniqueViolation(Object.assign(new Error(), { number: 2627 })), false)  // V3's SQL Server shape
  assert.equal(isUniqueViolation(undefined), false)
})

test('constraintStatus maps integrity violations to HTTP statuses', () => {
  assert.equal(constraintStatus(pgError('23505')), 409)
  assert.equal(constraintStatus(pgError('23503')), 404)
  assert.equal(constraintStatus(pgError('23514')), 400)
  assert.equal(constraintStatus(pgError('42P01')), undefined)   // undefined_table — a real bug, stays 500
  assert.equal(constraintStatus(new Error('boom')), undefined)
})

test('run returns ApiError status and message', async () => {
  const { ctx } = fakeContext()
  const res = await run(ctx, async () => { throw new ApiError(409, 'List is read-only') })
  assert.deepEqual(res, { status: 409, jsonBody: { error: 'List is read-only' } })
})

test('run maps an unhandled constraint violation without leaking details', async () => {
  const { ctx, logs } = fakeContext()
  const res = await run(ctx, async () => { throw pgError('23503') })
  assert.deepEqual(res, { status: 404, jsonBody: { error: 'Referenced record not found' } })
  assert.deepEqual(logs, ['warn'])
})

test('run turns anything else into a logged 500', async () => {
  const { ctx, logs } = fakeContext()
  const res = await run(ctx, async () => { throw pgError('42P01') })
  assert.deepEqual(res, { status: 500, jsonBody: { error: 'Internal server error' } })
  assert.deepEqual(logs, ['error'])
})
