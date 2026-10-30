import { CosmosClient, type Container } from '@azure/cosmos'
import { DefaultAzureCredential } from '@azure/identity'

// Containers are created by Terraform (modules/az-cosmos) — never createIfNotExists from here;
// the UAMI's Built-in Data Contributor role can't create containers anyway.
const LISTS_CONTAINER      = 'shoppingLists'    // PK /weekStartDate, items embedded
const FAVOURITES_CONTAINER = 'favouriteItems'   // PK /id (normalised name)

let client: CosmosClient | undefined

function getClient(): CosmosClient {
  if (client) return client

  client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,   // https://slacdb-dv-cosmos-ukw-001.documents.azure.com:443/ (resolves to the PE)
    // Azure: the user-assigned MI (AZURE_CLIENT_ID). Local run: falls back to your az login.
    // Local (key) auth is disabled on the account, so there is no key to pass even if we wanted to.
    aadCredentials: new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID }),
  })
  return client
}

const database = () => getClient().database(process.env.COSMOS_DATABASE ?? 'sla')

export const getLists      = (): Container => database().container(LISTS_CONTAINER)
export const getFavourites = (): Container => database().container(FAVOURITES_CONTAINER)

// Every Cosmos response carries its RU cost. Logging it per operation is what makes RU
// consumption visible in App Insights (traces | where message startswith "cosmos").
export function charged<T extends { requestCharge: number }>(op: string, res: T): T {
  console.log(`cosmos op=${op} ru=${res.requestCharge}`)
  return res
}
