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
    context.error('Unhandled error', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

// True if a SQL Server error is a unique/primary-key violation
// (2627 = PK/UNIQUE constraint, 2601 = unique index) — mapped to HTTP 409.
export function isUniqueViolation(err: unknown): boolean {
  const n = (err as { number?: number })?.number
  return n === 2627 || n === 2601
}