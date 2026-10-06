import { useState, type ReactNode } from 'react'
import { InteractionStatus } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { getAuthConfig } from './config'
import { buildLoginRequest, getRedirectError } from './msal'
import { LandingPage } from './landing-page'

/**
 * Nothing inside renders until the user is signed in. Unauthenticated → the
 * landing page, whose buttons start the External ID redirect; mid-redirect →
 * quiet placeholder. Sits inside QueryProvider but outside the router so no
 * query fires before a token can exist (getAccessToken acquires it silently).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { instance, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [error, setError] = useState(getRedirectError)

  if (isAuthenticated) return <>{children}</>
  if (inProgress !== InteractionStatus.None) return <SigningIn />

  function start(signUp: boolean) {
    return (loginHint?: string) => {
      setError(undefined)
      const { apiScope } = getAuthConfig()
      instance.loginRedirect(buildLoginRequest(apiScope, { signUp, loginHint })).catch((err: unknown) => {
        setError(`Couldn't start sign-in: ${err instanceof Error ? err.message : String(err)}`)
      })
    }
  }

  return <LandingPage onSignIn={start(false)} onSignUp={start(true)} error={error} />
}

function SigningIn() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="muted-text">Taking you to sign in…</p>
    </div>
  )
}
