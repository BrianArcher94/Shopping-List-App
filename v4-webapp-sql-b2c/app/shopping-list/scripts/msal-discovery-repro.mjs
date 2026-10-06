// Reproduces MSAL's authority discovery (the step behind endpoints_resolution_error)
// outside the browser, using the exact @azure/msal-common the SPA ships, with
// verbose logging so the failing check is visible. Run from app/shopping-list: node scripts/msal-discovery-repro.mjs [authority] [tenantId]
import { Authority, Logger, LogLevel, ProtocolMode } from '@azure/msal-common/browser'

const authorityUri = process.argv[2] ?? 'https://<tenant-domain-prefix>.ciamlogin.com/'
const tenantId = process.argv[3] ?? '<tenant-id>'
const knownAuthorities = ['<tenant-domain-prefix>.ciamlogin.com', `${tenantId}.ciamlogin.com`]

const logger = new Logger({
  logLevel: LogLevel.Verbose,
  piiLoggingEnabled: true,
  loggerCallback: (_level, message) => console.log('  [msal]', message.replace(/^.*?\] /, '')),
})

const network = {
  async sendGetRequestAsync(url, options) {
    console.log('  GET', url)
    const res = await fetch(url, { headers: options?.headers })
    const body = await res.json().catch(() => null)
    console.log('  ->', res.status, body?.issuer ? `issuer=${body.issuer}` : '')
    return { status: res.status, headers: Object.fromEntries(res.headers), body }
  },
  async sendPostRequestAsync(url) {
    throw new Error('unexpected POST ' + url)
  },
}

// Minimal in-memory cache with only what Authority touches.
const store = new Map()
const cache = {
  getAuthorityMetadataByAlias: (host) => {
    for (const v of store.values()) if (v.aliases?.includes(host)) return v
    return null
  },
  generateAuthorityMetadataCacheKey: (alias) => `authority-metadata-${alias}`,
  setAuthorityMetadata: (key, entity) => store.set(key, entity),
  getAuthorityMetadataKeys: () => [...store.keys()],
}

// Performance client stub: the browser build wraps every step in measurements.
const measurement = () => ({ end: () => {}, add: () => {}, increment: () => {}, discard: () => {} })
const perf = { startMeasurement: measurement, addFields: () => {}, incrementFields: () => {}, addQueueMeasurement: () => {} }

const options = {
  protocolMode: ProtocolMode.AAD,
  knownAuthorities,
  cloudDiscoveryMetadata: '',
  authorityMetadata: '',
  skipAuthorityMetadataCache: false,
}

const transformed = Authority.transformCIAMAuthority(authorityUri, 'repro')
console.log('authority in :', authorityUri)
console.log('after CIAM transform:', transformed)
console.log('knownAuthorities:', knownAuthorities)

try {
  const authority = new Authority(transformed, network, cache, options, logger, 'repro', perf)
  console.log('openid endpoint MSAL will fetch:', authority.defaultOpenIdConfigurationEndpoint)
  await authority.resolveEndpointsAsync()
  console.log('\nRESOLVED OK')
  console.log('  issuer       :', authority.metadata?.issuer)
  console.log('  authorization:', authority.authorizationEndpoint)
} catch (e) {
  console.log('\nFAILED:', e.errorCode ?? e.name, '-', e.errorMessage ?? e.message)
  if (e.subError) console.log('  subError:', e.subError)
  console.log(e.stack?.split('\n').slice(0, 6).join('\n'))
}
