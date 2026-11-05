import type { IShoppingDataService } from './service'
import { LocalStorageShoppingDataService } from './local-storage-service'
import { ApiShoppingDataService } from './api-service'

export type { IShoppingDataService } from './service'

// Singleton — every hook resolves through this. The UI and hooks never touch a
// backend directly; they only ever see IShoppingDataService.
//
// The component-test suite depends on synchronous, isolated localStorage, so it
// always uses LocalStorage. The dev server also defaults to LocalStorage.
//
// Set VITE_USE_API=true at build time (the V7 container image does) to switch
// the whole app onto the Function App REST API backed by Azure SQL. That is the
// only change required — the documented one-line backend swap.
const useApi =
  import.meta.env.MODE !== 'test' && import.meta.env.VITE_USE_API === 'true'

export const shoppingDataService: IShoppingDataService = useApi
  ? new ApiShoppingDataService()
  : new LocalStorageShoppingDataService()
