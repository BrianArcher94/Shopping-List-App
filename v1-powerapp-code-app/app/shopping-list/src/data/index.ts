import type { IShoppingDataService } from './service'
import { LocalStorageShoppingDataService } from './local-storage-service'
import { DataverseShoppingDataService } from './dataverse-service'

export type { IShoppingDataService } from './service'

// Singleton — every hook resolves through this. The mode switch keeps the
// component-test suite (which depends on synchronous, isolated localStorage)
// pointing at LocalStorage; the dev server, the production build, and the
// Power Apps Play surface all run against Dataverse.
//
// V2-V8 replace the second branch with their respective backend implementation
// (Table Storage, SQL, Cosmos, …). Nothing else in the codebase needs to change.
export const shoppingDataService: IShoppingDataService =
  import.meta.env.MODE === 'test'
    ? new LocalStorageShoppingDataService()
    : new DataverseShoppingDataService()
