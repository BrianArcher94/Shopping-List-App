import type { ProfileActivity, ProfileActivityEntry, UserProfile } from '../../domain/profile'
import type { Principal } from './auth'
import { ApiError } from './errors'
import { GraphError, getGraphClient, type GraphClient } from './graph'
import * as photoStore from './photos'
import * as profileRepo from './profile-repository'
import type { ProfileRow } from './profile-repository'
import {
  assertDeleteConfirmed,
  detailsFromGraph,
  emailFromGraph,
  mfaVerified,
  validateDetails,
  validatePhoto,
  validateTheme,
} from './profile'

// Orchestrates Graph (Entra), SQL and Blob for the /me routes. Dependencies are
// injected so the ordering and failure rules are unit tested
// (profile-service.test.ts) without Azure; me.ts wires the real ones.
//
// The caller is ALWAYS the validated Principal - nothing here accepts a user id
// from the request body or path.

export interface ProfileDeps {
  graph: () => GraphClient | null
  repo: Pick<
    typeof profileRepo,
    'getProfileRow' | 'saveTheme' | 'savePhotoState' | 'getActivity' | 'getAllActivity' | 'anonymiseAndDeleteProfile'
  >
  photos: Pick<typeof photoStore, 'savePhoto' | 'readPhoto' | 'deletePhoto'>
  warn: (message: string) => void
  now: () => Date
}

export interface PhotoState {
  hasPhoto: boolean
  photoUpdatedAt: string | null
}

export interface ProfileExport {
  exportedAt: string
  profile: UserProfile
  activity: ProfileActivityEntry[]
}

export function createProfileService(deps: ProfileDeps) {
  /** Graph is required for this operation; map its failures to user-safe API errors. */
  async function withGraph<T>(action: 'read' | 'write', fn: (g: GraphClient) => Promise<T>): Promise<T> {
    const graph = deps.graph()
    if (!graph) throw new ApiError(503, 'Profile sync with Entra External ID is not configured')
    try {
      return await fn(graph)
    } catch (err) {
      if (!(err instanceof GraphError)) throw err
      deps.warn(err.message) // full Graph detail for App Insights only
      if (err.status === 404) throw new ApiError(404, 'Your account was not found in Entra External ID')
      if (err.status === 400) throw new ApiError(400, 'Entra External ID rejected the change')
      throw new ApiError(502, action === 'write'
        ? 'Couldn’t reach Entra External ID. Nothing was changed.'
        : 'Couldn’t load your profile from Entra External ID')
    }
  }

  function toProfile(user: Principal, graphUser: Awaited<ReturnType<GraphClient['getUser']>>, row: ProfileRow): UserProfile {
    return {
      oid: user.oid,
      ...detailsFromGraph(graphUser),
      email: emailFromGraph(graphUser),
      memberSince: graphUser.createdDateTime ?? null,
      theme: row.theme,
      hasPhoto: row.photoUpdatedAt !== null,
      photoUpdatedAt: row.photoUpdatedAt,
      mfaVerified: mfaVerified(user.amr),
    }
  }

  async function getMe(user: Principal): Promise<UserProfile> {
    const [graphUser, row] = await Promise.all([
      withGraph('read', (g) => g.getUser(user.oid)),
      deps.repo.getProfileRow(user.oid),
    ])
    return toProfile(user, graphUser, row)
  }

  async function updateDetails(user: Principal, body: unknown): Promise<UserProfile> {
    const details = validateDetails(body)
    await withGraph('write', (g) => g.updateUser(user.oid, details))
    // Overlay what we just wrote: Graph reads are not guaranteed read-your-writes.
    const current = await getMe(user)
    return { ...current, ...details }
  }

  async function setTheme(user: Principal, body: unknown): Promise<UserProfile['theme']> {
    const theme = validateTheme(body)
    await deps.repo.saveTheme(user.oid, theme)
    return theme
  }

  async function getActivity(user: Principal): Promise<ProfileActivity> {
    return deps.repo.getActivity(user.oid, deps.now())
  }

  /**
   * The photo is app-owned: Blob holds the bytes, SQL the timestamp. There is no
   * Entra copy - External ID tenants have no Graph photo storage (see domain/profile.ts).
   */
  async function uploadPhoto(user: Principal, contentType: string | null, bytes: Uint8Array): Promise<PhotoState> {
    validatePhoto(contentType, bytes)
    await deps.photos.savePhoto(user.oid, bytes)
    const at = deps.now()
    await deps.repo.savePhotoState(user.oid, at)
    return { hasPhoto: true, photoUpdatedAt: at.toISOString() }
  }

  async function getPhoto(user: Principal): Promise<{ bytes: Buffer; etag: string } | null> {
    const row = await deps.repo.getProfileRow(user.oid)
    if (!row.photoUpdatedAt) return null
    const bytes = await deps.photos.readPhoto(user.oid)
    return bytes ? { bytes, etag: `"${Date.parse(row.photoUpdatedAt)}"` } : null
  }

  async function removePhoto(user: Principal): Promise<PhotoState> {
    await deps.photos.deletePhoto(user.oid)
    await deps.repo.savePhotoState(user.oid, null)
    return { hasPhoto: false, photoUpdatedAt: null }
  }

  async function revokeSessions(user: Principal): Promise<void> {
    await withGraph('write', (g) => g.revokeSignInSessions(user.oid))
  }

  async function exportData(user: Principal): Promise<ProfileExport> {
    const [profile, activity] = await Promise.all([getMe(user), deps.repo.getAllActivity(user.oid)])
    return { exportedAt: deps.now().toISOString(), profile, activity }
  }

  /**
   * Order matters. SQL + Blob first, Entra account LAST: if the Entra delete
   * fails the user can still sign in and retry (every step is idempotent). The
   * reverse order could leave personal data behind for an account that can no
   * longer sign in to ask for its removal.
   */
  async function deleteAccount(user: Principal, body: unknown): Promise<void> {
    assertDeleteConfirmed(body)
    if (!deps.graph()) throw new ApiError(503, 'Profile sync with Entra External ID is not configured')

    await deps.repo.anonymiseAndDeleteProfile(user.oid)
    await deps.photos.deletePhoto(user.oid)
    await withGraph('write', (g) => g.deleteUser(user.oid)).catch((err) => {
      if (err instanceof ApiError && err.status === 502) {
        throw new ApiError(502, 'Your data was removed, but Entra External ID couldn’t delete your sign-in. Please try again.')
      }
      throw err
    })
  }

  return { getMe, updateDetails, setTheme, getActivity, uploadPhoto, getPhoto, removePhoto, revokeSessions, exportData, deleteAccount }
}

export type ProfileService = ReturnType<typeof createProfileService>

/**
 * Production wiring, built per invocation so warnings land in that invocation's
 * log. Cheap: the Graph client, SQL pool and blob container are module singletons.
 */
export function profileServiceFor(warn: (message: string) => void): ProfileService {
  return createProfileService({
    graph: getGraphClient,
    repo: profileRepo,
    photos: photoStore,
    warn,
    now: () => new Date(),
  })
}
