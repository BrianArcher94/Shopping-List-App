import { describe, expect, it, vi } from 'vitest'
import { GraphClient, GraphError } from './graph'

// Request shaping only: URL, method, headers and body for each call, plus error
// mapping. No network - fetch is a mock.

function client(responses: Response[] = [new Response(null, { status: 204 })]) {
  const fetchFn = vi.fn(async () => responses.shift() ?? new Response(null, { status: 204 }))
  const graph = new GraphClient({ getToken: async () => 'graph-token', fetchFn: fetchFn as unknown as typeof fetch })
  const call = (i = 0) => {
    const [url, init] = fetchFn.mock.calls[i] as unknown as [string, RequestInit]
    return { url, init, headers: init.headers as Record<string, string> }
  }
  return { graph, fetchFn, call }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('GraphClient', () => {
  it('getUser selects only the profile fields and sends the bearer token', async () => {
    const { graph, call } = client([json({ id: 'oid-1', displayName: 'Sam' })])
    const user = await graph.getUser('oid-1')
    expect(user.displayName).toBe('Sam')
    const { url, init, headers } = call()
    expect(init.method).toBe('GET')
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/users/oid-1?$select=id,displayName,givenName,surname,city,country,mail,identities,createdDateTime',
    )
    expect(headers.Authorization).toBe('Bearer graph-token')
  })

  it('encodes the oid into the path', async () => {
    const { graph, call } = client([json({ id: 'x' })])
    await graph.getUser('a/../b')
    expect(call().url).toContain('/users/a%2F..%2Fb?')
  })

  it('updateUser PATCHes JSON and sends empty strings as null (clears the property)', async () => {
    const { graph, call } = client()
    await graph.updateUser('oid-1', { displayName: 'Sam C', givenName: 'Sam', surname: '', city: 'Bristol', country: '' })
    const { url, init, headers } = call()
    expect(init.method).toBe('PATCH')
    expect(url).toBe('https://graph.microsoft.com/v1.0/users/oid-1')
    expect(headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({
      displayName: 'Sam C', givenName: 'Sam', surname: null, city: 'Bristol', country: null,
    })
  })

  it('has no photo calls: External ID tenants have no Graph photo storage', () => {
    const { graph } = client()
    expect('putPhoto' in graph).toBe(false)
    expect('deletePhoto' in graph).toBe(false)
  })

  it('revokeSignInSessions POSTs to the action', async () => {
    const { graph, call } = client([json({ value: true })])
    await graph.revokeSignInSessions('oid-1')
    expect(call().init.method).toBe('POST')
    expect(call().url).toBe('https://graph.microsoft.com/v1.0/users/oid-1/revokeSignInSessions')
  })

  it('deleteUser tolerates 404 (already gone)', async () => {
    const { graph } = client([json({ error: { code: 'Request_ResourceNotFound' } }, 404)])
    await expect(graph.deleteUser('oid-1')).resolves.toBeUndefined()
  })

  it('throws GraphError with status and code on failure', async () => {
    const { graph } = client([json({ error: { code: 'Authorization_RequestDenied', message: 'Insufficient privileges' } }, 403)])
    const err = await graph.updateUser('oid-1', { displayName: 'x', givenName: '', surname: '', city: '', country: '' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(GraphError)
    expect(err.status).toBe(403)
    expect(err.code).toBe('Authorization_RequestDenied')
  })

  it('maps a network failure to GraphError status 0', async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError('fetch failed') })
    const graph = new GraphClient({ getToken: async () => 't', fetchFn: fetchFn as unknown as typeof fetch })
    const err = await graph.getUser('oid-1').catch((e) => e)
    expect(err).toBeInstanceOf(GraphError)
    expect(err.status).toBe(0)
  })

  it('maps a token failure (Key Vault / assertion) to GraphError status 0 without calling Graph', async () => {
    const fetchFn = vi.fn()
    const graph = new GraphClient({
      getToken: async () => { throw new Error('Key Vault sign forbidden') },
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const err = await graph.revokeSignInSessions('oid-1').catch((e) => e)
    expect(err).toBeInstanceOf(GraphError)
    expect(err.code).toBe('token')
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
