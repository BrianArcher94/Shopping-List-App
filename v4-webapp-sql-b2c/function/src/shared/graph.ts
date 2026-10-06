import type { TokenCredential } from '@azure/identity'
import type { ProfileDetails } from '../../domain/profile'
import { createGraphCredential, graphSettingsFromEnv } from './graph-credential'

// Thin Microsoft Graph client for the user operations the profile page needs.
// Every method takes the caller's oid, and callers only ever pass the oid from
// the VALIDATED access token (Principal.oid) - never an id from the request -
// so a user can only read or change their own Entra account.
//
// App permission required on the 'graph' app registration: User.ReadWrite.All.
// It is the least privilege that covers all four calls below (read, update,
// revoke sessions and delete), and app-only access cannot touch users who hold
// admin roles. No photo calls: External ID tenants have no Graph photo storage
// (404 ErrorNonExistentStorage), so the photo is app-owned - see domain/profile.ts.

const GRAPH = 'https://graph.microsoft.com/v1.0'
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default'

export const USER_SELECT = 'id,displayName,givenName,surname,city,country,mail,identities,createdDateTime'

export interface GraphUser {
  id: string
  displayName?: string | null
  givenName?: string | null
  surname?: string | null
  city?: string | null
  country?: string | null
  mail?: string | null
  identities?: { signInType?: string; issuer?: string; issuerAssignedId?: string | null }[]
  createdDateTime?: string | null
}

/** A Graph call failed. `status` 0 = network failure before any response. */
export class GraphError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export interface GraphClientOptions {
  getToken: () => Promise<string>
  fetchFn?: typeof fetch
}

export class GraphClient {
  private readonly getToken: () => Promise<string>
  private readonly fetchFn: typeof fetch

  constructor(opts: GraphClientOptions) {
    this.getToken = opts.getToken
    this.fetchFn = opts.fetchFn ?? fetch
  }

  getUser(oid: string): Promise<GraphUser> {
    return this.json<GraphUser>('GET', `/users/${enc(oid)}?$select=${USER_SELECT}`)
  }

  /** Graph treats null as "clear this property"; empty strings are rejected, so map '' -> null. */
  async updateUser(oid: string, details: ProfileDetails): Promise<void> {
    const body: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(details)) body[k] = v === '' ? null : v
    await this.send('PATCH', `/users/${enc(oid)}`, JSON.stringify(body), 'application/json')
  }

  /** Invalidates every refresh token and session cookie for the user - all devices. */
  async revokeSignInSessions(oid: string): Promise<void> {
    await this.send('POST', `/users/${enc(oid)}/revokeSignInSessions`)
  }

  /** Soft delete: Entra keeps the account restorable for 30 days. Already gone is fine. */
  async deleteUser(oid: string): Promise<void> {
    await this.send('DELETE', `/users/${enc(oid)}`, undefined, undefined, [404])
  }

  // ---------------------------------------------------------------------------

  private async json<T>(method: string, path: string): Promise<T> {
    const res = await this.send(method, path)
    return (await res.json()) as T
  }

  private async send(
    method: string,
    path: string,
    body?: BodyInit,
    contentType?: string,
    tolerate: number[] = [],
  ): Promise<Response> {
    // A token failure (Key Vault sign, assertion exchange) is still "couldn't reach Entra".
    let token: string
    try {
      token = await this.getToken()
    } catch (err) {
      throw new GraphError(0, 'token', `Graph token acquisition failed: ${(err as Error).message}`)
    }
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (contentType) headers['Content-Type'] = contentType

    let res: Response
    try {
      res = await this.fetchFn(`${GRAPH}${path}`, { method, headers, body })
    } catch (err) {
      throw new GraphError(0, 'network', `Graph ${method} ${path} failed: ${(err as Error).message}`)
    }
    if (res.ok || tolerate.includes(res.status)) return res

    // Graph errors look like { error: { code, message } }. Kept for logs only.
    const detail = (await res.json().catch(() => undefined)) as { error?: { code?: string; message?: string } } | undefined
    throw new GraphError(
      res.status,
      detail?.error?.code ?? 'unknown',
      `Graph ${method} ${path} -> ${res.status} ${detail?.error?.code ?? ''}: ${detail?.error?.message ?? ''}`.trim(),
    )
  }
}

const enc = encodeURIComponent

// ----- production singleton ---------------------------------------------------

let client: GraphClient | null | undefined

/** The configured client, or null when GRAPH_* settings are absent (local dev without Azure). */
export function getGraphClient(): GraphClient | null {
  if (client !== undefined) return client
  const settings = graphSettingsFromEnv()
  if (!settings) return (client = null)
  const credential: TokenCredential = createGraphCredential(settings)
  return (client = new GraphClient({
    getToken: async () => {
      const t = await credential.getToken(GRAPH_SCOPE)
      if (!t?.token) throw new GraphError(0, 'no_token', 'Could not obtain a Graph token')
      return t.token
    },
  }))
}
