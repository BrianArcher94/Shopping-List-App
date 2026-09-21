# Shopping List Tracker — V2 Frontend (Azure Web App + Table Storage)

The same React 19 / Vite / shadcn / TanStack Query / Zustand frontend used in
V1, ported off the Power Apps Code App platform to run as a standard SPA on an
Azure App Service (Linux) Web App. The UI, domain model, business rules, and
test suite are unchanged — only the **hosting** and **backend** differ.

## Backend seam (`src/data`)

Everything goes through `IShoppingDataService` (`src/data/service.ts`):

| Adapter | File | Used when |
|---|---|---|
| LocalStorage | `local-storage-service.ts` | tests, and the default for dev/prod **until the API is live** |
| V2 REST API | `api-service.ts` | when `VITE_USE_API=true` — calls the Azure Functions API over `/api/*` |

`src/data/index.ts` picks the adapter. Flipping to the real backend is one env
var (`VITE_USE_API=true`) — no UI or hook changes. (This is the V2 version of
the V1 LocalStorage ↔ Dataverse swap.)

## Scripts

```bash
npm install
npm run dev        # Vite dev server (LocalStorage)
npm test           # Vitest (LocalStorage, happy-dom) — always offline
npm run build      # tsc -b && vite build  ->  ./dist
npm start          # node server.js — serves ./dist (production, App Service)
```

## Deploying to the Web App

1. `npm ci && npm run build` produces the static SPA in `./dist`.
2. `server.js` (Express) serves `./dist` with an SPA fallback and is started by
   `npm start` / `node server.js`.
3. On the App Service Web App (Linux, Node 20) set the startup command to
   `node server.js`; App Service provides `PORT`.
4. When the Functions API is deployed, set the app setting `VITE_USE_API=true`
   at **build time** and rebuild (Vite inlines env vars at build), then redeploy.

> Note: `VITE_*` variables are baked in at build time, not read at runtime. To
> switch backends you rebuild with the flag set — it is not a live toggle.

## What was removed from V1

The Power Apps coupling was stripped so this builds with a plain
`npm install && vite build`: the `@microsoft/power-apps` SDK + Vite plugin,
`src/data/dataverse-service.ts`, the generated Dataverse code (`src/generated`),
the SDK test stubs, and the Power Apps branding.
