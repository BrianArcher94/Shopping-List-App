import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { AuthError, authenticate, type Principal } from './auth'
import { ApiError } from './errors'

// Re-exported so existing imports (repository.ts) keep working.
export { ApiError }

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
    if (err instanceof AuthError) {
      // Reason is for our logs only; the caller gets a generic 401/403.
      context.warn(`Auth failed: ${err.reason}`)
      return {
        status: err.status,
        jsonBody: { error: err.message },
        headers: err.status === 401 ? { 'WWW-Authenticate': 'Bearer' } : undefined,
      }
    }
    if (err instanceof ApiError) {
      return { status: err.status, jsonBody: { error: err.message } }
    }
    context.error('Unhandled error', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

// V4: the same wrapper, but the handler only runs once the bearer token has
// been validated — it receives the resulting Principal. Every user-facing route
// uses this; only the scheduler job (function-key auth) stays on run().
export async function runAuthed(
  req: HttpRequest,
  context: InvocationContext,
  fn: (user: Principal) => Promise<HttpResponseInit>,
): Promise<HttpResponseInit> {
  return run(context, async () => {
    const user = await authenticate(req)
    context.log(`Authenticated oid=${user.oid}`)
    return fn(user)
  })
}

// True if a SQL Server error is a unique/primary-key violation
// (2627 = PK/UNIQUE constraint, 2601 = unique index) — mapped to HTTP 409.
export function isUniqueViolation(err: unknown): boolean {
  const n = (err as { number?: number })?.number
  return n === 2627 || n === 2601
}
