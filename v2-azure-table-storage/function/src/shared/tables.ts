import { TableClient } from '@azure/data-tables'
import { DefaultAzureCredential } from '@azure/identity'

export const TABLES = {
    lists: 'ShoppingLists',
    items: 'ShoppingItems',
    favourites: 'FavouriteItems',
} as const

export function getTableClient(tableName: string): TableClient {
    // Local development against Azurite uses a connection string.
    const connection = process.env.TABLES_CONNECTION
    if (connection) {
        return TableClient.fromConnectionString(connection, tableName, {
            allowInsecureConnection: true,
        })
    }

    // In Azure: Managed Identity against the private table endpoint.
    const account = process.env.STORAGE_ACCOUNT_NAME
    if (!account) {
        throw new Error('Set TABLES_CONNECTION (local) or STORAGE_ACCOUNT_NAME (Azure)')
    }
    const endpoint = `https://${account}.table.core.windows.net`

    const credential = new DefaultAzureCredential({
        managedIdentityClientId: process.env.AZURE_CLIENT_ID,
    })
    return new TableClient(endpoint, tableName, credential)
}