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
    // Safety net: a Cosmos status the repository didn't handle (e.g. a race) is still the
    // caller's problem, not a 500. The status and activityId are logged; details are not returned.
    const mapped = safetyNet(err)
    if (mapped) {
      context.warn('Cosmos error', cosmosStatus(err), activityIdOf(err))
      return mapped
    }
    context.error('Unhandled error', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

// The Cosmos SDK throws an ErrorResponse with the HTTP status as a number in err.code
// (V5 read a PostgreSQL SQLSTATE string from the same property). Non-Cosmos errors → undefined.
export function cosmosStatus(err: unknown): number | undefined {
  const code = (err as { code?: unknown })?.code
  return typeof code === 'number' ? code : undefined
}

const activityIdOf = (err: unknown) => (err as { activityId?: string })?.activityId

// Cosmos status → API response for errors that reached run() unhandled; undefined for anything else.
//   409 conflict → 409 · 404 not found → 404 · 412 failed condition/ETag → 409 · 400 → 400
//   429 throttled (only after the SDK's own retries) → 503 + Retry-After
export function safetyNet(err: unknown): HttpResponseInit | undefined {
  switch (cosmosStatus(err)) {
    case 409: return { status: 409, jsonBody: { error: 'Conflicts with existing data' } }
    case 404: return { status: 404, jsonBody: { error: 'Referenced record not found' } }
    case 412: return { status: 409, jsonBody: { error: 'Changed by another request; reload and retry' } }
    case 400: return { status: 400, jsonBody: { error: 'Invalid value' } }
    case 429: return { status: 503, headers: { 'Retry-After': '1' }, jsonBody: { error: 'Busy; retry shortly' } }
    default:  return undefined
  }
}
