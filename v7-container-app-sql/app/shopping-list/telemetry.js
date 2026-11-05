// Azure Monitor OpenTelemetry bootstrap for the web container (V7, task T2.4).
//
// Loaded with `node --import ./telemetry.js server.js` so it runs before server.js imports
// http/express. In an ES module app the instrumentation loader hooks must be registered
// before any instrumented module is loaded, or nothing gets traced.
//
// Only active when APPLICATIONINSIGHTS_CONNECTION_STRING is set (Terraform sets it on the
// Container App). Locally it does nothing. Once active, the outgoing proxy request to the
// Function App carries a W3C traceparent header, so App Insights shows web → fnap → SQL
// as one trace.
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
  process.env.OTEL_SERVICE_NAME ??= "web";   // becomes cloud_RoleName in App Insights
  await import("@azure/monitor-opentelemetry/loader");
  const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
  useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
  console.log(JSON.stringify({
    time: new Date().toISOString(), level: "info", event: "telemetry_enabled",
    serviceName: process.env.OTEL_SERVICE_NAME,
  }));
}
