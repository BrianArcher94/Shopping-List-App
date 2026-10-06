import { describe, expect, it, vi } from 'vitest'
import type { Principal } from './auth'
import { ApiError } from './errors'
import { GraphError, type GraphClient } from './graph'
import { DEFAULT_PROFILE_ROW } from './profile-repository'
import { createProfileService, type ProfileDeps } from './profile-service'

// Orchestration rules, with Graph / SQL / Blob replaced by recording fakes.

const user: Principal = { oid: 'aaaaaaaa-0000-0000-0000-000000000004', name: 'Sam Carter', amr: ['pwd', 'otp', 'mfa'] }
const NOW = new Date('2026-10-01T09:00:00Z')
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

const graphUser = {
  id: user.oid, displayName: 'Sam Carter', givenName: 'Sam', surname: 'Carter', city: 'Bristol',
  country: 'United Kingdom', identities: [{ signInType: 'emailAddress', issuerAssignedId: 'sam@example.com' }],
  createdDateTime: '2026-03-02T10:00:00Z',
}

function setup(overrides: { graph?: Partial<GraphClient> | null } = {}) {
  const log: string[] = []
  const graph = overrides.graph === null ? null : {
    getUser: vi.fn(async () => { log.push('graph.getUser'); return graphUser }),
    updateUser: vi.fn(async () => { log.push('graph.updateUser') }),
    revokeSignInSessions: vi.fn(async () => { log.push('graph.revoke') }),
    deleteUser: vi.fn(async () => { log.push('graph.deleteUser') }),
    ...overrides.graph,
  } as unknown as GraphClient
  const repo = {
    getProfileRow: vi.fn(async () => ({ ...DEFAULT_PROFILE_ROW })),
    saveTheme: vi.fn(async () => { log.push('sql.saveTheme') }),
    savePhotoState: vi.fn(async () => { log.push('sql.savePhotoState') }),
    getActivity: vi.fn(),
    getAllActivity: vi.fn(async () => []),
    anonymiseAndDeleteProfile: vi.fn(async () => { log.push('sql.anonymise') }),
  }
  const photos = {
    savePhoto: vi.fn(async () => { log.push('blob.save') }),
    readPhoto: vi.fn(async () => Buffer.from(JPEG)),
    deletePhoto: vi.fn(async () => { log.push('blob.delete') }),
  }
  const warn = vi.fn()
  const deps: ProfileDeps = { graph: () => graph, repo: repo as never, photos, warn, now: () => NOW }
  return { svc: createProfileService(deps), graph, repo, photos, warn, log }
}

async function rejects(p: Promise<unknown>): Promise<ApiError> {
  const err = await p.then(() => undefined, (e) => e)
  expect(err).toBeInstanceOf(ApiError)
  return err as ApiError
}

describe('getMe', () => {
  it('merges Entra details with SQL preferences for the token user', async () => {
    const { svc, graph } = setup()
    const me = await svc.getMe(user)
    expect(graph!.getUser).toHaveBeenCalledWith(user.oid)
    expect(me).toEqual({
      oid: user.oid, displayName: 'Sam Carter', givenName: 'Sam', surname: 'Carter', city: 'Bristol',
      country: 'United Kingdom', email: 'sam@example.com', memberSince: '2026-03-02T10:00:00Z',
      theme: 'system', hasPhoto: false, photoUpdatedAt: null, mfaVerified: true,
    })
  })

  it('503 when Graph is not configured', async () => {
    const { svc } = setup({ graph: null })
    expect((await rejects(svc.getMe(user))).status).toBe(503)
  })

  it('maps Graph failures to safe messages and logs the detail', async () => {
    const { svc, warn } = setup({
      graph: { getUser: vi.fn(async () => { throw new GraphError(503, 'ServiceUnavailable', 'secret detail') }) },
    })
    const err = await rejects(svc.getMe(user))
    expect(err.status).toBe(502)
    expect(err.message).not.toContain('secret detail')
    expect(warn).toHaveBeenCalledWith('secret detail')
  })

  it('does not swallow non-Graph errors', async () => {
    const { svc } = setup({ graph: { getUser: vi.fn(async () => { throw new TypeError('bug') }) } })
    await expect(svc.getMe(user)).rejects.toThrow(TypeError)
  })
})

describe('updateDetails', () => {
  it('validates, writes to Entra, then returns the written values', async () => {
    const { svc, graph } = setup()
    const body = { displayName: ' Samantha Carter ', givenName: 'Samantha', surname: 'Carter', city: '', country: 'Ireland' }
    const me = await svc.updateDetails(user, body)
    expect(graph!.updateUser).toHaveBeenCalledWith(user.oid, {
      displayName: 'Samantha Carter', givenName: 'Samantha', surname: 'Carter', city: '', country: 'Ireland',
    })
    // Graph's (stale) read said Bristol / Sam Carter; the overlay wins.
    expect(me.displayName).toBe('Samantha Carter')
    expect(me.city).toBe('')
  })

  it('never calls Graph for an invalid body', async () => {
    const { svc, graph } = setup()
    expect((await rejects(svc.updateDetails(user, { displayName: '' }))).status).toBe(400)
    expect(graph!.updateUser).not.toHaveBeenCalled()
  })

  it('a Graph 400 becomes a 400 and anything else a "nothing was changed" 502', async () => {
    const bad = setup({ graph: { updateUser: vi.fn(async () => { throw new GraphError(400, 'Request_BadRequest', 'x') }) } })
    expect((await rejects(bad.svc.updateDetails(user, { displayName: 'Sam' }))).status).toBe(400)
    const down = setup({ graph: { updateUser: vi.fn(async () => { throw new GraphError(0, 'network', 'x') }) } })
    const err = await rejects(down.svc.updateDetails(user, { displayName: 'Sam' }))
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/Nothing was changed/)
  })
})

