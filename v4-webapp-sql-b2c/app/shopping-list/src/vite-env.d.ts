/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true" (and not in test mode) the app talks to the V2 Functions API. */
  readonly VITE_USE_API?: string
  /** Base path/URL for the V2 REST API. Defaults to "/api". */
  readonly VITE_API_BASE_URL?: string
  /** V4 — Entra External ID. MSAL authority, e.g. https://<tenant-domain-prefix>.ciamlogin.com/ */
  readonly VITE_AUTH_AUTHORITY?: string
  /** V4 — client ID of the SPA app registration */
  readonly VITE_AUTH_CLIENT_ID?: string
  /** V4 — fully qualified API scope, e.g. api://<api-client-id>/access_as_user */
  readonly VITE_AUTH_API_SCOPE?: string
  /** V4 — external tenant ID (GUID); its host form must be a known authority for MSAL 5 issuer validation */
  readonly VITE_AUTH_TENANT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
