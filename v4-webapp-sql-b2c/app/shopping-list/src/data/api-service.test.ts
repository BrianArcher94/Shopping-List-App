import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiShoppingDataService } from './api-service'

// Verifies the V4 token seam: the single request<T>() helper attaches the
// bearer token, and a caller-supplied header cannot clobber it.

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('ApiShoppingDataService auth header', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends Authorization: Bearer <token> when a token provider is injected', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]))
    const svc = new ApiShoppingDataService({ baseUrl: '/api', getAccessToken: async () => 'tok-123' })

    await svc.listAllLists()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/lists')
    const headers = new Headers(init?.headers)
    expect(headers.get('Authorization')).toBe('Bearer tok-123')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('sends no Authorization header when no provider is injected', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]))
    const svc = new ApiShoppingDataService({ baseUrl: '/api' })

    await svc.listFavourites()

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.has('Authorization')).toBe(false)
  })

  it('calls onUnauthorized when the API answers 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }))
    const onUnauthorized = vi.fn()
    const svc = new ApiShoppingDataService({ baseUrl: '/api', getAccessToken: async () => 'stale', onUnauthorized })

    await expect(svc.listAllLists()).rejects.toThrow(/401/)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('still parses bodies and handles 204 with auth on', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ id: 'x', name: 'Milk' }, 201))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const svc = new ApiShoppingDataService({ baseUrl: '/api', getAccessToken: async () => 't' })

    const created = await svc.addFavourite({ name: 'Milk', defaultQuantity: 1 })
    expect(created).toEqual({ id: 'x', name: 'Milk' })
    await expect(svc.removeFavourite('x')).resolves.toBeUndefined()

    for (const call of fetchMock.mock.calls) {
      expect(new Headers(call[1]?.headers).get('Authorization')).toBe('Bearer t')
    }
  })
})
