/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true" (and not in test mode) the app talks to the Functions REST API. */
  readonly VITE_USE_API?: string
  /** Base path/URL for the REST API. Defaults to "/api". */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
