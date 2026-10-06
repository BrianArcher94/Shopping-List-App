import { describe, expect, it, beforeAll } from 'vitest'
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK, type KeyLike } from 'jose'
import type { HttpRequest } from '@azure/functions'
import { AuthError, createAuthenticator, type AuthConfig } from './auth'

// Auth is pure and security-critical: these tests sign real RS256 tokens with a
// locally generated key pair and resolve keys from a local JWKS — no network,
// no tenant. Each case corresponds to one check in auth.ts.

const config: AuthConfig = {
  issuer: 'https://unit-test.ciamlogin.com/00000000-0000-0000-0000-000000000000/v2.0',
  audience: 'api-client-id',
  requiredScope: 'access_as_user',
  jwksUri: 'https://unit-test.invalid/keys', // never fetched: getKey is injected
  requireMfa: false,
}

let privateKey: KeyLike
let publicJwk: JWK
let otherPrivateKey: KeyLike
let authenticate: ReturnType<typeof createAuthenticator>
let authenticateMfa: ReturnType<typeof createAuthenticator>

beforeAll(async () => {
  const pair = await generateKeyPair('RS256')
  privateKey = pair.privateKey
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' }
  otherPrivateKey = (await generateKeyPair('RS256')).privateKey
  const getKey = createLocalJWKSet({ keys: [publicJwk] })
  authenticate = createAuthenticator({ config, getKey })
  authenticateMfa = createAuthenticator({ config: { ...config, requireMfa: true }, getKey })
})

interface TokenOpts {
  claims?: Record<string, unknown>
  issuer?: string
  audience?: string
  expiresIn?: string
  key?: KeyLike
}

