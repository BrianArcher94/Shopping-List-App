import type { HttpRequest } from '@azure/functions'
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose'
import { ApiError } from './errors'

// The identity a request is acting as. `oid` is the Entra object id — immutable
// per user per tenant — so it is what we persist. `name` is display-only.
export interface Principal {
  oid: string
  name: string
  /** Authentication methods from the token's amr claim, e.g. ["pwd","otp","mfa"]. Absent when the token has none. */
  amr?: string[]
}

// Used by the scheduler route (function-key auth, no user).
export const SYSTEM_PRINCIPAL: Principal = { oid: 'system', name: 'System' }

// Reason codes are logged (never returned) so App Insights can answer "why are
// callers getting 401" without telling an attacker which check they failed.
export type AuthFailureReason =
  | 'missing' | 'malformed' | 'bad_signature' | 'expired' | 'bad_issuer'
  | 'bad_audience' | 'bad_scope' | 'no_oid' | 'not_configured' | 'mfa_required'

export class AuthError extends ApiError {
  constructor(status: 401 | 403, public reason: AuthFailureReason) {
    super(status, status === 401 ? 'Unauthorized' : 'Forbidden')
  }
}

export interface AuthConfig {
  issuer: string
  audience: string
  requiredScope: string
  jwksUri: string
  /**
   * Defence in depth for the tenant's MFA Conditional Access policy: when true,
   * the token's `amr` claim must contain "mfa". The policy is the real control;
   * this refuses a token minted some other way (policy disabled, another client).
   * Keep false until the policy is enforced, or every user gets a 403.
   */
  requireMfa: boolean
}

// Read on first use, fail closed: a missing value throws rather than falling
// through to "no config, so allow".
function configFromEnv(): AuthConfig {
  const issuer = process.env.AUTH_ISSUER
  const audience = process.env.AUTH_AUDIENCE
  const requiredScope = process.env.AUTH_REQUIRED_SCOPE
  const jwksUri = process.env.AUTH_JWKS_URI
  if (!issuer || !audience || !requiredScope || !jwksUri) {
    throw new AuthError(401, 'not_configured')
  }
  // Optional; absent or anything but the literal "true" means off.
  const requireMfa = process.env.AUTH_REQUIRE_MFA?.trim().toLowerCase() === 'true'
  return { issuer, audience, requiredScope, jwksUri, requireMfa }
}

// Module-scope key set: caches signing keys and re-fetches on an unknown `kid`,
// so tenant key rotation needs no code change. Created lazily so tests can
// inject a local JWKS instead (see createAuthenticator).
let defaultKeySet: JWTVerifyGetKey | undefined
function remoteKeySet(uri: string): JWTVerifyGetKey {
  if (!defaultKeySet) defaultKeySet = createRemoteJWKSet(new URL(uri))
  return defaultKeySet
}

/**
 * Build an authenticator. Production uses the defaults (env config + remote
 * JWKS); tests pass an explicit config and a local key resolver.
 */
export function createAuthenticator(opts: { config?: AuthConfig; getKey?: JWTVerifyGetKey } = {}) {
  return async function authenticate(req: HttpRequest): Promise<Principal> {
    const header = req.headers.get('authorization') ?? ''
    const [scheme, token] = header.split(' ')
    if (!scheme) throw new AuthError(401, 'missing')
    if (scheme.toLowerCase() !== 'bearer' || !token) throw new AuthError(401, 'malformed')

    const config = opts.config ?? configFromEnv()
    const getKey = opts.getKey ?? remoteKeySet(config.jwksUri)

    let payload: JWTPayload
    try {
      const result = await jwtVerify(token, getKey, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ['RS256'], // never let the token choose its own algorithm
        clockTolerance: 60,
      })
      payload = result.payload
    } catch (err) {
      throw new AuthError(401, classify(err))
    }

    // Scope: the caller is known, just not allowed → 403 not 401.
    const scopes = typeof payload.scp === 'string' ? payload.scp.split(' ') : []
    if (!scopes.includes(config.requiredScope)) throw new AuthError(403, 'bad_scope')

    // MFA (optional): amr lists the methods used, e.g. ["pwd","otp","mfa"]. Caller is
    // known and scoped, just not strongly enough authenticated → 403.
    const amr = Array.isArray(payload.amr)
      ? (payload.amr as unknown[]).filter((m): m is string => typeof m === 'string')
      : []
    if (config.requireMfa && !amr.includes('mfa')) throw new AuthError(403, 'mfa_required')

    const oid = typeof payload.oid === 'string' ? payload.oid : undefined
    if (!oid) throw new AuthError(401, 'no_oid')

    const name =
      firstString(payload.name) ??
      firstString(payload.preferred_username) ??
      firstString(payload.email) ??
      'Unknown user'

    return amr.length > 0 ? { oid, name, amr } : { oid, name }
  }
}

// jose error codes → our reason codes.
function classify(err: unknown): AuthFailureReason {
  const code = (err as { code?: string })?.code
  const claim = (err as { claim?: string })?.claim
  switch (code) {
    case 'ERR_JWT_EXPIRED':
      return 'expired'
    case 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED':
    case 'ERR_JWKS_NO_MATCHING_KEY':
    case 'ERR_JOSE_ALG_NOT_ALLOWED':
      return 'bad_signature'
    case 'ERR_JWS_INVALID':
    case 'ERR_JWT_INVALID':
      return 'malformed'
    case 'ERR_JWT_CLAIM_VALIDATION_FAILED':
      if (claim === 'iss') return 'bad_issuer'
      if (claim === 'aud') return 'bad_audience'
      if (claim === 'exp') return 'expired'
      return 'malformed'
    default:
      return 'malformed'
  }
}

const firstString = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)

// The production instance. Handlers go through runAuthed (http.ts) rather than calling this directly.
export const authenticate = createAuthenticator()
