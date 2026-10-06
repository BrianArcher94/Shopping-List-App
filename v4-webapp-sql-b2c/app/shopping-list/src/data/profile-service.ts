import type {
  ProfileActivity,
  ProfileDetails,
  ThemePreference,
  UserProfile,
} from '@/domain/profile'

/** Result of a photo change; merged into the cached profile. */
export interface PhotoState {
  hasPhoto: boolean
  photoUpdatedAt: string | null
}

/**
 * The signed-in user's own profile - a second seam beside IShoppingDataService,
 * kept separate because it is about the user, not the shopping domain.
 *
 * V4 API mode: details sync to Entra External ID via the Function App
 * (/api/me*). LocalStorage mode and tests: a local stand-in with the same
 * surface, so the page works without a backend.
 */
export interface IProfileService {
  getProfile(): Promise<UserProfile>
  /** Writes every field back to the Entra profile; resolves with the saved profile. */
  updateDetails(details: ProfileDetails): Promise<UserProfile>
  setTheme(theme: ThemePreference): Promise<ThemePreference>
  getActivity(): Promise<ProfileActivity>

  /** The photo bytes, or null when the user has none. */
  getPhoto(): Promise<Blob | null>
  /** Upload an already-cropped JPEG. */
  uploadPhoto(jpeg: Blob): Promise<PhotoState>
  removePhoto(): Promise<PhotoState>

  /** Ends every session on every device, this one included. */
  revokeSessions(): Promise<void>
  /** A JSON file of the user's profile and activity. */
  exportData(): Promise<Blob>
  /** `confirm` must be DELETE_CONFIRMATION; the server checks it too. */
  deleteAccount(confirm: string): Promise<void>
}
