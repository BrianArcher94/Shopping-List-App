import { ManagedIdentityCredential } from '@azure/identity'
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob'
import { ApiError } from './errors'
import { photoBlobName } from './profile'

// Profile photos live in a private container in the existing storage account
// (private endpoint, public access off). The Function's UAMI already holds
// Storage Blob Data Owner on the account (main.role.tf), so no new grant and no
// key. The browser never reads the blob directly - GET /api/me/photo streams it.
//
// Local dev: set PHOTO_STORAGE_CONNECTION to an Azurite connection string.

let container: ContainerClient | undefined

function getContainer(): ContainerClient {
  if (container) return container
  const name = process.env.PHOTO_CONTAINER?.trim() || 'profile-photos'
  const local = process.env.PHOTO_STORAGE_CONNECTION?.trim()
  const account = process.env.STORAGE_ACCOUNT_NAME?.trim()

  let service: BlobServiceClient
  if (local) {
    service = BlobServiceClient.fromConnectionString(local)
  } else if (account) {
    const clientId = process.env.AZURE_CLIENT_ID?.trim()
    service = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      new ManagedIdentityCredential(clientId ? { clientId } : {}),
    )
  } else {
    throw new ApiError(503, 'Photo storage is not configured')
  }
  return (container = service.getContainerClient(name))
}

export async function savePhoto(oid: string, jpeg: Uint8Array): Promise<void> {
  await getContainer()
    .getBlockBlobClient(photoBlobName(oid))
    .uploadData(jpeg, { blobHTTPHeaders: { blobContentType: 'image/jpeg' } })
}

/** The photo bytes, or null if the user has none. */
export async function readPhoto(oid: string): Promise<Buffer | null> {
  try {
    return await getContainer().getBlockBlobClient(photoBlobName(oid)).downloadToBuffer()
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) return null
    throw err
  }
}

export async function deletePhoto(oid: string): Promise<void> {
  await getContainer().getBlockBlobClient(photoBlobName(oid)).deleteIfExists()
}
