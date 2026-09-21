import sql from 'mssql'

let poolPromise: Promise<sql.ConnectionPool> | undefined

export function getPool(): Promise<sql.ConnectionPool> {
  if (poolPromise) return poolPromise

  // Local dev: a plain connection string (SQL auth against a local container).
  const local = process.env.SQL_CONNECTION
  const pool = local
    ? new sql.ConnectionPool(local)
    : new sql.ConnectionPool({
        server:   process.env.SQL_SERVER_FQDN!,    // slasql-dv-sqls-ukw-001.database.windows.net
        database: process.env.SQL_DATABASE_NAME!,  // slasql-dv-sqldb-ukw-001
        port: 1433,
        options: { encrypt: true, trustServerCertificate: false },
        connectionTimeout: 30000,   // tolerate a serverless auto-resume on first hit
        // Managed Identity via DefaultAzureCredential — Tedious handles token refresh.
        authentication: {
          type: 'azure-active-directory-default',
          options: { clientId: process.env.AZURE_CLIENT_ID },  // the user-assigned MI
        },
      })

  poolPromise = pool.connect()
  poolPromise.catch(() => { poolPromise = undefined })  // failed connect can retry next call
  return poolPromise
}