async function token(opts: TokenOpts = {}): Promise<string> {
  const jwt = new SignJWT({ scp: 'access_as_user', oid: 'user-oid-1', name: 'Test User', ...opts.claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(opts.issuer ?? config.issuer)
    .setAudience(opts.audience ?? config.audience)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '1h')
  return jwt.sign(opts.key ?? privateKey)
}

function request(authorization?: string): HttpRequest {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('authorization', authorization)
  return { headers } as unknown as HttpRequest
}

async function expectAuthError(p: Promise<unknown>, status: number, reason: string) {
  const err = await p.then(() => undefined, (e) => e)
  expect(err).toBeInstanceOf(AuthError)
  expect((err as AuthError).status).toBe(status)
  expect((err as AuthError).reason).toBe(reason)
}

describe('authenticate', () => {
  it('returns the principal for a valid token', async () => {
    const user = await authenticate(request(`Bearer ${await token()}`))
    expect(user).toEqual({ oid: 'user-oid-1', name: 'Test User' })
  })

  it('401 missing: no Authorization header', async () => {
    await expectAuthError(authenticate(request()), 401, 'missing')
  })

  it('401 malformed: not a Bearer scheme', async () => {
    await expectAuthError(authenticate(request('Basic abc')), 401, 'malformed')
  })

  it('401 malformed: garbage token', async () => {
    await expectAuthError(authenticate(request('Bearer not-a-jwt')), 401, 'malformed')
  })

  it('401 expired', async () => {
    // exp two minutes ago — beyond the 60 s clock tolerance
    const t = await token({ expiresIn: '-2m' })
    await expectAuthError(authenticate(request(`Bearer ${t}`)), 401, 'expired')
  })

  it('401 bad_issuer: valid token from another tenant', async () => {
    const t = await token({ issuer: 'https://other.ciamlogin.com/11111111-1111-1111-1111-111111111111/v2.0' })
    await expectAuthError(authenticate(request(`Bearer ${t}`)), 401, 'bad_issuer')
  })

  it('401 bad_audience: token minted for a different API', async () => {
    const t = await token({ audience: '00000003-0000-0000-c000-000000000000' })
    await expectAuthError(authenticate(request(`Bearer ${t}`)), 401, 'bad_audience')
  })

  it('401 bad_signature: signed by a key the tenant does not publish', async () => {
    const t = await token({ key: otherPrivateKey })
    await expectAuthError(authenticate(request(`Bearer ${t}`)), 401, 'bad_signature')
  })

  it('401 bad_signature: alg=none is rejected', async () => {
    // Hand-built unsigned token: header {"alg":"none"}, our claims, empty signature.
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const unsigned = `${b64({ alg: 'none' })}.${b64({
      iss: config.issuer, aud: config.audience, exp: now + 3600, iat: now,
      scp: 'access_as_user', oid: 'user-oid-1',
    })}.`
    await expectAuthError(authenticate(request(`Bearer ${unsigned}`)), 401, 'bad_signature')
  })

  it('403 bad_scope: valid token without the required scope', async () => {
    const t = await token({ claims: { scp: 'some.other.scope' } })
    await expectAuthError(authenticate(request(`Bearer ${t}`)), 403, 'bad_scope')
  })

  it('401 no_oid: valid token with no oid claim', async () => {
    const t = await token({ claims: { oid: undefined } })
    await expectAuthError(authenticate(request(`Bearer ${t}`)), 401, 'no_oid')
  })

  it('falls back through preferred_username / email when name is absent', async () => {
    const t1 = await token({ claims: { name: undefined, preferred_username: 'pu@example.com' } })
    expect((await authenticate(request(`Bearer ${t1}`))).name).toBe('pu@example.com')
    const t2 = await token({ claims: { name: undefined, email: 'e@example.com' } })
    expect((await authenticate(request(`Bearer ${t2}`))).name).toBe('e@example.com')
    const t3 = await token({ claims: { name: undefined } })
    expect((await authenticate(request(`Bearer ${t3}`))).name).toBe('Unknown user')
  })

  // --- MFA assertion (AUTH_REQUIRE_MFA) ---

  it('mfa on: token whose amr contains "mfa" passes', async () => {
    const t = await token({ claims: { amr: ['pwd', 'otp', 'mfa'] } })
    expect((await authenticateMfa(request(`Bearer ${t}`))).oid).toBe('user-oid-1')
  })

  it('mfa on: 403 mfa_required when amr lacks "mfa"', async () => {
    const t = await token({ claims: { amr: ['pwd'] } })
    await expectAuthError(authenticateMfa(request(`Bearer ${t}`)), 403, 'mfa_required')
  })

  it('mfa on: 403 mfa_required when amr is absent entirely', async () => {
    await expectAuthError(authenticateMfa(request(`Bearer ${await token()}`)), 403, 'mfa_required')
  })

  it('mfa on: scope is checked before mfa (wrong scope is still 403 bad_scope)', async () => {
    const t = await token({ claims: { scp: 'other', amr: ['pwd'] } })
    await expectAuthError(authenticateMfa(request(`Bearer ${t}`)), 403, 'bad_scope')
  })

  it('mfa off: a single-factor token still passes', async () => {
    const t = await token({ claims: { amr: ['pwd'] } })
    expect((await authenticate(request(`Bearer ${t}`))).oid).toBe('user-oid-1')
  })

  it('env: AUTH_REQUIRE_MFA is off unless exactly "true"', async () => {
    const envAuth = createAuthenticator({ getKey: createLocalJWKSet({ keys: [publicJwk] }) })
    const saved = { ...process.env }
    Object.assign(process.env, {
      AUTH_ISSUER: config.issuer, AUTH_AUDIENCE: config.audience,
      AUTH_REQUIRED_SCOPE: config.requiredScope, AUTH_JWKS_URI: config.jwksUri,
    })
    try {
      const single = await token({ claims: { amr: ['pwd'] } })
      process.env.AUTH_REQUIRE_MFA = 'false'
      await expect(envAuth(request(`Bearer ${single}`))).resolves.toBeTruthy()
      process.env.AUTH_REQUIRE_MFA = 'yes'
      await expect(envAuth(request(`Bearer ${single}`))).resolves.toBeTruthy()
      process.env.AUTH_REQUIRE_MFA = ' TRUE '
      await expectAuthError(envAuth(request(`Bearer ${single}`)), 403, 'mfa_required')
    } finally {
      process.env = saved
    }
  })

  it('401 not_configured: env-backed authenticator fails closed when AUTH_* are missing', async () => {
    const envAuth = createAuthenticator()
    const saved = { ...process.env }
    delete process.env.AUTH_ISSUER
    try {
      await expectAuthError(envAuth(request(`Bearer ${await token()}`)), 401, 'not_configured')
    } finally {
      process.env = saved
    }
  })
})
