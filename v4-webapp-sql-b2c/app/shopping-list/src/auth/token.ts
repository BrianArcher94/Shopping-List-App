import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { getAuthConfig } from './config'
import { getMsalInstance } from './msal'

// The shape the data layer depends on. A plain async function, not a hook,
// because ApiShoppingDataService is not a React component.
export type AccessTokenProvider = () => Promise<string>

/**
 * Acquire an access token for the API scope. Silent first (cache / refresh
 * token); if the tenant demands interaction, redirect to sign in — the page
 * unloads and the in-flight request is abandoned, which is the intended outcome.
 */
export const getAccessToken: AccessTokenProvider = async () => {
  const pca = getMsalInstance()
  const { apiScope } = getAuthConfig()
  const account = pca.getActiveAccount() ?? pca.getAllAccounts()[0]
  const request = { scopes: [apiScope], account }

  try {
    const result = await pca.acquireTokenSilent(request)
    return result.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError || !account) {
      await pca.acquireTokenRedirect(request)
      // acquireTokenRedirect never resolves normally — the browser navigates away.
      return new Promise<string>(() => {})
    }
    throw err
  }
}

/** Force re-authentication, e.g. after the API answers 401 with a token we thought was fine. */
export async function reauthenticate(): Promise<void> {
  const pca = getMsalInstance()
  const { apiScope } = getAuthConfig()
  await pca.acquireTokenRedirect({ scopes: [apiScope], prompt: 'login' })
}
