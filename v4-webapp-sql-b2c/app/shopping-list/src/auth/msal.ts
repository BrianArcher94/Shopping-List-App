import { AuthError, PublicClientApplication, type Configuration, type RedirectRequest } from '@azure/msal-browser'
import { getAuthConfig, type AuthConfig } from './config'

/**
 * Pure config builder (exported for tests).
 *
 * knownAuthorities lists BOTH the name host and the tenant-ID host. External ID
 * publishes its OIDC `issuer` as https://<tenant-id>.ciamlogin.com/<tenant-id>/v2.0
 * even when the authority is name-based, and MSAL 5 rejects the discovery document
 * with `endpoints_resolution_error` unless the issuer's host is a known authority
 * (AzureAD/microsoft-authentication-library-for-js #8592 / #8595).
 */
export function buildMsalConfig(cfg: AuthConfig, origin: string): Configuration {
  const authorityHost = new URL(cfg.authority).host
  const ciamSuffix = authorityHost.slice(authorityHost.indexOf('.')) // ".ciamlogin.com"
  return {
    auth: {
      clientId: cfg.clientId,
      authority: cfg.authority,
      knownAuthorities: [authorityHost, `${cfg.tenantId.trim()}${ciamSuffix}`],
      // Registered on the SPA app registration — must match exactly, trailing slash included.
      redirectUri: `${origin}/`,
      postLogoutRedirectUri: `${origin}/`,
    },
    cache: {
      // Survives reload, dies with the tab. Trade-off discussed in implementation-plan.html §9.3.
      cacheLocation: 'sessionStorage',
    },
  }
}

/**
 * Login request for the landing page's two buttons (exported for tests).
 * signUp → prompt=create, which External ID honours by opening the sign-up screen
 * of the user flow directly. loginHint pre-fills the email on the hosted page.
 */
export function buildLoginRequest(
  apiScope: string,
  { signUp = false, loginHint }: { signUp?: boolean; loginHint?: string } = {},
): RedirectRequest {
  const hint = loginHint?.trim()
  return {
    scopes: [apiScope],
    ...(signUp && { prompt: 'create' }),
    ...(hint && { loginHint: hint }),
  }
}

// The single MSAL instance for the app. Created lazily (not at import time) so
// that importing this module in LocalStorage mode or in tests costs nothing.
let instance: PublicClientApplication | undefined

export function getMsalInstance(): PublicClientApplication {
  if (!instance) {
    instance = new PublicClientApplication(buildMsalConfig(getAuthConfig(), window.location.origin))
  }
  return instance
}

// A failed or cancelled redirect (e.g. the user backs out of sign-up) comes back
// as an error from handleRedirectPromise. It is kept here for the landing page to
// show instead of being thrown from bootstrap, which would leave a blank page.
let redirectError: string | undefined

export function getRedirectError(): string | undefined {
  return redirectError
}

// Must complete before the first MSAL call (main.tsx awaits this before rendering).
export async function initialiseMsal(): Promise<PublicClientApplication> {
  const pca = getMsalInstance()
  await pca.initialize()
  // Processes a redirect response if we are landing back from the login page,
  // and makes that account the active one so acquireTokenSilent has a subject.
  try {
    const result = await pca.handleRedirectPromise()
    if (result?.account) pca.setActiveAccount(result.account)
  } catch (err) {
    redirectError =
      err instanceof AuthError && err.errorCode === 'access_denied'
        ? 'Sign-in was cancelled. You can try again whenever you are ready.'
        : `Sign-in didn't complete: ${err instanceof AuthError ? err.errorMessage || err.errorCode : String(err)}`
  }
  if (!pca.getActiveAccount()) {
    const [first] = pca.getAllAccounts()
    if (first) pca.setActiveAccount(first)
  }
  return pca
}
