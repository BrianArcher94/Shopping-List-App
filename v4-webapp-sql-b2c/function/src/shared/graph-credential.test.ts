import { createHash, generateKeyPairSync, sign as nodeSign, type KeyObject } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { decodeProtectedHeader, jwtVerify } from 'jose'
import {
  buildClientAssertion,
  graphSettingsFromEnv,
  thumbprintToX5t,
  tokenEndpoint,
  type AssertionConfig,
} from './graph-credential'

// The assertion is what Entra checks against the certificate on the 'graph' app
// registration. In production Key Vault signs it; here a local RSA key stands in,
// and jose verifies the result exactly as a relying party would.

let publicKey: KeyObject
let privateKey: KeyObject
let thumbprintHex: string

const cfg = (): AssertionConfig => ({
  tenantId: '11111111-2222-3333-4444-555555555555',
  clientId: 'graph-app-client-id',
  authorityHost: 'https://login.microsoftonline.com/',
  thumbprintHex,
})

beforeAll(() => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
  publicKey = pair.publicKey
  privateKey = pair.privateKey
  // Any 20 bytes will do as a thumbprint for these tests.
  thumbprintHex = createHash('sha1').update('test-cert').digest('hex').toUpperCase()
})

const localSigner = async (data: Buffer) => nodeSign('sha256', data, privateKey)

describe('client assertion', () => {
  it('is a valid RS256 JWT verifiable with the certificate public key', async () => {
    const now = new Date('2026-10-01T10:00:00Z')
    const jwt = await buildClientAssertion(cfg(), localSigner, now)

    const { payload, protectedHeader } = await jwtVerify(jwt, publicKey, {
      algorithms: ['RS256'],
      currentDate: now,
      audience: 'https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/oauth2/v2.0/token',
      issuer: 'graph-app-client-id',
      subject: 'graph-app-client-id',
    })
    expect(protectedHeader).toMatchObject({ alg: 'RS256', typ: 'JWT' })
    expect(payload.exp! - payload.iat!).toBe(600)
    expect(payload.nbf).toBe(payload.iat)
    expect(typeof payload.jti).toBe('string')
  })

  it('carries x5t = base64url of the SHA-1 thumbprint bytes', async () => {
    const jwt = await buildClientAssertion(cfg(), localSigner)
    const header = decodeProtectedHeader(jwt)
    expect(header.x5t).toBe(Buffer.from(thumbprintHex, 'hex').toString('base64url'))
  })

  it('uses a fresh jti every time (Entra rejects replayed assertions)', async () => {
    const a = await buildClientAssertion(cfg(), localSigner)
    const b = await buildClientAssertion(cfg(), localSigner)
    const jti = (t: string) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).jti
    expect(jti(a)).not.toBe(jti(b))
  })

  it('fails verification if the signer used a different key', async () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
    const jwt = await buildClientAssertion(cfg(), async (d) => nodeSign('sha256', d, other))
    await expect(jwtVerify(jwt, publicKey)).rejects.toThrow()
  })
})

describe('helpers', () => {
  it('tokenEndpoint trims trailing slashes on the authority host', () => {
    expect(tokenEndpoint({ authorityHost: 'https://login.microsoftonline.com//', tenantId: 't' }))
      .toBe('https://login.microsoftonline.com/t/oauth2/v2.0/token')
  })

  it('thumbprintToX5t accepts colon/space separated hex and rejects the wrong length', () => {
    const spaced = thumbprintHex.match(/../g)!.join(':')
    expect(thumbprintToX5t(spaced)).toBe(thumbprintToX5t(thumbprintHex))
    expect(() => thumbprintToX5t('abcd')).toThrow(/40-character/)
  })

  it('graphSettingsFromEnv returns undefined unless all four GRAPH_* values are set', () => {
    const full = {
      GRAPH_TENANT_ID: 't', GRAPH_CLIENT_ID: 'c',
      GRAPH_CERT_KEY_ID: 'https://kv.vault.azure.net/keys/graph/1', GRAPH_CERT_THUMBPRINT: thumbprintHex,
      AZURE_CLIENT_ID: 'uami',
    }
    expect(graphSettingsFromEnv(full)).toMatchObject({
      tenantId: 't', clientId: 'c', managedIdentityClientId: 'uami',
      authorityHost: 'https://login.microsoftonline.com',
    })
    expect(graphSettingsFromEnv({ ...full, GRAPH_CERT_KEY_ID: ' ' })).toBeUndefined()
    expect(graphSettingsFromEnv({})).toBeUndefined()
  })
})
