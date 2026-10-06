// V4 profile page. Shared verbatim between app/src/domain and function/domain,
// like types.ts and rules.ts.
//
// Source of truth per field:
//   details (names, city, country) -> the Entra External ID user, via Microsoft Graph
//   preferences, photo bookkeeping  -> dbo.UserProfiles in Azure SQL
//   photo bytes                     -> Blob Storage, owned by the app. NOT synced to Entra:
//     Graph keeps user photos in Microsoft 365 storage, which an External ID tenant
//     (no M365/Exchange licence) does not have - PUT /users/{id}/photo/$value
//     returns 404 ErrorNonExistentStorage. Confirmed in App Insights, 2026-10-05.

export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

/** The editable fields. All of them are written back to the Entra user. */
export interface ProfileDetails {
  displayName: string
  givenName: string
  surname: string
  city: string
  country: string
}

export interface UserProfile extends ProfileDetails {
  /** Entra object id of the signed-in user. */
  oid: string
  /** Sign-in email. Read-only: it is the user's sign-in identity. */
  email: string
  /** ISO timestamp the Entra account was created, or null if unknown. */
  memberSince: string | null
  theme: ThemePreference
  hasPhoto: boolean
  /** ISO timestamp of the last photo change; doubles as a cache-buster. */
  photoUpdatedAt: string | null
  /** True when the access token's amr claim shows a second factor was used. */
  mfaVerified: boolean
}

export type ProfileActivityKind = 'item' | 'status' | 'favourite'

export interface ProfileActivityEntry {
  kind: ProfileActivityKind
  /** Item or favourite name, or the status a list was moved to. */
  label: string
  quantity: number | null
  listId: string | null
  listName: string | null
  at: string
}

export interface ProfileActivity {
  /** Window the counts cover, in days. */
  windowDays: number
  itemsAdded: number
  /** Lists where this user made the latest status change in the window. */
  statusChanges: number
  favouritesAdded: number
  recent: ProfileActivityEntry[]
}

/** Field limits, checked on both sides (Graph's own limits are looser). */
export const PROFILE_LIMITS = {
  displayName: 256,
  givenName: 64,
  surname: 64,
  city: 128,
  country: 128,
} as const satisfies Record<keyof ProfileDetails, number>

/** Uploaded photos are cropped client-side to a JPEG of this many pixels square. */
export const PHOTO_SIZE_PX = 512
/** Upper bound on the cropped upload. Graph's own photo limit is 4 MB. */
export const PHOTO_MAX_UPLOAD_BYTES = 2 * 1024 * 1024
/** Upper bound on the file the user picks, before cropping. */
export const PHOTO_MAX_SOURCE_BYTES = 10 * 1024 * 1024

/** The literal the user types to confirm account deletion. */
export const DELETE_CONFIRMATION = 'DELETE'

/** Shown instead of a deleted user's name on shared lists. */
export const FORMER_MEMBER_NAME = 'Former member'
