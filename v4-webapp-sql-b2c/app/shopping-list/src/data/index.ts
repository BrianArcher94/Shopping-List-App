import type { IShoppingDataService } from './service'
import { LocalStorageShoppingDataService } from './local-storage-service'
import { ApiShoppingDataService } from './api-service'
import type { IProfileService } from './profile-service'
import { LocalProfileService } from './local-profile-service'
import { ApiProfileService } from './api-profile-service'
import { authEnabled } from '@/auth/config'
import { getAccessToken, reauthenticate } from '@/auth/token'

export type { IShoppingDataService } from './service'
export type { IProfileService, PhotoState } from './profile-service'

// Singleton — every hook resolves through this. The UI and hooks never touch a
// backend directly; they only ever see IShoppingDataService.
//
// The component-test suite depends on synchronous, isolated localStorage, so it
// always uses LocalStorage (MODE === 'test'). Set VITE_USE_API=true at build
// time to switch the whole app onto the Functions API — the one-line backend
// swap that V1 introduced.
//
// V4: when the API is on, so is auth. The token provider is injected here so
// ApiShoppingDataService itself never imports MSAL and stays trivially testable.
const useApi =
  import.meta.env.MODE !== 'test' && import.meta.env.VITE_USE_API === 'true'

export const shoppingDataService: IShoppingDataService = useApi
  ? new ApiShoppingDataService(
      authEnabled ? { getAccessToken, onUnauthorized: reauthenticate } : {},
    )
  : new LocalStorageShoppingDataService()

// V4 profile page: the same switch, the same injected token provider.
export const profileService: IProfileService = useApi
  ? new ApiProfileService(authEnabled ? { getAccessToken, onUnauthorized: reauthenticate } : {})
  : new LocalProfileService()
