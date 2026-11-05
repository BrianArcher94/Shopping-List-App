import type { HttpResponseInit, InvocationContext } from '@azure/functions'

// A controlled error we can throw to return a specific status code.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const ok = (body: unknown): HttpResponseInit => ({ status: 200, jsonBody: body })
export const created = (body: unknown): HttpResponseInit => ({ status: 201, jsonBody: body })
export const noContent = (): HttpResponseInit => ({ status: 204 })

// Wrap a handler so thrown ApiErrors become clean responses and any other
// error becomes a logged 500 (never leaks internals to the caller).
export async function run(
  context: InvocationContext,
  fn: () => Promise<HttpResponseInit>,
): Promise<HttpResponseInit> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ApiError) {
      return { status: err.status, jsonBody: { error: err.message } }
    }
    // Safety net: a SQL error the repository didn't handle (e.g. a race, or the serverless
    // database resuming) is still mapped to a meaningful status. The error number is logged;
    // details are not returned.
    const mapped = safetyNet(err)
    if (mapped) {
      context.warn('SQL error', sqlErrorNumber(err))
      return mapped
    }
    context.error('Unhandled error', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

// mssql/Tedious put the SQL Server error number in err.number. Anything else → undefined.
export function sqlErrorNumber(err: unknown): number | undefined {
  const n = (err as { number?: unknown })?.number
  return typeof n === 'number' ? n : undefined
}

// True if a SQL Server error is a unique/primary-key violation
// (2627 = PK/UNIQUE constraint, 2601 = unique index) — mapped to HTTP 409.
export function isUniqueViolation(err: unknown): boolean {
  const n = sqlErrorNumber(err)
  return n === 2627 || n === 2601
}

// SQL error number → API response for errors that reached run() unhandled; undefined for anything else.
//   2627/2601 unique violation → 409 · 547 FK/CHECK violation → 409
//   40613 database unavailable (serverless resuming) → 503 + Retry-After
export function safetyNet(err: unknown): HttpResponseInit | undefined {
  switch (sqlErrorNumber(err)) {
    case 2627:
    case 2601:  return { status: 409, jsonBody: { error: 'Conflicts with existing data' } }
    case 547:   return { status: 409, jsonBody: { error: 'Conflicts with related data' } }
    case 40613: return { status: 503, headers: { 'Retry-After': '30' }, jsonBody: { error: 'Database is resuming; retry shortly' } }
    default:    return undefined
  }
}
