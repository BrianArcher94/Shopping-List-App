import {
  DELETE_CONFIRMATION,
  PHOTO_MAX_UPLOAD_BYTES,
  PROFILE_LIMITS,
  THEME_PREFERENCES,
  type ProfileDetails,
  type ThemePreference,
} from '../../domain/profile'
import { ApiError } from './errors'
import type { GraphUser } from './graph'

// Pure profile rules: no I/O, so every branch is unit tested (profile.test.ts).

const DETAIL_KEYS = Object.keys(PROFILE_LIMITS) as (keyof ProfileDetails)[]

// Control characters (incl. newlines) have no place in a name or a place name.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/** Validate a PATCH /me body. Unknown keys are rejected rather than silently dropped. */
export function validateDetails(body: unknown): ProfileDetails {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Expected a JSON object')
  }
  const input = body as Record<string, unknown>
  const unknownKeys = Object.keys(input).filter((k) => !DETAIL_KEYS.includes(k as keyof ProfileDetails))
  if (unknownKeys.length) throw new ApiError(400, `Unknown field(s): ${unknownKeys.join(', ')}`)

  const out = {} as ProfileDetails
  for (const key of DETAIL_KEYS) {
    const raw = input[key] ?? ''
    if (typeof raw !== 'string') throw new ApiError(400, `${key} must be a string`)
    const value = raw.trim()
    if (value.length > PROFILE_LIMITS[key]) {
      throw new ApiError(400, `${key} must be at most ${PROFILE_LIMITS[key]} characters`)
    }
    if (CONTROL_CHARS.test(value)) throw new ApiError(400, `${key} contains invalid characters`)
    out[key] = value
  }
  if (!out.displayName) throw new ApiError(400, 'displayName is required')
  return out
}

export function validateTheme(body: unknown): ThemePreference {
  const theme = (body as { theme?: unknown } | null)?.theme
  if (typeof theme !== 'string' || !THEME_PREFERENCES.includes(theme as ThemePreference)) {
    throw new ApiError(400, `theme must be one of ${THEME_PREFERENCES.join(', ')}`)
  }
  return theme as ThemePreference
}

export function assertDeleteConfirmed(body: unknown): void {
  if ((body as { confirm?: unknown } | null)?.confirm !== DELETE_CONFIRMATION) {
    throw new ApiError(400, `Type ${DELETE_CONFIRMATION} to confirm`)
  }
}

export function detailsFromGraph(user: GraphUser): ProfileDetails {
  return {
    displayName: user.displayName ?? '',
    givenName: user.givenName ?? '',
    surname: user.surname ?? '',
    city: user.city ?? '',
    country: user.country ?? '',
  }
}

/**
 * External ID users sign in with an `emailAddress` identity; `mail` is often
 * empty for them. Prefer the sign-in identity, fall back to mail.
 */
export function emailFromGraph(user: GraphUser): string {
  const signIn = user.identities?.find((i) => i.signInType === 'emailAddress' && i.issuerAssignedId)
  return signIn?.issuerAssignedId ?? user.mail ?? ''
}

/** JPEG files start FF D8 FF. The client always uploads its own re-encoded JPEG. */
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

export function validatePhoto(contentType: string | null, bytes: Uint8Array): void {
  if ((contentType ?? '').split(';')[0].trim().toLowerCase() !== 'image/jpeg') {
    throw new ApiError(415, 'Photo must be uploaded as image/jpeg')
  }
  if (bytes.length === 0) throw new ApiError(400, 'Photo is empty')
  if (bytes.length > PHOTO_MAX_UPLOAD_BYTES) throw new ApiError(413, 'Photo is too large')
  if (!isJpeg(bytes)) throw new ApiError(400, 'Photo is not a valid JPEG')
}

/** Blob name for a user's photo. The oid comes from the token, but never trust a path segment blindly. */
export function photoBlobName(oid: string): string {
  if (!/^[0-9a-zA-Z-]{1,64}$/.test(oid)) throw new ApiError(400, 'Invalid user id')
  return `${oid}.jpg`
}

export const mfaVerified = (amr: string[] | undefined) => Boolean(amr?.includes('mfa'))
