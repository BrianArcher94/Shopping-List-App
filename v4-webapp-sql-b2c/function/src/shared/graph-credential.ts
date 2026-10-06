import { randomUUID } from 'node:crypto'
import { ClientAssertionCredential, ManagedIdentityCredential, type TokenCredential } from '@azure/identity'
import { CryptographyClient } from '@azure/keyvault-keys'

// -----------------------------------------------------------------------------
// Secretless Microsoft Graph credential for the External ID tenant.
//
// Why not the managed identity directly? A managed identity can only be trusted
// (federated) by an app registration in ITS OWN tenant, and External ID tenants
// only allow single-tenant apps - so the UAMI (workforce tenant) cannot get a
// token for the external tenant's Graph.
//
// Instead the 'graph' app registration in the external tenant holds the PUBLIC
// half of a Key Vault certificate whose private key is non-exportable. To get a
// token we build an RFC 7523 client-assertion JWT and ask Key Vault to sign it,
// authenticating to Key Vault with the UAMI. The private key never leaves Key
// Vault and nothing secret is stored anywhere - the managed identity remains the
// only credential the Function App holds.
// -----------------------------------------------------------------------------

export interface AssertionConfig {
  /** External ID tenant id (GUID). */
  tenantId: string
  /** Client id of the 'graph' app registration in the external tenant. */
  clientId: string
  /** e.g. https://login.microsoftonline.com - covered by the AzureActiveDirectory NSG service tag. */
  authorityHost: string
  /** SHA-1 thumbprint of the certificate, hex (Key Vault / azurerm format). */
  thumbprintHex: string
}

/** Produces an RS256 signature over `data`. Key Vault in production, a local key in tests. */
export type Rs256Signer = (data: Buffer) => Promise<Uint8Array>

const b64url = (input: Buffer | Uint8Array | string) =>
  Buffer.from(input as Uint8Array).toString('base64url')

/** The token endpoint is also the assertion's required audience. */
export function tokenEndpoint(cfg: Pick<AssertionConfig, 'authorityHost' | 'tenantId'>): string {
  return `${cfg.authorityHost.replace(/\/+$/, '')}/${cfg.tenantId}/oauth2/v2.0/token`
}

/** Hex SHA-1 thumbprint -> the base64url `x5t` header Entra uses to pick the certificate. */
export function thumbprintToX5t(thumbprintHex: string): string {
  const hex = thumbprintHex.replace(/[^0-9a-f]/gi, '')
  if (hex.length !== 40) throw new Error('Certificate thumbprint must be a 40-character SHA-1 hex string')
  return b64url(Buffer.from(hex, 'hex'))
}

/** Build and sign a client-assertion JWT (valid for 10 minutes). */
export async function buildClientAssertion(
  cfg: AssertionConfig,
  sign: Rs256Signer,
  now: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000)
  const header = { alg: 'RS256', typ: 'JWT', x5t: thumbprintToX5t(cfg.thumbprintHex) }
  const payload = {
    aud: tokenEndpoint(cfg),
    iss: cfg.clientId,
    sub: cfg.clientId,
    jti: randomUUID(),
    iat,
    nbf: iat,
    exp: iat + 600,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signature = await sign(Buffer.from(signingInput, 'ascii'))
  return `${signingInput}.${b64url(signature)}`
}

export interface GraphCredentialSettings extends AssertionConfig {
  /** Versioned Key Vault KEY id of the certificate: https://<vault>.vault.azure.net/keys/<name>/<version> */
  keyId: string
  /** Client id of the user-assigned managed identity that may call Key Vault 'sign'. */
  managedIdentityClientId?: string
}

/** Read GRAPH_* settings. Returns undefined when profile sync is not configured (e.g. local dev). */
export function graphSettingsFromEnv(env: NodeJS.ProcessEnv = process.env): GraphCredentialSettings | undefined {
  const tenantId = env.GRAPH_TENANT_ID?.trim()
  const clientId = env.GRAPH_CLIENT_ID?.trim()
  const keyId = env.GRAPH_CERT_KEY_ID?.trim()
  const thumbprintHex = env.GRAPH_CERT_THUMBPRINT?.trim()
  if (!tenantId || !clientId || !keyId || !thumbprintHex) return undefined
  return {
    tenantId,
    clientId,
    keyId,
    thumbprintHex,
    authorityHost: env.GRAPH_AUTHORITY_HOST?.trim() || 'https://login.microsoftonline.com',
    managedIdentityClientId: env.AZURE_CLIENT_ID?.trim() || undefined,
  }
}

/** Production credential: Key Vault signs the assertion; @azure/identity exchanges and caches the token. */
export function createGraphCredential(settings: GraphCredentialSettings): TokenCredential {
  const kvCredential = new ManagedIdentityCredential(
    settings.managedIdentityClientId ? { clientId: settings.managedIdentityClientId } : {},
  )
  const crypto = new CryptographyClient(settings.keyId, kvCredential)
  const sign: Rs256Signer = async (data) => (await crypto.signData('RS256', data)).result

  return new ClientAssertionCredential(
    settings.tenantId,
    settings.clientId,
    () => buildClientAssertion(settings, sign),
    { authorityHost: settings.authorityHost },
  )
}
