// Production entry point for the Shopping List Tracker web container on Azure Container
// Apps (V7). Run as `node server.js` (PID 1 in the container) so SIGTERM reaches Node.
// The request pipeline lives in app.js.
//
// Environment:
//   PORT              port to listen on (default 8080, the Container App's target port)
//   API_PROXY_TARGET  Function App base URL, e.g. https://slasqlcon-dv-fnap-ukw-001.azurewebsites.net
//                     (set by Terraform; inside the spoke VNet it resolves to the private endpoint).
//                     Unset → /api answers 503, e.g. when the SPA runs on LocalStorage locally.
import { createApp, logJson } from "./app.js";

// PORT=0 asks the OS for a free port (used by the tests); the bound port is logged.
const port = process.env.PORT ? Number(process.env.PORT) : 8080;
const apiTarget = process.env.API_PROXY_TARGET;

const server = createApp({ apiTarget }).listen(port, () => {
  logJson({ level: "info", event: "listening", port: server.address().port, apiProxyTarget: apiTarget ?? null });
  if (!apiTarget) logJson({ level: "warn", event: "api_proxy_disabled" });
});

// Graceful shutdown. Container Apps sends SIGTERM on scale-in and revision swaps, then
// SIGKILLs after its grace period. Stop accepting connections, let in-flight requests finish,
// and exit; force-exit after 10 s so a stuck request can't hold the replica.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logJson({ level: "info", event: "shutdown", signal });
  server.close(() => process.exit(0));
  server.closeIdleConnections();   // idle keep-alive sockets would otherwise delay close()
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
