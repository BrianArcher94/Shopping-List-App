import {
  DELETE_CONFIRMATION,
  type ProfileActivity,
  type ProfileDetails,
  type ThemePreference,
  type UserProfile,
} from '@/domain/profile'
import type { IProfileService, PhotoState } from './profile-service'

// LocalStorage stand-in for /api/me. There is no sign-in in this mode, so it is
// a single "local user"; nothing syncs anywhere. Used by tests and by
// `npm run dev` without VITE_USE_API.

const KEY = 'sl:profile'
const PHOTO_KEY = 'sl:profile-photo'

interface Stored extends ProfileDetails {
  theme: ThemePreference
  photoUpdatedAt: string | null
  createdAt: string
}

function defaults(): Stored {
  return {
    displayName: 'Local user',
    givenName: '',
    surname: '',
    city: '',
    country: '',
    theme: 'system',
    photoUpdatedAt: null,
    createdAt: new Date().toISOString(),
  }
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...defaults(), ...(JSON.parse(raw) as Partial<Stored>) }
  } catch {
    // fall through to defaults
  }
  const fresh = defaults()
  write(fresh)
  return fresh
}

function write(value: Stored) {
  localStorage.setItem(KEY, JSON.stringify(value))
}

function toProfile(s: Stored): UserProfile {
  return {
    oid: 'local-user',
    displayName: s.displayName,
    givenName: s.givenName,
    surname: s.surname,
    city: s.city,
    country: s.country,
    email: 'local@localhost',
    memberSince: s.createdAt,
    theme: s.theme,
    hasPhoto: s.photoUpdatedAt !== null,
    photoUpdatedAt: s.photoUpdatedAt,
    mfaVerified: false,
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export class LocalProfileService implements IProfileService {
  async getProfile(): Promise<UserProfile> {
    return toProfile(read())
  }

  async updateDetails(details: ProfileDetails): Promise<UserProfile> {
    const trimmed = Object.fromEntries(
      Object.entries(details).map(([k, v]) => [k, v.trim()]),
    ) as unknown as ProfileDetails
    if (!trimmed.displayName) throw new Error('displayName is required')
    const next = { ...read(), ...trimmed }
    write(next)
    return toProfile(next)
  }

  async setTheme(theme: ThemePreference): Promise<ThemePreference> {
    write({ ...read(), theme })
    return theme
  }

  async getActivity(): Promise<ProfileActivity> {
    // LocalStorage rows carry no audit identity, so there is nothing to attribute.
    return { windowDays: 90, itemsAdded: 0, statusChanges: 0, favouritesAdded: 0, recent: [] }
  }

  async getPhoto(): Promise<Blob | null> {
    const dataUrl = localStorage.getItem(PHOTO_KEY)
    if (!dataUrl) return null
    const [meta, base64] = dataUrl.split(',')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return new Blob([bytes], { type: meta.slice(5).split(';')[0] || 'image/jpeg' })
  }

  async uploadPhoto(jpeg: Blob): Promise<PhotoState> {
    localStorage.setItem(PHOTO_KEY, await blobToDataUrl(jpeg))
    const photoUpdatedAt = new Date().toISOString()
    write({ ...read(), photoUpdatedAt })
    return { hasPhoto: true, photoUpdatedAt }
  }

  async removePhoto(): Promise<PhotoState> {
    localStorage.removeItem(PHOTO_KEY)
    write({ ...read(), photoUpdatedAt: null })
    return { hasPhoto: false, photoUpdatedAt: null }
  }

  async revokeSessions(): Promise<void> {
    // No sessions in local mode.
  }

  async exportData(): Promise<Blob> {
    const body = { exportedAt: new Date().toISOString(), profile: toProfile(read()), activity: [] }
    return new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
  }

  async deleteAccount(confirm: string): Promise<void> {
    if (confirm !== DELETE_CONFIRMATION) throw new Error(`Type ${DELETE_CONFIRMATION} to confirm`)
    localStorage.removeItem(KEY)
    localStorage.removeItem(PHOTO_KEY)
  }
}