describe('photos', () => {
  it('is app-owned: Blob + SQL only, never Graph', async () => {
    const { svc, repo, log, warn } = setup()
    const state = await svc.uploadPhoto(user, 'image/jpeg', JPEG)
    expect(log).toEqual(['blob.save', 'sql.savePhotoState'])
    expect(repo.savePhotoState).toHaveBeenCalledWith(user.oid, NOW)
    expect(state).toEqual({ hasPhoto: true, photoUpdatedAt: NOW.toISOString() })
    expect(warn).not.toHaveBeenCalled()
  })

  it('works without Graph configured', async () => {
    const { svc } = setup({ graph: null })
    expect((await svc.uploadPhoto(user, 'image/jpeg', JPEG)).hasPhoto).toBe(true)
  })

  it('rejects a non-JPEG before touching storage', async () => {
    const { svc, photos } = setup()
    expect((await rejects(svc.uploadPhoto(user, 'image/png', JPEG))).status).toBe(415)
    expect(photos.savePhoto).not.toHaveBeenCalled()
  })

  it('getPhoto returns null when there is no photo recorded', async () => {
    const { svc, photos } = setup()
    expect(await svc.getPhoto(user)).toBeNull()
    expect(photos.readPhoto).not.toHaveBeenCalled()
  })

  it('getPhoto returns bytes and an ETag from the update time', async () => {
    const { svc, repo } = setup()
    repo.getProfileRow.mockResolvedValueOnce({ theme: 'system', photoUpdatedAt: NOW.toISOString() })
    const photo = await svc.getPhoto(user)
    expect(photo!.etag).toBe(`"${NOW.getTime()}"`)
    expect(photo!.bytes.length).toBe(JPEG.length)
  })

  it('removePhoto clears Blob and SQL, never Graph', async () => {
    const { svc, log, repo } = setup()
    await expect(svc.removePhoto(user)).resolves.toEqual({ hasPhoto: false, photoUpdatedAt: null })
    expect(log).toEqual(['blob.delete', 'sql.savePhotoState'])
    expect(repo.savePhotoState).toHaveBeenCalledWith(user.oid, null)
  })
})

describe('deleteAccount', () => {
  it('requires the confirmation literal and touches nothing without it', async () => {
    const { svc, log } = setup()
    expect((await rejects(svc.deleteAccount(user, { confirm: 'yes' }))).status).toBe(400)
    expect(log).toEqual([])
  })

  it('refuses up front (503) if Graph is not configured, before deleting any data', async () => {
    const { svc, log } = setup({ graph: null })
    expect((await rejects(svc.deleteAccount(user, { confirm: 'DELETE' }))).status).toBe(503)
    expect(log).toEqual([])
  })

  it('removes SQL + Blob data first and the Entra account last', async () => {
    const { svc, log, graph } = setup()
    await svc.deleteAccount(user, { confirm: 'DELETE' })
    expect(log).toEqual(['sql.anonymise', 'blob.delete', 'graph.deleteUser'])
    expect(graph!.deleteUser).toHaveBeenCalledWith(user.oid)
  })

  it('explains a failed Entra delete so the user can retry', async () => {
    const { svc } = setup({ graph: { deleteUser: vi.fn(async () => { throw new GraphError(0, 'network', 'x') }) } })
    const err = await rejects(svc.deleteAccount(user, { confirm: 'DELETE' }))
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/try again/i)
  })
})

describe('preferences / sessions / export', () => {
  it('setTheme validates and stores', async () => {
    const { svc, repo } = setup()
    expect(await svc.setTheme(user, { theme: 'dark' })).toBe('dark')
    expect(repo.saveTheme).toHaveBeenCalledWith(user.oid, 'dark')
    expect((await rejects(svc.setTheme(user, { theme: 'neon' }))).status).toBe(400)
  })

  it('revokeSessions revokes the token user only', async () => {
    const { svc, graph } = setup()
    await svc.revokeSessions(user)
    expect(graph!.revokeSignInSessions).toHaveBeenCalledWith(user.oid)
  })

  it('exportData bundles profile + activity with a timestamp', async () => {
    const { svc } = setup()
    const out = await svc.exportData(user)
    expect(out.exportedAt).toBe(NOW.toISOString())
    expect(out.profile.email).toBe('sam@example.com')
    expect(out.activity).toEqual([])
  })
})
