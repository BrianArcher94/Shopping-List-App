import type { IShoppingDataService } from './service'
import { LocalStorageShoppingDataService } from './local-storage-service'
import { ApiShoppingDataService } from './api-service'

export type { IShoppingDataService } from './service'

// Singleton — every hook resolves through this. The UI and hooks never touch a
// backend directly; they only ever see IShoppingDataService.
//
// The component-test suite depends on synchronous, isolated localStorage, so it
// always uses LocalStorage. The dev server and production build ALSO default to
// LocalStorage for now, because the V2 Azure Functions API is not deployed yet.
//
// When the Functions API is live, set VITE_USE_API=true at build/runtime to
// switch the whole app onto the real Table Storage backend. That is the only
// change required — this is the V2 incarnation of the documented one-line
// backend swap (V1 swapped LocalStorage <-> Dataverse here instead).
const useApi =
  import.meta.env.MODE !== 'test' && import.meta.env.VITE_USE_API === 'true'

export const shoppingDataService: IShoppingDataService = useApi
  ? new ApiShoppingDataService()
  : new LocalStorageShoppingDataService()
