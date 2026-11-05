// Tests for the web container's server (app.js, server.js, telemetry.js) — task T2.7.
// Run with `npm run test:server` (node:test; no extra packages). The SPA itself is tested by
// Vitest under src/.
//
// Requests are sent over a raw socket so paths reach the server exactly as written —
// fetch() would normalise "/api/../jobs" and percent-encoding before sending.
import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createApp, classifyApiPath } from "../app.js";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The edge block and proxy log JSON lines; keep test output readable.
mock.method(console, "log", () => {});

// ---------- helpers ----------

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(() => resolve()));

// A stand-in for the Function App that records what it receives.
async function startUpstream(handler = (_req, res) => res.end('{"ok":true}')) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body });
      res.setHeader("content-type", "application/json");
      handler(req, res);
    });
  });
  const port = await listen(server);
  return { server, seen, url: `http://127.0.0.1:${port}`, host: `127.0.0.1:${port}` };
}

function rawRequest(port, method, rawPath, { body = "", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1", () => {
      const extra = Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join("");
      socket.write(
        `${method} ${rawPath} HTTP/1.1\r\nHost: sla.example\r\n${extra}` +
        `Content-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`,
      );
    });
    let data = "";
    socket.on("data", (c) => (data += c));
    socket.on("error", reject);
    socket.on("end", () => {
      const [head, ...rest] = data.split("\r\n\r\n");
      const [statusLine, ...headerLines] = head.split("\r\n");
      const hdrs = Object.fromEntries(headerLines.map((l) => {
        const i = l.indexOf(":");
        return [l.slice(0, i).toLowerCase(), l.slice(i + 1).trim()];
      }));
      let text = rest.join("\r\n\r\n");
      if (hdrs["transfer-encoding"] === "chunked") text = dechunk(text);
      resolve({ status: Number(statusLine.split(" ")[1]), headers: hdrs, body: text });
    });
  });
}

function dechunk(text) {
  let out = "";
  for (let i = 0; i < text.length;) {
    const lineEnd = text.indexOf("\r\n", i);
    const size = parseInt(text.slice(i, lineEnd), 16);
    if (!size) break;
    out += text.slice(lineEnd + 2, lineEnd + 2 + size);
    i = lineEnd + 2 + size + 2;
  }
  return out;
}

function makeDist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sla-dist-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>SPA</title>");
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log('app')");
  return dir;
}

// ---------- classifyApiPath ----------

describe("classifyApiPath", () => {
  const cases = [
    ["/api/jobs/create-weekly-list", "jobs"],
    ["/api/jobs", "jobs"],
    ["/API/Jobs/create-weekly-list", "jobs"],
    ["/api/%6Aobs/create-weekly-list", "jobs"],    // percent-encoded "j"
    ["/api//jobs/x", "jobs"],
    ["/api\\jobs\\x", "jobs"],
    ["/api/lists/../jobs/x", "bad"],                // dot segments are never sent by browsers
    ["/api/lists/%2e%2e/jobs/x", "bad"],
    ["/api/%E0%A4%A", "bad"],                       // malformed percent-encoding
    ["/api/jobsearch", "ok"],                       // a different route, not the jobs prefix
    ["/api/lists/2026-10-18/items", "ok"],
    ["/api/favourites/smoke%20test%20tea", "ok"],
    ["/history", "ok"],
  ];
  for (const [input, expected] of cases) {
    test(`${input} → ${expected}`, () => assert.equal(classifyApiPath(input), expected));
  }
});

// ---------- app with an upstream ----------

