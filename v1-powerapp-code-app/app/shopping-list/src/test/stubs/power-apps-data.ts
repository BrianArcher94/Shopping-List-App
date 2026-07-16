// Test-only stub. The Dataverse service path is never exercised in tests
// (src/data/index.ts switches to the LocalStorage impl when MODE === 'test'),
// so this only needs to satisfy module resolution.

export interface IOperationResult<T> {
  success?: boolean
  data?: T
  error?: { message: string } | null
  fileName?: string
}

export function getClient(_dataSourcesInfo: unknown): unknown {
  return {}
}
