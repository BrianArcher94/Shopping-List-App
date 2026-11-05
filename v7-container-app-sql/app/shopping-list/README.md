# Shopping List Tracker — V7 Frontend (Azure Container Apps + Azure SQL)

The same React 19 / Vite / shadcn / TanStack Query / Zustand frontend used since
V1. In V7 the web tier runs as a **container on Azure Container Apps**, behind
the Application Gateway. The UI, domain model, business rules and test suite are
unchanged; only the **hosting** differs.

## How requests flow

```
Browser → Cloudflare → App Gateway → web container (server.js)
                                        ├─ /*      → static SPA from ./dist
                                        └─ /api/*  → reverse proxy → Function App (private endpoint)
```

`server.js` serves the SPA and proxies same-origin `/api/*` calls to the Function
App, so the browser never needs CORS. See `shared-docs/v7/v7-plan.html` §5.

## Backend seam (`src/data`)

Everything goes through `IShoppingDataService` (`src/data/service.ts`):

| Adapter | File | Used when |
|---|---|---|
| LocalStorage | `local-storage-service.ts` | tests, and local dev without an API |
| REST API | `api-service.ts` | when `VITE_USE_API=true` — calls the Function App over `/api/*` |

`src/data/index.ts` picks the adapter.

## Scripts

```bash
npm install
npm run dev        # Vite dev server (LocalStorage unless VITE_USE_API=true)
npm test           # Vitest (LocalStorage, happy-dom) — always offline
npm run build      # tsc -b && vite build  ->  ./dist
npm start          # node server.js — serves ./dist and proxies /api
```

## Configuration

| Variable | When | Purpose |
|---|---|---|
| `VITE_USE_API` | build time | `true` switches the SPA onto the REST API |
| `VITE_API_BASE_URL` | build time | API base path, default `/api` |
| `API_PROXY_TARGET` | run time | Function App base URL that `server.js` proxies `/api` to |
| `PORT` | run time | Port `server.js` listens on, default `8080` |

> `VITE_*` variables are inlined by Vite at build time, so the container image is
> built with them set. Everything that differs between environments is a
> run-time variable, so the same image can be promoted unchanged.

## Container

The Dockerfile and image build (`az acr build`) are added in V7 Phase 2 —
see `shared-docs/v7/v7-tasks.html` (T2.6, T3P.2).
