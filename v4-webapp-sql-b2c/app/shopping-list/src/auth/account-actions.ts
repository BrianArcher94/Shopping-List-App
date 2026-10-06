import { authEnabled, getAuthConfig } from './config'
import { getMsalInstance } from './msal'

// MSAL-side actions the profile page triggers. All are no-ops in LocalStorage
// mode (no auth), so the page and its tests work without a tenant.

function activeAccount() {
  const pca = getMsalInstance()
  return pca.getActiveAccount() ?? pca.getAllAccounts()[0]
}

/**
 * After a profile edit: the API stamps audit rows with the token's `name` claim,
 * and the cached token still carries the OLD name. Force a refresh so the next
 * write is attributed to the new name (refreshed tokens read current attributes).
 * Best effort - if it fails, the next natural refresh picks the name up.
 */
export async function refreshSignedInUser(): Promise<void> {
  if (!authEnabled) return
  const account = activeAccount()
  if (!account) return
  await getMsalInstance()
    .acquireTokenSilent({ scopes: [getAuthConfig().apiScope], account, forceRefresh: true })
    .catch(() => undefined)
}

/** Clears the local MSAL cache and ends the External ID session cookie. */
export async function signOut(): Promise<void> {
  if (!authEnabled) return
  await getMsalInstance().logoutRedirect({
    account: activeAccount(),
    postLogoutRedirectUri: `${window.location.origin}/`,
  })
}

/**
 * External ID has no "change password" API for customers (Graph changePassword
 * is delegated-only, and external tenants only allow the openid / offline_access
 * / User.Read delegated scopes). Instead, send the user to the hosted sign-in
 * page with prompt=login; its "Forgot password?" link runs self-service password
 * reset (email one-time passcode) and returns them to the app signed in.
 */
export async function startPasswordReset(email: string | undefined): Promise<void> {
  if (!authEnabled) return
  await getMsalInstance().loginRedirect({
    scopes: [getAuthConfig().apiScope],
    prompt: 'login',
    ...(email ? { loginHint: email } : {}),
  })
}