describe("app with API_PROXY_TARGET", () => {
  let upstream, web, port, distDir;

  before(async () => {
    upstream = await startUpstream((req, res) => {
      if (req.url.startsWith("/api/slow")) return setTimeout(() => res.end("{}"), 1_000);
      res.statusCode = req.method === "POST" ? 201 : 200;
      res.end(JSON.stringify({ echo: req.url }));
    });
    distDir = makeDist();
    web = createApp({ apiTarget: upstream.url, distDir, proxyTimeoutMs: 300 }).listen(0, "127.0.0.1");
    await new Promise((r) => web.once("listening", r));
    port = web.address().port;
  });

  after(async () => {
    await close(web);
    await close(upstream.server);
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  test("GET /healthz → 200, never cached", async () => {
    const res = await rawRequest(port, "GET", "/healthz");
    assert.equal(res.status, 200);
    assert.equal(res.body, "OK");
    assert.equal(res.headers["cache-control"], "no-store");
  });

  test("job endpoint variants → 404 and never reach the Function App", async () => {
    const before = upstream.seen.length;
    for (const p of ["/api/jobs/create-weekly-list", "/API/Jobs/create-weekly-list", "/api/%6Aobs/create-weekly-list", "/api//jobs/create-weekly-list"]) {
      const res = await rawRequest(port, "POST", p);
      assert.equal(res.status, 404, p);
      assert.deepEqual(JSON.parse(res.body), { error: "Not found" });
    }
    assert.equal(upstream.seen.length, before);
  });

  test("dot-segment paths → 400 and never reach the Function App", async () => {
    const before = upstream.seen.length;
    const res = await rawRequest(port, "POST", "/api/lists/../jobs/create-weekly-list");
    assert.equal(res.status, 400);
    assert.equal(upstream.seen.length, before);
  });

  test("POST /api/lists is proxied verbatim with Host rewritten to the target", async () => {
    const body = JSON.stringify({ weekStartDate: "2098-12-28" });
    const res = await rawRequest(port, "POST", "/api/lists", { body, headers: { "Content-Type": "application/json" } });
    assert.equal(res.status, 201);
    const got = upstream.seen.at(-1);
    assert.equal(got.method, "POST");
    assert.equal(got.url, "/api/lists");                // no path rewrite
    assert.equal(got.body, body);                       // body streamed through untouched
    assert.equal(got.headers.host, upstream.host);      // changeOrigin
    assert.equal(got.headers["x-forwarded-host"], "sla.example");
  });

  test("query strings are preserved", async () => {
    await rawRequest(port, "GET", "/api/lists/current?now=2026-10-19T12:00:00Z");
    assert.equal(upstream.seen.at(-1).url, "/api/lists/current?now=2026-10-19T12:00:00Z");
  });

  test("a slow Function App → JSON 502 after the proxy timeout", async () => {
    const res = await rawRequest(port, "GET", "/api/slow");
    assert.equal(res.status, 502);
    assert.deepEqual(JSON.parse(res.body), { error: "API unavailable" });
  });

  test("client-side routes fall back to index.html (no-cache)", async () => {
    const res = await rawRequest(port, "GET", "/history");
    assert.equal(res.status, 200);
    assert.match(res.body, /<title>SPA<\/title>/);
    assert.equal(res.headers["cache-control"], "no-cache");
  });

  test("hashed assets are cached as immutable", async () => {
    const res = await rawRequest(port, "GET", "/assets/app-abc123.js");
    assert.equal(res.status, 200);
    assert.equal(res.headers["cache-control"], "public, max-age=31536000, immutable");
  });

  test("/apix is not an API path (SPA fallback, not proxied)", async () => {
    const before = upstream.seen.length;
    const res = await rawRequest(port, "GET", "/apix");
    assert.equal(res.status, 200);
    assert.equal(upstream.seen.length, before);
  });
});

describe("app error handling", () => {
  test("Function App unreachable → JSON 502", async () => {
    const dead = await startUpstream();
    const deadUrl = dead.url;
    await close(dead.server);    // port is now closed: connection refused
    const web = createApp({ apiTarget: deadUrl, distDir: makeDist() }).listen(0, "127.0.0.1");
    await new Promise((r) => web.once("listening", r));
    const res = await rawRequest(web.address().port, "GET", "/api/lists");
    await close(web);
    assert.equal(res.status, 502);
    assert.deepEqual(JSON.parse(res.body), { error: "API unavailable" });
  });

  test("no API_PROXY_TARGET → /api answers 503 instead of index.html", async () => {
    const web = createApp({ distDir: makeDist() }).listen(0, "127.0.0.1");
    await new Promise((r) => web.once("listening", r));
    const res = await rawRequest(web.address().port, "GET", "/api/lists");
    await close(web);
    assert.equal(res.status, 503);
    assert.deepEqual(JSON.parse(res.body), { error: "API not configured" });
  });
});

// ---------- the real process: telemetry and shutdown ----------

// Starts server.js on an OS-assigned port (PORT=0); `ready` resolves with the bound port
// from the "listening" log line, so parallel or lingering processes can't collide.
function startServerProcess(env) {
  const child = spawn(process.execPath, ["--import", "./telemetry.js", "server.js"], {
    cwd: appDir,
    env: { ...process.env, APPLICATIONINSIGHTS_CONNECTION_STRING: "", PORT: "0", ...env },
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 30_000);
    child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`server exited (${code}) before listening:\n${output}`)); });
    child.stdout.on("data", () => {
      const m = output.match(/"event":"listening","port":(\d+)/);
      if (m) { clearTimeout(timer); resolve(Number(m[1])); }
    });
  });
  return { child, ready, output: () => output };
}

async function traceparentSeen(env) {
  const upstream = await startUpstream();
  const proc = startServerProcess({ API_PROXY_TARGET: upstream.url, ...env });
  try {
    const port = await proc.ready;
    await rawRequest(port, "GET", "/api/lists");
    return upstream.seen.at(-1)?.headers.traceparent;
  } finally {
    proc.child.kill();
    await close(upstream.server);
  }
}

describe("telemetry.js", () => {
  test("with a connection string, proxied calls carry a W3C traceparent", async () => {
    // Ingestion endpoint is a closed local port: nothing leaves the machine.
    const tp = await traceparentSeen({
      APPLICATIONINSIGHTS_CONNECTION_STRING:
        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=http://127.0.0.1:9/",
    });
    assert.match(tp ?? "", /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });

  test("without a connection string, nothing is instrumented", async () => {
    assert.equal(await traceparentSeen({}), undefined);
  });
});

describe("server.js shutdown", () => {
  // Windows can't deliver a catchable SIGTERM (kill() terminates the process outright),
  // so this runs on Linux/macOS — the pipeline agent or the container image check (T2.9).
  test("SIGTERM exits cleanly within 10 s", { skip: process.platform === "win32" && "SIGTERM is not catchable on Windows" }, async () => {
    const proc = startServerProcess({});
    await proc.ready;
    const started = Date.now();
    const exited = new Promise((resolve) => proc.child.on("exit", (code) => resolve(code)));
    proc.child.kill("SIGTERM");
    const code = await exited;
    assert.equal(code, 0);
    assert.ok(Date.now() - started < 10_000);
    assert.match(proc.output(), /"event":"shutdown","signal":"SIGTERM"/);
  });
});
