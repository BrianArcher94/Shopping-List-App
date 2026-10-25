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
    // Safety net: a constraint the repository didn't pre-check (e.g. a race) is still
    // the caller's problem, not a 500. The SQLSTATE is logged; details are not returned.
    const status = constraintStatus(err)
    if (status) {
      context.warn('Constraint violation', pgCode(err))
      return { status, jsonBody: { error: CONSTRAINT_MESSAGES[status] } }
    }
    context.error('Unhandled error', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

// PostgreSQL reports errors as a 5-character SQLSTATE in err.code (V3 used SQL Server err.number).
const pgCode = (err: unknown) => (err as { code?: string })?.code

// True if a PostgreSQL error is a unique/primary-key violation (SQLSTATE 23505) — mapped to HTTP 409.
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === '23505'
}

const CONSTRAINT_MESSAGES: Record<number, string> = {
  400: 'Invalid value',
  404: 'Referenced record not found',
  409: 'Conflicts with existing data',
}

// SQLSTATE → HTTP status for integrity-constraint violations; undefined for anything else.
//   23505 unique_violation → 409 · 23503 foreign_key_violation → 404 · 23514 check_violation → 400
export function constraintStatus(err: unknown): number | undefined {
  switch (pgCode(err)) {
    case '23505': return 409
    case '23503': return 404
    case '23514': return 400
    default:      return undefined
  }
}