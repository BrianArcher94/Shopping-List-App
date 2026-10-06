import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { authEnabled } from './auth/config'
import { initialiseMsal } from './auth/msal'

// MSAL must be initialised (and any login redirect processed) before anything
// that might ask for a token renders. In LocalStorage mode there is no auth.
async function bootstrap() {
  if (authEnabled) await initialiseMsal()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
