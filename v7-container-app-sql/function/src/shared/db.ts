import sql from 'mssql'

let poolPromise: Promise<sql.ConnectionPool> | undefined

export function getPool(): Promise<sql.ConnectionPool> {
  if (poolPromise) return poolPromise

  // Always Azure SQL Database with Entra auth — the server is Entra-only, there is no SQL login.
  // DefaultAzureCredential uses the user-assigned managed identity in Azure (AZURE_CLIENT_ID)
  // and falls back to your `az login` when running locally with AZURE_CLIENT_ID unset.
  const pool = new sql.ConnectionPool({
    server:   process.env.SQL_SERVER_FQDN!,    // slasqlcon-dv-sql-ukw-001.database.windows.net (resolves to the PE)
    database: process.env.SQL_DATABASE_NAME!,  // SLA
    port: 1433,
    options: { encrypt: true, trustServerCertificate: false },
    connectionTimeout: 30000,   // tolerate a serverless auto-resume on first hit
    // Tedious gets and refreshes the token via DefaultAzureCredential.
    authentication: {
      type: 'azure-active-directory-default',
      options: { clientId: process.env.AZURE_CLIENT_ID },  // the user-assigned MI; unset locally
    },
  })

  poolPromise = pool.connect()
  poolPromise.catch(() => { poolPromise = undefined })  // failed connect can retry next call
  return poolPromise
}