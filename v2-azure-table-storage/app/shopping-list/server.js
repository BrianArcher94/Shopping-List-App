// Minimal production server for the Shopping List Tracker SPA on Azure App
// Service (Linux, Node 20). Serves the static Vite build from ./dist and falls
// back to index.html for client-side routes (React Router).
//
// App Service injects PORT (commonly 8080); the start command is `node
// server.js` (see package.json "start"), wired to the Web App's app_command_line.
import express from 'express'
import compression from 'compression'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = process.env.PORT || 8080

// Base URL of the V2 Functions App (e.g. https://slatbl-dv-fnap-ukw-001.azurewebsites.net).
// Set as an App Service application setting (see terraform/main.wapp.tf). When the
// Web App is VNet-integrated, this hostname resolves to the Function App's private
// endpoint, so /api traffic stays inside the spoke VNet. Leave unset for local dev
// or when the SPA runs against LocalStorage (VITE_USE_API=false) — the proxy is then
// simply not mounted.
const apiTarget = process.env.API_PROXY_TARGET

const app = express()

app.use(compression())

// Reverse-proxy /api/* to the Functions App. The client calls same-origin "/api"
// (see src/data/api-service.ts), so no CORS is involved. The Functions runtime
// already serves its routes under "/api" (default routePrefix), so the path is
// forwarded verbatim — "/api/lists" → "<apiTarget>/api/lists" — with no rewrite.
// Mounted via pathFilter (not app.use('/api', ...)) so the "/api" prefix is
// preserved on the forwarded request. Declared before the static middleware and
// SPA fallback so API calls never fall through to index.html.
if (apiTarget) {
  app.use(
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      xfwd: true,
      pathFilter: '/api',
    }),
  )
  console.log(`Proxying /api -> ${apiTarget}`)
} else {
  console.warn('API_PROXY_TARGET not set — /api proxy is disabled')
}

// Health probe for App Service (site_config.health_check_path = "/healthz").
// Declared before the static middleware and SPA fallback so it returns a fast,
// uncached 200 — not index.html.
app.get('/healthz', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.status(200).send('OK')
})

// Serve static assets. Hashed asset filenames are immutable and cached for a
// year; index.html is never cached so new deploys are picked up immediately.
app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }),
)

// SPA fallback — any route that is not a static asset returns index.html so the
// client-side router can handle it.
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Shopping List Tracker listening on port ${port}`)
})
