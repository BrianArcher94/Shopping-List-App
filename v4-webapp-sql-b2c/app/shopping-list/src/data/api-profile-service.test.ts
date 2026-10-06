import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiProfileService, ApiRequestError } from './api-profile-service'

// The /api/me* contract as the SPA sees it: paths, methods, bodies, the token
// seam, and the server's user-safe { error } message surfacing as Error.message.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function svc(getAccessToken?: () => Promise<string>, onUnauthorized?: () => void) {
  return new ApiProfileService({ baseUrl: '/api', getAccessToken, onUnauthorized })
}

const call = (mock: ReturnType<typeof vi.spyOn>, i = 0) => {
  const [url, init] = mock.mock.calls[i] as [string, RequestInit]
  return { url, init, headers: new Headers(init.headers) }
}

describe('ApiProfileService', () => {
  afterEach(() => vi.restoreAllMocks())

  it('GET /me with the bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ displayName: 'Sam' }))
    expect(await svc(async () => 'tok').getProfile()).toEqual({ displayName: 'Sam' })
    const { url, headers } = call(fetchMock)
    expect(url).toBe('/api/me')
    expect(headers.get('Authorization')).toBe('Bearer tok')
  })

  it('PATCH /me sends the details as JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}))
    const details = { displayName: 'Sam', givenName: 'Sam', surname: 'Carter', city: '', country: '' }
    await svc().updateDetails(details)
    const { url, init, headers } = call(fetchMock)
    expect(url).toBe('/api/me')
    expect(init.method).toBe('PATCH')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual(details)
  })

  it('surfaces the server error message (e.g. Graph unreachable)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: 'Couldn’t reach Entra External ID. Nothing was changed.' }, 502),
    )
    const err = await svc().updateDetails({ displayName: 'x', givenName: '', surname: '', city: '', country: '' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(ApiRequestError)
    expect(err.status).toBe(502)
    expect(err.message).toBe('Couldn’t reach Entra External ID. Nothing was changed.')
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 500 }))
    await expect(svc().getProfile()).rejects.toThrow('Request failed (500)')
  })

  it('calls onUnauthorized on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: 'Unauthorized' }, 401))
    const onUnauthorized = vi.fn()
    await expect(svc(async () => 't', onUnauthorized).getProfile()).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('PUT /me/preferences returns the stored theme', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ theme: 'dark' }))
    expect(await svc().setTheme('dark')).toBe('dark')
    expect(call(fetchMock).init.method).toBe('PUT')
    expect(JSON.parse(call(fetchMock).init.body as string)).toEqual({ theme: 'dark' })
  })

  it('getPhoto: 404 means no photo, not an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: 'No photo' }, 404))
    expect(await svc().getPhoto()).toBeNull()
  })

  it('getPhoto returns the image bytes with the token attached', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([0xff, 0xd8, 0xff]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    )
    const blob = await svc(async () => 'tok').getPhoto()
    expect(blob!.size).toBe(3)
    expect(call(fetchMock).headers.get('Authorization')).toBe('Bearer tok')
  })

  it('uploadPhoto PUTs the JPEG as image/jpeg, not JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ hasPhoto: true, photoUpdatedAt: '2026-10-01T09:00:00.000Z' }),
    )
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
    const state = await svc().uploadPhoto(jpeg)
    const { url, init, headers } = call(fetchMock)
    expect(url).toBe('/api/me/photo')
    expect(init.method).toBe('PUT')
    expect(headers.get('Content-Type')).toBe('image/jpeg')
    expect(init.body).toBe(jpeg)
    expect(state.hasPhoto).toBe(true)
  })

  it('revokeSessions POSTs; deleteAccount DELETEs /me with the confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    await svc().revokeSessions()
    await svc().deleteAccount('DELETE')
    expect(call(fetchMock, 0)).toMatchObject({ url: '/api/me/revoke-sessions', init: { method: 'POST' } })
    const del = call(fetchMock, 1)
    expect(del.url).toBe('/api/me')
    expect(del.init.method).toBe('DELETE')
    expect(JSON.parse(del.init.body as string)).toEqual({ confirm: 'DELETE' })
  })
})
