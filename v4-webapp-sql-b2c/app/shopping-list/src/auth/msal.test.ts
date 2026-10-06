import { describe, expect, it } from 'vitest'
import { buildMsalConfig } from './msal'

// Guards the CIAM issuer-validation workaround: MSAL 5 only accepts the GUID-host
// issuer External ID returns if that host is listed in knownAuthorities.

const cfg = {
  authority: 'https://contoso.ciamlogin.com/',
  clientId: 'aaaaaaaa-0000-0000-0000-000000000001',
  apiScope: 'api://aaaaaaaa-0000-0000-0000-000000000002/access_as_user',
  tenantId: 'aaaaaaaa-0000-0000-0000-000000000003',
}

describe('buildMsalConfig', () => {
  it('tolerates a tenant id with surrounding whitespace (pipeline variable hygiene)', () => {
    const c = buildMsalConfig({ ...cfg, tenantId: ' aaaaaaaa-0000-0000-0000-000000000003 ' }, 'http://localhost:5173')
    expect(c.auth.knownAuthorities).toContain('aaaaaaaa-0000-0000-0000-000000000003.ciamlogin.com')
  })

  it('lists both the name host and the tenant-id host as known authorities', () => {
    const c = buildMsalConfig(cfg, 'https://app.example.com')
    expect(c.auth.knownAuthorities).toEqual([
      'contoso.ciamlogin.com',
      'aaaaaaaa-0000-0000-0000-000000000003.ciamlogin.com',
    ])
  })

  it('uses the origin with a trailing slash as the redirect URI', () => {
    const c = buildMsalConfig(cfg, 'http://localhost:5173')
    expect(c.auth.redirectUri).toBe('http://localhost:5173/')
    expect(c.auth.postLogoutRedirectUri).toBe('http://localhost:5173/')
  })

  it('keeps the authority as given and caches in sessionStorage', () => {
    const c = buildMsalConfig(cfg, 'http://localhost:5173')
    expect(c.auth.authority).toBe(cfg.authority)
    expect(c.cache?.cacheLocation).toBe('sessionStorage')
  })
})
