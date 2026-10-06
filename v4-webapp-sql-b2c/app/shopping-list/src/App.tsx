import { ThemeProvider } from "@/providers/theme-provider"
import { SonnerProvider } from "@/providers/sonner-provider"
import { QueryProvider } from "./providers/query-provider"
import { RouterProvider } from "react-router-dom"
import { MsalProvider } from "@azure/msal-react"
import { router } from "@/router"
import { authEnabled } from "@/auth/config"
import { getMsalInstance } from "@/auth/msal"
import { AuthGate } from "@/auth/auth-gate"

// Provider order: Theme > Sonner > [Msal] > Query > [AuthGate] > Router.
// AuthGate sits inside QueryProvider but outside the router, so no query can
// fire before a token exists. The two auth layers only mount when auth is on.
export default function App() {
  const tree = (
    <QueryProvider>
      {authEnabled ? (
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      ) : (
        <RouterProvider router={router} />
      )}
    </QueryProvider>
  )

  return (
    <ThemeProvider defaultTheme="dark">
      <SonnerProvider>
        {authEnabled ? <MsalProvider instance={getMsalInstance()}>{tree}</MsalProvider> : tree}
      </SonnerProvider>
    </ThemeProvider>
  )
}
