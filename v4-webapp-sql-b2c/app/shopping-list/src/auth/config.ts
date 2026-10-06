// Build-time auth configuration. VITE_* values are inlined by Vite at build
// time — set them in the pipeline's build step env, never as App Service settings
// (the same rule as VITE_USE_API; see pipelines/wapp-deploy.yml).
//
// authEnabled mirrors the useApi switch in data/index.ts: LocalStorage mode has
// no backend, so it has no login. Tests always run with auth off.
export const authEnabled =
  import.meta.env.MODE !== 'test' && import.meta.env.VITE_USE_API === 'true'

export interface AuthConfig {
  /** MSAL authority, e.g. https://<tenant-domain-prefix>.ciamlogin.com/ */
  authority: string
  /** Client ID of the SPA app registration */
  clientId: string
  /** Fully qualified API scope, e.g. api://<api-client-id>/access_as_user */
  apiScope: string
  /**
   * External tenant ID (GUID). Required because the tenant's OIDC `issuer` uses
   * the GUID host form (https://<tenant-id>.ciamlogin.com/...), and MSAL 5
   * validates the issuer host against knownAuthorities (msal.js #8592).
   */
  tenantId: string
}

export function getAuthConfig(): AuthConfig {
  // Trimmed: these come from pipeline variables, and a stray trailing space in
  // VITE_AUTH_TENANT_ID once produced a knownAuthorities host that could never
  // match the issuer - an hour of endpoints_resolution_error for one byte.
  const authority = import.meta.env.VITE_AUTH_AUTHORITY?.trim()
  const clientId = import.meta.env.VITE_AUTH_CLIENT_ID?.trim()
  const apiScope = import.meta.env.VITE_AUTH_API_SCOPE?.trim()
  const tenantId = import.meta.env.VITE_AUTH_TENANT_ID?.trim()
  if (!authority || !clientId || !apiScope || !tenantId) {
    // Fail loudly at startup rather than with an opaque MSAL error on first login.
    throw new Error(
      'Auth is enabled (VITE_USE_API=true) but one of VITE_AUTH_AUTHORITY, VITE_AUTH_CLIENT_ID, ' +
        'VITE_AUTH_API_SCOPE or VITE_AUTH_TENANT_ID is missing. They must be set in the build environment.',
    )
  }
  return { authority, clientId, apiScope, tenantId }
}
