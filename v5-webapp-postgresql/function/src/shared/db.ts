import { Pool, types } from 'pg'
import { DefaultAzureCredential } from '@azure/identity'

// DATE (OID 1082) → plain 'YYYY-MM-DD' string. pg's default turns it into a JS Date at
// LOCAL midnight, which toISOString() shifts back a day on a BST machine.
types.setTypeParser(1082, (v) => v)

// Azure: the user-assigned MI (AZURE_CLIENT_ID). Local run: falls back to your az login.
const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID })
const ENTRA_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default'

let pool: Pool | undefined

export function getPool(): Pool {
  if (pool) return pool

  pool = new Pool({
    host:     process.env.PGHOST,       // slapgsql-dv-pgsql-ukw-001.postgres.database.azure.com (public FQDN → resolves to the PE)
    database: process.env.PGDATABASE,   // sla
    user:     process.env.PGUSER,       // role name = MI display name (slapgsql-dv-msid-ukw-001)
    port:     Number(process.env.PGPORT ?? 5432),
    // Entra token as the password. Called for each NEW connection; the credential caches and
    // refreshes the token. PostgreSQL only checks it at connect, so open connections outlive it.
    password: async () => (await credential.getToken(ENTRA_SCOPE)).token,
    ssl: { rejectUnauthorized: true },
    max: 5,                             // per instance — see plan §11 for the connection budget
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,    // no auto-pause on Flexible Server, so no long resume wait
  })

  // An idle client dropped by the server emits 'error' on the pool; unhandled, it crashes the host.
  pool.on('error', (err) => console.error('pg pool error', err))

  return pool
}
