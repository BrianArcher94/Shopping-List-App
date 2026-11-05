// Express app for the Shopping List Tracker web container (V7). Kept separate from
// server.js (process start-up, telemetry, shutdown) so it can be tested in-process.
//
// Request handling, in order:
//   1. /healthz                 → 200 (Container App probes, App Gateway probe)
//   2. /api/jobs/*              → 404 — system-only route, never proxied (edge block)
//   3. /api/*                   → reverse proxy to the Function App (private endpoint)
//   4. static assets            → ./dist
//   5. anything else            → index.html (client-side routing)
import express from "express";
import compression from "compression";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "node:url";
import path from "node:path";

const defaultDistDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");

// One JSON object per line, so Log Analytics (ContainerAppConsoleLogs_CL) can parse it.
export const logJson = (fields) => console.log(JSON.stringify({ time: new Date().toISOString(), ...fields }));

// Classify a raw request path for the edge block. The Function App decodes the path once
// before routing, so the check must see what the Function App will see:
//   - percent-decoded once            (/api/%6Aobs/x       → /api/jobs/x)
//   - backslashes treated as slashes  (/api\jobs\x)
//   - repeated slashes collapsed      (/api//jobs/x)
//   - case-insensitive                (/API/Jobs/x)
// Dot segments (/api/lists/../jobs) are refused outright — browsers never send them.
// Returns "bad" (400), "jobs" (404) or "ok".
export function classifyApiPath(rawPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return "bad";
  }
  const segments = decoded.replace(/\\/g, "/").split("/");
  if (segments.some((s) => s === "." || s === "..")) return "bad";
  const normalised = segments.filter(Boolean).join("/").toLowerCase();
  if (normalised === "api/jobs" || normalised.startsWith("api/jobs/")) return "jobs";
  return "ok";
}

const isApiPath = (p) => p === "/api" || p.startsWith("/api/");

/**
 * @param {{ apiTarget?: string, distDir?: string, proxyTimeoutMs?: number }} [options]
 */
export function createApp({ apiTarget, distDir = defaultDistDir, proxyTimeoutMs = 60_000 } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(compression());

  // Health probe for the Container App liveness/readiness probes and the App Gateway
  // backend probe. Deliberately independent of the Function App: a cold Function must not
  // take the web tier out of rotation.
  app.get("/healthz", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.status(200).send("OK");
  });

  // Edge block (C8): /api/jobs/* is for the Logic App only, which calls the Function App
  // directly over the VNet. Applied to every request (not just /api-prefixed ones) because
  // the classification is case- and encoding-insensitive. Registered before the proxy.
  app.use((req, res, next) => {
    const verdict = classifyApiPath(req.path);
    if (verdict === "ok") return next();
    logJson({
      level: "warn",
      event: verdict === "jobs" ? "edge_block_jobs" : "edge_reject_path",
      method: req.method,
      path: req.originalUrl.slice(0, 300),
      clientIp: req.headers["x-forwarded-for"] ?? req.socket.remoteAddress,
    });
    // 404 rather than 403: don't confirm the route exists.
    if (verdict === "jobs") return res.status(404).json({ error: "Not found" });
    return res.status(400).json({ error: "Bad request path" });
  });

  // Reverse-proxy /api/* to the Function App. The client calls same-origin "/api" (see
  // src/data/api-service.ts), so no CORS is involved. The Functions runtime serves its routes
  // under "/api", so the path is forwarded verbatim with no rewrite. changeOrigin sets Host to
  // the Function App's hostname — required for its front end and for TLS SNI to the private
  // endpoint. The timeout allows for a Function cold start plus a serverless SQL resume.
  if (apiTarget) {
    app.use(
      createProxyMiddleware({
        target: apiTarget,
        changeOrigin: true,
        xfwd: true,
        pathFilter: (p) => isApiPath(p),
        // Upstream timeout only. Don't also set `timeout`: that is the *client* socket timeout,
        // and when it fires the socket is destroyed before the 502 below can be sent.
        proxyTimeout: proxyTimeoutMs,
        on: {
          error: (err, req, res) => {
            logJson({ level: "error", event: "proxy_error", code: err.code, path: req.url?.slice(0, 300) });
            // res is a ServerResponse for HTTP requests (a Socket only for WebSocket upgrades).
            if (typeof res.status === "function" && !res.headersSent) {
              res.status(502).json({ error: "API unavailable" });
            } else {
              res.end?.();
            }
          },
        },
      }),
    );
  } else {
    // Without a target, /api must not fall through to index.html (a 200 HTML page would
    // confuse the SPA's API client), so answer explicitly.
    app.use((req, res, next) => (isApiPath(req.path) ? res.status(503).json({ error: "API not configured" }) : next()));
  }

  // Serve static assets. Hashed asset filenames are immutable and cached for a
  // year; index.html is never cached so new deploys are picked up immediately.
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA fallback — any route that is not a static asset returns index.html so the
  // client-side router can handle it.
  app.get("*", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });

  return app;
}
