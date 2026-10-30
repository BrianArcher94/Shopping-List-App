import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { InvocationContext } from '@azure/functions'
import { ApiError, cosmosStatus, run, safetyNet } from '../src/shared/http'

// The Cosmos SDK's ErrorResponse carries the HTTP status as a number in .code.
const cosmosError = (code: number) => Object.assign(new Error(`cosmos ${code}`), { code, activityId: 'act-1' })

const fakeContext = () => {
  const logs: string[] = []
  const ctx = { warn: () => logs.push('warn'), error: () => logs.push('error') } as unknown as InvocationContext
  return { ctx, logs }
}

test('cosmosStatus reads numeric codes only', () => {
  assert.equal(cosmosStatus(cosmosError(409)), 409)
  assert.equal(cosmosStatus(Object.assign(new Error(), { code: '23505' })), undefined)        // V5's SQLSTATE shape
  assert.equal(cosmosStatus(Object.assign(new Error(), { code: 'ECONNREFUSED' })), undefined) // Node system error
  assert.equal(cosmosStatus(undefined), undefined)
})

test('safetyNet maps Cosmos statuses to API responses', () => {
  assert.equal(safetyNet(cosmosError(409))?.status, 409)
  assert.equal(safetyNet(cosmosError(404))?.status, 404)
  assert.equal(safetyNet(cosmosError(412))?.status, 409)   // failed condition / ETag → conflict
  assert.equal(safetyNet(cosmosError(400))?.status, 400)
  assert.deepEqual(safetyNet(cosmosError(429))?.headers, { 'Retry-After': '1' })
  assert.equal(safetyNet(cosmosError(429))?.status, 503)
  assert.equal(safetyNet(cosmosError(403)), undefined)     // RBAC/firewall problem — a real bug, stays 500
  assert.equal(safetyNet(new Error('boom')), undefined)
})

test('run returns ApiError status and message', async () => {
  const { ctx } = fakeContext()
  const res = await run(ctx, async () => { throw new ApiError(409, 'List is read-only') })
  assert.deepEqual(res, { status: 409, jsonBody: { error: 'List is read-only' } })
})

test('run maps an unhandled Cosmos status without leaking details', async () => {
  const { ctx, logs } = fakeContext()
  const res = await run(ctx, async () => { throw cosmosError(412) })
  assert.deepEqual(res, { status: 409, jsonBody: { error: 'Changed by another request; reload and retry' } })
  assert.deepEqual(logs, ['warn'])
})

test('run turns anything else into a logged 500', async () => {
  const { ctx, logs } = fakeContext()
  const res = await run(ctx, async () => { throw cosmosError(403) })
  assert.deepEqual(res, { status: 500, jsonBody: { error: 'Internal server error' } })
  assert.deepEqual(logs, ['error'])
})
