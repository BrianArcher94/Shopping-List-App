// Test-only stub matching the surface used by generated services.
export interface EntityMetadata {
  [k: string]: unknown
}

export interface GetEntityMetadataOptions<T = unknown> {
  // generic stub; real type lives in @microsoft/power-apps/data/metadata/dataverse
  _t?: T
}
