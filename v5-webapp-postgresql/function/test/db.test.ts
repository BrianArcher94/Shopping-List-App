import { test } from 'node:test'
import assert from 'node:assert/strict'
import { types } from 'pg'
import '../src/shared/db'   // registers the DATE type parser (no connection is opened on import)

const DATE_OID = 1082

test('db.ts makes pg return DATE columns as the raw YYYY-MM-DD string', () => {
  const parse = types.getTypeParser(DATE_OID, 'text')
  assert.equal(parse('2026-10-11'), '2026-10-11')
})
