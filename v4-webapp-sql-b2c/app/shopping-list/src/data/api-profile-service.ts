import type { ProfileActivity, ProfileDetails, ThemePreference, UserProfile } from '@/domain/profile'
import type { IProfileService, PhotoState } from './profile-service'
import type { ApiServiceOptions } from './api-service'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** An API failure with the server's own (user-safe) message. */
export class ApiRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * /api/me* over HTTP. Same token seam as ApiShoppingDataService (the provider
 * is injected, so this class never imports MSAL), but it surfaces the server's
 * `{ error }` message: the profile page shows those to the user, and the API
 * only ever returns safe text there.
 */
export class ApiProfileService implements IProfileService {
  private readonly baseUrl: string
  private readonly opts: ApiServiceOptions

  constructor(options: ApiServiceOptions = {}) {
    this.baseUrl = options.baseUrl ?? API_BASE_URL
    this.opts = options
  }

  private async send(path: string, init: RequestInit = {}, accept404 = false): Promise<Response> {
    const headers = new Headers(init.headers)
    if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (this.opts.getAccessToken) {
      headers.set('Authorization', `Bearer ${await this.opts.getAccessToken()}`)
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    if (res.status === 401 && this.opts.onUnauthorized) await this.opts.onUnauthorized()
    if (res.ok || (accept404 && res.status === 404)) return res

    const body = (await res.json().catch(() => undefined)) as { error?: string } | undefined
    throw new ApiRequestError(res.status, body?.error ?? `Request failed (${res.status})`)
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    return (await (await this.send(path, init)).json()) as T
  }

  getProfile(): Promise<UserProfile> {
    return this.json<UserProfile>('/me')
  }

  updateDetails(details: ProfileDetails): Promise<UserProfile> {
    return this.json<UserProfile>('/me', { method: 'PATCH', body: JSON.stringify(details) })
  }

  async setTheme(theme: ThemePreference): Promise<ThemePreference> {
    const res = await this.json<{ theme: ThemePreference }>('/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ theme }),
    })
    return res.theme
  }

  getActivity(): Promise<ProfileActivity> {
    return this.json<ProfileActivity>('/me/activity')
  }

  async getPhoto(): Promise<Blob | null> {
    const res = await this.send('/me/photo', {}, true)
    return res.status === 404 ? null : res.blob()
  }

  uploadPhoto(jpeg: Blob): Promise<PhotoState> {
    return this.json<PhotoState>('/me/photo', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg,
    })
  }

  removePhoto(): Promise<PhotoState> {
    return this.json<PhotoState>('/me/photo', { method: 'DELETE' })
  }

  async revokeSessions(): Promise<void> {
    await this.send('/me/revoke-sessions', { method: 'POST' })
  }

  async exportData(): Promise<Blob> {
    return (await this.send('/me/export')).blob()
  }

  async deleteAccount(confirm: string): Promise<void> {
    await this.send('/me', { method: 'DELETE', body: JSON.stringify({ confirm }) })
  }
}
